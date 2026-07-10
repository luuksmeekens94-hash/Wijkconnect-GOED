-- CreateEnum
CREATE TYPE "wijkconnect"."MonitoringProgram" AS ENUM ('MOVEMENT', 'SOCIAL');
CREATE TYPE "wijkconnect"."MonitoringCaseStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "wijkconnect"."MonitoringReferralSource" AS ENUM ('ASSISTANT', 'GP', 'PHYSIOTHERAPIST', 'SOCIAL_PROFESSIONAL', 'SELF', 'OTHER');
CREATE TYPE "wijkconnect"."MonitoringReferralBasis" AS ENUM ('PHONE_TRIAGE', 'CONSULT', 'FORMAL_REFERRAL', 'MORNING_CLINIC', 'NO_INDICATION', 'OTHER');
CREATE TYPE "wijkconnect"."MonitoringAppointmentStatus" AS ENUM ('SCHEDULED', 'ATTENDED', 'NO_SHOW', 'CANCELLED');
CREATE TYPE "wijkconnect"."MonitoringOutcome" AS ENUM ('ONE_OFF_PHYSIO', 'REGULAR_PHYSIO', 'RETURN_TO_GP', 'SPECIALIST_CARE', 'REFERRED_TO_SOCIAL', 'ADVICE_ONLY', 'SOCIAL_SUPPORT', 'SUPPORT_STARTED', 'OTHER_SUPPORT', 'SELF_MANAGEMENT', 'NO_MATCH', 'UNREACHABLE', 'DECLINED', 'NO_FOLLOW_UP', 'UNKNOWN');
CREATE TYPE "wijkconnect"."MonitoringHelpRequestClarity" AS ENUM ('CLEAR', 'PARTIAL', 'UNCLEAR');
CREATE TYPE "wijkconnect"."MonitoringFeedbackChannel" AS ENUM ('ZORGDOMEIN', 'PATIENT_RECORD', 'SECURE_EMAIL', 'PHONE', 'OTHER');
CREATE TYPE "wijkconnect"."MonitoringSocialReason" AS ENUM ('FINANCIAL', 'PSYCHOSOCIAL_STRESS', 'POVERTY', 'LONELINESS', 'LIFESTYLE', 'SELF_MANAGEMENT', 'HOUSING', 'WORK_INCOME', 'FAMILY', 'OTHER');
CREATE TYPE "wijkconnect"."WeeklyReviewStatus" AS ENUM ('OPEN', 'READY', 'CLOSED');
CREATE TYPE "wijkconnect"."SurveyAudience" AS ENUM ('MOVEMENT_PATIENT', 'SOCIAL_PATIENT', 'GP', 'ASSISTANT', 'SOCIAL_PROFESSIONAL');
CREATE TYPE "wijkconnect"."SurveyQuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'SCALE', 'FREE_TEXT');
CREATE TYPE "wijkconnect"."SurveyInvitationStatus" AS ENUM ('DRAFT', 'READY', 'SENT', 'OPENED', 'COMPLETED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "wijkconnect"."KpiUnit" AS ENUM ('COUNT', 'PERCENTAGE', 'DAYS');
CREATE TYPE "wijkconnect"."KpiComparator" AS ENUM ('AT_LEAST', 'AT_MOST');
CREATE TYPE "wijkconnect"."ProjectActivityType" AS ENUM ('MDO', 'TRAINING', 'EVALUATION', 'IMPLEMENTATION', 'BOTTLENECK', 'FINANCING', 'SCALE_UP', 'OTHER');

-- AlterEnum / AlterTable
ALTER TYPE "wijkconnect"."Role" ADD VALUE 'DATA_MANAGER';
ALTER TABLE "wijkconnect"."User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "wijkconnect"."MonitoringParticipant" (
    "id" TEXT NOT NULL,
    "pseudonymCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MonitoringParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wijkconnect"."MonitoringCase" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "sourceReferralId" TEXT,
    "program" "wijkconnect"."MonitoringProgram" NOT NULL,
    "referralDate" DATE NOT NULL,
    "referralSource" "wijkconnect"."MonitoringReferralSource" NOT NULL,
    "referralBasis" "wijkconnect"."MonitoringReferralBasis",
    "complaintCategory" TEXT,
    "helpRequest" TEXT,
    "helpRequestClarity" "wijkconnect"."MonitoringHelpRequestClarity",
    "assignedOrganization" TEXT,
    "assignedProfessional" TEXT,
    "status" "wijkconnect"."MonitoringCaseStatus" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MonitoringCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wijkconnect"."MonitoringCaseSocialReason" (
    "id" SERIAL NOT NULL,
    "caseId" TEXT NOT NULL,
    "reason" "wijkconnect"."MonitoringSocialReason" NOT NULL,
    CONSTRAINT "MonitoringCaseSocialReason_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wijkconnect"."MonitoringAppointment" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "wijkconnect"."MonitoringAppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "outcome" "wijkconnect"."MonitoringOutcome",
    "outcomeNote" TEXT,
    "followUpOrganization" TEXT,
    "evaluationEligible" BOOLEAN,
    "reminderSentAt" TIMESTAMP(3),
    "feedbackSentAt" TIMESTAMP(3),
    "feedbackRecipient" TEXT,
    "feedbackChannel" "wijkconnect"."MonitoringFeedbackChannel",
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MonitoringAppointment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wijkconnect"."WeeklyReview" (
    "id" TEXT NOT NULL,
    "program" "wijkconnect"."MonitoringProgram" NOT NULL,
    "weekStart" DATE NOT NULL,
    "availableSlots" INTEGER NOT NULL DEFAULT 0,
    "clinicPlanned" BOOLEAN NOT NULL DEFAULT true,
    "status" "wijkconnect"."WeeklyReviewStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WeeklyReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wijkconnect"."KpiTarget" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "program" "wijkconnect"."MonitoringProgram",
    "unit" "wijkconnect"."KpiUnit" NOT NULL,
    "comparator" "wijkconnect"."KpiComparator" NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KpiTarget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wijkconnect"."SurveyTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "audience" "wijkconnect"."SurveyAudience" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SurveyTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wijkconnect"."SurveyQuestion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "type" "wijkconnect"."SurveyQuestionType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "options" JSONB,
    "minValue" INTEGER,
    "maxValue" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SurveyQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wijkconnect"."SurveyInvitation" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "caseId" TEXT,
    "appointmentId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "status" "wijkconnect"."SurveyInvitationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "invitedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SurveyInvitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wijkconnect"."SurveyResponse" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wijkconnect"."SurveyAnswer" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "choiceValue" TEXT,
    "selectedValues" JSONB,
    "numericValue" DOUBLE PRECISION,
    "textValue" TEXT,
    CONSTRAINT "SurveyAnswer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wijkconnect"."ProjectActivity" (
    "id" TEXT NOT NULL,
    "type" "wijkconnect"."ProjectActivityType" NOT NULL,
    "activityDate" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerName" TEXT,
    "followUpDate" DATE,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonitoringParticipant_pseudonymCode_key" ON "wijkconnect"."MonitoringParticipant"("pseudonymCode");
CREATE UNIQUE INDEX "MonitoringCase_sourceReferralId_key" ON "wijkconnect"."MonitoringCase"("sourceReferralId");
CREATE INDEX "MonitoringCase_program_referralDate_idx" ON "wijkconnect"."MonitoringCase"("program", "referralDate");
CREATE INDEX "MonitoringCase_status_program_idx" ON "wijkconnect"."MonitoringCase"("status", "program");
CREATE INDEX "MonitoringCase_participantId_referralDate_idx" ON "wijkconnect"."MonitoringCase"("participantId", "referralDate");
CREATE UNIQUE INDEX "MonitoringCaseSocialReason_caseId_reason_key" ON "wijkconnect"."MonitoringCaseSocialReason"("caseId", "reason");
CREATE INDEX "MonitoringAppointment_scheduledAt_status_idx" ON "wijkconnect"."MonitoringAppointment"("scheduledAt", "status");
CREATE INDEX "MonitoringAppointment_caseId_scheduledAt_idx" ON "wijkconnect"."MonitoringAppointment"("caseId", "scheduledAt");
CREATE INDEX "WeeklyReview_weekStart_status_idx" ON "wijkconnect"."WeeklyReview"("weekStart", "status");
CREATE UNIQUE INDEX "WeeklyReview_program_weekStart_key" ON "wijkconnect"."WeeklyReview"("program", "weekStart");
CREATE INDEX "KpiTarget_active_periodStart_periodEnd_idx" ON "wijkconnect"."KpiTarget"("active", "periodStart", "periodEnd");
CREATE UNIQUE INDEX "KpiTarget_code_periodStart_key" ON "wijkconnect"."KpiTarget"("code", "periodStart");
CREATE INDEX "SurveyTemplate_audience_active_idx" ON "wijkconnect"."SurveyTemplate"("audience", "active");
CREATE UNIQUE INDEX "SurveyTemplate_code_version_key" ON "wijkconnect"."SurveyTemplate"("code", "version");
CREATE UNIQUE INDEX "SurveyQuestion_templateId_code_key" ON "wijkconnect"."SurveyQuestion"("templateId", "code");
CREATE UNIQUE INDEX "SurveyQuestion_templateId_position_key" ON "wijkconnect"."SurveyQuestion"("templateId", "position");
CREATE UNIQUE INDEX "SurveyInvitation_tokenHash_key" ON "wijkconnect"."SurveyInvitation"("tokenHash");
CREATE INDEX "SurveyInvitation_status_createdAt_idx" ON "wijkconnect"."SurveyInvitation"("status", "createdAt");
CREATE INDEX "SurveyInvitation_templateId_status_idx" ON "wijkconnect"."SurveyInvitation"("templateId", "status");
CREATE UNIQUE INDEX "SurveyResponse_invitationId_key" ON "wijkconnect"."SurveyResponse"("invitationId");
CREATE UNIQUE INDEX "SurveyAnswer_responseId_questionId_key" ON "wijkconnect"."SurveyAnswer"("responseId", "questionId");
CREATE INDEX "ProjectActivity_activityDate_type_idx" ON "wijkconnect"."ProjectActivity"("activityDate", "type");
CREATE INDEX "ProjectActivity_completed_followUpDate_idx" ON "wijkconnect"."ProjectActivity"("completed", "followUpDate");

-- AddForeignKey
ALTER TABLE "wijkconnect"."MonitoringCase" ADD CONSTRAINT "MonitoringCase_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "wijkconnect"."MonitoringParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wijkconnect"."MonitoringCase" ADD CONSTRAINT "MonitoringCase_sourceReferralId_fkey" FOREIGN KEY ("sourceReferralId") REFERENCES "wijkconnect"."Referral"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "wijkconnect"."MonitoringCase" ADD CONSTRAINT "MonitoringCase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "wijkconnect"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wijkconnect"."MonitoringCaseSocialReason" ADD CONSTRAINT "MonitoringCaseSocialReason_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "wijkconnect"."MonitoringCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wijkconnect"."MonitoringAppointment" ADD CONSTRAINT "MonitoringAppointment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "wijkconnect"."MonitoringCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wijkconnect"."MonitoringAppointment" ADD CONSTRAINT "MonitoringAppointment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "wijkconnect"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wijkconnect"."WeeklyReview" ADD CONSTRAINT "WeeklyReview_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "wijkconnect"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "wijkconnect"."SurveyQuestion" ADD CONSTRAINT "SurveyQuestion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "wijkconnect"."SurveyTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wijkconnect"."SurveyInvitation" ADD CONSTRAINT "SurveyInvitation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "wijkconnect"."SurveyTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wijkconnect"."SurveyInvitation" ADD CONSTRAINT "SurveyInvitation_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "wijkconnect"."MonitoringCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "wijkconnect"."SurveyInvitation" ADD CONSTRAINT "SurveyInvitation_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "wijkconnect"."MonitoringAppointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "wijkconnect"."SurveyInvitation" ADD CONSTRAINT "SurveyInvitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "wijkconnect"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wijkconnect"."SurveyResponse" ADD CONSTRAINT "SurveyResponse_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "wijkconnect"."SurveyInvitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wijkconnect"."SurveyAnswer" ADD CONSTRAINT "SurveyAnswer_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "wijkconnect"."SurveyResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wijkconnect"."SurveyAnswer" ADD CONSTRAINT "SurveyAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "wijkconnect"."SurveyQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wijkconnect"."ProjectActivity" ADD CONSTRAINT "ProjectActivity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "wijkconnect"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
