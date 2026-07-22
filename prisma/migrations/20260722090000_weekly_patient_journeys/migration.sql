-- Add the dedicated physiotherapist portal role.
ALTER TYPE "wijkconnect"."Role" ADD VALUE IF NOT EXISTS 'PHYSIOTHERAPIST';

-- "Unknown" must remain a valid choice when the social help request is not clear yet.
ALTER TYPE "wijkconnect"."MonitoringSocialReason" ADD VALUE IF NOT EXISTS 'UNKNOWN';

CREATE TYPE "wijkconnect"."PatientJourneyDiscipline" AS ENUM ('PHYSIOTHERAPY', 'SOCIAL');

CREATE TYPE "wijkconnect"."PatientJourneyOutcome" AS ENUM (
  'EXERCISES_AND_ADVICE',
  'FOLLOW_UP_MOVEMENT_CLINIC',
  'PRIMARY_CARE_PHYSIOTHERAPY',
  'REFERRED_TO_SOCIAL_CLINIC',
  'REFERRED_TO_SOCIAL_PROFESSIONAL',
  'RETURNED_TO_GP',
  'NEIGHBORHOOD_TEAM_TRAJECTORY',
  'WELFARE_TRAJECTORY',
  'REFERRED_TO_OTHER_SOCIAL_ORGANIZATION',
  'FOLLOW_UP_SOCIAL_CLINIC',
  'ADVICE_OR_INFORMATION_ONLY',
  'NO_FOLLOW_UP_NEEDED',
  'CONTACT_UNSUCCESSFUL',
  'OTHER',
  'UNKNOWN'
);

ALTER TABLE "wijkconnect"."MonitoringParticipant"
  ADD COLUMN "identityFingerprint" TEXT,
  ADD COLUMN "displayNameEncrypted" TEXT,
  ADD COLUMN "emailEncrypted" TEXT,
  ADD COLUMN "contactPermissionConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "contactRetentionUntil" TIMESTAMP(3),
  ADD COLUMN "contactPurgedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "MonitoringParticipant_identityFingerprint_key"
  ON "wijkconnect"."MonitoringParticipant"("identityFingerprint");

CREATE INDEX "MonitoringParticipant_contactRetentionUntil_idx"
  ON "wijkconnect"."MonitoringParticipant"("contactRetentionUntil");

CREATE TABLE "wijkconnect"."PatientJourneyUpdate" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "discipline" "wijkconnect"."PatientJourneyDiscipline" NOT NULL,
  "outcome" "wijkconnect"."PatientJourneyOutcome" NOT NULL,
  "destination" TEXT,
  "note" TEXT,
  "occurredAt" DATE NOT NULL,
  "recordedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PatientJourneyUpdate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PatientJourneyUpdate_caseId_occurredAt_idx"
  ON "wijkconnect"."PatientJourneyUpdate"("caseId", "occurredAt");

CREATE INDEX "PatientJourneyUpdate_discipline_outcome_occurredAt_idx"
  ON "wijkconnect"."PatientJourneyUpdate"("discipline", "outcome", "occurredAt");

CREATE INDEX "PatientJourneyUpdate_recordedById_occurredAt_idx"
  ON "wijkconnect"."PatientJourneyUpdate"("recordedById", "occurredAt");

ALTER TABLE "wijkconnect"."PatientJourneyUpdate"
  ADD CONSTRAINT "PatientJourneyUpdate_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "wijkconnect"."MonitoringCase"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wijkconnect"."PatientJourneyUpdate"
  ADD CONSTRAINT "PatientJourneyUpdate_recordedById_fkey"
  FOREIGN KEY ("recordedById") REFERENCES "wijkconnect"."User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
