import { MonitoringAppointmentStatus, MonitoringProgram } from "@prisma/client";
import { endOfDay, startOfDay, startOfYear } from "date-fns";
import { calculateMonitoringMetrics } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";

export function getMonitoringPeriod(from?: string, to?: string) {
  const parsedFrom = from ? new Date(`${from}T00:00:00.000Z`) : startOfYear(new Date());
  const parsedTo = to ? new Date(`${to}T23:59:59.999Z`) : endOfDay(new Date());
  return {
    from: Number.isNaN(parsedFrom.getTime()) ? startOfYear(new Date()) : startOfDay(parsedFrom),
    to: Number.isNaN(parsedTo.getTime()) ? endOfDay(new Date()) : parsedTo,
  };
}

export async function getMonitoringDashboardData(input: {
  from: Date;
  to: Date;
  program?: MonitoringProgram;
}) {
  const [appointments, cases, reviews, surveyCounts, openActivities] = await Promise.all([
    prisma.monitoringAppointment.findMany({
    where: {
      scheduledAt: { gte: input.from, lte: input.to },
      ...(input.program ? { case: { program: input.program } } : {}),
    },
    include: {
      case: {
        include: {
          participant: true,
          socialReasons: true,
        },
      },
    },
    orderBy: { scheduledAt: "desc" },
    }),
    prisma.monitoringCase.findMany({
      where: {
        referralDate: { gte: input.from, lte: input.to },
        ...(input.program ? { program: input.program } : {}),
      },
      select: { id: true, program: true, status: true, participantId: true },
    }),
    prisma.weeklyReview.findMany({
      where: {
        weekStart: { gte: input.from, lte: input.to },
        ...(input.program ? { program: input.program } : {}),
      },
      orderBy: { weekStart: "desc" },
    }),
    prisma.surveyInvitation.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.projectActivity.count({ where: { completed: false } }),
  ]);

  const availableSlots = reviews.filter((review) => review.clinicPlanned).reduce((sum, review) => sum + review.availableSlots, 0);
  const metrics = calculateMonitoringMetrics(
    appointments.map((appointment) => ({
      participantId: appointment.case.participantId,
      referralDate: appointment.case.referralDate,
      scheduledAt: appointment.scheduledAt,
      status: appointment.status,
      outcome: appointment.outcome,
      feedbackSentAt: appointment.feedbackSentAt,
      program: appointment.case.program,
    })),
    availableSlots,
  );

  const qualityIssues = appointments.flatMap((appointment) => {
    const issues: Array<{ severity: "blocking" | "warning"; label: string }> = [];
    if (appointment.scheduledAt < appointment.case.referralDate) issues.push({ severity: "blocking", label: "Afspraak ligt vóór verwijzingsdatum" });
    if (appointment.status === MonitoringAppointmentStatus.SCHEDULED && appointment.scheduledAt < new Date()) issues.push({ severity: "blocking", label: "Afgelopen afspraak staat nog op gepland" });
    if (appointment.status === MonitoringAppointmentStatus.ATTENDED && !appointment.outcome) issues.push({ severity: "blocking", label: "Verschenen consult zonder uitkomst" });
    if (!appointment.case.referralBasis) issues.push({ severity: "warning", label: "Basis voor inplanning ontbreekt" });
    if (appointment.status === MonitoringAppointmentStatus.ATTENDED && !appointment.feedbackSentAt) issues.push({ severity: "warning", label: "Terugkoppeling nog niet vastgelegd" });
    if (
      appointment.case.program === MonitoringProgram.SOCIAL &&
      appointment.status === MonitoringAppointmentStatus.NO_SHOW &&
      !appointment.reminderSentAt
    ) issues.push({ severity: "warning", label: "No-show zonder vastgelegde herinnering" });
    if (
      appointment.case.program === MonitoringProgram.SOCIAL &&
      appointment.scheduledAt.getTime() - appointment.case.referralDate.getTime() > 14 * 86_400_000
    ) issues.push({ severity: "warning", label: "Eerste contact later dan 14 dagen" });

    return issues.map((issue) => ({
      ...issue,
      appointmentId: appointment.id,
      caseId: appointment.caseId,
      participantCode: appointment.case.participant.pseudonymCode.slice(-8),
    }));
  });

  return { appointments, cases, reviews, metrics, qualityIssues, surveyCounts, openActivities };
}
