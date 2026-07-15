import { SurveyQuestionType } from "@prisma/client";

export type SurveyQuestionForSubmission = {
  id: string;
  type: SurveyQuestionType;
  required: boolean;
  options: unknown;
  minValue: number | null;
  maxValue: number | null;
};

export type SurveyAnswerForCreate = {
  questionId: string;
  choiceValue?: string;
  selectedValues?: string[];
  numericValue?: number;
  textValue?: string;
};

function stringOptions(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
}

function cleanedValues(values: string[] | undefined) {
  return (values ?? []).map((value) => value.trim()).filter(Boolean);
}

export function buildSurveyAnswerData(
  questions: SurveyQuestionForSubmission[],
  valuesByQuestionId: Record<string, string[]>,
): SurveyAnswerForCreate[] {
  const answers: SurveyAnswerForCreate[] = [];
  for (const question of questions) {
    const values = cleanedValues(valuesByQuestionId[question.id]);
    if (values.length === 0) {
      if (question.required) throw new Error("Beantwoord alle verplichte vragen");
      continue;
    }

    if (question.type === SurveyQuestionType.SINGLE_CHOICE) {
      const options = stringOptions(question.options);
      if (values.length !== 1 || !options.includes(values[0])) throw new Error("Ongeldig antwoord geselecteerd");
      answers.push({ questionId: question.id, choiceValue: values[0] });
      continue;
    }

    if (question.type === SurveyQuestionType.MULTIPLE_CHOICE) {
      const options = stringOptions(question.options);
      const selectedValues = [...new Set(values)];
      if (
        selectedValues.length > Math.min(options.length, 20) ||
        selectedValues.some((value) => !options.includes(value))
      ) throw new Error("Ongeldig antwoord geselecteerd");
      answers.push({ questionId: question.id, selectedValues });
      continue;
    }

    if (question.type === SurveyQuestionType.SCALE) {
      if (values.length !== 1) throw new Error("Kies één waarde op de schaal");
      const numericValue = Number(values[0]);
      if (
        !Number.isFinite(numericValue) ||
        !Number.isInteger(numericValue) ||
        (question.minValue !== null && numericValue < question.minValue) ||
        (question.maxValue !== null && numericValue > question.maxValue)
      ) {
        throw new Error("De gekozen schaalwaarde valt buiten het toegestane bereik");
      }
      answers.push({ questionId: question.id, numericValue });
      continue;
    }

    const textValue = values.join(" ").trim();
    if (textValue.length > 4000) throw new Error("Een open antwoord mag maximaal 4.000 tekens bevatten");
    if (textValue) answers.push({ questionId: question.id, textValue });
  }
  return answers;
}
