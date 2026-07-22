import assert from "node:assert/strict";
import test from "node:test";
import {
  decryptMonitoringPatientEmail,
  decryptMonitoringPatientName,
  encryptMonitoringPatientEmail,
  encryptMonitoringPatientName,
  fingerprintMonitoringPatientIdentity,
  monitoringPseudonymFromFingerprint,
} from "../lib/monitoring-contact-security.ts";

process.env.MONITORING_CONTACT_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");

test("patiëntnaam en e-mail worden versleuteld en correct ontsleuteld", () => {
  const encryptedName = encryptMonitoringPatientName("  Mevrouw   De Vries ");
  const encryptedEmail = encryptMonitoringPatientEmail("PATIENT@EXAMPLE.NL ");
  assert.notEqual(encryptedName, "Mevrouw De Vries");
  assert.notEqual(encryptedEmail, "patient@example.nl");
  assert.equal(decryptMonitoringPatientName(encryptedName), "Mevrouw De Vries");
  assert.equal(decryptMonitoringPatientEmail(encryptedEmail), "patient@example.nl");
});

test("dezelfde identiteit krijgt een stabiele niet-herleidbare koppelsleutel", () => {
  const first = fingerprintMonitoringPatientIdentity("Jan Jansen", "jan@example.nl");
  const same = fingerprintMonitoringPatientIdentity(" jan   jansen ", "JAN@EXAMPLE.NL");
  const other = fingerprintMonitoringPatientIdentity("Piet Jansen", "jan@example.nl");
  assert.equal(first, same);
  assert.notEqual(first, other);
  assert.match(monitoringPseudonymFromFingerprint(first), /^WC-[A-F0-9]{20}$/);
});
