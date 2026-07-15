import { bearerTokenFromRequest, verifyLongSecret } from "@/lib/request-security";
import { sendDueSurveyReminders } from "@/lib/survey-delivery";
import { purgeExpiredSurveyContacts } from "@/lib/survey-retention";

export async function GET(request: Request) {
  if (!verifyLongSecret(bearerTokenFromRequest(request), process.env.CRON_SECRET)) {
    return Response.json({ error: "Geen toegang" }, { status: 401 });
  }
  const reminders = await sendDueSurveyReminders();
  const retention = await purgeExpiredSurveyContacts();
  return Response.json({ reminders, retention }, { headers: { "Cache-Control": "no-store" } });
}
