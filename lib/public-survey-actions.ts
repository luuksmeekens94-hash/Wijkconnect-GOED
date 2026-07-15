"use server";

import { SurveyInvitationStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { evaluateSurveyAccess } from "@/lib/survey-access";
import { buildSurveyAnswerData } from "@/lib/survey-response";
import { hashSurveyAccessToken, verifySurveyAccessToken } from "@/lib/survey-security";

export async function submitPublicSurvey(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const verified = verifySurveyAccessToken(token);
  if (!verified) throw new Error("Deze vragenlijstlink is ongeldig");

  const invitation = await prisma.surveyInvitation.findFirst({
    where: { id: verified.invitationId, tokenHash: hashSurveyAccessToken(token) },
    include: {
      response: { select: { id: true } },
      template: { include: { questions: { orderBy: { position: "asc" } } } },
    },
  });
  if (!invitation) throw new Error("Deze vragenlijstlink is ongeldig");
  const access = evaluateSurveyAccess({
    status: invitation.status,
    expiresAt: invitation.expiresAt,
    hasResponse: Boolean(invitation.response),
  });
  if (access === "completed") {
    redirect(`/vragenlijst/${encodeURIComponent(token)}?bedankt=1`);
  }
  if (access !== "available") {
    throw new Error("Deze vragenlijst is niet meer beschikbaar");
  }

  const valuesByQuestionId = Object.fromEntries(
    invitation.template.questions.map((question) => [
      question.id,
      formData.getAll(`question_${question.id}`).map(String),
    ]),
  );
  const answers = buildSurveyAnswerData(invitation.template.questions, valuesByQuestionId);

  await prisma.$transaction(async (transaction) => {
    const claimed = await transaction.surveyInvitation.updateMany({
      where: {
        id: invitation.id,
        status: {
          in: [
            SurveyInvitationStatus.READY,
            SurveyInvitationStatus.SENT,
            SurveyInvitationStatus.OPENED,
          ],
        },
      },
      data: { status: SurveyInvitationStatus.COMPLETED, completedAt: new Date() },
    });
    if (claimed.count !== 1) throw new Error("Deze vragenlijst is al ingevuld");

    await transaction.surveyResponse.create({
      data: {
        invitationId: invitation.id,
        answers: { create: answers },
      },
    });
    await transaction.auditLog.create({
      data: {
        action: "SURVEY_RESPONSE_SUBMITTED",
        entityType: "SURVEY_INVITATION",
        entityId: invitation.id,
        details: { templateId: invitation.templateId },
      },
    });
  });

  redirect(`/vragenlijst/${encodeURIComponent(token)}?bedankt=1`);
}
