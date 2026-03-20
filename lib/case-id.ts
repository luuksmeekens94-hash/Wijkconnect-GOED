import { prisma } from "@/lib/prisma";

export async function generateCaseId() {
  const year = new Date().getFullYear();

  const counter = await prisma.caseCounter.upsert({
    where: { year },
    update: { value: { increment: 1 } },
    create: { year, value: 1 },
  });

  return `WC-${year}-${String(counter.value).padStart(4, "0")}`;
}
