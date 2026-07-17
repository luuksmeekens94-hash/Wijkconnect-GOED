const BREVO_TRANSACTIONAL_EMAIL_URL = "https://api.brevo.com/v3/smtp/email";

export type BrevoRecipient = {
  email: string;
  name?: string;
};

export type BrevoTransactionalEmail = {
  to: BrevoRecipient;
  subject: string;
  textContent: string;
  htmlContent: string;
  idempotencyKey: string;
  correlation: {
    invitationId: string;
    kind: "invitation" | "reminder";
    attemptId?: string;
  };
  tags?: string[];
};

export type BrevoSendResult = {
  messageId: string;
};

type BrevoConfig = {
  apiKey: string;
  senderEmail: string;
  senderName: string;
  replyToEmail?: string;
};

type BrevoErrorBody = {
  code?: string;
  message?: string;
};

export class BrevoApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super("De e-mailprovider heeft de verzending niet geaccepteerd.");
    this.name = "BrevoApiError";
    this.status = status;
    this.code = code;
  }
}

function requiredEnvironmentValue(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Ontbrekende serverconfiguratie: ${name}`);
  return value;
}

function getBrevoConfig(): BrevoConfig {
  return {
    apiKey: requiredEnvironmentValue("BREVO_API_KEY"),
    senderEmail: requiredEnvironmentValue("BREVO_SENDER_EMAIL"),
    senderName: process.env.BREVO_SENDER_NAME?.trim() || "WijkConnect",
    replyToEmail: process.env.BREVO_REPLY_TO_EMAIL?.trim() || undefined,
  };
}

function correlationHeaderValue(input: BrevoTransactionalEmail["correlation"]) {
  return JSON.stringify({
    wijkconnectInvitationId: input.invitationId,
    wijkconnectMessageKind: input.kind,
    ...(input.attemptId ? { wijkconnectDeliveryAttemptId: input.attemptId } : {}),
  });
}

/**
 * Verstuurt één transactionele e-mail via de officiële Brevo v3 API.
 * De API-key en afzender worden uitsluitend aan de serverzijde ingelezen.
 */
export async function sendBrevoTransactionalEmail(
  email: BrevoTransactionalEmail,
  fetchImplementation: typeof fetch = fetch,
): Promise<BrevoSendResult> {
  const config = getBrevoConfig();
  const response = await fetchImplementation(BREVO_TRANSACTIONAL_EMAIL_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": config.apiKey,
      "content-type": "application/json",
    },
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({
      sender: { email: config.senderEmail, name: config.senderName },
      to: [{ email: email.to.email, ...(email.to.name ? { name: email.to.name } : {}) }],
      ...(config.replyToEmail ? { replyTo: { email: config.replyToEmail, name: config.senderName } } : {}),
      subject: email.subject,
      textContent: email.textContent,
      htmlContent: email.htmlContent,
      tags: email.tags ?? ["wijkconnect-survey"],
      headers: {
        "Idempotency-Key": email.idempotencyKey,
        "X-Mailin-custom": correlationHeaderValue(email.correlation),
      },
    }),
  });

  let body: BrevoErrorBody & Partial<BrevoSendResult> = {};
  try {
    body = await response.json() as BrevoErrorBody & Partial<BrevoSendResult>;
  } catch {
    // Een niet-JSON foutantwoord bevat mogelijk providerinformatie die niet gelogd hoort te worden.
  }

  if (!response.ok || !body.messageId) {
    throw new BrevoApiError(response.status, body.code || `HTTP_${response.status}`);
  }

  return { messageId: body.messageId };
}

export function isBrevoConfigured() {
  const appUrl = (process.env.APP_URL || process.env.NEXTAUTH_URL)?.trim();
  const contactKey = process.env.SURVEY_CONTACT_ENCRYPTION_KEY?.trim() ?? "";
  const decodedContactKey = /^[a-f\d]{64}$/i.test(contactKey)
    ? Buffer.from(contactKey, "hex")
    : Buffer.from(contactKey, "base64");
  const tokenSecret = process.env.SURVEY_TOKEN_SECRET?.trim() ?? "";

  try {
    if (!appUrl || !["http:", "https:"].includes(new URL(appUrl).protocol)) return false;
  } catch {
    return false;
  }

  return Boolean(
    process.env.BREVO_API_KEY?.trim() &&
    process.env.BREVO_SENDER_EMAIL?.trim() &&
    decodedContactKey.length === 32 &&
    Buffer.byteLength(tokenSecret, "utf8") >= 32
  );
}
