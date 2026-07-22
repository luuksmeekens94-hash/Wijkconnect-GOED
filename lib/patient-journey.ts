import {
  MonitoringOutcome,
  PatientJourneyDiscipline,
  PatientJourneyOutcome,
} from "@prisma/client";

export const physiotherapyJourneyOutcomeOptions = [
  { value: PatientJourneyOutcome.EXERCISES_AND_ADVICE, label: "Oefeningen en advies meegegeven" },
  { value: PatientJourneyOutcome.FOLLOW_UP_MOVEMENT_CLINIC, label: "Follow-up bij het beweegspreekuur" },
  { value: PatientJourneyOutcome.PRIMARY_CARE_PHYSIOTHERAPY, label: "Naar eerstelijnsfysiotherapie voor meerdere behandelingen" },
  { value: PatientJourneyOutcome.REFERRED_TO_SOCIAL_CLINIC, label: "Door naar het sociaal spreekuur" },
  { value: PatientJourneyOutcome.REFERRED_TO_SOCIAL_PROFESSIONAL, label: "Door naar een professional in het sociaal domein" },
  { value: PatientJourneyOutcome.RETURNED_TO_GP, label: "Terug naar de huisarts" },
  { value: PatientJourneyOutcome.NO_FOLLOW_UP_NEEDED, label: "Geen vervolg nodig" },
  { value: PatientJourneyOutcome.UNKNOWN, label: "Onduidelijk" },
  { value: PatientJourneyOutcome.OTHER, label: "Anders" },
] as const;

export const socialJourneyOutcomeOptions = [
  { value: PatientJourneyOutcome.NEIGHBORHOOD_TEAM_TRAJECTORY, label: "Traject gestart bij Buurtteams" },
  { value: PatientJourneyOutcome.WELFARE_TRAJECTORY, label: "Traject gestart bij Bindkracht10 / welzijn" },
  { value: PatientJourneyOutcome.REFERRED_TO_OTHER_SOCIAL_ORGANIZATION, label: "Doorverwezen naar een andere instantie of professional" },
  { value: PatientJourneyOutcome.FOLLOW_UP_SOCIAL_CLINIC, label: "Follow-up bij het sociaal spreekuur" },
  { value: PatientJourneyOutcome.RETURNED_TO_GP, label: "Terug naar de huisarts" },
  { value: PatientJourneyOutcome.ADVICE_OR_INFORMATION_ONLY, label: "Alleen advies of informatie gegeven" },
  { value: PatientJourneyOutcome.NO_FOLLOW_UP_NEEDED, label: "Geen vervolg nodig" },
  { value: PatientJourneyOutcome.CONTACT_UNSUCCESSFUL, label: "Contact niet gelukt" },
  { value: PatientJourneyOutcome.UNKNOWN, label: "Onduidelijk" },
  { value: PatientJourneyOutcome.OTHER, label: "Anders" },
] as const;

export function patientJourneyOptionsForDiscipline(discipline: PatientJourneyDiscipline) {
  return discipline === PatientJourneyDiscipline.PHYSIOTHERAPY
    ? physiotherapyJourneyOutcomeOptions
    : socialJourneyOutcomeOptions;
}

export function patientJourneyOutcomeAllowed(
  discipline: PatientJourneyDiscipline,
  outcome: PatientJourneyOutcome,
) {
  return patientJourneyOptionsForDiscipline(discipline).some((option) => option.value === outcome);
}

export function patientJourneyOutcomeLabel(outcome: PatientJourneyOutcome) {
  return [...physiotherapyJourneyOutcomeOptions, ...socialJourneyOutcomeOptions]
    .find((option) => option.value === outcome)?.label ?? outcome;
}

export function patientJourneyDisciplineLabel(discipline: PatientJourneyDiscipline) {
  return discipline === PatientJourneyDiscipline.PHYSIOTHERAPY ? "Fysiotherapie" : "Sociaal domein";
}

export function journeyOutcomeNeedsDestination(outcome: PatientJourneyOutcome) {
  const destinationOutcomes: PatientJourneyOutcome[] = [
    PatientJourneyOutcome.PRIMARY_CARE_PHYSIOTHERAPY,
    PatientJourneyOutcome.REFERRED_TO_SOCIAL_PROFESSIONAL,
    PatientJourneyOutcome.REFERRED_TO_OTHER_SOCIAL_ORGANIZATION,
  ];
  return destinationOutcomes.includes(outcome);
}

export function journeyOutcomeToMonitoringOutcome(
  discipline: PatientJourneyDiscipline,
  outcome: PatientJourneyOutcome,
) {
  const shared: Partial<Record<PatientJourneyOutcome, MonitoringOutcome>> = {
    [PatientJourneyOutcome.RETURNED_TO_GP]: MonitoringOutcome.RETURN_TO_GP,
    [PatientJourneyOutcome.NO_FOLLOW_UP_NEEDED]: MonitoringOutcome.NO_FOLLOW_UP,
    [PatientJourneyOutcome.UNKNOWN]: MonitoringOutcome.UNKNOWN,
  };
  if (shared[outcome]) return shared[outcome]!;

  if (discipline === PatientJourneyDiscipline.PHYSIOTHERAPY) {
    const movement: Partial<Record<PatientJourneyOutcome, MonitoringOutcome>> = {
      [PatientJourneyOutcome.EXERCISES_AND_ADVICE]: MonitoringOutcome.ONE_OFF_PHYSIO,
      [PatientJourneyOutcome.PRIMARY_CARE_PHYSIOTHERAPY]: MonitoringOutcome.REGULAR_PHYSIO,
      [PatientJourneyOutcome.REFERRED_TO_SOCIAL_CLINIC]: MonitoringOutcome.REFERRED_TO_SOCIAL,
      [PatientJourneyOutcome.REFERRED_TO_SOCIAL_PROFESSIONAL]: MonitoringOutcome.REFERRED_TO_SOCIAL,
    };
    return movement[outcome] ?? MonitoringOutcome.UNKNOWN;
  }

  const social: Partial<Record<PatientJourneyOutcome, MonitoringOutcome>> = {
    [PatientJourneyOutcome.NEIGHBORHOOD_TEAM_TRAJECTORY]: MonitoringOutcome.SUPPORT_STARTED,
    [PatientJourneyOutcome.WELFARE_TRAJECTORY]: MonitoringOutcome.SUPPORT_STARTED,
    [PatientJourneyOutcome.REFERRED_TO_OTHER_SOCIAL_ORGANIZATION]: MonitoringOutcome.OTHER_SUPPORT,
    [PatientJourneyOutcome.ADVICE_OR_INFORMATION_ONLY]: MonitoringOutcome.ADVICE_ONLY,
    [PatientJourneyOutcome.CONTACT_UNSUCCESSFUL]: MonitoringOutcome.UNREACHABLE,
  };
  return social[outcome] ?? MonitoringOutcome.UNKNOWN;
}
