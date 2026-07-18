import type { SurveyEmailAudienceContext } from "@/lib/survey-program-context";

export type SurveyEmailContent = {
  subject: string;
  textContent: string;
  htmlContent: string;
};

export function surveyEmailUsesReminderCopy(persistedMode: string) {
  switch (persistedMode) {
    case "initial":
    case "manual-reminder":
    case "legacy-initial":
    case "legacy-fallback-initial":
    case "legacy-unresolved-initial":
      return false;
    case "scheduled-reminder":
    case "legacy-reminder":
    case "legacy-fallback-reminder":
    case "legacy-unresolved-reminder":
      return true;
    default:
      throw new Error("Onbekende vragenlijst-verzendmodus");
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatExpiryDate(date?: Date | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Amsterdam",
  }).format(date);
}

export function buildSurveyEmail(input: {
  surveyUrl: string;
  reminder?: boolean;
  expiresAt?: Date | null;
  audience?: SurveyEmailAudienceContext | null;
}): SurveyEmailContent {
  const surveyUrl = new URL(input.surveyUrl);
  if (!["https:", "http:"].includes(surveyUrl.protocol)) {
    throw new Error("Ongeldige vragenlijstlink");
  }

  const reminder = input.reminder ?? false;
  const expiryDate = formatExpiryDate(input.expiresAt);
  const subject = input.audience
    ? reminder ? input.audience.reminderSubject : input.audience.subject
    : reminder ? "Herinnering: wilt u uw ervaring delen?" : "Wilt u uw ervaring met ons delen?";
  const introduction = input.audience
    ? reminder ? input.audience.reminderIntroduction : input.audience.introduction
    : reminder
      ? "Onlangs ontving u van ons een uitnodiging voor een korte vragenlijst. Als u deze nog niet heeft ingevuld, horen wij graag uw ervaring."
      : "Wij horen graag hoe u onze dienstverlening heeft ervaren. Daarom nodigen wij u uit voor een korte vragenlijst.";
  const expiryText = expiryDate ? ` U kunt de vragenlijst invullen tot en met ${expiryDate}.` : "";

  const textContent = [
    "Beste meneer/mevrouw,",
    "",
    ...(input.audience ? [`Deze vragenlijst gaat over: ${input.audience.badge}`, ""] : []),
    introduction,
    `Invullen duurt maar enkele minuten.${expiryText}`,
    "",
    `Open de vragenlijst: ${surveyUrl.toString()}`,
    "",
    "Uw antwoorden worden vertrouwelijk verwerkt. Uw naam en antwoorden staan niet in deze e-mail.",
    "Heeft u de vragenlijst al ingevuld? Dan hoeft u niets meer te doen.",
    "Wilt u geen evaluatie-uitnodigingen meer ontvangen? Beantwoord deze e-mail; dan blokkeren wij vervolguitnodigingen.",
    "",
    "Met vriendelijke groet,",
    "Huisartsenpraktijk De Schakel",
    "via WijkConnect",
  ].join("\n");

  const escapedUrl = escapeHtml(surveyUrl.toString());
  const htmlContent = `<!doctype html>
<html lang="nl">
  <body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a">
    <div style="display:none;max-height:0;overflow:hidden">Een korte uitnodiging van WijkConnect.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:24px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border-radius:16px">
          <tr><td style="padding:32px">
            <p style="margin:0 0 20px;font-size:13px;font-weight:700;letter-spacing:2px;color:#2563eb">WIJKCONNECT</p>
            ${input.audience ? `<p style="display:inline-block;margin:0 0 16px;padding:7px 11px;border-radius:999px;background:#e0f2fe;color:#0369a1;font-size:13px;font-weight:700">${escapeHtml(input.audience.badge)}</p>` : ""}
            <h1 style="margin:0 0 20px;font-size:26px;line-height:1.25">${escapeHtml(subject)}</h1>
            <p style="margin:0 0 16px;line-height:1.6">Beste meneer/mevrouw,</p>
            <p style="margin:0 0 16px;line-height:1.6">${escapeHtml(introduction)}</p>
            <p style="margin:0 0 24px;line-height:1.6">Invullen duurt maar enkele minuten.${escapeHtml(expiryText)}</p>
            <p style="margin:0 0 28px"><a href="${escapedUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:10px">Vragenlijst openen</a></p>
            <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#475569">Uw antwoorden worden vertrouwelijk verwerkt. Uw naam en antwoorden staan niet in deze e-mail.</p>
            <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#475569">Heeft u de vragenlijst al ingevuld? Dan hoeft u niets meer te doen.</p>
            <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569">Wilt u geen evaluatie-uitnodigingen meer ontvangen? Beantwoord deze e-mail; dan blokkeren wij vervolguitnodigingen.</p>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#0f172a">Met vriendelijke groet,<br><strong>Huisartsenpraktijk De Schakel</strong><br><span style="color:#64748b">via WijkConnect</span></p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, textContent, htmlContent };
}
