import assert from "node:assert/strict";
import test from "node:test";
import { PatientJourneyDiscipline, PatientJourneyOutcome } from "@prisma/client";
import {
  journeyOutcomeToMonitoringOutcome,
  journeyOutcomeNeedsDestination,
  patientJourneyOutcomeAllowed,
} from "../lib/patient-journey.ts";

test("fysio- en sociale vervolgstappen blijven gescheiden", () => {
  assert.equal(patientJourneyOutcomeAllowed(PatientJourneyDiscipline.PHYSIOTHERAPY, PatientJourneyOutcome.EXERCISES_AND_ADVICE), true);
  assert.equal(patientJourneyOutcomeAllowed(PatientJourneyDiscipline.PHYSIOTHERAPY, PatientJourneyOutcome.NEIGHBORHOOD_TEAM_TRAJECTORY), false);
  assert.equal(patientJourneyOutcomeAllowed(PatientJourneyDiscipline.SOCIAL, PatientJourneyOutcome.NEIGHBORHOOD_TEAM_TRAJECTORY), true);
  assert.equal(patientJourneyOutcomeAllowed(PatientJourneyDiscipline.SOCIAL, PatientJourneyOutcome.PRIMARY_CARE_PHYSIOTHERAPY), false);
});

test("een vervolgstap voedt ook de bestaande monitoringuitkomst", () => {
  assert.equal(
    journeyOutcomeToMonitoringOutcome(PatientJourneyDiscipline.PHYSIOTHERAPY, PatientJourneyOutcome.EXERCISES_AND_ADVICE),
    "ONE_OFF_PHYSIO",
  );
  assert.equal(
    journeyOutcomeToMonitoringOutcome(PatientJourneyDiscipline.SOCIAL, PatientJourneyOutcome.NEIGHBORHOOD_TEAM_TRAJECTORY),
    "SUPPORT_STARTED",
  );
});

test("doorverwijzingen naar een andere partij vereisen een bestemming", () => {
  assert.equal(journeyOutcomeNeedsDestination(PatientJourneyOutcome.PRIMARY_CARE_PHYSIOTHERAPY), true);
  assert.equal(journeyOutcomeNeedsDestination(PatientJourneyOutcome.REFERRED_TO_OTHER_SOCIAL_ORGANIZATION), true);
  assert.equal(journeyOutcomeNeedsDestination(PatientJourneyOutcome.NO_FOLLOW_UP_NEEDED), false);
});
