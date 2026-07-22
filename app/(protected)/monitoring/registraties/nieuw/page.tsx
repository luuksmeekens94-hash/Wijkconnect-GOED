import { MonitoringRegistrationForm } from "@/components/monitoring-registration-form";
import { requireRole } from "@/lib/auth";
import { createMonitoringRegistration } from "@/lib/monitoring-actions";
import { formatDateInput } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";

export default async function NewMonitoringRegistrationPage() {
  await requireRole(["ADMIN"]);
  const referrals = await prisma.referral.findMany({
    where: { monitoringCase: null },
    select: { id: true, caseId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <MonitoringRegistrationForm
      action={createMonitoringRegistration}
      today={formatDateInput(new Date())}
      referrals={referrals.map((referral) => ({
        id: referral.id,
        caseId: referral.caseId,
        createdAt: new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(referral.createdAt),
      }))}
    />
  );
}
