-- Keep every survey email delivery attempt so retries can reuse the same
-- idempotency key and webhooks can still correlate older provider messages.
CREATE TYPE "wijkconnect"."SurveyDeliveryAttemptKind" AS ENUM ('INVITATION', 'REMINDER');
CREATE TYPE "wijkconnect"."SurveyDeliveryAttemptStatus" AS ENUM ('QUEUED', 'UNCERTAIN', 'SENT', 'FAILED');

CREATE TABLE "wijkconnect"."SurveyDeliveryAttempt" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "kind" "wijkconnect"."SurveyDeliveryAttemptKind" NOT NULL,
    "status" "wijkconnect"."SurveyDeliveryAttemptStatus" NOT NULL DEFAULT 'QUEUED',
    "mode" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'brevo',
    "providerMessageId" TEXT,
    "tryCount" INTEGER NOT NULL DEFAULT 1,
    "lastAttemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retryUntil" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyDeliveryAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SurveyDeliveryAttempt_idempotencyKey_key"
    ON "wijkconnect"."SurveyDeliveryAttempt"("idempotencyKey");
CREATE UNIQUE INDEX "SurveyDeliveryAttempt_providerMessageId_key"
    ON "wijkconnect"."SurveyDeliveryAttempt"("providerMessageId");
CREATE INDEX "SurveyDeliveryAttempt_invitationId_kind_createdAt_idx"
    ON "wijkconnect"."SurveyDeliveryAttempt"("invitationId", "kind", "createdAt");
CREATE INDEX "SurveyDeliveryAttempt_status_lastAttemptedAt_idx"
    ON "wijkconnect"."SurveyDeliveryAttempt"("status", "lastAttemptedAt");

-- Preserve every provider message that was already known before this ledger
-- existed. The invitation columns remain as a compatibility summary only.
WITH "legacyMessages" AS (
    SELECT
        "id" AS "invitationId",
        'INVITATION'::"wijkconnect"."SurveyDeliveryAttemptKind" AS "kind",
        'legacy-initial'::TEXT AS "mode",
        NULLIF(TRIM(BOTH '<>' FROM "initialProviderMessageId"), '') AS "providerMessageId",
        COALESCE("sentAt", "invitedAt", "createdAt") AS "acceptedAt",
        1 AS "priority"
    FROM "wijkconnect"."SurveyInvitation"
    WHERE "initialProviderMessageId" IS NOT NULL

    UNION ALL

    SELECT
        "id",
        'REMINDER'::"wijkconnect"."SurveyDeliveryAttemptKind",
        'legacy-reminder'::TEXT,
        NULLIF(TRIM(BOTH '<>' FROM "reminderProviderMessageId"), ''),
        COALESCE("reminderSentAt", "sentAt", "createdAt"),
        2
    FROM "wijkconnect"."SurveyInvitation"
    WHERE "reminderProviderMessageId" IS NOT NULL

    UNION ALL

    SELECT
        "id",
        CASE
            WHEN "initialProviderMessageId" IS NULL
             AND "reminderProviderMessageId" IS NULL
             AND "reminderSentAt" IS NULL
            THEN 'INVITATION'::"wijkconnect"."SurveyDeliveryAttemptKind"
            ELSE 'REMINDER'::"wijkconnect"."SurveyDeliveryAttemptKind"
        END,
        CASE
            WHEN "initialProviderMessageId" IS NULL
             AND "reminderProviderMessageId" IS NULL
             AND "reminderSentAt" IS NULL
            THEN 'legacy-fallback-initial'::TEXT
            ELSE 'legacy-fallback-reminder'::TEXT
        END,
        NULLIF(TRIM(BOTH '<>' FROM "providerMessageId"), ''),
        COALESCE("reminderSentAt", "sentAt", "createdAt"),
        3
    FROM "wijkconnect"."SurveyInvitation"
    WHERE "providerMessageId" IS NOT NULL
), "deduplicatedMessages" AS (
    SELECT DISTINCT ON ("invitationId", "providerMessageId") *
    FROM "legacyMessages"
    WHERE "providerMessageId" IS NOT NULL
    ORDER BY "invitationId", "providerMessageId", "priority"
)
INSERT INTO "wijkconnect"."SurveyDeliveryAttempt" (
    "id", "invitationId", "kind", "status", "mode", "idempotencyKey",
    "provider", "providerMessageId", "tryCount", "lastAttemptedAt",
    "sentAt", "createdAt", "updatedAt"
)
SELECT
    'legacy-' || md5("invitationId" || ':' || "providerMessageId"),
    "invitationId",
    "kind",
    'SENT'::"wijkconnect"."SurveyDeliveryAttemptStatus",
    "mode",
    'legacy-' || md5("invitationId" || ':' || "providerMessageId" || ':' || "mode"),
    'brevo',
    "providerMessageId",
    1,
    "acceptedAt",
    "acceptedAt",
    "acceptedAt",
    CURRENT_TIMESTAMP
FROM "deduplicatedMessages"
ON CONFLICT ("providerMessageId") DO NOTHING;

-- Preserve the old deterministic key for unresolved pre-migration sends. They
-- fail closed after the historical provider window instead of silently using a
-- new key and possibly delivering a duplicate.
INSERT INTO "wijkconnect"."SurveyDeliveryAttempt" (
    "id", "invitationId", "kind", "status", "mode", "idempotencyKey",
    "provider", "tryCount", "lastAttemptedAt", "retryUntil", "lastErrorCode",
    "createdAt", "updatedAt"
)
SELECT
    'legacy-unresolved-initial-' || md5("id"),
    "id",
    'INVITATION'::"wijkconnect"."SurveyDeliveryAttemptKind",
    'UNCERTAIN'::"wijkconnect"."SurveyDeliveryAttemptStatus",
    'legacy-unresolved-initial',
    'wijkconnect-survey-' || "id" || '-invitation',
    'brevo',
    GREATEST("sendAttempts", 1),
    "updatedAt",
    "updatedAt" + INTERVAL '10 minutes',
    COALESCE("lastDeliveryErrorCode", 'LEGACY_UNRESOLVED'),
    "updatedAt",
    CURRENT_TIMESTAMP
FROM "wijkconnect"."SurveyInvitation"
WHERE "status" = 'READY'
  AND "deliveryStatus" IN ('QUEUED', 'FAILED')
  AND "initialProviderMessageId" IS NULL
  AND "providerMessageId" IS NULL
ON CONFLICT ("idempotencyKey") DO NOTHING;

INSERT INTO "wijkconnect"."SurveyDeliveryAttempt" (
    "id", "invitationId", "kind", "status", "mode", "idempotencyKey",
    "provider", "tryCount", "lastAttemptedAt", "retryUntil", "lastErrorCode",
    "createdAt", "updatedAt"
)
SELECT
    'legacy-unresolved-reminder-' || md5("id"),
    "id",
    'REMINDER'::"wijkconnect"."SurveyDeliveryAttemptKind",
    'UNCERTAIN'::"wijkconnect"."SurveyDeliveryAttemptStatus",
    'legacy-unresolved-reminder',
    'wijkconnect-survey-' || "id" || '-reminder',
    'brevo',
    GREATEST("sendAttempts", 1),
    COALESCE("failedAt", "updatedAt"),
    COALESCE("failedAt", "updatedAt") + INTERVAL '10 minutes',
    COALESCE("lastDeliveryErrorCode", 'LEGACY_UNRESOLVED'),
    COALESCE("failedAt", "updatedAt"),
    CURRENT_TIMESTAMP
FROM "wijkconnect"."SurveyInvitation"
WHERE "status" IN ('SENT', 'OPENED')
  AND "failedAt" IS NOT NULL
  AND "lastDeliveryErrorCode" IS NOT NULL
  AND "reminderProviderMessageId" IS NULL
ON CONFLICT ("idempotencyKey") DO NOTHING;

-- A failed or uncertain logical send must be resolved by retrying the same
-- attempt and idempotency key before a new send can be created.
CREATE UNIQUE INDEX "SurveyDeliveryAttempt_one_active_per_invitation"
    ON "wijkconnect"."SurveyDeliveryAttempt"("invitationId")
    WHERE "status" IN ('QUEUED', 'UNCERTAIN', 'FAILED');
CREATE UNIQUE INDEX "SurveyDeliveryAttempt_one_initial_per_invitation"
    ON "wijkconnect"."SurveyDeliveryAttempt"("invitationId")
    WHERE "kind" = 'INVITATION';

ALTER TABLE "wijkconnect"."SurveyDeliveryAttempt"
    ADD CONSTRAINT "SurveyDeliveryAttempt_invitationId_fkey"
    FOREIGN KEY ("invitationId") REFERENCES "wijkconnect"."SurveyInvitation"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
