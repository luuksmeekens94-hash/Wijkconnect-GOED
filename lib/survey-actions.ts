"use server";

import { createHash, randomBytes } from "crypto";
import { SurveyInvitationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
  caseId: z.string().optional(),
  appointmentId: z.string().optional(),
  expiresAt: z.string().optional(),
});

export async function createSurveyInvitation(formData: FormData) {
  const user = await requireRole(["ADMIN", "DATA_MANAGER"]);
  const parsed = invitationSchema.safeParse({
    templateId: formData.get("templateId"),
    caseId: formData.get("caseId") || undefined,
    appointmentId: formData.get("appointmentId") || undefined,
    expiresAt: formData.get("expiresAt") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Ongeldige vragenlijstuitnodiging");

  const tokenHash = createHash("sha256").update(randomBytes(32)).digest("hex");
  const invitation = await prisma.surveyInvitation.create({
    data: {
      templateId: parsed.data.templateId,
      caseId: parsed.data.caseId,
      appointmentId: parsed.data.appointmentId,
      tokenHash,
      status: SurveyInvitationStatus.READY,
      expiresAt: parsed.data.expiresAt ? new Date(`${parsed.data.expiresAt}T23:59:59.999Z`) : undefined,
      createdById: user.id,
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "SURVEY_INVITATION_PREPARED",
    entityType: "SURVEY_INVITATION",
    entityId: invitation.id,
    details: { templateId: parsed.data.templateId, caseId: parsed.data.caseId },
  });
  revalidatePath("/monitoring/vragenlijsten");
}

export async function updateSurveyInvitationStatus(formData: FormData) {
  const user = await requireRole(["ADMIN", "DATA_MANAGER"]);
  const invitationId = String(formData.get("invitationId") ?? "");
  const status = z.nativeEnum(SurveyInvitationStatus).parse(formData.get("status"));
  const now = new Date();
  await prisma.surveyInvitation.update({
    where: { id: invitationId },
    data: {
      status,
      sentAt: status === SurveyInvitationStatus.SENT ? now : undefined,
      invitedAt: status === SurveyInvitationStatus.SENT ? now : undefined,
      completedAt: status === SurveyInvitationStatus.COMPLETED ? now : undefined,
    },
  });
  await writeAuditLog({ userId: user.id, action: "SURVEY_INVITATION_STATUS_UPDATED", entityType: "SURVEY_INVITATION", entityId: invitationId, details: { status } });
  revalidatePath("/monitoring/vragenlijsten");
}
