import { prisma } from "@/lib/prisma";
import { evaluateSurveyAccess } from "@/lib/survey-access";
import { hashSurveyAccessToken, verifySurveyAccessToken } from "@/lib/survey-security";

export async function getPublicSurvey(token: string) {
  const verified = verifySurveyAccessToken(token);
  if (!verified) return { state: "unavailable" as const };

  const invitation = await prisma.surveyInvitation.findFirst({
    where: {
      id: verified.invitationId,
      tokenHash: hashSurveyAccessToken(token),
    },
    include: {
      response: { select: { id: true } },
      template: {
        include: { questions: { orderBy: { position: "asc" } } },
      },
    },
  });
  if (!invitation) return { state: "unavailable" as const };
  const state = evaluateSurveyAccess({
    status: invitation.status,
    expiresAt: invitation.expiresAt,
    hasResponse: Boolean(invitation.response),
  });
  return state === "unavailable" ? { state } : { state, invitation };
}
