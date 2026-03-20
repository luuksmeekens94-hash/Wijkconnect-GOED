import { prisma } from "@/lib/prisma";

export async function createNotification(input: {
  userId: string;
  referralId?: string;
  title: string;
  message: string;
}) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      referralId: input.referralId,
      title: input.title,
      message: input.message,
    },
  });
}
