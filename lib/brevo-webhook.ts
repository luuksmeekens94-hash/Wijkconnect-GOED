export type BrevoWebhookEvent = {
  event: string;
  messageId: string | null;
  invitationId: string | null;
  attemptId: string | null;
  messageKind: "invitation" | "reminder" | null;
  occurredAt: Date;
  reasonCode: string | null;
};

function safeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseCorrelation(value: unknown): Pick<BrevoWebhookEvent, "invitationId" | "attemptId" | "messageKind"> {
  if (typeof value !== "string") return { invitationId: null, attemptId: null, messageKind: null };
  try {
    const parsed = JSON.parse(value) as {
      wijkconnectInvitationId?: unknown;
      wijkconnectDeliveryAttemptId?: unknown;
      wijkconnectMessageKind?: unknown;
    };
    const kind = safeString(parsed.wijkconnectMessageKind);
    return {
      invitationId: safeString(parsed.wijkconnectInvitationId),
      attemptId: safeString(parsed.wijkconnectDeliveryAttemptId),
      messageKind: kind === "invitation" || kind === "reminder" ? kind : null,
    };
  } catch {
    return { invitationId: null, attemptId: null, messageKind: null };
  }
}

function parseOccurredAt(payload: Record<string, unknown>) {
  const timestamp = typeof payload.ts_event === "number"
    ? payload.ts_event
    : typeof payload.ts === "number"
      ? payload.ts
      : null;
  return timestamp ? new Date(timestamp * 1000) : new Date();
}

export function parseBrevoWebhookEvent(payload: unknown): BrevoWebhookEvent | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  const event = safeString(record.event);
  if (!event) return null;
  const correlation = parseCorrelation(record["X-Mailin-custom"]);

  return {
    event,
    messageId: safeString(record["message-id"]) ?? safeString(record.messageId),
    ...correlation,
    occurredAt: parseOccurredAt(record),
    reasonCode: safeString(record.reason)?.slice(0, 120) ?? null,
  };
}

export function webhookEventKind(event: string): "delivered" | "transient-bounce" | "permanent-bounce" | "complaint" | "ignored" {
  switch (event) {
    case "delivered":
      return "delivered";
    case "hard_bounce":
    case "invalid":
    case "invalid_email":
      return "permanent-bounce";
    case "soft_bounce":
    case "blocked":
    case "error":
      return "transient-bounce";
    case "spam":
    case "unsubscribed":
      return "complaint";
    default:
      return "ignored";
  }
}

export type BrevoDeliveryState = {
  deliveryStatus: "PENDING" | "QUEUED" | "SENT" | "DELIVERED" | "BOUNCED" | "FAILED" | "SUPPRESSED";
  lastDeliveryErrorCode: string | null;
  deliveredAt: Date | null;
};

const terminalWebhookEvents = new Set(["hard_bounce", "invalid", "invalid_email", "spam", "unsubscribed"]);

export function decideBrevoWebhookTransition(
  kind: ReturnType<typeof webhookEventKind>,
  event: string,
  state: BrevoDeliveryState,
) {
  const isTerminal = state.deliveryStatus === "SUPPRESSED" || terminalWebhookEvents.has(state.lastDeliveryErrorCode ?? "");
  if (kind === "ignored") return "ignored" as const;
  if (state.deliveryStatus === "SUPPRESSED") return "ignored" as const;
  if (kind === "delivered") {
    if (isTerminal || (state.deliveryStatus === "DELIVERED" && state.deliveredAt)) return "ignored" as const;
    return "delivered" as const;
  }
  if (kind === "transient-bounce") {
    if (isTerminal || state.deliveryStatus === "DELIVERED") return "ignored" as const;
    return "transient-bounce" as const;
  }
  if (kind === "permanent-bounce" && state.deliveryStatus === "BOUNCED" && state.lastDeliveryErrorCode === event) {
    return "ignored" as const;
  }
  return kind;
}

export function normalizeBrevoMessageId(messageId: string) {
  return messageId.replace(/^<|>$/g, "");
}

export function brevoCorrelationMatches(
  event: Pick<BrevoWebhookEvent, "invitationId" | "messageId" | "messageKind">,
  invitation: {
    id: string;
    initialProviderMessageId: string | null;
    reminderProviderMessageId: string | null;
    providerMessageId: string | null;
  },
) {
  if (!event.invitationId || !event.messageId || event.invitationId !== invitation.id) return false;
  const expectedMessageIds = event.messageKind === "invitation"
    ? [invitation.initialProviderMessageId ?? invitation.providerMessageId]
    : event.messageKind === "reminder"
      ? [invitation.reminderProviderMessageId ?? invitation.providerMessageId]
      : [
          invitation.initialProviderMessageId,
          invitation.reminderProviderMessageId,
          invitation.providerMessageId,
        ];
  const normalizedEventId = normalizeBrevoMessageId(event.messageId);
  return expectedMessageIds.some((messageId) =>
    messageId ? normalizeBrevoMessageId(messageId) === normalizedEventId : false,
  );
}

export function brevoDeliveryAttemptCorrelationMatches(
  event: Pick<BrevoWebhookEvent, "invitationId" | "attemptId" | "messageId" | "messageKind">,
  attempt: {
    id: string;
    invitationId: string;
    kind: "INVITATION" | "REMINDER";
    providerMessageId: string | null;
  },
) {
  if (!event.invitationId || !event.messageId || event.invitationId !== attempt.invitationId) return false;
  if (event.attemptId && event.attemptId !== attempt.id) return false;
  if (event.messageKind && event.messageKind.toUpperCase() !== attempt.kind) return false;
  if (!attempt.providerMessageId) return event.attemptId === attempt.id;
  return normalizeBrevoMessageId(event.messageId) === normalizeBrevoMessageId(attempt.providerMessageId);
}
