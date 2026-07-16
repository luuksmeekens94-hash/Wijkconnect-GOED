import assert from "node:assert/strict";
import test from "node:test";
import { SurveyAudience } from "@prisma/client";
import { isBrevoConfigured, sendBrevoTransactionalEmail } from "../lib/brevo.ts";
import {
  brevoCorrelationMatches,
  decideBrevoWebhookTransition,
  parseBrevoWebhookEvent,
  webhookEventKind,
} from "../lib/brevo-webhook.ts";
import { bearerTokenFromRequest, verifyLongSecret, verifySameOrigin } from "../lib/request-security.ts";
import { buildSurveyEmail } from "../lib/survey-email.ts";
import { getPatientSurveyProgramContext } from "../lib/survey-program-context.ts";

test("Brevo-client gebruikt uitsluitend serverconfiguratie en de officiële v3-vorm", async () => {
  const previous = {
    apiKey: process.env.BREVO_API_KEY,
    senderEmail: process.env.BREVO_SENDER_EMAIL,
    senderName: process.env.BREVO_SENDER_NAME,
  };
  process.env.BREVO_API_KEY = "test-api-key";
  process.env.BREVO_SENDER_EMAIL = "vragenlijst@example.nl";
  process.env.BREVO_SENDER_NAME = "WijkConnect test";

  let requestUrl = "";
  let requestBody: Record<string, unknown> = {};
  const fetchMock = (async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    assert.equal(new Headers(init?.headers).get("api-key"), "test-api-key");
    return Response.json({ messageId: "<provider-message-id>" }, { status: 201 });
  }) as typeof fetch;

  try {
    const result = await sendBrevoTransactionalEmail({
      to: { email: "ontvanger@example.nl" },
      subject: "Wilt u uw ervaring delen?",
      textContent: "Tekst",
      htmlContent: "<p>Tekst</p>",
      idempotencyKey: "survey-test-id",
      correlation: { invitationId: "invitation-1", kind: "invitation" },
    }, fetchMock);

    assert.equal(requestUrl, "https://api.brevo.com/v3/smtp/email");
    assert.equal(result.messageId, "<provider-message-id>");
    assert.deepEqual(requestBody.sender, { email: "vragenlijst@example.nl", name: "WijkConnect test" });
    assert.deepEqual(requestBody.to, [{ email: "ontvanger@example.nl" }]);
    assert.equal((requestBody.headers as Record<string, string>)["X-Mailin-custom"], JSON.stringify({
      wijkconnectInvitationId: "invitation-1",
      wijkconnectMessageKind: "invitation",
    }));
    assert.equal(JSON.stringify(requestBody).includes("test-api-key"), false);
  } finally {
    if (previous.apiKey === undefined) delete process.env.BREVO_API_KEY;
    else process.env.BREVO_API_KEY = previous.apiKey;
    if (previous.senderEmail === undefined) delete process.env.BREVO_SENDER_EMAIL;
    else process.env.BREVO_SENDER_EMAIL = previous.senderEmail;
    if (previous.senderName === undefined) delete process.env.BREVO_SENDER_NAME;
    else process.env.BREVO_SENDER_NAME = previous.senderName;
  }
});

test("verzendstatus is pas actief als ook link- en surveysecrets geldig zijn", () => {
  const names = [
    "APP_URL",
    "BREVO_API_KEY",
    "BREVO_SENDER_EMAIL",
    "SURVEY_CONTACT_ENCRYPTION_KEY",
    "SURVEY_TOKEN_SECRET",
  ] as const;
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    process.env.APP_URL = "https://wijkconnect.example";
    process.env.BREVO_API_KEY = "test-api-key";
    process.env.BREVO_SENDER_EMAIL = "vragenlijst@example.nl";
    process.env.SURVEY_CONTACT_ENCRYPTION_KEY = Buffer.alloc(32, 4).toString("base64");
    process.env.SURVEY_TOKEN_SECRET = "t".repeat(32);
    assert.equal(isBrevoConfigured(), true);

    process.env.SURVEY_TOKEN_SECRET = "te-kort";
    assert.equal(isBrevoConfigured(), false);
  } finally {
    for (const name of names) {
      const value = previous[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test("patiëntmail noemt het juiste spreekuur zonder de neutrale onderwerpregel te veranderen", () => {
  const content = buildSurveyEmail({
    surveyUrl: "https://wijkconnect.example/vragenlijst/opaque-token",
    expiresAt: new Date("2026-08-31T12:00:00Z"),
    program: getPatientSurveyProgramContext(SurveyAudience.MOVEMENT_PATIENT),
  });
  const allContent = `${content.subject}\n${content.textContent}\n${content.htmlContent}`.toLowerCase();

  assert.match(content.subject, /ervaring/);
  assert.doesNotMatch(content.subject, /beweegspreekuur|sociaal spreekuur/);
  assert.match(content.textContent, /wijkconnect/i);
  assert.match(content.textContent, /opaque-token/);
  assert.match(allContent, /beweegspreekuur/);
  assert.doesNotMatch(allContent, /sociaal spreekuur/);
  assert.match(content.textContent, /bij de schakel heeft bezocht/i);
  assert.match(content.textContent, /geen evaluatie-uitnodigingen meer ontvangen/i);
  assert.doesNotMatch(allContent, /diagnose|behandeling|klacht/);
});

test("sociaal spreekuur wordt herkenbaar in de patiëntmail genoemd", () => {
  const content = buildSurveyEmail({
    surveyUrl: "https://wijkconnect.example/vragenlijst/opaque-token",
    program: getPatientSurveyProgramContext(SurveyAudience.SOCIAL_PATIENT),
  });
  const allContent = `${content.textContent}\n${content.htmlContent}`.toLowerCase();

  assert.match(allContent, /sociaal spreekuur/);
  assert.doesNotMatch(allContent, /beweegspreekuur/);
});

test("professionele vragenlijstmail blijft algemeen", () => {
  const content = buildSurveyEmail({
    surveyUrl: "https://wijkconnect.example/vragenlijst/opaque-token",
  });
  const allContent = `${content.subject}\n${content.textContent}\n${content.htmlContent}`.toLowerCase();

  assert.doesNotMatch(allContent, /beweegspreekuur|sociaal spreekuur/);
});

test("Brevo-webhook wordt zonder e-mailadres naar een interne status vertaald", () => {
  const event = parseBrevoWebhookEvent({
    event: "hard_bounce",
    email: "niet-opslaan@example.nl",
    "message-id": "provider-id",
    ts_event: 1786802400,
    reason: "mailbox unavailable",
    "X-Mailin-custom": JSON.stringify({
      wijkconnectInvitationId: "invitation-2",
      wijkconnectMessageKind: "invitation",
    }),
  });

  assert.equal(event?.invitationId, "invitation-2");
  assert.equal(event?.messageKind, "invitation");
  assert.equal(event?.messageId, "provider-id");
  assert.equal(webhookEventKind(event?.event ?? ""), "permanent-bounce");
  assert.equal(Object.hasOwn(event ?? {}, "email"), false);
  assert.equal(webhookEventKind("spam"), "complaint");
  assert.equal(webhookEventKind("opened"), "ignored");
});

test("webhookcorrelatie vereist zowel hetzelfde uitnodigingsnummer als providerbericht", () => {
  assert.equal(brevoCorrelationMatches(
    { invitationId: "invitation-1", messageId: "provider-1", messageKind: "invitation" },
    { id: "invitation-1", initialProviderMessageId: "<provider-1>", reminderProviderMessageId: "<provider-2>", providerMessageId: "<provider-2>" },
  ), true);
  assert.equal(brevoCorrelationMatches(
    { invitationId: "invitation-1", messageId: "provider-2", messageKind: "reminder" },
    { id: "invitation-1", initialProviderMessageId: "<provider-1>", reminderProviderMessageId: "<provider-2>", providerMessageId: "<provider-2>" },
  ), true);
  assert.equal(brevoCorrelationMatches(
    { invitationId: "invitation-ander", messageId: "provider-1", messageKind: "invitation" },
    { id: "invitation-1", initialProviderMessageId: "<provider-1>", reminderProviderMessageId: "<provider-2>", providerMessageId: "<provider-2>" },
  ), false);
  assert.equal(brevoCorrelationMatches(
    { invitationId: "invitation-1", messageId: "provider-ander", messageKind: "invitation" },
    { id: "invitation-1", initialProviderMessageId: "<provider-1>", reminderProviderMessageId: "<provider-2>", providerMessageId: "<provider-2>" },
  ), false);
});

test("historische providerMessageId is alleen fallback als het specifieke veld ontbreekt", () => {
  const historical = {
    id: "invitation-oud",
    initialProviderMessageId: null,
    reminderProviderMessageId: null,
    providerMessageId: "<historisch-provider-id>",
  };
  assert.equal(brevoCorrelationMatches(
    { invitationId: "invitation-oud", messageId: "historisch-provider-id", messageKind: "invitation" },
    historical,
  ), true);
  assert.equal(brevoCorrelationMatches(
    { invitationId: "invitation-oud", messageId: "historisch-provider-id", messageKind: "reminder" },
    historical,
  ), true);
  assert.equal(brevoCorrelationMatches(
    { invitationId: "invitation-oud", messageId: "laatste-id", messageKind: "invitation" },
    { ...historical, initialProviderMessageId: "eerste-id", providerMessageId: "laatste-id" },
  ), false);
});

test("dubbele en vertraagde webhooks veranderen terminale statussen niet", () => {
  assert.equal(decideBrevoWebhookTransition("delivered", "delivered", {
    deliveryStatus: "DELIVERED",
    lastDeliveryErrorCode: null,
    deliveredAt: new Date(),
  }), "ignored");
  assert.equal(decideBrevoWebhookTransition("delivered", "delivered", {
    deliveryStatus: "BOUNCED",
    lastDeliveryErrorCode: "hard_bounce",
    deliveredAt: null,
  }), "ignored");
  assert.equal(decideBrevoWebhookTransition("transient-bounce", "soft_bounce", {
    deliveryStatus: "DELIVERED",
    lastDeliveryErrorCode: null,
    deliveredAt: new Date(),
  }), "ignored");
  assert.equal(decideBrevoWebhookTransition("delivered", "delivered", {
    deliveryStatus: "BOUNCED",
    lastDeliveryErrorCode: "soft_bounce",
    deliveredAt: null,
  }), "delivered");
  assert.equal(decideBrevoWebhookTransition("complaint", "spam", {
    deliveryStatus: "SUPPRESSED",
    lastDeliveryErrorCode: "spam",
    deliveredAt: null,
  }), "ignored");
});

test("webhook- en cronsecret moeten lang zijn en exact overeenkomen", () => {
  const secret = "a".repeat(48);
  assert.equal(verifyLongSecret(secret, secret), true);
  assert.equal(verifyLongSecret(`${secret}x`, secret), false);
  assert.equal(verifyLongSecret("te-kort", "te-kort"), false);
  assert.equal(verifyLongSecret(null, secret), false);
  assert.equal(bearerTokenFromRequest(new Request("https://example.test", {
    headers: { authorization: `Bearer ${secret}` },
  })), secret);
  assert.equal(bearerTokenFromRequest(new Request("https://example.test", {
    headers: { authorization: `Basic ${secret}` },
  })), null);
});

test("handmatige verzendroute vereist exact dezelfde origin", () => {
  const previous = process.env.APP_URL;
  process.env.APP_URL = "https://wijkconnect.example";
  try {
    assert.equal(verifySameOrigin(new Request("https://wijkconnect.example/api/send", {
      method: "POST",
      headers: { origin: "https://wijkconnect.example" },
    })), true);
    assert.equal(verifySameOrigin(new Request("https://wijkconnect.example/api/send", {
      method: "POST",
      headers: { origin: "https://kwaad.example" },
    })), false);
    assert.equal(verifySameOrigin(new Request("https://wijkconnect.example/api/send", { method: "POST" })), false);
  } finally {
    if (previous === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previous;
  }
});
