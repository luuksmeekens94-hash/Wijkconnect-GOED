"use server";

import { createHmac } from "crypto";
import {
  KpiComparator,
  KpiUnit,
  MonitoringAppointmentStatus,
  MonitoringCaseStatus,
  MonitoringFeedbackChannel,
  MonitoringHelpRequestClarity,
  MonitoringOutcome,
  MonitoringProgram,
  MonitoringReferralBasis,
  MonitoringReferralSource,
  MonitoringSocialReason,
  ProjectActivityType,
  WeeklyReviewStatus,
} from "@prisma/client";
import { endOfWeek, startOfWeek } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const monitoringRoles = ["ADMIN", "DATA_MANAGER"] as const;

function parseDateOnly(value: string) {
  const parsed = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error("Ongeldige datum");
  return parsed;
}

function optionalDate(value?: string) {
  return value ? parseDateOnly(value) : undefined;
}

function hashParticipantReference(value: string) {
  const secret = process.env.MONITORING_PSEUDONYM_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("MONITORING_PSEUDONYM_SECRET ontbreekt in de omgevingsvariabelen");
  }

  const normalized = value.trim().toUpperCase();
  const digest = createHmac("sha256", secret).update(normalized).digest("hex");
  return `WC-${digest.slice(0, 20).toUpperCase()}`;
}

function normalizeWeekStart(value: Date) {
  return startOfWeek(value, { weekStartsOn: 1 });
}

async function assertWeekIsEditable(program: MonitoringProgram, date: Date) {
  const weekStart = normalizeWeekStart(date);
  const review = await prisma.weeklyReview.findUnique({
    where: { program_weekStart: { program, weekStart } },
  });

  if (review?.status === WeeklyReviewStatus.CLOSED) {
    throw new Error("Deze week is afgesloten. Heropen de week voordat je registraties wijzigt.");
  }
}

const registrationSchema = z
  .object({
    participantReference: z.string().trim().min(2).max(80),
    sourceReferralId: z.string().optional(),
    program: z.nativeEnum(MonitoringProgram),
    referralDate: z.string().min(1),
    referralSource: z.nativeEnum(MonitoringReferralSource),
    referralBasis: z.nativeEnum(MonitoringReferralBasis).optional(),
    complaintCategory: z.string().trim().max(100).optional(),
    helpRequest: z.string().trim().max(500).optional(),
    helpRequestClarity: z.nativeEnum(MonitoringHelpRequestClarity).optional(),
    assignedOrganization: z.string().trim().max(120).optional(),
    assignedProfessional: z.string().trim().max(120).optional(),
    socialReasons: z.array(z.nativeEnum(MonitoringSocialReason)),
    scheduledDate: z.string().optional(),
    appointmentStatus: z.nativeEnum(MonitoringAppointmentStatus).optional(),
    outcome: z.nativeEnum(MonitoringOutcome).optional(),
    outcomeNote: z.string().trim().max(500).optional(),
    followUpOrganization: z.string().trim().max(120).optional(),
    evaluationEligible: z.enum(["yes", "no"]).optional(),
    reminderDate: z.string().optional(),
    feedbackDate: z.string().optional(),
    feedbackRecipient: z.string().trim().max(120).optional(),
    feedbackChannel: z.nativeEnum(MonitoringFeedbackChannel).optional(),
  })
  .superRefine((value, context) => {
    if (value.program === MonitoringProgram.MOVEMENT && !value.complaintCategory) {
      context.addIssue({ code: "custom", path: ["complaintCategory"], message: "Vul de klachtregio in" });
    }
    if (value.program === MonitoringProgram.SOCIAL && value.socialReasons.length === 0) {
      context.addIssue({ code: "custom", path: ["socialReasons"], message: "Selecteer minimaal één sociale hulpvraag" });
    }
    if (value.scheduledDate && !value.appointmentStatus) {
      context.addIssue({ code: "custom", path: ["appointmentStatus"], message: "Vul de afspraakstatus in" });
    }
    if (value.appointmentStatus === MonitoringAppointmentStatus.ATTENDED && !value.outcome) {
      context.addIssue({ code: "custom", path: ["outcome"], message: "Vul de uitkomst van het consult in" });
    }
  });

export async function createMonitoringRegistration(formData: FormData) {
  const user = await requireRole([...monitoringRoles]);
  const parsed = registrationSchema.safeParse({
    participantReference: formData.get("participantReference"),
    sourceReferralId: formData.get("sourceReferralId") || undefined,
    program: formData.get("program"),
    referralDate: formData.get("referralDate"),
    referralSource: formData.get("referralSource"),
    referralBasis: formData.get("referralBasis") || undefined,
    complaintCategory: formData.get("complaintCategory") || undefined,
    helpRequest: formData.get("helpRequest") || undefined,
    helpRequestClarity: formData.get("helpRequestClarity") || undefined,
    assignedOrganization: formData.get("assignedOrganization") || undefined,
    assignedProfessional: formData.get("assignedProfessional") || undefined,
    socialReasons: formData.getAll("socialReasons"),
    scheduledDate: formData.get("scheduledDate") || undefined,
    appointmentStatus: formData.get("appointmentStatus") || undefined,
    outcome: formData.get("outcome") || undefined,
    outcomeNote: formData.get("outcomeNote") || undefined,
    followUpOrganization: formData.get("followUpOrganization") || undefined,
    evaluationEligible: formData.get("evaluationEligible") || undefined,
    reminderDate: formData.get("reminderDate") || undefined,
    feedbackDate: formData.get("feedbackDate") || undefined,
    feedbackRecipient: formData.get("feedbackRecipient") || undefined,
    feedbackChannel: formData.get("feedbackChannel") || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ongeldige registratie");
  }

  const referralDate = parseDateOnly(parsed.data.referralDate);
  const scheduledAt = parsed.data.scheduledDate ? parseDateOnly(parsed.data.scheduledDate) : undefined;
  if (scheduledAt && scheduledAt < referralDate) {
    throw new Error("De afspraakdatum kan niet vóór de verwijzingsdatum liggen");
  }
  if (
    scheduledAt &&
    scheduledAt > new Date() &&
    (parsed.data.appointmentStatus === MonitoringAppointmentStatus.ATTENDED ||
      parsed.data.appointmentStatus === MonitoringAppointmentStatus.NO_SHOW)
  ) {
    throw new Error("Een toekomstige afspraak kan nog niet op verschenen of no-show staan");
  }

  await assertWeekIsEditable(parsed.data.program, scheduledAt ?? referralDate);
  const pseudonymCode = hashParticipantReference(parsed.data.participantReference);

  const monitoringCase = await prisma.$transaction(async (transaction) => {
    const participant = await transaction.monitoringParticipant.upsert({
      where: { pseudonymCode },
      update: {},
      create: { pseudonymCode },
    });

    return transaction.monitoringCase.create({
      data: {
        participantId: participant.id,
        sourceReferralId: parsed.data.sourceReferralId,
        program: parsed.data.program,
        referralDate,
        referralSource: parsed.data.referralSource,
        referralBasis: parsed.data.referralBasis,
        complaintCategory: parsed.data.program === MonitoringProgram.MOVEMENT ? parsed.data.complaintCategory : null,
        helpRequest: parsed.data.helpRequest,
        helpRequestClarity: parsed.data.program === MonitoringProgram.SOCIAL ? parsed.data.helpRequestClarity : null,
        assignedOrganization: parsed.data.assignedOrganization,
        assignedProfessional: parsed.data.assignedProfessional,
        createdById: user.id,
        socialReasons: {
          create: parsed.data.program === MonitoringProgram.SOCIAL
            ? parsed.data.socialReasons.map((reason) => ({ reason }))
            : [],
        },
        appointments: scheduledAt
          ? {
              create: {
                scheduledAt,
                status: parsed.data.appointmentStatus ?? MonitoringAppointmentStatus.SCHEDULED,
                outcome: parsed.data.outcome,
                outcomeNote: parsed.data.outcomeNote,
                followUpOrganization: parsed.data.followUpOrganization,
                evaluationEligible: parsed.data.evaluationEligible === "yes" ? true : parsed.data.evaluationEligible === "no" ? false : null,
                reminderSentAt: optionalDate(parsed.data.reminderDate),
                feedbackSentAt: optionalDate(parsed.data.feedbackDate),
                feedbackRecipient: parsed.data.feedbackRecipient,
                feedbackChannel: parsed.data.feedbackChannel,
                createdById: user.id,
              },
            }
          : undefined,
      },
    });
  });

  await writeAuditLog({
    userId: user.id,
    action: "MONITORING_REGISTRATION_CREATED",
    entityType: "MONITORING_CASE",
    entityId: monitoringCase.id,
    details: { program: parsed.data.program, referralDate: parsed.data.referralDate },
  });

  revalidatePath("/monitoring");
  revalidatePath("/monitoring/registraties");
  revalidatePath("/monitoring/weken");
  redirect(`/monitoring/registraties/${monitoringCase.id}`);
}

const appointmentSchema = z.object({
  caseId: z.string().min(1),
  scheduledDate: z.string().min(1),
  status: z.nativeEnum(MonitoringAppointmentStatus),
  outcome: z.nativeEnum(MonitoringOutcome).optional(),
  outcomeNote: z.string().trim().max(500).optional(),
  followUpOrganization: z.string().trim().max(120).optional(),
  evaluationEligible: z.enum(["yes", "no"]).optional(),
  reminderDate: z.string().optional(),
  feedbackDate: z.string().optional(),
  feedbackRecipient: z.string().trim().max(120).optional(),
  feedbackChannel: z.nativeEnum(MonitoringFeedbackChannel).optional(),
});

export async function addMonitoringAppointment(formData: FormData) {
  const user = await requireRole([...monitoringRoles]);
  const parsed = appointmentSchema.safeParse({
    caseId: formData.get("caseId"),
    scheduledDate: formData.get("scheduledDate"),
    status: formData.get("status"),
    outcome: formData.get("outcome") || undefined,
    outcomeNote: formData.get("outcomeNote") || undefined,
    followUpOrganization: formData.get("followUpOrganization") || undefined,
    evaluationEligible: formData.get("evaluationEligible") || undefined,
    reminderDate: formData.get("reminderDate") || undefined,
    feedbackDate: formData.get("feedbackDate") || undefined,
    feedbackRecipient: formData.get("feedbackRecipient") || undefined,
    feedbackChannel: formData.get("feedbackChannel") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Ongeldige afspraak");

  const monitoringCase = await prisma.monitoringCase.findUnique({ where: { id: parsed.data.caseId } });
  if (!monitoringCase) throw new Error("Registratie niet gevonden");
  const scheduledAt = parseDateOnly(parsed.data.scheduledDate);
  if (scheduledAt < monitoringCase.referralDate) throw new Error("De afspraakdatum kan niet vóór de verwijzingsdatum liggen");
  if (parsed.data.status === MonitoringAppointmentStatus.ATTENDED && !parsed.data.outcome) {
    throw new Error("Vul de uitkomst van het consult in");
  }
  await assertWeekIsEditable(monitoringCase.program, scheduledAt);

  const appointment = await prisma.monitoringAppointment.create({
    data: {
      caseId: monitoringCase.id,
      scheduledAt,
      status: parsed.data.status,
      outcome: parsed.data.outcome,
      outcomeNote: parsed.data.outcomeNote,
      followUpOrganization: parsed.data.followUpOrganization,
      evaluationEligible: parsed.data.evaluationEligible === "yes" ? true : parsed.data.evaluationEligible === "no" ? false : null,
      reminderSentAt: optionalDate(parsed.data.reminderDate),
      feedbackSentAt: optionalDate(parsed.data.feedbackDate),
      feedbackRecipient: parsed.data.feedbackRecipient,
      feedbackChannel: parsed.data.feedbackChannel,
      createdById: user.id,
    },
  });

  await writeAuditLog({ userId: user.id, action: "MONITORING_APPOINTMENT_CREATED", entityType: "MONITORING_APPOINTMENT", entityId: appointment.id });
  revalidatePath(`/monitoring/registraties/${monitoringCase.id}`);
  revalidatePath("/monitoring");
}

const updateAppointmentSchema = appointmentSchema.omit({ caseId: true, scheduledDate: true }).extend({
  appointmentId: z.string().min(1),
});

export async function updateMonitoringAppointment(formData: FormData) {
  const user = await requireRole([...monitoringRoles]);
  const parsed = updateAppointmentSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
    status: formData.get("status"),
    outcome: formData.get("outcome") || undefined,
    outcomeNote: formData.get("outcomeNote") || undefined,
    followUpOrganization: formData.get("followUpOrganization") || undefined,
    evaluationEligible: formData.get("evaluationEligible") || undefined,
    reminderDate: formData.get("reminderDate") || undefined,
    feedbackDate: formData.get("feedbackDate") || undefined,
    feedbackRecipient: formData.get("feedbackRecipient") || undefined,
    feedbackChannel: formData.get("feedbackChannel") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Ongeldige afspraakupdate");
  if (parsed.data.status === MonitoringAppointmentStatus.ATTENDED && !parsed.data.outcome) {
    throw new Error("Vul de uitkomst van het consult in");
  }

  const existing = await prisma.monitoringAppointment.findUnique({
    where: { id: parsed.data.appointmentId },
    include: { case: true },
  });
  if (!existing) throw new Error("Afspraak niet gevonden");
  await assertWeekIsEditable(existing.case.program, existing.scheduledAt);

  await prisma.monitoringAppointment.update({
    where: { id: existing.id },
    data: {
      status: parsed.data.status,
      outcome: parsed.data.outcome ?? null,
      outcomeNote: parsed.data.outcomeNote ?? null,
      followUpOrganization: parsed.data.followUpOrganization ?? null,
      evaluationEligible: parsed.data.evaluationEligible === "yes" ? true : parsed.data.evaluationEligible === "no" ? false : null,
      reminderSentAt: optionalDate(parsed.data.reminderDate) ?? null,
      feedbackSentAt: optionalDate(parsed.data.feedbackDate) ?? null,
      feedbackRecipient: parsed.data.feedbackRecipient ?? null,
      feedbackChannel: parsed.data.feedbackChannel ?? null,
      closedAt: parsed.data.status === MonitoringAppointmentStatus.ATTENDED ? new Date() : null,
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "MONITORING_APPOINTMENT_UPDATED",
    entityType: "MONITORING_APPOINTMENT",
    entityId: existing.id,
    details: { previousStatus: existing.status, newStatus: parsed.data.status },
  });
  revalidatePath(`/monitoring/registraties/${existing.caseId}`);
  revalidatePath("/monitoring");
  revalidatePath("/monitoring/weken");
}

export async function setMonitoringCaseStatus(formData: FormData) {
  const user = await requireRole([...monitoringRoles]);
  const caseId = String(formData.get("caseId") ?? "");
  const status = z.nativeEnum(MonitoringCaseStatus).parse(formData.get("status"));
  const monitoringCase = await prisma.monitoringCase.findUnique({
    where: { id: caseId },
    include: { appointments: true },
  });
  if (!monitoringCase) throw new Error("Registratie niet gevonden");
  const latestDate = monitoringCase.appointments.at(-1)?.scheduledAt ?? monitoringCase.referralDate;
  await assertWeekIsEditable(monitoringCase.program, latestDate);
  if (status === MonitoringCaseStatus.CLOSED && !monitoringCase.appointments.some((item) => item.outcome)) {
    throw new Error("Een casus kan pas worden gesloten wanneer een uitkomst is vastgelegd");
  }

  await prisma.monitoringCase.update({
    where: { id: caseId },
    data: { status, closedAt: status === MonitoringCaseStatus.CLOSED ? new Date() : null },
  });
  await writeAuditLog({ userId: user.id, action: "MONITORING_CASE_STATUS_UPDATED", entityType: "MONITORING_CASE", entityId: caseId, details: { status } });
  revalidatePath(`/monitoring/registraties/${caseId}`);
  revalidatePath("/monitoring/registraties");
}

const weeklyReviewSchema = z.object({
  program: z.nativeEnum(MonitoringProgram),
  weekStart: z.string().min(1),
  availableSlots: z.coerce.number().int().min(0).max(500),
  clinicPlanned: z.boolean(),
  status: z.nativeEnum(WeeklyReviewStatus),
  notes: z.string().trim().max(1000).optional(),
});

export async function saveWeeklyReview(formData: FormData) {
  const user = await requireRole([...monitoringRoles]);
  const parsed = weeklyReviewSchema.safeParse({
    program: formData.get("program"),
    weekStart: formData.get("weekStart"),
    availableSlots: formData.get("availableSlots"),
    clinicPlanned: formData.get("clinicPlanned") === "on",
    status: formData.get("status"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Ongeldige weekcontrole");

  const weekStart = normalizeWeekStart(parseDateOnly(parsed.data.weekStart));
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  if (parsed.data.status === WeeklyReviewStatus.CLOSED) {
    const appointments = await prisma.monitoringAppointment.findMany({
      where: { scheduledAt: { gte: weekStart, lte: weekEnd }, case: { program: parsed.data.program } },
      include: { case: { include: { socialReasons: true } } },
    });
    const issues: string[] = [];
    if (parsed.data.clinicPlanned && parsed.data.availableSlots === 0) issues.push("capaciteit ontbreekt");
    if (appointments.some((item) => item.status === MonitoringAppointmentStatus.SCHEDULED && item.scheduledAt < new Date())) issues.push("afgelopen afspraken staan nog op gepland");
    if (appointments.some((item) => item.status === MonitoringAppointmentStatus.ATTENDED && !item.outcome)) issues.push("verschenen consult zonder uitkomst");
    if (appointments.some((item) => item.case.program === MonitoringProgram.MOVEMENT && !item.case.complaintCategory)) issues.push("beweegregistratie zonder klachtregio");
    if (appointments.some((item) => item.case.program === MonitoringProgram.SOCIAL && item.case.socialReasons.length === 0)) issues.push("sociale registratie zonder hulpvraagthema");
    if (appointments.some((item) => item.scheduledAt < item.case.referralDate)) issues.push("afspraak vóór verwijzing");
    if (issues.length > 0) throw new Error(`Week kan nog niet worden afgesloten: ${issues.join(", ")}`);
  }

  const review = await prisma.weeklyReview.upsert({
    where: { program_weekStart: { program: parsed.data.program, weekStart } },
    update: {
      availableSlots: parsed.data.clinicPlanned ? parsed.data.availableSlots : 0,
      clinicPlanned: parsed.data.clinicPlanned,
      status: parsed.data.status,
      notes: parsed.data.notes,
      reviewedById: parsed.data.status === WeeklyReviewStatus.CLOSED ? user.id : null,
      reviewedAt: parsed.data.status === WeeklyReviewStatus.CLOSED ? new Date() : null,
    },
    create: {
      program: parsed.data.program,
      weekStart,
      availableSlots: parsed.data.clinicPlanned ? parsed.data.availableSlots : 0,
      clinicPlanned: parsed.data.clinicPlanned,
      status: parsed.data.status,
      notes: parsed.data.notes,
      reviewedById: parsed.data.status === WeeklyReviewStatus.CLOSED ? user.id : null,
      reviewedAt: parsed.data.status === WeeklyReviewStatus.CLOSED ? new Date() : null,
    },
  });

  await writeAuditLog({ userId: user.id, action: "WEEKLY_REVIEW_SAVED", entityType: "WEEKLY_REVIEW", entityId: review.id, details: { status: parsed.data.status } });
  revalidatePath("/monitoring");
  revalidatePath("/monitoring/weken");
}

const projectActivitySchema = z.object({
  type: z.nativeEnum(ProjectActivityType),
  activityDate: z.string().min(1),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(1000).optional(),
  ownerName: z.string().trim().max(120).optional(),
  followUpDate: z.string().optional(),
  completed: z.boolean(),
});

export async function createProjectActivity(formData: FormData) {
  const user = await requireRole([...monitoringRoles]);
  const parsed = projectActivitySchema.safeParse({
    type: formData.get("type"),
    activityDate: formData.get("activityDate"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    ownerName: formData.get("ownerName") || undefined,
    followUpDate: formData.get("followUpDate") || undefined,
    completed: formData.get("completed") === "on",
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Ongeldige projectactiviteit");

  const activity = await prisma.projectActivity.create({
    data: {
      type: parsed.data.type,
      activityDate: parseDateOnly(parsed.data.activityDate),
      title: parsed.data.title,
      description: parsed.data.description,
      ownerName: parsed.data.ownerName,
      followUpDate: optionalDate(parsed.data.followUpDate),
      completed: parsed.data.completed,
      createdById: user.id,
    },
  });
  await writeAuditLog({ userId: user.id, action: "PROJECT_ACTIVITY_CREATED", entityType: "PROJECT_ACTIVITY", entityId: activity.id });
  revalidatePath("/monitoring/projectlog");
  revalidatePath("/monitoring");
}

export async function toggleProjectActivity(formData: FormData) {
  const user = await requireRole([...monitoringRoles]);
  const id = String(formData.get("id") ?? "");
  const completed = formData.get("completed") === "true";
  await prisma.projectActivity.update({ where: { id }, data: { completed } });
  await writeAuditLog({ userId: user.id, action: "PROJECT_ACTIVITY_UPDATED", entityType: "PROJECT_ACTIVITY", entityId: id, details: { completed } });
  revalidatePath("/monitoring/projectlog");
}

const kpiTargetSchema = z.object({
  id: z.string().optional(),
  code: z.string().trim().min(2).max(80).transform((value) => value.toUpperCase().replace(/[^A-Z0-9_]+/g, "_")),
  label: z.string().trim().min(3).max(160),
  program: z.nativeEnum(MonitoringProgram).optional(),
  unit: z.nativeEnum(KpiUnit),
  comparator: z.nativeEnum(KpiComparator),
  targetValue: z.coerce.number().finite().min(0),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  active: z.boolean(),
});

export async function saveKpiTarget(formData: FormData) {
  const user = await requireRole(["ADMIN"]);
  const parsed = kpiTargetSchema.safeParse({
    id: formData.get("id") || undefined,
    code: formData.get("code"),
    label: formData.get("label"),
    program: formData.get("program") || undefined,
    unit: formData.get("unit"),
    comparator: formData.get("comparator"),
    targetValue: formData.get("targetValue"),
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd"),
    active: formData.get("active") === "on",
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Ongeldige KPI-doelstelling");
  const periodStart = parseDateOnly(parsed.data.periodStart);
  const periodEnd = parseDateOnly(parsed.data.periodEnd);
  if (periodEnd < periodStart) throw new Error("De einddatum moet na de startdatum liggen");

  const target = parsed.data.id
    ? await prisma.kpiTarget.update({
        where: { id: parsed.data.id },
        data: { label: parsed.data.label, program: parsed.data.program, unit: parsed.data.unit, comparator: parsed.data.comparator, targetValue: parsed.data.targetValue, periodStart, periodEnd, active: parsed.data.active },
      })
    : await prisma.kpiTarget.create({
        data: { code: parsed.data.code, label: parsed.data.label, program: parsed.data.program, unit: parsed.data.unit, comparator: parsed.data.comparator, targetValue: parsed.data.targetValue, periodStart, periodEnd, active: parsed.data.active },
      });

  await writeAuditLog({ userId: user.id, action: "KPI_TARGET_SAVED", entityType: "KPI_TARGET", entityId: target.id, details: { code: target.code } });
  revalidatePath("/admin/projectinstellingen");
  revalidatePath("/monitoring");
}
