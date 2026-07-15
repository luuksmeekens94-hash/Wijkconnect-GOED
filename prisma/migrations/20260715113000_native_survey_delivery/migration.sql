-- Recipient contact details are isolated from monitoring records and encrypted by
-- the application before they reach this table.
CREATE TYPE "wijkconnect"."SurveyRecipientType" AS ENUM ('PATIENT', 'PROFESSIONAL');
CREATE TYPE "wijkconnect"."SurveyDeliveryStatus" AS ENUM ('PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'BOUNCED', 'FAILED', 'SUPPRESSED');

CREATE TABLE "wijkconnect"."SurveyRecipient" (
    "id" TEXT NOT NULL,
    "type" "wijkconnect"."SurveyRecipientType" NOT NULL,
    "emailEncrypted" TEXT,
    "emailFingerprint" TEXT NOT NULL,
    "contactPermissionConfirmedAt" TIMESTAMP(3),
    "contactPermissionSource" TEXT,
    "contactRetentionUntil" TIMESTAMP(3),
    "contactPurgedAt" TIMESTAMP(3),
    "suppressedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SurveyRecipient_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "wijkconnect"."SurveyInvitation"
    ADD COLUMN "recipientId" TEXT,
    ADD COLUMN "campaignPeriod" TEXT,
    ADD COLUMN "dedupeKey" TEXT,
    ADD COLUMN "deliveryStatus" "wijkconnect"."SurveyDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    ADD COLUMN "deliveryProvider" TEXT,
    ADD COLUMN "initialProviderMessageId" TEXT,
    ADD COLUMN "reminderProviderMessageId" TEXT,
    ADD COLUMN "providerMessageId" TEXT,
    ADD COLUMN "sendAttempts" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "openedAt" TIMESTAMP(3),
    ADD COLUMN "deliveredAt" TIMESTAMP(3),
    ADD COLUMN "bouncedAt" TIMESTAMP(3),
    ADD COLUMN "failedAt" TIMESTAMP(3),
    ADD COLUMN "reminderSentAt" TIMESTAMP(3),
    ADD COLUMN "lastDeliveryErrorCode" TEXT;

CREATE INDEX "SurveyRecipient_emailFingerprint_type_idx" ON "wijkconnect"."SurveyRecipient"("emailFingerprint", "type");
CREATE INDEX "SurveyRecipient_suppressedAt_idx" ON "wijkconnect"."SurveyRecipient"("suppressedAt");
CREATE INDEX "SurveyRecipient_contactRetentionUntil_idx" ON "wijkconnect"."SurveyRecipient"("contactRetentionUntil");
CREATE INDEX "SurveyInvitation_deliveryStatus_createdAt_idx" ON "wijkconnect"."SurveyInvitation"("deliveryStatus", "createdAt");
CREATE INDEX "SurveyInvitation_recipientId_createdAt_idx" ON "wijkconnect"."SurveyInvitation"("recipientId", "createdAt");
CREATE INDEX "SurveyInvitation_templateId_campaignPeriod_idx" ON "wijkconnect"."SurveyInvitation"("templateId", "campaignPeriod");
-- Historical invitations remain compatible because their dedupe key is NULL.
-- New patient invitations use appointment:<id>, providing a race-safe one-per-
-- visit constraint without rewriting or deleting existing production records.
CREATE UNIQUE INDEX "SurveyInvitation_dedupeKey_key" ON "wijkconnect"."SurveyInvitation"("dedupeKey");

ALTER TABLE "wijkconnect"."SurveyInvitation"
    ADD CONSTRAINT "SurveyInvitation_recipientId_fkey"
    FOREIGN KEY ("recipientId") REFERENCES "wijkconnect"."SurveyRecipient"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
