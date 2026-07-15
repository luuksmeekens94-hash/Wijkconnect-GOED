import { SurveyInvitationStatus } from "@prisma/client";

export type SurveyAccessRecord = {
  status: SurveyInvitationStatus;
  expiresAt: Date | null;
  hasResponse: boolean;
};

export function evaluateSurveyAccess(record: SurveyAccessRecord, now = new Date()) {
  if (record.hasResponse || record.status === SurveyInvitationStatus.COMPLETED) return "completed" as const;
  if (record.status === SurveyInvitationStatus.EXPIRED || (record.expiresAt && record.expiresAt <= now)) {
    return "expired" as const;
  }
  if (
    record.status === SurveyInvitationStatus.READY ||
    record.status === SurveyInvitationStatus.SENT ||
    record.status === SurveyInvitationStatus.OPENED
  ) {
    return "available" as const;
  }
  return "unavailable" as const;
}
