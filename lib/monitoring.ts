import {
  MonitoringAppointmentStatus,
  MonitoringFeedbackChannel,
  MonitoringOutcome,
  MonitoringProgram,
  MonitoringReferralBasis,
  MonitoringReferralSource,
  MonitoringSocialReason,
  ProjectActivityType,
  SurveyAudience,
  WeeklyReviewStatus,
} from "@prisma/client";
import { endOfWeek, startOfWeek } from "date-fns";

export const monitoringProgramOptions = [
  { value: MonitoringProgram.MOVEMENT, label: "Beweegspreekuur" },
  { value: MonitoringProgram.SOCIAL, label: "Sociaal spreekuur" },
] as const;

export const monitoringWeeklyCapacityDefaults: Record<MonitoringProgram, number> = {
  [MonitoringProgram.MOVEMENT]: 6,
  [MonitoringProgram.SOCIAL]: 4,
};

export function getMonitoringWeeklyCapacity(program: MonitoringProgram, availableSlots?: number | null) {
  return availableSlots ?? monitoringWeeklyCapacityDefaults[program];
}

export const monitoringReferralSourceOptions = [
  { value: MonitoringReferralSource.ASSISTANT, label: "Doktersassistent" },
  { value: MonitoringReferralSource.GP, label: "Huisarts" },
  { value: MonitoringReferralSource.PHYSIOTHERAPIST, label: "Fysiotherapeut" },
  { value: MonitoringReferralSource.SOCIAL_PROFESSIONAL, label: "Sociaal professional" },
  { value: MonitoringReferralSource.SELF, label: "Zelf / rechtstreeks" },
  { value: MonitoringReferralSource.OTHER, label: "Anders" },
] as const;

export const monitoringReferralBasisOptions = [
  { value: MonitoringReferralBasis.PHONE_TRIAGE, label: "Telefonische triage" },
  { value: MonitoringReferralBasis.CONSULT, label: "Consult" },
  { value: MonitoringReferralBasis.FORMAL_REFERRAL, label: "Formele verwijzing" },
  { value: MonitoringReferralBasis.MORNING_CLINIC, label: "Ochtendspreekuur" },
  { value: MonitoringReferralBasis.NO_INDICATION, label: "Zonder vastgelegde indicatie" },
  { value: MonitoringReferralBasis.OTHER, label: "Anders" },
] as const;

export const monitoringAppointmentStatusOptions = [
  { value: MonitoringAppointmentStatus.SCHEDULED, label: "Gepland" },
  { value: MonitoringAppointmentStatus.ATTENDED, label: "Verschenen" },
  { value: MonitoringAppointmentStatus.NO_SHOW, label: "No-show" },
  { value: MonitoringAppointmentStatus.CANCELLED, label: "Geannuleerd" },
] as const;

export const monitoringOutcomeOptions = [
  { value: MonitoringOutcome.ONE_OFF_PHYSIO, label: "Eenmalig fysioconsult zonder vervolg", programs: [MonitoringProgram.MOVEMENT] },
  { value: MonitoringOutcome.REGULAR_PHYSIO, label: "Vervolg in reguliere fysiotherapie", programs: [MonitoringProgram.MOVEMENT] },
  { value: MonitoringOutcome.RETURN_TO_GP, label: "Terug naar huisarts", programs: [MonitoringProgram.MOVEMENT, MonitoringProgram.SOCIAL] },
  { value: MonitoringOutcome.SPECIALIST_CARE, label: "Specialistische zorg", programs: [MonitoringProgram.MOVEMENT] },
  { value: MonitoringOutcome.REFERRED_TO_SOCIAL, label: "Doorverwezen naar sociaal spreekuur", programs: [MonitoringProgram.MOVEMENT] },
  { value: MonitoringOutcome.ADVICE_ONLY, label: "Advies gegeven", programs: [MonitoringProgram.SOCIAL] },
  { value: MonitoringOutcome.SOCIAL_SUPPORT, label: "Ondersteuning sociaal domein", programs: [MonitoringProgram.SOCIAL] },
  { value: MonitoringOutcome.SUPPORT_STARTED, label: "Ondersteuning gestart", programs: [MonitoringProgram.SOCIAL] },
  { value: MonitoringOutcome.OTHER_SUPPORT, label: "Andere ondersteuning", programs: [MonitoringProgram.SOCIAL] },
  { value: MonitoringOutcome.SELF_MANAGEMENT, label: "Zelfmanagement / advies", programs: [MonitoringProgram.MOVEMENT, MonitoringProgram.SOCIAL] },
  { value: MonitoringOutcome.NO_MATCH, label: "Geen passend aanbod", programs: [MonitoringProgram.SOCIAL] },
  { value: MonitoringOutcome.UNREACHABLE, label: "Niet bereikbaar", programs: [MonitoringProgram.SOCIAL] },
  { value: MonitoringOutcome.DECLINED, label: "Afgezien van hulp", programs: [MonitoringProgram.SOCIAL] },
  { value: MonitoringOutcome.NO_FOLLOW_UP, label: "Geen vervolg", programs: [MonitoringProgram.MOVEMENT, MonitoringProgram.SOCIAL] },
  { value: MonitoringOutcome.UNKNOWN, label: "Nog onbekend", programs: [MonitoringProgram.MOVEMENT, MonitoringProgram.SOCIAL] },
] as const;

export const monitoringFeedbackChannelOptions = [
  { value: MonitoringFeedbackChannel.ZORGDOMEIN, label: "ZorgDomein" },
  { value: MonitoringFeedbackChannel.PATIENT_RECORD, label: "Patiëntdossier" },
  { value: MonitoringFeedbackChannel.SECURE_EMAIL, label: "Beveiligde e-mail" },
  { value: MonitoringFeedbackChannel.PHONE, label: "Telefonisch" },
  { value: MonitoringFeedbackChannel.OTHER, label: "Anders" },
] as const;

export const monitoringSocialReasonOptions = [
  { value: MonitoringSocialReason.FINANCIAL, label: "Financiële zorgen" },
  { value: MonitoringSocialReason.PSYCHOSOCIAL_STRESS, label: "Stress / psychosociaal" },
  { value: MonitoringSocialReason.POVERTY, label: "Armoede" },
  { value: MonitoringSocialReason.LONELINESS, label: "Eenzaamheid" },
  { value: MonitoringSocialReason.LIFESTYLE, label: "Leefstijl" },
  { value: MonitoringSocialReason.SELF_MANAGEMENT, label: "Zelfmanagement" },
  { value: MonitoringSocialReason.HOUSING, label: "Wonen" },
  { value: MonitoringSocialReason.WORK_INCOME, label: "Werk / inkomen" },
  { value: MonitoringSocialReason.FAMILY, label: "Gezin" },
  { value: MonitoringSocialReason.OTHER, label: "Anders" },
] as const;

export const projectActivityTypeOptions = [
  { value: ProjectActivityType.MDO, label: "MDO" },
  { value: ProjectActivityType.TRAINING, label: "Training / opfrissessie" },
  { value: ProjectActivityType.EVALUATION, label: "Evaluatie" },
  { value: ProjectActivityType.IMPLEMENTATION, label: "Implementatie" },
  { value: ProjectActivityType.BOTTLENECK, label: "Knelpunt" },
  { value: ProjectActivityType.FINANCING, label: "Financiering / borging" },
  { value: ProjectActivityType.SCALE_UP, label: "Opschaling" },
  { value: ProjectActivityType.OTHER, label: "Anders" },
] as const;

export const surveyAudienceLabels: Record<SurveyAudience, string> = {
  MOVEMENT_PATIENT: "Patiënten beweegspreekuur",
  SOCIAL_PATIENT: "Patiënten sociaal spreekuur",
  GP: "Huisartsen",
  ASSISTANT: "Doktersassistenten",
  SOCIAL_PROFESSIONAL: "Welzijnscoaches / buurtteams",
};

export const weeklyReviewStatusLabels: Record<WeeklyReviewStatus, string> = {
  OPEN: "Open",
  READY: "Klaar voor controle",
  CLOSED: "Afgesloten",
};

export function getOptionLabel<T extends string>(options: ReadonlyArray<{ value: T; label: string }>, value?: T | null) {
  if (!value) return "Niet ingevuld";
  return options.find((option) => option.value === value)?.label ?? value;
}

export function getIsoWeekRange(value = new Date()) {
  return {
    start: startOfWeek(value, { weekStartsOn: 1 }),
    end: endOfWeek(value, { weekStartsOn: 1 }),
  };
}

export function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function percentage(numerator: number, denominator: number) {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export type MonitoringMetricInput = {
  participantId: string;
  referralDate: Date;
  scheduledAt: Date;
  status: MonitoringAppointmentStatus;
  outcome?: MonitoringOutcome | null;
  feedbackSentAt?: Date | null;
  program: MonitoringProgram;
};

export function calculateMonitoringMetrics(records: MonitoringMetricInput[], availableSlots = 0) {
  const attended = records.filter((record) => record.status === MonitoringAppointmentStatus.ATTENDED);
  const noShows = records.filter((record) => record.status === MonitoringAppointmentStatus.NO_SHOW);
  const cancelled = records.filter((record) => record.status === MonitoringAppointmentStatus.CANCELLED);
  const scheduled = records.filter((record) => record.status !== MonitoringAppointmentStatus.CANCELLED);
  const uniquePatients = new Set(attended.map((record) => record.participantId)).size;
  const validLeadTimes = attended.filter((record) => record.scheduledAt.getTime() >= record.referralDate.getTime());
  const withinSevenDays = validLeadTimes.filter((record) => {
    const days = (record.scheduledAt.getTime() - record.referralDate.getTime()) / 86_400_000;
    return days <= 7;
  }).length;
  const feedbackComplete = attended.filter((record) => Boolean(record.feedbackSentAt)).length;
  const oneOffMovement = attended.filter(
    (record) => record.program === MonitoringProgram.MOVEMENT && record.outcome === MonitoringOutcome.ONE_OFF_PHYSIO,
  ).length;
  const movementAttended = attended.filter((record) => record.program === MonitoringProgram.MOVEMENT).length;

  return {
    registrations: records.length,
    uniquePatients,
    scheduled: scheduled.length,
    attended: attended.length,
    noShows: noShows.length,
    cancelled: cancelled.length,
    openSlots: Math.max(availableSlots - scheduled.length, 0),
    overbookedBy: Math.max(scheduled.length - availableSlots, 0),
    withinSevenDays,
    withinSevenDaysPercentage: percentage(withinSevenDays, validLeadTimes.length),
    noShowPercentage: percentage(noShows.length, attended.length + noShows.length),
    feedbackPercentage: percentage(feedbackComplete, attended.length),
    oneOffMovementPercentage: percentage(oneOffMovement, movementAttended),
  };
}
