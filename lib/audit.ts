import { prisma } from "@/lib/prisma";

export async function writeAuditLog(input: {
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      details: input.details as object | undefined,
    },
  });
}
