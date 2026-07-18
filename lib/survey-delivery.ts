import { randomUUID } from "node:crypto";
import {
  Prisma,
  SurveyDeliveryAttemptKind,
  SurveyDeliveryAttemptStatus,
  SurveyDeliveryStatus,
  SurveyInvitationStatus,
} from "@prisma/client";
import { BrevoApiError, sendBrevoTransactionalEmail } from "@/lib/brevo";
import {
  brevoDeliveryAttemptCorrelationMatches,
  decideBrevoWebhookTransition,
  normalizeBrevoMessageId,
  parseBrevoWebhookEvent,
  webhookEventKind,
  type BrevoWebhookEvent,
} from "@/lib/brevo-webhook";
import { prisma } from "@/lib/prisma";
import { buildSurveyEmail, surveyEmailUsesReminderCopy } from "@/lib/survey-email";
import {
  brevoFailureIsUncertain,
  SURVEY_DELIVERY_PROVIDER,
  surveyDeliveryAttemptIdempotencyKey,
} from "@/lib/survey-delivery-attempt";
import { getSurveyEmailAudienceContext } from "@/lib/survey-program-context";
import {
  canSendManualSurveyReminder,
  MANUAL_REMINDER_COOLDOWN_MINUTES,
  RECOVER_QUEUED_AFTER_MINUTES,
} from "@/lib/survey-reminder-policy";
import { decryptSurveyRecipientEmail, getSurveyAccessToken } from "@/lib/survey-security";

const ATTEMPT_RETRY_WINDOW_MINUTES = 10;
const reminderEligibleDeliveryStatuses = new Set<SurveyDeliveryStatus>([
  SurveyDeliveryStatus.SENT,
  SurveyDeliveryStatus.DELIVERED,
]);
const reminderEligibleInvitationStatuses = new Set<SurveyInvitationStatus>([
  SurveyInvitationStatus.SENT,
  SurveyInvitationStatus.OPENED,
]);
const terminalDeliveryErrorCodes = ["hard_bounce", "invalid", "invalid_email", "spam", "unsubscribed"];

export type SurveyDeliveryResult = {
  outcome: "sent" | "already-sent" | "suppressed" | "not-eligible";
  invitationId: string;
};

type SurveyDeliveryMode = "initial" | "scheduled-reminder" | "manual-reminder";

class DeliveryClaimConflict extends Error {}

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

function uncertainProviderOutcome(error: unknown) {
  if (error instanceof BrevoApiError) {
    return brevoFailureIsUncertain(error.status, error.code);
  }
  if (error instanceof Error && (
    error.message.startsWith("Ontbrekende serverconfiguratie:") ||
    error.message.startsWith("APP_URL")
  )) return false;
  return true;
}

function addMinutes(value: Date, minutes: number) {
  return new Date(value.getTime() + minutes * 60 * 1000);
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

function retryCutoffForAttempt(
  attempt: { status: SurveyDeliveryAttemptStatus; lastAttemptedAt: Date; retryUntil: Date | null },
  mode: SurveyDeliveryMode,
  now: Date,
) {
  if (attempt.status === SurveyDeliveryAttemptStatus.SENT) return null;
  if (
    (attempt.status === SurveyDeliveryAttemptStatus.QUEUED || attempt.status === SurveyDeliveryAttemptStatus.UNCERTAIN) &&
    (!attempt.retryUntil || attempt.retryUntil < now)
  ) return null;

  const waitMinutes = attempt.status === SurveyDeliveryAttemptStatus.FAILED
    ? mode === "manual-reminder" ? MANUAL_REMINDER_COOLDOWN_MINUTES : 0
    : RECOVER_QUEUED_AFTER_MINUTES;
  return new Date(now.getTime() - waitMinutes * 60 * 1000);
}

async function reclaimAttempt(
  attempt: {
    id: string;
    invitationId: string;
    status: SurveyDeliveryAttemptStatus;
    lastAttemptedAt: Date;
    retryUntil: Date | null;
  },
  mode: SurveyDeliveryMode,
  now: Date,
) {
  const cutoff = retryCutoffForAttempt(attempt, mode, now);
  if (!cutoff || attempt.lastAttemptedAt > cutoff) return null;
  const reminder = mode !== "initial";

  try {
    return await prisma.$transaction(async (transaction) => {
      const attemptClaim = await transaction.surveyDeliveryAttempt.updateMany({
        where: {
          id: attempt.id,
          invitationId: attempt.invitationId,
          lastAttemptedAt: { lte: cutoff },
          OR: [
            { status: SurveyDeliveryAttemptStatus.FAILED },
            {
              status: { in: [SurveyDeliveryAttemptStatus.QUEUED, SurveyDeliveryAttemptStatus.UNCERTAIN] },
              retryUntil: { gte: now },
            },
          ],
        },
        data: {
          status: SurveyDeliveryAttemptStatus.QUEUED,
          tryCount: { increment: 1 },
          lastAttemptedAt: now,
          failedAt: null,
          lastErrorCode: null,
        },
      });
      if (attemptClaim.count !== 1) throw new DeliveryClaimConflict();

      const invitationClaim = await transaction.surveyInvitation.updateMany({
        where: reminder
          ? {
              id: attempt.invitationId,
              status: { in: [SurveyInvitationStatus.SENT, SurveyInvitationStatus.OPENED] },
              deliveryStatus: { in: [SurveyDeliveryStatus.SENT, SurveyDeliveryStatus.DELIVERED] },
              completedAt: null,
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            }
          : {
              id: attempt.invitationId,
              status: SurveyInvitationStatus.READY,
              deliveryStatus: { in: [SurveyDeliveryStatus.QUEUED, SurveyDeliveryStatus.FAILED] },
            },
        data: reminder
          ? { reminderSentAt: now, lastDeliveryErrorCode: "REMINDER_QUEUED" }
          : {
              deliveryStatus: SurveyDeliveryStatus.QUEUED,
              deliveryProvider: SURVEY_DELIVERY_PROVIDER,
              failedAt: null,
              lastDeliveryErrorCode: null,
            },
      });
      if (invitationClaim.count !== 1) throw new DeliveryClaimConflict();
      return transaction.surveyDeliveryAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
    });
  } catch (error) {
    if (error instanceof DeliveryClaimConflict) return null;
    throw error;
  }
}

async function createInitialAttempt(invitationId: string, now: Date) {
  const attemptId = randomUUID();
  try {
    return await prisma.$transaction(async (transaction) => {
      const invitationClaim = await transaction.surveyInvitation.updateMany({
        where: {
          id: invitationId,
          status: SurveyInvitationStatus.READY,
          OR: [
            { deliveryStatus: { in: [SurveyDeliveryStatus.PENDING, SurveyDeliveryStatus.FAILED] } },
            {
              deliveryStatus: SurveyDeliveryStatus.QUEUED,
              updatedAt: { lte: new Date(now.getTime() - RECOVER_QUEUED_AFTER_MINUTES * 60 * 1000) },
            },
          ],
        },
        data: {
          deliveryStatus: SurveyDeliveryStatus.QUEUED,
          deliveryProvider: SURVEY_DELIVERY_PROVIDER,
          sendAttempts: { increment: 1 },
          failedAt: null,
          lastDeliveryErrorCode: null,
        },
      });
      if (invitationClaim.count !== 1) throw new DeliveryClaimConflict();
      return transaction.surveyDeliveryAttempt.create({
        data: {
          id: attemptId,
          invitationId,
          kind: SurveyDeliveryAttemptKind.INVITATION,
          mode: "initial",
          idempotencyKey: surveyDeliveryAttemptIdempotencyKey(attemptId),
          retryUntil: addMinutes(now, ATTEMPT_RETRY_WINDOW_MINUTES),
          lastAttemptedAt: now,
        },
      });
    });
  } catch (error) {
    if (
      error instanceof DeliveryClaimConflict ||
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
    ) return null;
    throw error;
  }
}

async function claimInitialAttempt(invitationId: string, now: Date) {
  const latest = await prisma.surveyDeliveryAttempt.findFirst({
    where: { invitationId, kind: SurveyDeliveryAttemptKind.INVITATION },
    orderBy: { createdAt: "desc" },
  });
  if (latest) return reclaimAttempt(latest, "initial", now);
  return createInitialAttempt(invitationId, now);
}

async function createReminderAttempt(
  invitation: {
    id: string;
    reminderSentAt: Date | null;
    reminderProviderMessageId: string | null;
    lastDeliveryErrorCode: string | null;
  },
  mode: Exclude<SurveyDeliveryMode, "initial">,
  now: Date,
) {
  if (mode === "scheduled-reminder" && invitation.reminderSentAt) return null;
  if (
    !invitation.reminderProviderMessageId &&
    invitation.reminderSentAt &&
    invitation.lastDeliveryErrorCode &&
    invitation.lastDeliveryErrorCode !== "REMINDER_QUEUED"
  ) return null;

  const attemptId = randomUUID();
  const manualBefore = new Date(now.getTime() - MANUAL_REMINDER_COOLDOWN_MINUTES * 60 * 1000);
  const recoverBefore = new Date(now.getTime() - RECOVER_QUEUED_AFTER_MINUTES * 60 * 1000);
  const claimConditions = mode === "manual-reminder"
    ? [
        { reminderSentAt: null },
        { reminderSentAt: { lte: manualBefore }, lastDeliveryErrorCode: null },
        { reminderSentAt: { lte: recoverBefore }, lastDeliveryErrorCode: "REMINDER_QUEUED" },
        { reminderSentAt: { lte: recoverBefore }, lastDeliveryErrorCode: "REMINDER_UNCERTAIN" },
      ]
    : [
        { reminderSentAt: null },
        { reminderSentAt: { lte: recoverBefore }, lastDeliveryErrorCode: { not: null } },
      ];

  try {
    return await prisma.$transaction(async (transaction) => {
      const invitationClaim = await transaction.surveyInvitation.updateMany({
        where: {
          id: invitation.id,
          completedAt: null,
          status: { in: [SurveyInvitationStatus.SENT, SurveyInvitationStatus.OPENED] },
          deliveryStatus: { in: [SurveyDeliveryStatus.SENT, SurveyDeliveryStatus.DELIVERED] },
          AND: [
            { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            { OR: claimConditions },
          ],
        },
        data: {
          reminderSentAt: now,
          lastDeliveryErrorCode: "REMINDER_QUEUED",
          sendAttempts: { increment: 1 },
        },
      });
      if (invitationClaim.count !== 1) throw new DeliveryClaimConflict();
      return transaction.surveyDeliveryAttempt.create({
        data: {
          id: attemptId,
          invitationId: invitation.id,
          kind: SurveyDeliveryAttemptKind.REMINDER,
          mode,
          idempotencyKey: surveyDeliveryAttemptIdempotencyKey(attemptId),
          retryUntil: addMinutes(now, ATTEMPT_RETRY_WINDOW_MINUTES),
          lastAttemptedAt: now,
        },
      });
    });
  } catch (error) {
    if (
      error instanceof DeliveryClaimConflict ||
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
    ) return null;
    throw error;
  }
}

async function claimReminderAttempt(
  invitation: {
    id: string;
    reminderSentAt: Date | null;
    reminderProviderMessageId: string | null;
    lastDeliveryErrorCode: string | null;
  },
  mode: Exclude<SurveyDeliveryMode, "initial">,
  now: Date,
) {
  const latest = await prisma.surveyDeliveryAttempt.findFirst({
    where: { invitationId: invitation.id, kind: SurveyDeliveryAttemptKind.REMINDER },
    orderBy: { createdAt: "desc" },
  });
  if (latest && latest.status !== SurveyDeliveryAttemptStatus.SENT) {
    return reclaimAttempt(latest, mode, now);
  }
  if (latest?.status === SurveyDeliveryAttemptStatus.SENT) {
    if (mode === "scheduled-reminder") return null;
    const acceptedAt = latest.sentAt ?? latest.lastAttemptedAt;
    if (acceptedAt > new Date(now.getTime() - MANUAL_REMINDER_COOLDOWN_MINUTES * 60 * 1000)) return null;
  }
  return createReminderAttempt(invitation, mode, now);
}

async function markAttemptFailed(
  invitationId: string,
  attemptId: string,
  reminder: boolean,
  error: unknown,
) {
  const now = new Date();
  const errorCode = safeDeliveryErrorCode(error);
  const status = uncertainProviderOutcome(error)
    ? SurveyDeliveryAttemptStatus.UNCERTAIN
    : SurveyDeliveryAttemptStatus.FAILED;

  await prisma.$transaction(async (transaction) => {
    const changed = await transaction.surveyDeliveryAttempt.updateMany({
      where: { id: attemptId, providerMessageId: null, status: SurveyDeliveryAttemptStatus.QUEUED },
      data: { status, failedAt: now, lastErrorCode: errorCode },
    });
    if (changed.count !== 1) return;
    await transaction.surveyInvitation.updateMany({
      where: reminder
        ? { id: invitationId, lastDeliveryErrorCode: "REMINDER_QUEUED" }
        : { id: invitationId, deliveryStatus: SurveyDeliveryStatus.QUEUED },
      data: reminder
        ? {
            failedAt: now,
            lastDeliveryErrorCode: status === SurveyDeliveryAttemptStatus.UNCERTAIN
              ? "REMINDER_UNCERTAIN"
              : errorCode,
          }
        : {
            deliveryStatus: SurveyDeliveryStatus.FAILED,
            failedAt: now,
            lastDeliveryErrorCode: errorCode,
          },
    });
  });
}

async function stopAttemptBeforeSending(attemptId: string, errorCode: string) {
  await prisma.surveyDeliveryAttempt.updateMany({
    where: { id: attemptId, status: SurveyDeliveryAttemptStatus.QUEUED, providerMessageId: null },
    data: {
      status: SurveyDeliveryAttemptStatus.FAILED,
      failedAt: new Date(),
      lastErrorCode: errorCode,
    },
  });
}

async function deliverSurveyEmail(
  invitationId: string,
  mode: SurveyDeliveryMode,
  actorUserId?: string,
): Promise<SurveyDeliveryResult> {
  const reminder = mode !== "initial";
  const manualReminder = mode === "manual-reminder";
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
  if (!invitation.recipient.emailEncrypted) return { outcome: "not-eligible", invitationId };

  if (reminder && (
    (manualReminder && !canSendManualSurveyReminder(invitation)) ||
    !invitation.sentAt ||
    !reminderEligibleDeliveryStatuses.has(invitation.deliveryStatus)
  )) return { outcome: "not-eligible", invitationId };

  const now = new Date();
  const attempt = reminder
    ? await claimReminderAttempt(invitation, mode as Exclude<SurveyDeliveryMode, "initial">, now)
    : await claimInitialAttempt(invitation.id, now);
  if (!attempt) return { outcome: "already-sent", invitationId };

  const current = await loadDeliverableInvitation(invitation.id);
  if (!current?.recipient?.emailEncrypted) {
    await stopAttemptBeforeSending(attempt.id, "RECIPIENT_UNAVAILABLE");
    return { outcome: "not-eligible", invitationId };
  }
  const currentStatusEligible = reminder
    ? reminderEligibleInvitationStatuses.has(current.status)
    : current.status === SurveyInvitationStatus.READY;
  if (
    !currentStatusEligible ||
    current.completedAt ||
    (current.expiresAt && current.expiresAt <= new Date())
  ) {
    await stopAttemptBeforeSending(attempt.id, "INVITATION_NOT_ELIGIBLE");
    return { outcome: "not-eligible", invitationId };
  }
  if (current.recipient.suppressedAt) {
    await stopAttemptBeforeSending(attempt.id, "RECIPIENT_SUPPRESSED");
    await prisma.surveyInvitation.update({
      where: { id: invitation.id },
      data: { deliveryStatus: SurveyDeliveryStatus.SUPPRESSED },
    });
    return { outcome: "suppressed", invitationId };
  }

  let deliveryOutcome: SurveyDeliveryResult["outcome"] = "sent";
  try {
    const emailContent = buildSurveyEmail({
      surveyUrl: publicSurveyUrl(current.id),
      // Retries must preserve the copy attached to the persisted idempotent attempt,
      // even when another caller (cron or a manual action) reclaims that attempt.
      reminder: surveyEmailUsesReminderCopy(attempt.mode),
      expiresAt: current.expiresAt,
      audience: getSurveyEmailAudienceContext(current.template.audience),
    });
    const result = await sendBrevoTransactionalEmail({
      to: { email: decryptSurveyRecipientEmail(current.recipient.emailEncrypted) },
      ...emailContent,
      idempotencyKey: attempt.idempotencyKey,
      correlation: {
        invitationId: current.id,
        attemptId: attempt.id,
        kind: reminder ? "reminder" : "invitation",
      },
      tags: ["wijkconnect-survey", reminder ? "survey-reminder" : "survey-invitation"],
    });
    const providerMessageId = normalizeBrevoMessageId(result.messageId);

    const acceptedAt = new Date();
    const persisted = await prisma.$transaction(async (transaction) => {
      const attemptPersisted = await transaction.surveyDeliveryAttempt.updateMany({
        where: {
          id: attempt.id,
          status: { in: [SurveyDeliveryAttemptStatus.QUEUED, SurveyDeliveryAttemptStatus.UNCERTAIN] },
          providerMessageId: null,
        },
        data: {
          status: SurveyDeliveryAttemptStatus.SENT,
          providerMessageId,
          sentAt: acceptedAt,
          failedAt: null,
          lastErrorCode: null,
        },
      });

      if (attemptPersisted.count === 0) {
        const storedAttempt = await transaction.surveyDeliveryAttempt.findUnique({
          where: { id: attempt.id },
          select: { status: true, providerMessageId: true },
        });
        if (
          storedAttempt?.status !== SurveyDeliveryAttemptStatus.SENT ||
          !storedAttempt.providerMessageId ||
          normalizeBrevoMessageId(storedAttempt.providerMessageId) !== providerMessageId
        ) throw new Error("DELIVERY_ATTEMPT_STATE_CONFLICT");
        return { webhookWon: true, invitationUpdated: false };
      }

      const invitationPersisted = await transaction.surveyInvitation.updateMany({
        where: {
          id: current.id,
          status: reminder
            ? { in: [SurveyInvitationStatus.SENT, SurveyInvitationStatus.OPENED] }
            : SurveyInvitationStatus.READY,
          completedAt: null,
          deliveryStatus: { not: SurveyDeliveryStatus.SUPPRESSED },
          AND: [
            { OR: [{ expiresAt: null }, { expiresAt: { gt: acceptedAt } }] },
            {
              OR: [
                { lastDeliveryErrorCode: null },
                { lastDeliveryErrorCode: "REMINDER_QUEUED" },
                { lastDeliveryErrorCode: "REMINDER_UNCERTAIN" },
                { lastDeliveryErrorCode: { notIn: terminalDeliveryErrorCodes } },
              ],
            },
          ],
        },
        data: {
          ...(!reminder ? { status: SurveyInvitationStatus.SENT } : {}),
          deliveryStatus: SurveyDeliveryStatus.SENT,
          deliveryProvider: SURVEY_DELIVERY_PROVIDER,
          ...(!reminder
            ? { initialProviderMessageId: providerMessageId }
            : { reminderProviderMessageId: providerMessageId, reminderSentAt: acceptedAt }),
          providerMessageId,
          invitedAt: current.invitedAt ?? acceptedAt,
          sentAt: current.sentAt ?? acceptedAt,
          failedAt: null,
          lastDeliveryErrorCode: null,
        },
      });
      return { webhookWon: false, invitationUpdated: invitationPersisted.count === 1 };
    });
    if (!persisted.invitationUpdated) {
      const latest = await loadDeliverableInvitation(current.id);
      if (latest?.recipient?.suppressedAt || latest?.deliveryStatus === SurveyDeliveryStatus.SUPPRESSED) {
        deliveryOutcome = "suppressed";
      } else if (
        latest?.completedAt ||
        latest?.status === SurveyInvitationStatus.COMPLETED ||
        latest?.status === SurveyInvitationStatus.CANCELLED ||
        latest?.status === SurveyInvitationStatus.EXPIRED ||
        (latest?.expiresAt && latest.expiresAt <= new Date())
      ) {
        deliveryOutcome = "not-eligible";
      }
    }
  } catch (error) {
    try {
      await markAttemptFailed(invitation.id, attempt.id, reminder, error);
    } catch (persistenceError) {
      console.error("Survey delivery attempt state could not be persisted", {
        invitationId,
        attemptId: attempt.id,
        errorName: persistenceError instanceof Error ? persistenceError.name : "unknown",
      });
    }
    throw error;
  }

  try {
    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        action: reminder ? "SURVEY_REMINDER_SENT" : "SURVEY_INVITATION_SENT",
        entityType: "SURVEY_INVITATION",
        entityId: invitation.id,
        details: {
          provider: SURVEY_DELIVERY_PROVIDER,
          mode: attempt.mode,
          requestedMode: mode,
          attemptId: attempt.id,
          outcome: deliveryOutcome,
        },
      },
    });
  } catch (error) {
    console.error("Survey delivery audit could not be persisted", {
      invitationId,
      attemptId: attempt.id,
      errorName: error instanceof Error ? error.name : "unknown",
    });
  }
  return { outcome: deliveryOutcome, invitationId };
}

export function sendSurveyInvitationEmail(invitationId: string, actorUserId?: string) {
  return deliverSurveyEmail(invitationId, "initial", actorUserId);
}

export function sendSurveyReminderEmail(invitationId: string) {
  return deliverSurveyEmail(invitationId, "scheduled-reminder");
}

export function sendManualSurveyReminderEmail(invitationId: string, actorUserId: string) {
  return deliverSurveyEmail(invitationId, "manual-reminder", actorUserId);
}

function messageIdVariants(messageId: string | null) {
  if (!messageId) return [];
  const trimmed = normalizeBrevoMessageId(messageId);
  return Array.from(new Set([messageId, trimmed, `<${trimmed}>`]));
}

async function findWebhookDelivery(event: BrevoWebhookEvent) {
  if (!event.invitationId || !event.messageId) return null;
  const variants = messageIdVariants(event.messageId);
  const attemptKind = event.messageKind === "invitation"
    ? SurveyDeliveryAttemptKind.INVITATION
    : event.messageKind === "reminder"
      ? SurveyDeliveryAttemptKind.REMINDER
      : undefined;

  const attempt = await prisma.surveyDeliveryAttempt.findFirst({
    where: {
      invitationId: event.invitationId,
      ...(event.attemptId ? { id: event.attemptId } : {}),
      ...(attemptKind ? { kind: attemptKind } : {}),
      OR: event.attemptId
        ? [{ providerMessageId: null }, { providerMessageId: { in: variants } }]
        : [{ providerMessageId: { in: variants } }],
    },
    include: { invitation: { include: { recipient: true } } },
  });
  if (attempt && brevoDeliveryAttemptCorrelationMatches(event, attempt)) {
    const latestAttempt = await prisma.surveyDeliveryAttempt.findFirst({
      where: { invitationId: event.invitationId },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });
    return {
      invitation: attempt.invitation,
      attempt,
      isLatestAttempt: latestAttempt?.id === attempt.id,
    };
  }

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
  const invitation = await prisma.surveyInvitation.findFirst({
    where: { id: event.invitationId, ...messageFilter },
    include: { recipient: true },
  });
  return invitation ? { invitation, attempt: null, isLatestAttempt: true } : null;
}

export async function applyBrevoWebhookPayload(payload: unknown) {
  const event = parseBrevoWebhookEvent(payload);
  if (!event) return "invalid" as const;
  const kind = webhookEventKind(event.event);
  if (kind === "ignored") return "ignored" as const;

  const delivery = await findWebhookDelivery(event);
  if (!delivery) return "not-found" as const;
  const { invitation, attempt } = delivery;
  const transition = decideBrevoWebhookTransition(kind, event.event, invitation);
  if (transition === "ignored") return "ignored" as const;
  const normalizedMessageId = normalizeBrevoMessageId(event.messageId!);
  const updateInvitationSummary = delivery.isLatestAttempt ||
    transition === "complaint" ||
    transition === "permanent-bounce";

  await prisma.$transaction(async (transaction) => {
    if (attempt) {
      await transaction.surveyDeliveryAttempt.update({
        where: { id: attempt.id },
        data: {
          status: SurveyDeliveryAttemptStatus.SENT,
          providerMessageId: attempt.providerMessageId ?? normalizedMessageId,
          sentAt: attempt.sentAt ?? event.occurredAt,
          failedAt: null,
          lastErrorCode: transition === "delivered" ? null : event.event.slice(0, 120),
        },
      });
    }

    if (!updateInvitationSummary) return;

    if (transition === "delivered") {
      await transaction.surveyInvitation.updateMany({
        where: {
          id: invitation.id,
          deliveryStatus: { not: SurveyDeliveryStatus.SUPPRESSED },
          ...(invitation.status === SurveyInvitationStatus.READY
            ? { status: SurveyInvitationStatus.READY, completedAt: null }
            : {}),
          AND: [{
            OR: [
              { lastDeliveryErrorCode: null },
              { lastDeliveryErrorCode: { notIn: terminalDeliveryErrorCodes } },
            ],
          }],
        },
        data: {
          ...(invitation.status === SurveyInvitationStatus.READY
            ? { status: SurveyInvitationStatus.SENT }
            : {}),
          deliveryStatus: SurveyDeliveryStatus.DELIVERED,
          deliveredAt: invitation.deliveredAt ?? event.occurredAt,
          invitedAt: invitation.invitedAt ?? event.occurredAt,
          sentAt: invitation.sentAt ?? event.occurredAt,
          providerMessageId: normalizedMessageId,
          lastDeliveryErrorCode: null,
        },
      });
    } else if (transition === "transient-bounce") {
      await transaction.surveyInvitation.updateMany({
        where: {
          id: invitation.id,
          deliveryStatus: { notIn: [SurveyDeliveryStatus.DELIVERED, SurveyDeliveryStatus.SUPPRESSED] },
          AND: [{
            OR: [
              { lastDeliveryErrorCode: null },
              { lastDeliveryErrorCode: { notIn: terminalDeliveryErrorCodes } },
            ],
          }],
        },
        data: {
          deliveryStatus: SurveyDeliveryStatus.BOUNCED,
          bouncedAt: event.occurredAt,
          lastDeliveryErrorCode: event.event.slice(0, 120),
        },
      });
    } else {
      await transaction.surveyInvitation.updateMany({
        where: {
          id: invitation.id,
          ...(transition === "complaint"
            ? {}
            : { deliveryStatus: { not: SurveyDeliveryStatus.SUPPRESSED } }),
        },
        data: {
          deliveryStatus: transition === "complaint" ? SurveyDeliveryStatus.SUPPRESSED : SurveyDeliveryStatus.BOUNCED,
          bouncedAt: event.occurredAt,
          lastDeliveryErrorCode: event.event.slice(0, 120),
        },
      });
      if (invitation.recipient) {
        await transaction.surveyRecipient.update({
          where: { id: invitation.recipient.id },
          data: { suppressedAt: invitation.recipient.suppressedAt ?? event.occurredAt },
        });
      }
    }
  });

  await prisma.auditLog.create({
    data: {
      action: `SURVEY_DELIVERY_${transition.toUpperCase()}`,
      entityType: "SURVEY_INVITATION",
      entityId: invitation.id,
      details: {
        provider: SURVEY_DELIVERY_PROVIDER,
        event: event.event,
        attemptId: attempt?.id,
        invitationSummaryUpdated: updateInvitationSummary,
      },
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
  const recoverBefore = new Date(now.getTime() - RECOVER_QUEUED_AFTER_MINUTES * 60 * 1000);
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
          { reminderSentAt: { lte: recoverBefore }, lastDeliveryErrorCode: { not: null } },
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
