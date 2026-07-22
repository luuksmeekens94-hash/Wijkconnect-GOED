"use server";

import {
  MonitoringAppointmentStatus,
  MonitoringCaseStatus,
  MonitoringHelpRequestClarity,
  MonitoringOutcome,
  MonitoringProgram,
  MonitoringReferralBasis,
  MonitoringReferralSource,
  MonitoringSocialReason,
} from "@prisma/client";
import { endOfWeek, startOfWeek } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import {
  encryptMonitoringPatientEmail,
  encryptMonitoringPatientName,
  fingerprintMonitoringPatientIdentity,
  monitoringPseudonymFromFingerprint,
  normalizeMonitoringPatientEmail,
  normalizeMonitoringPatientName,
} from "@/lib/monitoring-contact-security";
import { monitoringContactRetentionUntil } from "@/lib/monitoring-contact-retention";
import { prepareAndSendPatientSurvey } from "@/lib/patient-survey-invitation";
import { prisma } from "@/lib/prisma";

const allowedReferralSources = [
  MonitoringReferralSource.GP,
  MonitoringReferralSource.ASSISTANT,
  MonitoringReferralSource.OTHER,
] as const;

const weeklyPatientSchema = z.object({
  weekStart: z.string().date(),
  appointmentDate: z.string().date(),
  patientName: z.string().trim().min(2).max(120),
  patientEmail: z.string().trim().email().max(254),
  referralSource: z.nativeEnum(MonitoringReferralSource),
  program: z.nativeEnum(MonitoringProgram),
  appointmentStatus: z.nativeEnum(MonitoringAppointmentStatus),
  complaintCategory: z.string().trim().max(100).optional(),
  socialReason: z.nativeEnum(MonitoringSocialReason).optional(),
  sendSurvey: z.boolean(),
}).superRefine((value, context) => {
  if (!allowedReferralSources.includes(value.referralSource as typeof allowedReferralSources[number])) {
    context.addIssue({ code: "custom", path: ["referralSource"], message: "Selecteer huisarts, telefonische triage of onduidelijk" });
  }
  if (
    value.appointmentStatus !== MonitoringAppointmentStatus.ATTENDED &&
    value.appointmentStatus !== MonitoringAppointmentStatus.NO_SHOW
  ) {
    context.addIssue({ code: "custom", path: ["appointmentStatus"], message: "Selecteer geweest of no-show" });
  }
  if (value.appointmentStatus === MonitoringAppointmentStatus.ATTENDED) {
    if (value.program === MonitoringProgram.MOVEMENT && !value.complaintCategory) {
      context.addIssue({ code: "custom", path: ["complaintCategory"], message: "Selecteer een klachtregio of onduidelijk" });
    }
    if (value.program === MonitoringProgram.SOCIAL && !value.socialReason) {
      context.addIssue({ code: "custom", path: ["socialReason"], message: "Selecteer een hulpvraag of onduidelijk" });
    }
  }
  if (value.appointmentStatus !== MonitoringAppointmentStatus.ATTENDED && value.sendSurvey) {
    context.addIssue({ code: "custom", path: ["sendSurvey"], message: "Een no-show ontvangt geen patiëntvragenlijst" });
  }
});

function parseDateOnly(value: string) {
  const parsed = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error("Ongeldige datum");
  return parsed;
}

export async function createWeeklyPatientRegistration(formData: FormData) {
  const user = await requireRole(["ADMIN", "DATA_MANAGER"]);
  const parsed = weeklyPatientSchema.safeParse({
    weekStart: formData.get("weekStart"),
    appointmentDate: formData.get("appointmentDate"),
    patientName: formData.get("patientName"),
    patientEmail: formData.get("patientEmail"),
    referralSource: formData.get("referralSource"),
    program: formData.get("program"),
    appointmentStatus: formData.get("appointmentStatus"),
    complaintCategory: formData.get("complaintCategory") || undefined,
    socialReason: formData.get("socialReason") || undefined,
    sendSurvey: formData.get("sendSurvey") === "yes",
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Ongeldige patiëntregistratie");

  const requestedWeekStart = parseDateOnly(parsed.data.weekStart);
  const weekStart = startOfWeek(requestedWeekStart, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const appointmentDate = parseDateOnly(parsed.data.appointmentDate);
  if (appointmentDate < weekStart || appointmentDate > weekEnd) {
    throw new Error("De datum van het spreekuur valt niet in de geselecteerde week");
  }
  if (parsed.data.appointmentDate > new Date().toISOString().slice(0, 10)) {
    throw new Error("Een toekomstige afspraak kan nog niet op geweest of no-show worden gezet");
  }

  const closedWeek = await prisma.weeklyReview.findUnique({
    where: { program_weekStart: { program: parsed.data.program, weekStart } },
    select: { status: true },
  });
  if (closedWeek?.status === "CLOSED") {
    throw new Error("Deze week is al afgesloten. Heropen de week om een patiënt toe te voegen.");
  }

  const patientName = normalizeMonitoringPatientName(parsed.data.patientName);
  const patientEmail = normalizeMonitoringPatientEmail(parsed.data.patientEmail);
  const identityFingerprint = fingerprintMonitoringPatientIdentity(patientName, patientEmail);
  const contactRetentionUntil = monitoringContactRetentionUntil();
  const attended = parsed.data.appointmentStatus === MonitoringAppointmentStatus.ATTENDED;
  const referralBasis = parsed.data.referralSource === MonitoringReferralSource.ASSISTANT
    ? MonitoringReferralBasis.PHONE_TRIAGE
    : parsed.data.referralSource === MonitoringReferralSource.GP
      ? MonitoringReferralBasis.CONSULT
      : undefined;

  const result = await prisma.$transaction(async (transaction) => {
    const participant = await transaction.monitoringParticipant.upsert({
      where: { identityFingerprint },
      update: {
        displayNameEncrypted: encryptMonitoringPatientName(patientName),
        emailEncrypted: encryptMonitoringPatientEmail(patientEmail),
        contactPermissionConfirmedAt: parsed.data.sendSurvey ? new Date() : undefined,
        contactRetentionUntil,
        contactPurgedAt: null,
      },
      create: {
        pseudonymCode: monitoringPseudonymFromFingerprint(identityFingerprint),
        identityFingerprint,
        displayNameEncrypted: encryptMonitoringPatientName(patientName),
        emailEncrypted: encryptMonitoringPatientEmail(patientEmail),
        contactPermissionConfirmedAt: parsed.data.sendSurvey ? new Date() : null,
        contactRetentionUntil,
      },
    });

    const duplicate = await transaction.monitoringAppointment.findFirst({
      where: {
        scheduledAt: appointmentDate,
        case: { participantId: participant.id, program: parsed.data.program },
      },
      select: { id: true },
    });
    if (duplicate) throw new Error("Deze patiënt staat voor dit spreekuur al in deze week");

    const monitoringCase = await transaction.monitoringCase.create({
      data: {
        participantId: participant.id,
        program: parsed.data.program,
        referralDate: appointmentDate,
        referralSource: parsed.data.referralSource,
        referralBasis,
        complaintCategory: attended && parsed.data.program === MonitoringProgram.MOVEMENT
          ? parsed.data.complaintCategory
          : null,
        helpRequestClarity: attended && parsed.data.program === MonitoringProgram.SOCIAL
          ? parsed.data.socialReason === MonitoringSocialReason.UNKNOWN
            ? MonitoringHelpRequestClarity.UNCLEAR
            : MonitoringHelpRequestClarity.CLEAR
          : null,
        status: attended ? MonitoringCaseStatus.OPEN : MonitoringCaseStatus.CLOSED,
        closedAt: attended ? null : new Date(),
        createdById: user.id,
        socialReasons: attended && parsed.data.program === MonitoringProgram.SOCIAL && parsed.data.socialReason
          ? { create: [{ reason: parsed.data.socialReason }] }
          : undefined,
        appointments: {
          create: {
            scheduledAt: appointmentDate,
            status: parsed.data.appointmentStatus,
            outcome: attended ? MonitoringOutcome.UNKNOWN : null,
            evaluationEligible: parsed.data.sendSurvey,
            closedAt: attended ? new Date() : null,
            createdById: user.id,
          },
        },
      },
      include: { appointments: { select: { id: true } } },
    });

    return {
      caseId: monitoringCase.id,
      appointmentId: monitoringCase.appointments[0].id,
    };
  });

  await writeAuditLog({
    userId: user.id,
    action: "WEEKLY_PATIENT_REGISTRATION_CREATED",
    entityType: "MONITORING_CASE",
    entityId: result.caseId,
    details: {
      program: parsed.data.program,
      weekStart: parsed.data.weekStart,
      appointmentStatus: parsed.data.appointmentStatus,
      surveyRequested: parsed.data.sendSurvey,
    },
  });

  let survey = "not-requested";
  if (parsed.data.sendSurvey) {
    try {
      const delivery = await prepareAndSendPatientSurvey({
        appointmentId: result.appointmentId,
        recipientEmail: patientEmail,
        createdById: user.id,
      });
      survey = delivery.outcome === "sent" || delivery.outcome === "already-sent" ? "sent" : "not-sent";
    } catch (error) {
      console.error("Weekly patient survey could not be sent", {
        caseId: result.caseId,
        appointmentId: result.appointmentId,
        errorName: error instanceof Error ? error.name : "unknown",
      });
      survey = "failed";
    }
  }

  revalidatePath("/monitoring/weekinvoer");
  revalidatePath("/monitoring");
  revalidatePath("/monitoring/weken");
  revalidatePath("/monitoring/registraties");
  revalidatePath("/monitoring/vragenlijsten");
  redirect(`/monitoring/weekinvoer?week=${parsed.data.weekStart}&saved=1&survey=${survey}`);
}
