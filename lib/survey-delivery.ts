import {
  SurveyDeliveryStatus,
  SurveyInvitationStatus,
} from "@prisma/client";
import { BrevoApiError, sendBrevoTransactionalEmail } from "@/lib/brevo";
import { decideBrevoWebhookTransition, normalizeBrevoMessageId, parseBrevoWebhookEvent, webhookEventKind, type BrevoWebhookEvent } from "@/lib/brevo-webhook";
import { prisma } from "@/lib/prisma";
import { buildSurveyEmail } from "@/lib/survey-email";
import { getPatientSurveyProgramContext } from "@/lib/survey-program-context";
import { decryptSurveyRecipientEmail, getSurveyAccessToken } from "@/lib/survey-security";

const RECOVER_QUEUED_AFTER_MINUTES = 15;
const reminderEligibleDeliveryStatuses = new Set<SurveyDeliveryStatus>([
  SurveyDeliveryStatus.SENT,
  SurveyDeliveryStatus.DELIVERED,
]);
const terminalDeliveryErrorCodes = ["hard_bounce", "invalid", "invalid_email", "spam", "unsubscribed"];

export type SurveyDeliveryResult = {
  outcome: "sent" | "already-sent" | "suppressed" | "not-eligible";
  invitationId: string;
};

function appUrl() {
  const configured = (process.env.APP_URL || process.env.NEXTAUTH_URL)?.trim();
  if (!configured) throw new Error("APP_URL ontbreekt in de serverconfiguratie");
  const url = new URL(configured);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("APP_URL moet in productie https gebruiken");
  }
  return url;
}

function publicSurveyUrl(invitationId: string) {
  return new URL(`/vragenlijst/${encodeURIComponent(getSurveyAccessToken(invitationId))}`, appUrl()).toString();
}

function safeDeliveryErrorCode(error: unknown) {
  if (error instanceof BrevoApiError) return error.code.slice(0, 120);
  if (error instanceof Error && error.message.startsWith("Ontbrekende serverconfiguratie:")) return "CONFIGURATION";
  return "DELIVERY_ERROR";
}

async function loadDeliverableInvitation(invitationId: string) {
  return prisma.surveyInvitation.findUnique({
    where: { id: invitationId },
    include: {
      recipient: true,
      template: { select: { audience: true } },
    },
  });
}

async function claimInitialDelivery(invitationId: string) {
  const recoverBefore = new Date(Date.now() - RECOVER_QUEUED_AFTER_MINUTES * 60 * 1000);
  const claim = await prisma.surveyInvitation.updateMany({
    where: {
      id: invitationId,
      status: SurveyInvitationStatus.READY,
      OR: [
        { deliveryStatus: { in: [SurveyDeliveryStatus.PENDING, SurveyDeliveryStatus.FAILED] } },
        { deliveryStatus: SurveyDeliveryStatus.QUEUED, updatedAt: { lte: recoverBefore } },
      ],
    },
    data: {
      deliveryStatus: SurveyDeliveryStatus.QUEUED,
      deliveryProvider: "brevo",
      sendAttempts: { increment: 1 },
      failedAt: null,
      lastDeliveryErrorCode: null,
    },
  });
  return claim.count === 1;
}

function staleReminderClaim(invitation: { reminderSentAt: Date | null; lastDeliveryErrorCode: string | null }) {
  if (!invitation.reminderSentAt || invitation.lastDeliveryErrorCode !== "REMINDER_QUEUED") return false;
  return invitation.reminderSentAt <= new Date(Date.now() - RECOVER_QUEUED_AFTER_MINUTES * 60 * 1000);
}

async function deliverSurveyEmail(invitationId: string, reminder: boolean, actorUserId?: string): Promise<SurveyDeliveryResult> {
  const invitation = await loadDeliverableInvitation(invitationId);
  if (!invitation || !invitation.recipient) return { outcome: "not-eligible", invitationId };
  if (invitation.status === SurveyInvitationStatus.COMPLETED || invitation.completedAt) {
    return { outcome: "not-eligible", invitationId };
  }
  if (invitation.expiresAt && invitation.expiresAt <= new Date()) {
    await prisma.surveyInvitation.update({
      where: { id: invitation.id },
      data: { status: SurveyInvitationStatus.EXPIRED },
    });
    return { outcome: "not-eligible", invitationId };
  }
  if (invitation.recipient.suppressedAt) {
    await prisma.surveyInvitation.update({
      where: { id: invitation.id },
      data: { deliveryStatus: SurveyDeliveryStatus.SUPPRESSED },
    });
    return { outcome: "suppressed", invitationId };
  }
  const encryptedRecipientEmail = invitation.recipient.emailEncrypted;
  if (!encryptedRecipientEmail) {
    return { outcome: "not-eligible", invitationId };
  }

  if (reminder) {
    if (
      (invitation.reminderSentAt && !staleReminderClaim(invitation)) ||
      !invitation.sentAt ||
      !reminderEligibleDeliveryStatuses.has(invitation.deliveryStatus)
    ) {
      return { outcome: "not-eligible", invitationId };
    }
    const claim = await prisma.surveyInvitation.updateMany({
      where: {
        id: invitation.id,
        completedAt: null,
        status: { in: [SurveyInvitationStatus.SENT, SurveyInvitationStatus.OPENED] },
        OR: [
          { reminderSentAt: null },
          {
            reminderSentAt: { lte: new Date(Date.now() - RECOVER_QUEUED_AFTER_MINUTES * 60 * 1000) },
            lastDeliveryErrorCode: "REMINDER_QUEUED",
          },
        ],
      },
      data: {
        reminderSentAt: new Date(),
        lastDeliveryErrorCode: "REMINDER_QUEUED",
        sendAttempts: { increment: 1 },
      },
    });
    if (claim.count !== 1) return { outcome: "already-sent", invitationId };
  } else if (!await claimInitialDelivery(invitation.id)) {
    return { outcome: "already-sent", invitationId };
  }

  try {
    const emailContent = buildSurveyEmail({
      surveyUrl: publicSurveyUrl(invitation.id),
      reminder,
      expiresAt: invitation.expiresAt,
      program: getPatientSurveyProgramContext(invitation.template.audience),
    });
    const result = await sendBrevoTransactionalEmail({
      to: { email: decryptSurveyRecipientEmail(encryptedRecipientEmail) },
      ...emailContent,
      idempotencyKey: `wijkconnect-survey-${invitation.id}-${reminder ? "reminder" : "invitation"}`,
      correlation: { invitationId: invitation.id, kind: reminder ? "reminder" : "invitation" },
      tags: ["wijkconnect-survey", reminder ? "survey-reminder" : "survey-invitation"],
    });

    const now = new Date();
    const persisted = await prisma.surveyInvitation.updateMany({
      where: {
        id: invitation.id,
        status: reminder
          ? { in: [SurveyInvitationStatus.SENT, SurveyInvitationStatus.OPENED] }
          : SurveyInvitationStatus.READY,
        deliveryStatus: { not: SurveyDeliveryStatus.SUPPRESSED },
        OR: [
          { lastDeliveryErrorCode: null },
          { lastDeliveryErrorCode: "REMINDER_QUEUED" },
          { lastDeliveryErrorCode: { notIn: terminalDeliveryErrorCodes } },
        ],
      },
      data: {
        ...(!reminder ? { status: SurveyInvitationStatus.SENT } : {}),
        deliveryStatus: SurveyDeliveryStatus.SENT,
        deliveryProvider: "brevo",
        ...(!reminder
          ? { initialProviderMessageId: result.messageId }
          : { reminderProviderMessageId: result.messageId }),
        providerMessageId: result.messageId,
        invitedAt: invitation.invitedAt ?? now,
        sentAt: invitation.sentAt ?? now,
        failedAt: null,
        lastDeliveryErrorCode: null,
      },
    });
    if (persisted.count !== 1) return { outcome: "suppressed", invitationId };
    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        action: reminder ? "SURVEY_REMINDER_SENT" : "SURVEY_INVITATION_SENT",
        entityType: "SURVEY_INVITATION",
        entityId: invitation.id,
        details: { provider: "brevo" },
      },
    });
    return { outcome: "sent", invitationId };
  } catch (error) {
    await prisma.surveyInvitation.update({
      where: { id: invitation.id },
      data: {
        ...(reminder
          ? { reminderSentAt: null }
          : { deliveryStatus: SurveyDeliveryStatus.FAILED }),
        failedAt: new Date(),
        lastDeliveryErrorCode: safeDeliveryErrorCode(error),
      },
    });
    throw error;
  }
}

export function sendSurveyInvitationEmail(invitationId: string, actorUserId?: string) {
  return deliverSurveyEmail(invitationId, false, actorUserId);
}

export function sendSurveyReminderEmail(invitationId: string) {
  return deliverSurveyEmail(invitationId, true);
}

function messageIdVariants(messageId: string | null) {
  if (!messageId) return [];
  const trimmed = normalizeBrevoMessageId(messageId);
  return Array.from(new Set([messageId, trimmed, `<${trimmed}>`]));
}

async function findWebhookInvitation(event: BrevoWebhookEvent) {
  if (!event.invitationId || !event.messageId) return null;
  const variants = messageIdVariants(event.messageId);
  const messageFilter = event.messageKind === "invitation"
    ? {
        OR: [
          { initialProviderMessageId: { in: variants } },
          { initialProviderMessageId: null, providerMessageId: { in: variants } },
        ],
      }
    : event.messageKind === "reminder"
      ? {
          OR: [
            { reminderProviderMessageId: { in: variants } },
            { reminderProviderMessageId: null, providerMessageId: { in: variants } },
          ],
        }
      : {
          OR: [
            { initialProviderMessageId: { in: variants } },
            { reminderProviderMessageId: { in: variants } },
            { providerMessageId: { in: variants } },
          ],
        };
  return prisma.surveyInvitation.findFirst({
    where: {
      id: event.invitationId,
      ...messageFilter,
    },
    include: { recipient: true },
  });
}

export async function applyBrevoWebhookPayload(payload: unknown) {
  const event = parseBrevoWebhookEvent(payload);
  if (!event) return "invalid" as const;
  const kind = webhookEventKind(event.event);
  if (kind === "ignored") return "ignored" as const;

  const invitation = await findWebhookInvitation(event);
  if (!invitation) return "not-found" as const;
  const transition = decideBrevoWebhookTransition(kind, event.event, invitation);
  if (transition === "ignored") return "ignored" as const;

  if (transition === "delivered") {
    await prisma.surveyInvitation.update({
      where: { id: invitation.id },
      data: {
        deliveryStatus: SurveyDeliveryStatus.DELIVERED,
        deliveredAt: invitation.deliveredAt ?? event.occurredAt,
        lastDeliveryErrorCode: null,
      },
    });
  } else if (transition === "transient-bounce") {
    await prisma.surveyInvitation.update({
      where: { id: invitation.id },
      data: {
        deliveryStatus: SurveyDeliveryStatus.BOUNCED,
        bouncedAt: event.occurredAt,
        lastDeliveryErrorCode: event.event.slice(0, 120),
      },
    });
  } else {
    await prisma.$transaction([
      prisma.surveyInvitation.update({
        where: { id: invitation.id },
        data: {
          deliveryStatus: transition === "complaint" ? SurveyDeliveryStatus.SUPPRESSED : SurveyDeliveryStatus.BOUNCED,
          bouncedAt: event.occurredAt,
          lastDeliveryErrorCode: event.event.slice(0, 120),
        },
      }),
      ...(invitation.recipient
        ? [prisma.surveyRecipient.update({
            where: { id: invitation.recipient.id },
            data: { suppressedAt: invitation.recipient.suppressedAt ?? event.occurredAt },
          })]
        : []),
    ]);
  }

  await prisma.auditLog.create({
    data: {
      action: `SURVEY_DELIVERY_${transition.toUpperCase()}`,
      entityType: "SURVEY_INVITATION",
      entityId: invitation.id,
      details: { provider: "brevo", event: event.event },
    },
  });
  return "updated" as const;
}

function reminderDelayDays() {
  const parsed = Number.parseInt(process.env.SURVEY_REMINDER_AFTER_DAYS || "4", 10);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 30 ? parsed : 4;
}

export async function sendDueSurveyReminders(limit = 50) {
  const now = new Date();
  const sentBefore = new Date(now.getTime() - reminderDelayDays() * 24 * 60 * 60 * 1000);
  const invitations = await prisma.surveyInvitation.findMany({
    where: {
      status: { in: [SurveyInvitationStatus.SENT, SurveyInvitationStatus.OPENED] },
      deliveryStatus: { in: [SurveyDeliveryStatus.SENT, SurveyDeliveryStatus.DELIVERED] },
      completedAt: null,
      sentAt: { lte: sentBefore },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      AND: [{
        OR: [
          { reminderSentAt: null },
          {
            reminderSentAt: { lte: new Date(now.getTime() - RECOVER_QUEUED_AFTER_MINUTES * 60 * 1000) },
            lastDeliveryErrorCode: "REMINDER_QUEUED",
          },
        ],
      }],
      recipient: { is: { suppressedAt: null, emailEncrypted: { not: null } } },
    },
    select: { id: true },
    orderBy: { sentAt: "asc" },
    take: Math.min(Math.max(limit, 1), 100),
  });

  const summary = { selected: invitations.length, sent: 0, skipped: 0, failed: 0 };
  for (const invitation of invitations) {
    try {
      const result = await sendSurveyReminderEmail(invitation.id);
      if (result.outcome === "sent") summary.sent += 1;
      else summary.skipped += 1;
    } catch {
      summary.failed += 1;
    }
  }
  return summary;
}
