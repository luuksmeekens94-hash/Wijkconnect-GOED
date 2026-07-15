import assert from "node:assert/strict";
import test from "node:test";
import { SurveyQuestionType } from "@prisma/client";
import { summarizeSurveyQuestion } from "../lib/survey-reporting.ts";

const emptyAnswer = {
  choiceValue: null,
  selectedValues: null,
  numericValue: null,
  textValue: null,
};

test("vat enkelvoudige antwoorden samen in de volgorde van het template", () => {
  const summary = summarizeSurveyQuestion(
    { type: SurveyQuestionType.SINGLE_CHOICE, options: ["Ja", "Misschien", "Nee"] },
    [
      { ...emptyAnswer, choiceValue: "Nee" },
      { ...emptyAnswer, choiceValue: "Ja" },
      { ...emptyAnswer, choiceValue: "Ja" },
    ],
  );

  assert.equal(summary.answered, 3);
  assert.deepEqual(summary.counts, [
    { label: "Ja", count: 2, percentage: 66.7 },
    { label: "Nee", count: 1, percentage: 33.3 },
  ]);
});

test("toont bij meervoudige antwoorden het percentage respondenten per keuze", () => {
  const summary = summarizeSurveyQuestion(
    { type: SurveyQuestionType.MULTIPLE_CHOICE, options: ["A", "B", "C"] },
    [
      { ...emptyAnswer, selectedValues: ["A", "B"] },
      { ...emptyAnswer, selectedValues: ["A"] },
    ],
  );

  assert.deepEqual(summary.counts, [
    { label: "A", count: 2, percentage: 100 },
    { label: "B", count: 1, percentage: 50 },
  ]);
});

test("berekent het gemiddelde van schaalvragen en bewaart open antwoorden", () => {
  const scale = summarizeSurveyQuestion(
    { type: SurveyQuestionType.SCALE, options: null },
    [
      { ...emptyAnswer, numericValue: 7 },
      { ...emptyAnswer, numericValue: 8 },
      { ...emptyAnswer, numericValue: 10 },
    ],
  );
  assert.equal(scale.average, 8.3);

  const open = summarizeSurveyQuestion(
    { type: SurveyQuestionType.FREE_TEXT, options: null },
    [
      { ...emptyAnswer, textValue: "  Meer uitleg vooraf. " },
      { ...emptyAnswer, textValue: "" },
    ],
  );
  assert.deepEqual(open.textAnswers, ["Meer uitleg vooraf."]);
});
