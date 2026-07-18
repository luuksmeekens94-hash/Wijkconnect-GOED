import type { SurveyAudience } from "@prisma/client";

export type PatientSurveyProgramContext = {
  displayName: "Beweegspreekuur" | "Sociaal spreekuur";
  sentenceName: "het beweegspreekuur" | "het sociaal spreekuur";
};

export type SurveyEmailAudienceContext = {
  badge: string;
  subject: string;
  reminderSubject: string;
  introduction: string;
  reminderIntroduction: string;
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

export function getSurveyEmailAudienceContext(audience?: SurveyAudience | null): SurveyEmailAudienceContext | null {
  switch (audience) {
    case "MOVEMENT_PATIENT":
      return {
        badge: "Beweegspreekuur",
        subject: "Wilt u uw ervaring met ons delen?",
        reminderSubject: "Herinnering: wilt u uw ervaring delen?",
        introduction: "U ontvangt deze uitnodiging omdat u onlangs het beweegspreekuur bij Huisartsenpraktijk De Schakel heeft bezocht. Wij horen graag hoe u het spreekuur heeft ervaren. Met uw antwoorden kunnen wij het beweegspreekuur verder verbeteren.",
        reminderIntroduction: "Onlangs ontving u van ons een uitnodiging voor een korte vragenlijst over uw bezoek aan het beweegspreekuur. Als u deze nog niet heeft ingevuld, horen wij graag uw ervaring.",
      };
    case "SOCIAL_PATIENT":
      return {
        badge: "Sociaal spreekuur",
        subject: "Wilt u uw ervaring met ons delen?",
        reminderSubject: "Herinnering: wilt u uw ervaring delen?",
        introduction: "U ontvangt deze uitnodiging omdat u onlangs het sociaal spreekuur bij Huisartsenpraktijk De Schakel heeft bezocht. Wij horen graag hoe u het spreekuur heeft ervaren. Met uw antwoorden kunnen wij het sociaal spreekuur verder verbeteren.",
        reminderIntroduction: "Onlangs ontving u van ons een uitnodiging voor een korte vragenlijst over uw bezoek aan het sociaal spreekuur. Als u deze nog niet heeft ingevuld, horen wij graag uw ervaring.",
      };
    case "GP":
      return {
        badge: "Huisartsen · beweegspreekuur en sociaal spreekuur",
        subject: "Uw ervaring met het beweegspreekuur en sociaal spreekuur",
        reminderSubject: "Herinnering: uw ervaring met beide spreekuren",
        introduction: "Als huisarts vragen wij u naar uw ervaringen met het beweegspreekuur en het sociaal spreekuur. De vragenlijst gaat onder meer over verwijzen, samenwerking, terugkoppeling en de invloed van beide spreekuren op passende zorg en werkdruk.",
        reminderIntroduction: "Onlangs ontving u een vragenlijst over uw ervaringen als huisarts met het beweegspreekuur en het sociaal spreekuur. Als u deze nog niet heeft ingevuld, ontvangen wij uw reactie graag alsnog.",
      };
    case "ASSISTANT":
      return {
        badge: "Doktersassistenten · beweegspreekuur",
        subject: "Uw ervaring met het beweegspreekuur",
        reminderSubject: "Herinnering: uw ervaring met het beweegspreekuur",
        introduction: "Als doktersassistent vragen wij u naar uw ervaringen met het beweegspreekuur. De vragenlijst gaat onder meer over triage, planning, ondersteuning en de samenwerking met de fysiotherapeut.",
        reminderIntroduction: "Onlangs ontving u een vragenlijst over uw ervaringen als doktersassistent met het beweegspreekuur. Als u deze nog niet heeft ingevuld, ontvangen wij uw reactie graag alsnog.",
      };
    case "SOCIAL_PROFESSIONAL":
      return {
        badge: "Welzijnsprofessionals · sociaal spreekuur",
        subject: "Uw ervaring met het sociaal spreekuur",
        reminderSubject: "Herinnering: uw ervaring met het sociaal spreekuur",
        introduction: "Als welzijnsprofessional vragen wij u naar uw ervaringen met het sociaal spreekuur. De vragenlijst gaat onder meer over verwijzing, overdracht, afstemming en de samenwerking met Huisartsenpraktijk De Schakel.",
        reminderIntroduction: "Onlangs ontving u een vragenlijst over uw ervaringen als welzijnsprofessional met het sociaal spreekuur. Als u deze nog niet heeft ingevuld, ontvangen wij uw reactie graag alsnog.",
      };
    default:
      return null;
  }
}
