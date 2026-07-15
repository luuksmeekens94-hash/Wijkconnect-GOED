import { SurveyInvitationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const ACTIVE_CONTACT_STATUSES = [
  SurveyInvitationStatus.DRAFT,
  SurveyInvitationStatus.READY,
  SurveyInvitationStatus.SENT,
  SurveyInvitationStatus.OPENED,
];

export async function purgeExpiredSurveyContacts(limit = 500, now = new Date()) {
  const boundedLimit = Math.min(Math.max(limit, 1), 1_000);
  const candidates = await prisma.surveyRecipient.findMany({
    where: {
      emailEncrypted: { not: null },
      contactRetentionUntil: { lte: now },
      invitations: {
        none: {
          status: { in: ACTIVE_CONTACT_STATUSES },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      },
    },
    select: { id: true },
    orderBy: { contactRetentionUntil: "asc" },
    take: boundedLimit,
  });

  if (candidates.length === 0) return { selected: 0, purged: 0 };
  const ids = candidates.map((candidate) => candidate.id);
  const result = await prisma.surveyRecipient.updateMany({
    where: {
      id: { in: ids },
      emailEncrypted: { not: null },
      contactRetentionUntil: { lte: now },
    },
    data: { emailEncrypted: null, contactPurgedAt: now },
  });

  if (result.count > 0) {
    await prisma.auditLog.create({
      data: {
        action: "SURVEY_CONTACT_RETENTION_PURGE",
        entityType: "SURVEY_RECIPIENT_BATCH",
        entityId: now.toISOString().slice(0, 10),
        details: { purged: result.count },
      },
    });
  }
  return { selected: candidates.length, purged: result.count };
}
