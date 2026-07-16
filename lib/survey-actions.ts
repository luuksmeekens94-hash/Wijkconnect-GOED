"use server";

import { randomUUID } from "node:crypto";
import {
  MonitoringAppointmentStatus,
  MonitoringProgram,
  Prisma,
  SurveyAudience,
  SurveyInvitationStatus,
  SurveyRecipientType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSurveyCampaignPeriod, normalizeSurveyCampaignPeriod } from "@/lib/survey-campaign";
import { sendSurveyInvitationEmail } from "@/lib/survey-delivery";
import {
  encryptSurveyRecipientEmail,
  fingerprintSurveyRecipientEmail,
  getProfessionalSurveyDedupeKey,
  getSurveyAccessToken,
  hashSurveyAccessToken,
} from "@/lib/survey-security";
import { veznSurveyTemplates } from "@/lib/vezn-survey-templates";

export async function initializeVeznSurveyTemplates() {
  const user = await requireRole(["ADMIN", "DATA_MANAGER"]);
  let created = 0;

  for (const definition of veznSurveyTemplates) {
    const existing = await prisma.surveyTemplate.findUnique({
      where: { code_version: { code: definition.code, version: 1 } },
    });
    if (existing) continue;

    await prisma.surveyTemplate.create({
      data: {
        code: definition.code,
        name: definition.name,
        audience: definition.audience,
        version: 1,
        description: definition.description,
        questions: {
          create: definition.questions.map((question, index) => ({
            code: question.code,
            position: index + 1,
            prompt: question.prompt,
            type: question.type!,
            required: question.required ?? true,
            options: question.options ?? undefined,
            minValue: question.minValue,
            maxValue: question.maxValue,
          })),
        },
      },
    });
    created += 1;
  }

  await writeAuditLog({
    userId: user.id,
    action: "SURVEY_TEMPLATES_INITIALIZED",
    entityType: "SURVEY_TEMPLATE",
    entityId: "VEZN_V1",
    details: { created },
  });
  revalidatePath("/monitoring/vragenlijsten");
}
const invitationSchema = z.object({
  templateId: z.string().min(1),
  recipientType: z.nativeEnum(SurveyRecipientType),
  recipientEmail: z.string().trim().email().max(254),
  appointmentId: z.string().optional(),
  campaignPeriod: z.string().trim().max(16).optional(),
  expiresAt: z.string().optional(),
  permissionConfirmed: z.literal("yes"),
}).superRefine((value, context) => {
  if (value.recipientType === SurveyRecipientType.PATIENT && !value.appointmentId) {
    context.addIssue({ code: "custom", path: ["appointmentId"], message: "Selecteer de bezochte afspraak" });
  }
  if (value.recipientType === SurveyRecipientType.PROFESSIONAL && value.appointmentId) {
    context.addIssue({ code: "custom", path: ["appointmentId"], message: "Een professionalsurvey hoort niet bij een patiëntafspraak" });
  }
  if (
    value.recipientType === SurveyRecipientType.PROFESSIONAL &&
    (!value.campaignPeriod || !isSurveyCampaignPeriod(value.campaignPeriod))
  ) {
    context.addIssue({ code: "custom", path: ["campaignPeriod"], message: "Selecteer een geldige campagneperiode" });
  }
  if (value.recipientType === SurveyRecipientType.PATIENT && value.campaignPeriod) {
    context.addIssue({ code: "custom", path: ["campaignPeriod"], message: "Een patiëntuitnodiging heeft geen campagneperiode" });
  }
});

const patientAudiences = new Set<SurveyAudience>([
  SurveyAudience.MOVEMENT_PATIENT,
  SurveyAudience.SOCIAL_PATIENT,
]);

function defaultSurveyExpiry() {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + 30);
  return value;
}

function surveyExpiry(value?: string) {
  if (!value) return defaultSurveyExpiry();
  const expiry = new Date(`${value}T23:59:59.999Z`);
  if (Number.isNaN(expiry.getTime()) || expiry <= new Date()) {
    throw new Error("De verloopdatum moet in de toekomst liggen");
  }
  return expiry;
}

export async function createSurveyInvitation(formData: FormData) {
  const user = await requireRole(["ADMIN", "DATA_MANAGER"]);
  const parsed = invitationSchema.safeParse({
    templateId: formData.get("templateId"),
    recipientType: formData.get("recipientType"),
    recipientEmail: formData.get("recipientEmail"),
    appointmentId: formData.get("appointmentId") || undefined,
    campaignPeriod: formData.get("campaignPeriod") || undefined,
    expiresAt: formData.get("expiresAt") || undefined,
    permissionConfirmed: formData.get("permissionConfirmed"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Ongeldige vragenlijstuitnodiging");

  const [template, appointment] = await Promise.all([
    prisma.surveyTemplate.findUnique({ where: { id: parsed.data.templateId } }),
    parsed.data.appointmentId
      ? prisma.monitoringAppointment.findUnique({
          where: { id: parsed.data.appointmentId },
          include: { case: true },
        })
      : null,
  ]);
  if (!template?.active) throw new Error("Deze vragenlijst is niet beschikbaar");

  if (parsed.data.recipientType === SurveyRecipientType.PATIENT) {
    if (!appointment) throw new Error("De geselecteerde afspraak bestaat niet");
    if (appointment.status !== MonitoringAppointmentStatus.ATTENDED || appointment.evaluationEligible !== true) {
      throw new Error("Alleen een aanwezige patiënt die geschikt is voor evaluatie kan worden uitgenodigd");
    }
    const expectedAudience = appointment.case.program === MonitoringProgram.MOVEMENT
      ? SurveyAudience.MOVEMENT_PATIENT
      : SurveyAudience.SOCIAL_PATIENT;
    if (template.audience !== expectedAudience) {
      throw new Error("De vragenlijst past niet bij het spreekuur van deze afspraak");
    }
  } else if (patientAudiences.has(template.audience)) {
    throw new Error("Deze patiëntvragenlijst vereist een gekoppelde afspraak");
  }

  const emailFingerprint = fingerprintSurveyRecipientEmail(parsed.data.recipientEmail);
  const campaignPeriod = parsed.data.campaignPeriod
    ? normalizeSurveyCampaignPeriod(parsed.data.campaignPeriod)
    : undefined;
  const suppressedRecipient = await prisma.surveyRecipient.findFirst({
    where: { emailFingerprint, suppressedAt: { not: null } },
    select: { id: true },
  });
  if (suppressedRecipient) throw new Error("Dit e-mailadres is geblokkeerd voor vragenlijstuitnodigingen");

  const invitationId = randomUUID();
  const expiresAt = surveyExpiry(parsed.data.expiresAt);
  const contactRetentionUntil = new Date(expiresAt);
  contactRetentionUntil.setUTCDate(contactRetentionUntil.getUTCDate() + 30);
  const invitation = await prisma.$transaction(async (transaction) => {
    if (appointment) {
      await transaction.surveyInvitation.updateMany({
        where: {
          appointmentId: appointment.id,
          status: { in: [SurveyInvitationStatus.CANCELLED, SurveyInvitationStatus.EXPIRED] },
        },
        data: { dedupeKey: null },
      });
    }
    const existingRecipient = await transaction.surveyRecipient.findFirst({
      where: { emailFingerprint, type: parsed.data.recipientType, suppressedAt: null },
      orderBy: { updatedAt: "desc" },
    });
    const recipient = existingRecipient
      ? await transaction.surveyRecipient.update({
          where: { id: existingRecipient.id },
          data: {
            emailEncrypted: encryptSurveyRecipientEmail(parsed.data.recipientEmail),
            contactPermissionConfirmedAt: new Date(),
            contactPermissionSource: "ADMIN_CONFIRMED",
            contactRetentionUntil: existingRecipient.contactRetentionUntil && existingRecipient.contactRetentionUntil > contactRetentionUntil
              ? existingRecipient.contactRetentionUntil
              : contactRetentionUntil,
            contactPurgedAt: null,
          },
        })
      : await transaction.surveyRecipient.create({
          data: {
            type: parsed.data.recipientType,
            emailEncrypted: encryptSurveyRecipientEmail(parsed.data.recipientEmail),
            emailFingerprint,
            contactPermissionConfirmedAt: new Date(),
            contactPermissionSource: "ADMIN_CONFIRMED",
            contactRetentionUntil,
          },
        });

    return transaction.surveyInvitation.create({
      data: {
        id: invitationId,
        templateId: template.id,
        caseId: appointment?.caseId,
        appointmentId: appointment?.id,
        recipientId: recipient.id,
        campaignPeriod,
        dedupeKey: appointment
          ? `appointment:${appointment.id}`
          : getProfessionalSurveyDedupeKey(template.id, emailFingerprint, campaignPeriod!),
        tokenHash: hashSurveyAccessToken(getSurveyAccessToken(invitationId)),
        status: SurveyInvitationStatus.READY,
        expiresAt,
        createdById: user.id,
      },
    });
  }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect(parsed.data.recipientType === SurveyRecipientType.PROFESSIONAL
        ? "/monitoring/vragenlijsten?melding=professionele-uitnodiging-bestaat-al"
        : "/monitoring/vragenlijsten?melding=patientuitnodiging-bestaat-al");
    }
    throw error;
  });

  await writeAuditLog({
    userId: user.id,
    action: "SURVEY_INVITATION_PREPARED",
    entityType: "SURVEY_INVITATION",
    entityId: invitation.id,
    details: {
      templateId: parsed.data.templateId,
      appointmentId: parsed.data.appointmentId,
      campaignPeriod,
      recipientType: parsed.data.recipientType,
    },
  });
  revalidatePath("/monitoring/vragenlijsten");
  redirect("/monitoring/vragenlijsten?melding=uitnodiging-klaargezet");
}

export async function updateSurveyInvitationStatus(formData: FormData) {
  const user = await requireRole(["ADMIN", "DATA_MANAGER"]);
  const invitationId = String(formData.get("invitationId") ?? "");
  const status = z.literal(SurveyInvitationStatus.CANCELLED).parse(formData.get("status"));
  const existing = await prisma.surveyInvitation.findUnique({
    where: { id: invitationId },
    select: { appointmentId: true },
  });
  if (!existing) throw new Error("Uitnodiging niet gevonden");
  const changed = await prisma.surveyInvitation.updateMany({
    where: {
      id: invitationId,
      status: {
        in: [
          SurveyInvitationStatus.DRAFT,
          SurveyInvitationStatus.READY,
          SurveyInvitationStatus.SENT,
          SurveyInvitationStatus.OPENED,
        ],
      },
    },
    data: { status, dedupeKey: existing.appointmentId ? null : undefined },
  });
  if (changed.count !== 1) throw new Error("Deze uitnodiging kan niet meer worden geannuleerd");
  await writeAuditLog({ userId: user.id, action: "SURVEY_INVITATION_STATUS_UPDATED", entityType: "SURVEY_INVITATION", entityId: invitationId, details: { status } });
  revalidatePath("/monitoring/vragenlijsten");
}

export async function sendPreparedSurveyInvitation(formData: FormData) {
  const user = await requireRole(["ADMIN", "DATA_MANAGER"]);
  const invitationId = z.string().min(1).max(128).parse(formData.get("invitationId"));

  try {
    await sendSurveyInvitationEmail(invitationId, user.id);
  } catch (error) {
    console.error("Survey invitation delivery failed", {
      invitationId,
      errorName: error instanceof Error ? error.name : "unknown",
    });
    revalidatePath("/monitoring/vragenlijsten");
    redirect("/monitoring/vragenlijsten?melding=verzending-mislukt");
  }

  revalidatePath("/monitoring/vragenlijsten");
  redirect("/monitoring/vragenlijsten?melding=uitnodiging-verstuurd");
}
