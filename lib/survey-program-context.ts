import type { SurveyAudience } from "@prisma/client";

export type PatientSurveyProgramContext = {
  displayName: "Beweegspreekuur" | "Sociaal spreekuur";
  sentenceName: "het beweegspreekuur" | "het sociaal spreekuur";
};

export function getPatientSurveyProgramContext(audience?: SurveyAudience | null): PatientSurveyProgramContext | null {
  if (audience === "MOVEMENT_PATIENT") {
    return {
      displayName: "Beweegspreekuur",
      sentenceName: "het beweegspreekuur",
    };
  }
  if (audience === "SOCIAL_PATIENT") {
    return {
      displayName: "Sociaal spreekuur",
      sentenceName: "het sociaal spreekuur",
    };
  }
  return null;
}
