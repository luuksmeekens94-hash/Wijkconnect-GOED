import assert from "node:assert/strict";
import test from "node:test";
import { SurveyQuestionType } from "@prisma/client";
import { buildSurveyAnswerData } from "../lib/survey-response.ts";

const questions = [
  { id: "single", type: SurveyQuestionType.SINGLE_CHOICE, required: true, options: ["Ja", "Nee"], minValue: null, maxValue: null },
  { id: "multiple", type: SurveyQuestionType.MULTIPLE_CHOICE, required: true, options: ["A", "B", "C"], minValue: null, maxValue: null },
  { id: "scale", type: SurveyQuestionType.SCALE, required: true, options: null, minValue: 1, maxValue: 5 },
  { id: "text", type: SurveyQuestionType.FREE_TEXT, required: false, options: null, minValue: null, maxValue: null },
];

test("alle vier vraagtypen worden naar strikt gescheiden antwoordvelden omgezet", () => {
  assert.deepEqual(buildSurveyAnswerData(questions, {
    single: ["Ja"],
    multiple: ["A", "C", "A"],
    scale: ["4"],
    text: ["  Goede uitleg.  "],
  }), [
    { questionId: "single", choiceValue: "Ja" },
    { questionId: "multiple", selectedValues: ["A", "C"] },
    { questionId: "scale", numericValue: 4 },
    { questionId: "text", textValue: "Goede uitleg." },
  ]);
});

test("ontbrekende verplichte antwoorden en gemanipuleerde keuzes worden geweigerd", () => {
  assert.throws(() => buildSurveyAnswerData(questions, { single: [] }), /verplichte vragen/);
  assert.throws(() => buildSurveyAnswerData(questions, {
    single: ["Misschien"], multiple: ["A"], scale: ["3"], text: [],
  }), /Ongeldig antwoord/);
  assert.throws(() => buildSurveyAnswerData(questions, {
    single: ["Ja"], multiple: ["A"], scale: ["99"], text: [],
  }), /buiten het toegestane bereik/);
  assert.throws(() => buildSurveyAnswerData(questions, {
    single: ["Ja"], multiple: ["A"], scale: ["2.5"], text: [],
  }), /buiten het toegestane bereik/);
});
