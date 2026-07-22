import { prisma } from "@/lib/prisma";

export function monitoringContactRetentionUntil(now = new Date()) {
  const configured = Number.parseInt(process.env.MONITORING_CONTACT_RETENTION_DAYS || "365", 10);
  const days = Number.isFinite(configured) && configured >= 30 && configured <= 730 ? configured : 365;
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function purgeExpiredMonitoringParticipantContacts(now = new Date()) {
  const result = await prisma.monitoringParticipant.updateMany({
    where: {
      contactRetentionUntil: { lte: now },
      OR: [
        { displayNameEncrypted: { not: null } },
        { emailEncrypted: { not: null } },
      ],
    },
    data: {
      displayNameEncrypted: null,
      emailEncrypted: null,
      contactPurgedAt: now,
    },
  });

  return { purged: result.count };
}
