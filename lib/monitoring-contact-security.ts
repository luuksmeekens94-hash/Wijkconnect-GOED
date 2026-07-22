import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
} from "node:crypto";

const CIPHER_VERSION = "v1";

function contactMasterKey() {
  const configured = (
    process.env.MONITORING_CONTACT_ENCRYPTION_KEY ||
    process.env.SURVEY_CONTACT_ENCRYPTION_KEY
  )?.trim();
  if (!configured) {
    throw new Error("MONITORING_CONTACT_ENCRYPTION_KEY of SURVEY_CONTACT_ENCRYPTION_KEY ontbreekt");
  }

  const key = /^[a-f\d]{64}$/i.test(configured)
    ? Buffer.from(configured, "hex")
    : Buffer.from(configured, "base64");
  if (key.length !== 32) {
    throw new Error("De sleutel voor patiëntcontacten moet exact 32 bytes zijn");
  }
  return key;
}

function contactSubkey(purpose: "encryption" | "fingerprint") {
  return Buffer.from(hkdfSync(
    "sha256",
    contactMasterKey(),
    Buffer.from("wijkconnect:monitoring-contact:v1", "utf8"),
    Buffer.from(purpose, "utf8"),
    32,
  ));
}

function encryptContactValue(value: string, field: "name" | "email") {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", contactSubkey("encryption"), iv);
  cipher.setAAD(Buffer.from(`wijkconnect:monitoring-contact:${field}:v1`, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    CIPHER_VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

function decryptContactValue(encrypted: string, field: "name" | "email") {
  const [version, ivValue, tagValue, ciphertextValue, ...rest] = encrypted.split(".");
  if (version !== CIPHER_VERSION || !ivValue || !tagValue || !ciphertextValue || rest.length > 0) {
    throw new Error("Ongeldige versleutelde patiëntcontactwaarde");
  }

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      contactSubkey("encryption"),
      Buffer.from(ivValue, "base64url"),
    );
    decipher.setAAD(Buffer.from(`wijkconnect:monitoring-contact:${field}:v1`, "utf8"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error("Patiëntcontact kon niet veilig worden ontsleuteld");
  }
}

export function normalizeMonitoringPatientName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

export function normalizeMonitoringPatientEmail(value: string) {
  return value.trim().toLowerCase();
}

export function encryptMonitoringPatientName(value: string) {
  return encryptContactValue(normalizeMonitoringPatientName(value), "name");
}

export function decryptMonitoringPatientName(value: string) {
  return decryptContactValue(value, "name");
}

export function encryptMonitoringPatientEmail(value: string) {
  return encryptContactValue(normalizeMonitoringPatientEmail(value), "email");
}

export function decryptMonitoringPatientEmail(value: string) {
  return decryptContactValue(value, "email");
}

export function fingerprintMonitoringPatientIdentity(name: string, email: string) {
  return createHmac("sha256", contactSubkey("fingerprint"))
    .update("wijkconnect:monitoring-identity:v1:")
    .update(normalizeMonitoringPatientName(name).toLocaleLowerCase("nl-NL"))
    .update(":")
    .update(normalizeMonitoringPatientEmail(email))
    .digest("hex");
}

export function monitoringPseudonymFromFingerprint(fingerprint: string) {
  return `WC-${fingerprint.slice(0, 20).toUpperCase()}`;
}

export function maskMonitoringPatientEmail(email: string) {
  const normalized = normalizeMonitoringPatientEmail(email);
  const [local, domain] = normalized.split("@");
  if (!local || !domain) return "afgeschermd";
  return `${local.slice(0, 1)}${"*".repeat(Math.min(Math.max(local.length - 1, 2), 6))}@${domain}`;
}
