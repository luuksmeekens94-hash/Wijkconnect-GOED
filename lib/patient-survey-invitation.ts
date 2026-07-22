import { randomUUID } from "node:crypto";
import {
  MonitoringAppointmentStatus,
  MonitoringProgram,
  Prisma,
  SurveyAudience,
  SurveyInvitationStatus,
  SurveyRecipientType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendSurveyInvitationEmail } from "@/lib/survey-delivery";
import {
  encryptSurveyRecipientEmail,
  fingerprintSurveyRecipientEmail,
  getSurveyAccessToken,
  hashSurveyAccessToken,
} from "@/lib/survey-security";

function surveyExpiry(now = new Date()) {
  return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
}

export async function prepareAndSendPatientSurvey({
  appointmentId,
  recipientEmail,
  createdById,
}: {
  appointmentId: string;
  recipientEmail: string;
  createdById: string;
}) {
  const appointment = await prisma.monitoringAppointment.findUnique({
    where: { id: appointmentId },
    include: { case: true },
  });
  if (!appointment || appointment.status !== MonitoringAppointmentStatus.ATTENDED) {
    throw new Error("Alleen een patiënt die is geweest kan een vragenlijst ontvangen");
  }

  const audience = appointment.case.program === MonitoringProgram.MOVEMENT
    ? SurveyAudience.MOVEMENT_PATIENT
    : SurveyAudience.SOCIAL_PATIENT;
  const template = await prisma.surveyTemplate.findFirst({
    where: { audience, active: true },
    orderBy: { version: "desc" },
  });
  if (!template) throw new Error("De patiëntvragenlijst voor dit spreekuur is nog niet ingericht");

  const emailFingerprint = fingerprintSurveyRecipientEmail(recipientEmail);
  const suppressed = await prisma.surveyRecipient.findFirst({
    where: { emailFingerprint, suppressedAt: { not: null } },
    select: { id: true },
  });
  if (suppressed) throw new Error("Dit e-mailadres is geblokkeerd voor vragenlijstuitnodigingen");

  const expiresAt = surveyExpiry();
  const contactRetentionUntil = new Date(expiresAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  const invitationId = randomUUID();
  const dedupeKey = `appointment:${appointment.id}`;

  let invitation: { id: string; status: SurveyInvitationStatus };
  try {
    invitation = await prisma.$transaction(async (transaction) => {
      const existingRecipient = await transaction.surveyRecipient.findFirst({
        where: { emailFingerprint, type: SurveyRecipientType.PATIENT, suppressedAt: null },
        orderBy: { updatedAt: "desc" },
      });
      const recipient = existingRecipient
        ? await transaction.surveyRecipient.update({
            where: { id: existingRecipient.id },
            data: {
              emailEncrypted: encryptSurveyRecipientEmail(recipientEmail),
              contactPermissionConfirmedAt: new Date(),
              contactPermissionSource: "PRACTICE_MANAGER_WEEKLY_REGISTRATION",
              contactRetentionUntil: existingRecipient.contactRetentionUntil && existingRecipient.contactRetentionUntil > contactRetentionUntil
                ? existingRecipient.contactRetentionUntil
                : contactRetentionUntil,
              contactPurgedAt: null,
            },
          })
        : await transaction.surveyRecipient.create({
            data: {
              type: SurveyRecipientType.PATIENT,
              emailEncrypted: encryptSurveyRecipientEmail(recipientEmail),
              emailFingerprint,
              contactPermissionConfirmedAt: new Date(),
              contactPermissionSource: "PRACTICE_MANAGER_WEEKLY_REGISTRATION",
              contactRetentionUntil,
            },
          });

      return transaction.surveyInvitation.create({
        data: {
          id: invitationId,
          templateId: template.id,
          caseId: appointment.caseId,
          appointmentId: appointment.id,
          recipientId: recipient.id,
          dedupeKey,
          tokenHash: hashSurveyAccessToken(getSurveyAccessToken(invitationId)),
          status: SurveyInvitationStatus.READY,
          expiresAt,
          createdById,
        },
        select: { id: true, status: true },
      });
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    const existing = await prisma.surveyInvitation.findUnique({
      where: { dedupeKey },
      select: { id: true, status: true },
    });
    if (!existing) throw error;
    invitation = existing;
  }

  if (invitation.status !== SurveyInvitationStatus.READY) {
    return { invitationId: invitation.id, outcome: "already-sent" as const };
  }

  const result = await sendSurveyInvitationEmail(invitation.id, createdById);
  return { invitationId: invitation.id, outcome: result.outcome };
}
