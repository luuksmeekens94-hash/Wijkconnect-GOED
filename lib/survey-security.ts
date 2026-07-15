import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const EMAIL_CIPHER_VERSION = "v1";
const TOKEN_VERSION = "v1";

function requiredEnvironmentValue(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} ontbreekt in de omgevingsvariabelen`);
  return value;
}

function surveyContactMasterKey() {
  const configured = requiredEnvironmentValue("SURVEY_CONTACT_ENCRYPTION_KEY");
  const key = /^[a-f\d]{64}$/i.test(configured)
    ? Buffer.from(configured, "hex")
    : Buffer.from(configured, "base64");

  if (key.length !== 32) {
    throw new Error("SURVEY_CONTACT_ENCRYPTION_KEY moet exact 32 bytes zijn (base64 of 64 hex-tekens)");
  }
  return key;
}

function surveyContactSubkey(purpose: "email-encryption" | "email-fingerprint") {
  return Buffer.from(hkdfSync(
    "sha256",
    surveyContactMasterKey(),
    Buffer.from("wijkconnect:survey-contact:v1", "utf8"),
    Buffer.from(purpose, "utf8"),
    32,
  ));
}

function surveyTokenSecret() {
  const secret = requiredEnvironmentValue("SURVEY_TOKEN_SECRET");
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("SURVEY_TOKEN_SECRET moet minimaal 32 tekens lang zijn");
  }
  return secret;
}

export function normalizeSurveyRecipientEmail(email: string) {
  return email.trim().toLowerCase();
}

export function encryptSurveyRecipientEmail(email: string) {
  const normalized = normalizeSurveyRecipientEmail(email);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", surveyContactSubkey("email-encryption"), iv);
  cipher.setAAD(Buffer.from("wijkconnect:survey-recipient-email:v1", "utf8"));
  const ciphertext = Buffer.concat([cipher.update(normalized, "utf8"), cipher.final()]);
  const authenticationTag = cipher.getAuthTag();

  return [
    EMAIL_CIPHER_VERSION,
    iv.toString("base64url"),
    authenticationTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptSurveyRecipientEmail(encrypted: string) {
  const [version, ivValue, authenticationTagValue, ciphertextValue, ...rest] = encrypted.split(".");
  if (
    version !== EMAIL_CIPHER_VERSION ||
    !ivValue ||
    !authenticationTagValue ||
    !ciphertextValue ||
    rest.length > 0
  ) {
    throw new Error("Ongeldig versleuteld e-mailadres");
  }

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      surveyContactSubkey("email-encryption"),
      Buffer.from(ivValue, "base64url"),
    );
    decipher.setAAD(Buffer.from("wijkconnect:survey-recipient-email:v1", "utf8"));
    decipher.setAuthTag(Buffer.from(authenticationTagValue, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error("E-mailadres kon niet veilig worden ontsleuteld");
  }
}

export function fingerprintSurveyRecipientEmail(email: string) {
  return createHmac("sha256", surveyContactSubkey("email-fingerprint"))
    .update("wijkconnect:survey-recipient-fingerprint:v1:")
    .update(normalizeSurveyRecipientEmail(email))
    .digest("hex");
}

export function getSurveyAccessToken(invitationId: string) {
  if (!invitationId || invitationId.length > 128) throw new Error("Ongeldig uitnodigingsnummer");
  const encodedId = Buffer.from(invitationId, "utf8").toString("base64url");
  const signature = createHmac("sha256", surveyTokenSecret())
    .update(`${TOKEN_VERSION}.${encodedId}`)
    .digest("base64url");
  return `${TOKEN_VERSION}.${encodedId}.${signature}`;
}

export function hashSurveyAccessToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function getProfessionalSurveyDedupeKey(
  templateId: string,
  emailFingerprint: string,
  campaignPeriod: string,
) {
  if (!templateId || !emailFingerprint || !campaignPeriod) throw new Error("Onvolledige campagnegegevens");
  const digest = createHmac("sha256", surveyTokenSecret())
    .update("wijkconnect:professional-survey-dedupe:v1:")
    .update(templateId)
    .update(":")
    .update(emailFingerprint)
    .update(":")
    .update(campaignPeriod)
    .digest("hex");
  return `professional:${digest}`;
}

export function verifySurveyAccessToken(token: string): { invitationId: string } | null {
  if (!token || token.length > 512) return null;
  const [version, encodedId, providedSignature, ...rest] = token.split(".");
  if (version !== TOKEN_VERSION || !encodedId || !providedSignature || rest.length > 0) return null;

  let invitationId: string;
  try {
    invitationId = Buffer.from(encodedId, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!invitationId || invitationId.length > 128) return null;

  const expectedToken = getSurveyAccessToken(invitationId);
  const expectedSignature = expectedToken.split(".")[2];
  const provided = Buffer.from(providedSignature, "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

  return { invitationId };
}

export function maskSurveyRecipientEmail(email: string) {
  const [local, domain] = normalizeSurveyRecipientEmail(email).split("@");
  if (!local || !domain) return "afgeschermd";
  return `${local.slice(0, 1)}${"*".repeat(Math.min(Math.max(local.length - 1, 2), 6))}@${domain}`;
}
