import { SurveyQuestionType } from "@prisma/client";

export type SurveyReportQuestion = {
  type: SurveyQuestionType;
  options: unknown;
};

export type SurveyReportAnswer = {
  choiceValue: string | null;
  selectedValues: unknown;
  numericValue: number | null;
  textValue: string | null;
};

export type SurveyAnswerCount = {
  label: string;
  count: number;
  percentage: number;
};

export type SurveyQuestionSummary = {
  answered: number;
  counts: SurveyAnswerCount[];
  average: number | null;
  textAnswers: string[];
};

function stringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
}

function roundedPercentage(count: number, total: number) {
  return total > 0 ? Math.round((count / total) * 1_000) / 10 : 0;
}

function countValues(values: string[], preferredOrder: string[], denominator: number) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);

  const orderedLabels = [
    ...preferredOrder.filter((value) => counts.has(value)),
    ...[...counts.keys()].filter((value) => !preferredOrder.includes(value)).sort((a, b) => a.localeCompare(b, "nl")),
  ];

  return orderedLabels.map((label) => {
    const count = counts.get(label) ?? 0;
    return { label, count, percentage: roundedPercentage(count, denominator) };
  });
}

export function summarizeSurveyQuestion(
  question: SurveyReportQuestion,
  answers: SurveyReportAnswer[],
): SurveyQuestionSummary {
  const answered = answers.length;
  const preferredOrder = stringArray(question.options);

  if (question.type === SurveyQuestionType.SINGLE_CHOICE) {
    const values = answers.flatMap((answer) => answer.choiceValue ? [answer.choiceValue] : []);
    return { answered, counts: countValues(values, preferredOrder, answered), average: null, textAnswers: [] };
  }

  if (question.type === SurveyQuestionType.MULTIPLE_CHOICE) {
    const values = answers.flatMap((answer) => stringArray(answer.selectedValues));
    return { answered, counts: countValues(values, preferredOrder, answered), average: null, textAnswers: [] };
  }

  if (question.type === SurveyQuestionType.SCALE) {
    const values = answers.flatMap((answer) => answer.numericValue === null ? [] : [answer.numericValue]);
    const average = values.length > 0
      ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
      : null;
    return {
      answered,
      counts: countValues(values.map(String), [], answered).sort((a, b) => Number(a.label) - Number(b.label)),
      average,
      textAnswers: [],
    };
  }

  return {
    answered,
    counts: [],
    average: null,
    textAnswers: answers.flatMap((answer) => answer.textValue?.trim() ? [answer.textValue.trim()] : []),
  };
}
