import { SurveyDeliveryStatus, SurveyInvitationStatus } from "@prisma/client";

export const RECOVER_QUEUED_AFTER_MINUTES = 2;
export const MANUAL_REMINDER_COOLDOWN_MINUTES = 5;

type ReminderEligibility = {
  status: SurveyInvitationStatus;
  deliveryStatus: SurveyDeliveryStatus;
  sentAt: Date | null;
  reminderSentAt: Date | null;
  lastDeliveryErrorCode: string | null;
  completedAt: Date | null;
  expiresAt: Date | null;
};

const reminderEligibleDeliveryStatuses = new Set<SurveyDeliveryStatus>([
  SurveyDeliveryStatus.SENT,
  SurveyDeliveryStatus.DELIVERED,
]);
const reminderEligibleInvitationStatuses = new Set<SurveyInvitationStatus>([
  SurveyInvitationStatus.SENT,
  SurveyInvitationStatus.OPENED,
]);

export function canSendManualSurveyReminder(invitation: ReminderEligibility, now = new Date()) {
  if (
    !invitation.sentAt ||
    invitation.completedAt ||
    invitation.status === SurveyInvitationStatus.COMPLETED ||
    (invitation.expiresAt && invitation.expiresAt <= now) ||
    !reminderEligibleInvitationStatuses.has(invitation.status) ||
    !reminderEligibleDeliveryStatuses.has(invitation.deliveryStatus)
  ) {
    return false;
  }
  if (!invitation.reminderSentAt) return true;

  const waitMinutes = ["REMINDER_QUEUED", "REMINDER_UNCERTAIN"].includes(invitation.lastDeliveryErrorCode ?? "")
    ? RECOVER_QUEUED_AFTER_MINUTES
    : MANUAL_REMINDER_COOLDOWN_MINUTES;
  return invitation.reminderSentAt <= new Date(now.getTime() - waitMinutes * 60 * 1000);
}
