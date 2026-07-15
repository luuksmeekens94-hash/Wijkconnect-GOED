import assert from "node:assert/strict";
import test from "node:test";
import {
  decryptSurveyRecipientEmail,
  encryptSurveyRecipientEmail,
  fingerprintSurveyRecipientEmail,
  getSurveyAccessToken,
  hashSurveyAccessToken,
  maskSurveyRecipientEmail,
  verifySurveyAccessToken,
} from "../lib/survey-security.ts";

process.env.SURVEY_CONTACT_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
process.env.SURVEY_TOKEN_SECRET = "test-secret-with-at-least-thirty-two-characters";

test("e-mail wordt genormaliseerd en met unieke AES-GCM nonce versleuteld", () => {
  const first = encryptSurveyRecipientEmail(" Patient@Example.nl ");
  const second = encryptSurveyRecipientEmail("patient@example.nl");
  assert.notEqual(first, second);
  assert.equal(first.includes("patient@example.nl"), false);
  assert.equal(decryptSurveyRecipientEmail(first), "patient@example.nl");
  assert.equal(decryptSurveyRecipientEmail(second), "patient@example.nl");
  assert.equal(
    fingerprintSurveyRecipientEmail("Patient@Example.nl"),
    fingerprintSurveyRecipientEmail(" patient@example.nl "),
  );
});

test("gewijzigde ciphertext wordt geweigerd", () => {
  const encrypted = encryptSurveyRecipientEmail("patient@example.nl");
  const changed = `${encrypted.slice(0, -1)}${encrypted.endsWith("a") ? "b" : "a"}`;
  assert.throws(() => decryptSurveyRecipientEmail(changed), /kon niet veilig worden ontsleuteld/);
});

test("toegangstoken is deterministisch, controleerbaar en alleen gehasht op te slaan", () => {
  const token = getSurveyAccessToken("invitation-123");
  assert.equal(getSurveyAccessToken("invitation-123"), token);
  assert.deepEqual(verifySurveyAccessToken(token), { invitationId: "invitation-123" });
  assert.equal(hashSurveyAccessToken(token).length, 64);
  assert.equal(verifySurveyAccessToken(`${token.slice(0, -1)}x`), null);
});

test("e-mailadres kan gemaskeerd in het beheer worden getoond", () => {
  assert.equal(maskSurveyRecipientEmail("patient@example.nl"), "p******@example.nl");
});
