import assert from "node:assert/strict";
import test from "node:test";
import {
  isSurveyCampaignPeriod,
  shiftSurveyCampaignPeriod,
  surveyCampaignPeriodForDate,
  surveyCampaignPeriodOptions,
} from "../lib/survey-campaign.ts";
import { isSurveyContactRetentionExpired } from "../lib/survey-retention-policy.ts";
import { getProfessionalSurveyDedupeKey } from "../lib/survey-security.ts";

process.env.SURVEY_TOKEN_SECRET = "test-secret-with-at-least-thirty-two-characters";

test("campagneperioden zijn zichtbare kalenderkwartalen", () => {
  const now = new Date("2026-07-15T12:00:00.000Z");
  assert.equal(surveyCampaignPeriodForDate(now), "2026-Q3");
  assert.equal(shiftSurveyCampaignPeriod("2026-Q4", 1), "2027-Q1");
  assert.equal(shiftSurveyCampaignPeriod("2026-Q1", -1), "2025-Q4");
  assert.deepEqual(surveyCampaignPeriodOptions(now), ["2026-Q2", "2026-Q3", "2026-Q4", "2027-Q1", "2027-Q2", "2027-Q3"]);
  assert.equal(isSurveyCampaignPeriod("2026-q3"), true);
  assert.equal(isSurveyCampaignPeriod("2026-03"), false);
});

test("professionaldedupe geldt exact per template, fingerprint en campagneperiode", () => {
  const original = getProfessionalSurveyDedupeKey("template-a", "fingerprint-a", "2026-Q3");
  assert.equal(original, getProfessionalSurveyDedupeKey("template-a", "fingerprint-a", "2026-Q3"));
  assert.notEqual(original, getProfessionalSurveyDedupeKey("template-b", "fingerprint-a", "2026-Q3"));
  assert.notEqual(original, getProfessionalSurveyDedupeKey("template-a", "fingerprint-b", "2026-Q3"));
  assert.notEqual(original, getProfessionalSurveyDedupeKey("template-a", "fingerprint-a", "2026-Q4"));
  assert.match(original, /^professional:[a-f\d]{64}$/);
});

test("contactretentie wist alleen aanwezige ciphertext na de bewaartermijn", () => {
  const now = new Date("2026-07-15T12:00:00.000Z");
  assert.equal(isSurveyContactRetentionExpired(new Date("2026-07-15T11:59:59.000Z"), "ciphertext", now), true);
  assert.equal(isSurveyContactRetentionExpired(new Date("2026-07-15T12:00:01.000Z"), "ciphertext", now), false);
  assert.equal(isSurveyContactRetentionExpired(null, "ciphertext", now), false);
  assert.equal(isSurveyContactRetentionExpired(new Date("2026-07-01T00:00:00.000Z"), null, now), false);
});
