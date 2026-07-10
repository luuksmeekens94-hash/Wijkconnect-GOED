import { SurveyAudience, SurveyQuestionType } from "@prisma/client";

type QuestionDefinition = {
  code: string;
  prompt: string;
  type?: SurveyQuestionType;
  options?: string[];
  required?: boolean;
  minValue?: number;
  maxValue?: number;
};

export type SurveyTemplateDefinition = {
  code: string;
  name: string;
  audience: SurveyAudience;
  description: string;
  questions: QuestionDefinition[];
};

const yesNo = ["Ja", "Nee"];
const yesNoUnknown = ["Ja", "Nee", "Weet ik niet"];
const satisfaction = ["Zeer tevreden", "Tevreden", "Neutraal", "Ontevreden", "Zeer ontevreden"];
const recommend = ["Ja", "Misschien", "Nee"];
const continuation = ["Ja", "Alleen onder voorwaarden", "Nee"];
const qualityFive = ["Zeer goed", "Goed", "Neutraal", "Matig", "Slecht"];
const waitTime = ["Binnen 1 week", "Binnen 2 weken", "Binnen 1 maand", "Langer dan 1 maand"];

function single(code: string, prompt: string, options: string[]): QuestionDefinition {
  return { code, prompt, type: SurveyQuestionType.SINGLE_CHOICE, options };
}

function open(code: string, prompt: string): QuestionDefinition {
  return { code, prompt, type: SurveyQuestionType.FREE_TEXT, required: false };
}

export const veznSurveyTemplates: SurveyTemplateDefinition[] = [
  {
    code: "PATIENT_MOVEMENT",
    name: "Patiënten beweegspreekuur",
    audience: SurveyAudience.MOVEMENT_PATIENT,
    description: "VEZN-vragenlijst Q1 2026, versie 1. Open antwoorden zijn alleen voor bevoegde projectbeheerders zichtbaar.",
    questions: [
      single("Q1", "Hoe tevreden bent u over het beweegspreekuur?", satisfaction),
      single("Q2", "Hoe snel kon u terecht?", waitTime),
      single("Q3", "Vond u de wachttijd acceptabel?", yesNo),
      single("Q4", "Voelde u zich op de juiste plek bij het beweegspreekuur?", ["Ja, helemaal", "Grotendeels", "Niet echt", "Helemaal niet"]),
      single("Q5", "Heeft het beweegspreekuur u geholpen bij uw klacht?", ["Ja, sterk", "Ja, enigszins", "Beperkt", "Niet"]),
      single("Q6", "Voelt u zich beter in staat om zelf met uw klachten om te gaan?", ["Ja", "Enigszins", "Nee"]),
      single("Q7", "Zou u zonder het beweegspreekuur een afspraak bij de huisarts hebben gemaakt?", yesNoUnknown),
      single("Q8", "Bent u na het beweegspreekuur nog teruggegaan naar de huisarts met dezelfde klacht?", yesNo),
      single("Q9", "Zou u het beweegspreekuur aanbevelen aan anderen?", recommend),
      open("Q10", "Heeft u nog tips voor verbetering?"),
    ],
  },
  {
    code: "PATIENT_SOCIAL",
    name: "Patiënten sociaal spreekuur",
    audience: SurveyAudience.SOCIAL_PATIENT,
    description: "VEZN-vragenlijst Q1 2026, versie 1.",
    questions: [
      single("Q1", "Hoe tevreden bent u over het sociaal spreekuur?", satisfaction),
      single("Q2", "Hoe snel kon u terecht?", waitTime),
      single("Q3", "Vond u de wachttijd acceptabel?", yesNo),
      single("Q4", "Voelde u zich op de juiste plek bij het sociaal spreekuur?", ["Ja, helemaal", "Grotendeels", "Niet echt", "Helemaal niet"]),
      single("Q5", "Heeft het sociaal spreekuur u geholpen bij uw hulpvraag?", ["Ja, sterk", "Ja, enigszins", "Beperkt", "Niet"]),
      single("Q6", "Voelt u zich beter geholpen bij uw situatie?", ["Ja", "Enigszins", "Nee"]),
      single("Q7", "Zou u het sociaal spreekuur aanbevelen aan anderen?", recommend),
      open("Q8", "Heeft u nog tips voor verbetering?"),
    ],
  },
  {
    code: "GP",
    name: "Huisartsen",
    audience: SurveyAudience.GP,
    description: "Gecombineerde evaluatie van het beweeg- en sociaal spreekuur, VEZN Q1 2026 versie 1.",
    questions: [
      single("Q1", "Ben je bekend met het wekelijkse beweegspreekuur?", yesNo),
      single("Q2", "Hoe vaak verwijs je patiënten met beweegklachten naar het beweegspreekuur?", ["Zeer vaak", "Vaak", "Af en toe", "Zelden", "Nooit"]),
      single("Q3", "In hoeverre draagt het beweegspreekuur bij aan vermindering van laag-complexe beweegklachten op jouw spreekuur?", ["Helemaal niet", "Beperkt", "Enigszins", "Duidelijk", "Zeer sterk"]),
      single("Q4", "Heeft het beweegspreekuur volgens jou geleid tot minder verwijzingen naar de tweede lijn?", yesNoUnknown),
      single("Q5", "Ervaar je dat het beweegspreekuur jouw werkdruk vermindert?", ["Ja, sterk", "Ja, enigszins", "Geen verschil", "Verhoogt werkdruk"]),
      single("Q6", "Hoe beoordeel je de verwijsprocedure en terugkoppeling vanuit het beweegspreekuur?", qualityFive),
      single("Q7", "Is de huidige mate van terugkoppeling voor jou voldoende?", yesNoUnknown),
      single("Q8", "Zou je het beweegspreekuur structureel willen voortzetten?", continuation),
      single("Q9", "Zie je meerwaarde in uitbreiding van het beweegspreekuur?", yesNoUnknown),
      open("Q10", "Wat kan er volgens jou verbeterd worden aan het beweegspreekuur?"),
      single("Q11", "Ben je bekend met het sociaal spreekuur?", yesNo),
      single("Q12", "Ben je bekend met de procedure om patiënten te verwijzen naar het sociaal spreekuur?", ["Ja, volledig duidelijk", "Ja, grotendeels", "Niet helemaal", "Nee"]),
      single("Q13", "Heb je patiënten verwezen naar het sociaal spreekuur?", yesNo),
      single("Q14", "In hoeverre draagt het sociaal spreekuur bij aan het verminderen van niet-medische problematiek op jouw spreekuur?", ["Helemaal niet", "Beperkt", "Enigszins", "Duidelijk", "Zeer sterk"]),
      single("Q15", "Ervaar je dat het sociaal spreekuur bijdraagt aan vermindering van werkdruk?", ["Ja, sterk", "Ja, enigszins", "Geen verschil", "Verhoogt werkdruk"]),
      single("Q16", "Ben je tevreden over de terugkoppeling vanuit het sociaal spreekuur?", satisfaction),
      single("Q17", "Is de huidige mate van terugkoppeling vanuit het sociaal spreekuur voor jou voldoende?", yesNoUnknown),
      single("Q18", "Hoe beoordeel je de samenwerking met Bindkracht/Buurtteams?", qualityFive),
      single("Q19", "Zou je het beweegspreekuur structureel willen voortzetten?", continuation),
      single("Q20", "Zou je het sociaal spreekuur structureel willen voortzetten?", continuation),
      single("Q21", "Zie je meerwaarde in uitbreiding van één of beide spreekuren?", yesNoUnknown),
      open("Q22", "Wat kan er volgens jou verbeterd worden?"),
    ],
  },
  {
    code: "ASSISTANT",
    name: "Doktersassistenten",
    audience: SurveyAudience.ASSISTANT,
    description: "Evaluatie triage, planning en samenwerking, VEZN Q1 2026 versie 1.",
    questions: [
      single("Q1", "Maak je actief gebruik van het triageprotocol voor het beweegspreekuur?", ["Regelmatig", "Af en toe", "Zelden", "Nooit"]),
      single("Q2", "Voel je je voldoende ondersteund en getraind om de triage goed uit te voeren?", ["Ja, volledig", "Ja, deels", "Af en toe"]),
      single("Q3", "Hoe gemakkelijk kun je patiënten plannen voor het beweegspreekuur?", ["Zeer gemakkelijk", "Gemakkelijk", "Neutraal", "Moeilijk", "Zeer moeilijk"]),
      single("Q4", "Ervaar je dat patiënten snel terecht kunnen, binnen een week?", ["Ja", "Meestal", "Soms", "Zelden"]),
      single("Q5", "Ervaar je dat het beweegspreekuur jouw werkdruk beïnvloedt?", ["Vermindert, sterk", "Vermindert enigszins", "Geen verschil", "Verhoogt werkdruk"]),
      single("Q6", "Hoe beoordeel je de samenwerking met de fysiotherapeut?", qualityFive),
      single("Q7", "Zou je het beweegspreekuur structureel willen voortzetten?", continuation),
      single("Q8", "Zie je meerwaarde in uitbreiding van het beweegspreekuur?", yesNoUnknown),
      open("Q9", "Wat kan er volgens jou verbeterd worden?"),
    ],
  },
  {
    code: "SOCIAL_PROFESSIONAL",
    name: "Welzijnscoaches en buurtteams",
    audience: SurveyAudience.SOCIAL_PROFESSIONAL,
    description: "Evaluatie van verwijzing, overdracht en samenwerking, VEZN Q1 2026 versie 1.",
    questions: [
      single("Q1", "Hoe beoordeel je de samenwerking met de huisartsenpraktijk in het kader van het sociaal spreekuur?", qualityFive),
      single("Q2", "Voel je je voldoende betrokken in de inrichting en ontwikkeling van het sociaal spreekuur?", ["Ja", "Gedeeltelijk", "Nee"]),
      single("Q3", "Is voor jou duidelijk wanneer en op welke manier patiënten worden verwezen?", ["Ja, volledig duidelijk", "Grotendeels duidelijk", "Niet altijd duidelijk", "Onduidelijk"]),
      single("Q4", "Ervaar je dat patiënten tijdig worden doorverwezen, met vroegsignalering?", ["Ja, meestal", "Soms", "Zelden"]),
      single("Q5", "Worden patiënten passend doorverwezen, met de juiste hulpvraag en doelgroep?", ["Meestal", "Soms", "Zelden"]),
      single("Q6", "Is de hulpvraag bij verwijzing voldoende helder geformuleerd?", ["Ja", "Gedeeltelijk", "Nee"]),
      single("Q7", "Is de onderlinge afstemming over casussen voldoende?", ["Ja", "Gedeeltelijk", "Nee"]),
      single("Q8", "Is er voldoende ruimte voor terugkoppeling naar de huisartsenpraktijk?", ["Ja", "Gedeeltelijk", "Nee"]),
      single("Q9", "Zijn de randvoorwaarden, zoals ruimte, planning, tijd en frequentie, passend?", ["Ja", "Gedeeltelijk", "Nee"]),
      single("Q10", "Ervaar je dat het sociaal spreekuur meerwaarde heeft voor bewoners in de wijk?", ["Ja, duidelijk", "Enigszins", "Beperkt", "Niet"]),
      single("Q11", "Zie je meerwaarde in een structurele voortzetting van het sociaal spreekuur?", continuation),
      open("Q12", "Wat kan er verbeterd worden in het sociaal spreekuur of de samenwerking?"),
    ],
  },
];
