import type { NextRequest } from "next/server";
import { MonitoringProgram } from "@prisma/client";
import { auth } from "@/lib/auth";
import { toCsv } from "@/lib/export";
import {
  getOptionLabel,
  monitoringAppointmentStatusOptions,
  monitoringFeedbackChannelOptions,
  monitoringOutcomeOptions,
  monitoringProgramOptions,
  monitoringReferralBasisOptions,
  monitoringReferralSourceOptions,
  monitoringSocialReasonOptions,
} from "@/lib/monitoring";
import { getMonitoringPeriod } from "@/lib/monitoring-queries";
import { prisma } from "@/lib/prisma";
import { patientJourneyDisciplineLabel, patientJourneyOutcomeLabel } from "@/lib/patient-journey";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return new Response("Niet ingelogd", { status: 401 });
  if (session.user.role !== "ADMIN") return new Response("Geen toegang", { status: 403 });

  const from = request.nextUrl.searchParams.get("from") ?? undefined;
  const to = request.nextUrl.searchParams.get("to") ?? undefined;
  const requestedProgram = request.nextUrl.searchParams.get("program");
  const program = Object.values(MonitoringProgram).includes(requestedProgram as MonitoringProgram) ? requestedProgram as MonitoringProgram : undefined;
  const period = getMonitoringPeriod(from, to);
  const cases = await prisma.monitoringCase.findMany({
    where: { referralDate: { gte: period.from, lte: period.to }, ...(program ? { program } : {}) },
    include: {
      participant: true,
      socialReasons: true,
      sourceReferral: { select: { caseId: true } },
      appointments: { orderBy: { scheduledAt: "asc" } },
      patientJourneyUpdates: {
        include: { recordedBy: { select: { organization: true, role: true } } },
        orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: { referralDate: "asc" },
  });

  const rows: Array<Record<string, string | number | boolean | Date | null | undefined>> = [];
  for (const monitoringCase of cases) {
    const base = {
      patient_code_hash: monitoringCase.participant.pseudonymCode,
      program: getOptionLabel(monitoringProgramOptions, monitoringCase.program),
      source_referral: monitoringCase.sourceReferral?.caseId ?? "",
      referral_date: monitoringCase.referralDate,
      referral_source: getOptionLabel(monitoringReferralSourceOptions, monitoringCase.referralSource),
      referral_basis: getOptionLabel(monitoringReferralBasisOptions, monitoringCase.referralBasis),
      complaint_category: monitoringCase.complaintCategory ?? "",
      social_reasons: monitoringCase.socialReasons.map((item) => getOptionLabel(monitoringSocialReasonOptions, item.reason)).join(" | "),
      assigned_organization: monitoringCase.assignedOrganization ?? "",
      assigned_professional: monitoringCase.assignedProfessional ?? "",
      case_status: monitoringCase.status,
      journey_update_count: monitoringCase.patientJourneyUpdates.length,
      journey_last_date: monitoringCase.patientJourneyUpdates.at(-1)?.occurredAt ?? "",
      journey_last_discipline: monitoringCase.patientJourneyUpdates.at(-1)
        ? patientJourneyDisciplineLabel(monitoringCase.patientJourneyUpdates.at(-1)!.discipline)
        : "",
      journey_last_outcome: monitoringCase.patientJourneyUpdates.at(-1)
        ? patientJourneyOutcomeLabel(monitoringCase.patientJourneyUpdates.at(-1)!.outcome)
        : "",
      journey_last_destination: monitoringCase.patientJourneyUpdates.at(-1)?.destination ?? "",
      journey_history: monitoringCase.patientJourneyUpdates.map((update) => [
        update.occurredAt.toISOString().slice(0, 10),
        patientJourneyDisciplineLabel(update.discipline),
        patientJourneyOutcomeLabel(update.outcome),
        update.destination ?? "",
        update.note ?? "",
        update.recordedBy.organization,
      ].join(" | ")).join(" || "),
    };
    if (monitoringCase.appointments.length === 0) {
      rows.push({ ...base, appointment_date: "", appointment_status: "Niet ingepland", outcome: "", follow_up_organization: "", reminder_date: "", feedback_date: "", feedback_recipient: "", feedback_channel: "" });
      continue;
    }
    for (const appointment of monitoringCase.appointments) {
      rows.push({
        ...base,
        appointment_date: appointment.scheduledAt,
        appointment_status: getOptionLabel(monitoringAppointmentStatusOptions, appointment.status),
        outcome: getOptionLabel(monitoringOutcomeOptions, appointment.outcome),
        follow_up_organization: appointment.followUpOrganization ?? "",
        reminder_date: appointment.reminderSentAt ?? "",
        feedback_date: appointment.feedbackSentAt ?? "",
        feedback_recipient: appointment.feedbackRecipient ?? "",
        feedback_channel: getOptionLabel(monitoringFeedbackChannelOptions, appointment.feedbackChannel),
      });
    }
  }

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "MONITORING_EXPORT_DOWNLOADED", entityType: "EXPORT", entityId: "monitoring", details: { from, to, program, rows: rows.length } },
  });
  const filename = `wijkconnect-monitoring-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(Buffer.from(toCsv(rows), "utf-8"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" },
  });
}
