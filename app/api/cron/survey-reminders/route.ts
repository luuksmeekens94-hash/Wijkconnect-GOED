import { bearerTokenFromRequest, verifyLongSecret } from "@/lib/request-security";
import { sendDueSurveyReminders } from "@/lib/survey-delivery";
import { purgeExpiredSurveyContacts } from "@/lib/survey-retention";
import { purgeExpiredMonitoringParticipantContacts } from "@/lib/monitoring-contact-retention";

export async function GET(request: Request) {
  if (!verifyLongSecret(bearerTokenFromRequest(request), process.env.CRON_SECRET)) {
    return Response.json({ error: "Geen toegang" }, { status: 401 });
  }
  const reminders = await sendDueSurveyReminders();
  const [retention, monitoringRetention] = await Promise.all([
    purgeExpiredSurveyContacts(),
    purgeExpiredMonitoringParticipantContacts(),
  ]);
  return Response.json({ reminders, retention, monitoringRetention }, { headers: { "Cache-Control": "no-store" } });
}
