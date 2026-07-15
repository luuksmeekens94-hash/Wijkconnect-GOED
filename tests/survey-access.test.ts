import assert from "node:assert/strict";
import test from "node:test";
import { SurveyInvitationStatus } from "@prisma/client";
import { evaluateSurveyAccess } from "../lib/survey-access.ts";

const now = new Date("2026-07-15T12:00:00.000Z");

test("alleen voorbereide, verstuurde of geopende uitnodigingen zijn invulbaar", () => {
  for (const status of [
    SurveyInvitationStatus.READY,
    SurveyInvitationStatus.SENT,
    SurveyInvitationStatus.OPENED,
  ]) {
    assert.equal(evaluateSurveyAccess({ status, expiresAt: new Date("2026-07-16T00:00:00.000Z"), hasResponse: false }, now), "available");
  }
  assert.equal(evaluateSurveyAccess({ status: SurveyInvitationStatus.DRAFT, expiresAt: null, hasResponse: false }, now), "unavailable");
  assert.equal(evaluateSurveyAccess({ status: SurveyInvitationStatus.CANCELLED, expiresAt: null, hasResponse: false }, now), "unavailable");
});

test("verlopen en reeds beantwoorde links kunnen niet opnieuw worden ingevuld", () => {
  assert.equal(evaluateSurveyAccess({ status: SurveyInvitationStatus.SENT, expiresAt: new Date("2026-07-15T11:59:59.000Z"), hasResponse: false }, now), "expired");
  assert.equal(evaluateSurveyAccess({ status: SurveyInvitationStatus.EXPIRED, expiresAt: null, hasResponse: false }, now), "expired");
  assert.equal(evaluateSurveyAccess({ status: SurveyInvitationStatus.COMPLETED, expiresAt: null, hasResponse: false }, now), "completed");
  assert.equal(evaluateSurveyAccess({ status: SurveyInvitationStatus.SENT, expiresAt: null, hasResponse: true }, now), "completed");
});
