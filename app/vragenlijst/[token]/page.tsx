import type { Metadata } from "next";
import { CheckCircle2, Clock3, LockKeyhole } from "lucide-react";
import { SurveyQuestionType } from "@prisma/client";
import { unstable_noStore as noStore } from "next/cache";
import { submitPublicSurvey } from "@/lib/public-survey-actions";
import { getPublicSurvey } from "@/lib/public-survey";
import { getPatientSurveyProgramContext } from "@/lib/survey-program-context";

export const metadata: Metadata = {
  title: "Vragenlijst | WijkConnect",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function options(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
}

function scaleValues(minValue: number | null, maxValue: number | null) {
  const minimum = minValue ?? 1;
  const maximum = maxValue ?? 10;
  if (maximum < minimum || maximum - minimum > 20) return [];
  return Array.from({ length: maximum - minimum + 1 }, (_, index) => minimum + index);
}

function StatusCard({ state }: { state: "unavailable" | "expired" | "completed" }) {
  const completed = state === "completed";
  const expired = state === "expired";
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
        {completed
          ? <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          : <Clock3 className="mx-auto h-12 w-12 text-slate-400" />}
        <h1 className="mt-5 text-2xl font-semibold text-slate-900">
          {completed ? "Bedankt voor uw reactie" : expired ? "Deze vragenlijst is verlopen" : "Deze vragenlijst is niet beschikbaar"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {completed
            ? "Uw antwoorden zijn veilig opgeslagen. U kunt dit venster sluiten."
            : "Neem contact op met de huisartsenpraktijk als u denkt dat dit niet klopt."}
        </p>
      </section>
    </main>
  );
}

export default async function PublicSurveyPage({ params }: { params: Promise<{ token: string }> }) {
  noStore();
  const { token } = await params;
  const survey = await getPublicSurvey(token);
  if (survey.state !== "available") return <StatusCard state={survey.state} />;

  const { template } = survey.invitation;
  const program = getPatientSurveyProgramContext(template.audience);
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <header className="rounded-[2rem] bg-slate-950 p-7 text-white shadow-sm sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">WijkConnect · De Schakel</p>
          {program ? <p className="mt-5 inline-flex rounded-full bg-sky-400/15 px-3 py-1.5 text-sm font-semibold text-sky-200 ring-1 ring-inset ring-sky-300/20">{program.displayName}</p> : null}
          <h1 className={`${program ? "mt-3" : "mt-4"} text-3xl font-semibold leading-tight`}>
            {program ? `Vragenlijst over ${program.sentenceName}` : template.name}
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            {program
              ? `U ontvangt deze vragenlijst omdat u onlangs ${program.sentenceName} bij De Schakel heeft bezocht. Met uw antwoorden kunnen we dit spreekuur verbeteren.`
              : "Met uw antwoorden kunnen we het spreekuur verbeteren. Invullen duurt maar een paar minuten."}
          </p>
          {program ? <p className="mt-2 text-sm leading-6 text-slate-300">Invullen duurt maar een paar minuten.</p> : null}
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-5 text-slate-300">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
            <span>Uw antwoorden worden beveiligd opgeslagen en alleen gebruikt voor evaluatie. Vul in open velden geen naam of andere herkenbare gegevens in.</span>
          </div>
        </header>

        <form action={submitPublicSurvey} className="mt-6 space-y-5">
          <input type="hidden" name="token" value={token} />
          {template.questions.map((question, questionIndex) => {
            const questionOptions = options(question.options);
            const name = `question_${question.id}`;
            return (
              <fieldset key={question.id} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                <legend className="sr-only">{question.prompt}</legend>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">Vraag {questionIndex + 1} van {template.questions.length}</p>
                <p className="mt-2 text-base font-medium leading-7 text-slate-900">{question.prompt}{question.required ? <span className="ml-1 text-rose-600" aria-label="verplicht">*</span> : null}</p>

                {question.type === SurveyQuestionType.SINGLE_CHOICE ? (
                  <div className="mt-4 space-y-2">
                    {questionOptions.map((option) => <label key={option} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700 hover:border-sky-300"><input type="radio" name={name} value={option} required={question.required} className="mt-0.5 h-4 w-4 text-sky-600" /><span>{option}</span></label>)}
                  </div>
                ) : null}

                {question.type === SurveyQuestionType.MULTIPLE_CHOICE ? (
                  <div className="mt-4 space-y-2">
                    {questionOptions.map((option) => <label key={option} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700 hover:border-sky-300"><input type="checkbox" name={name} value={option} className="mt-0.5 h-4 w-4 rounded text-sky-600" /><span>{option}</span></label>)}
                  </div>
                ) : null}

                {question.type === SurveyQuestionType.SCALE ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {scaleValues(question.minValue, question.maxValue).map((value) => <label key={value} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:border-sky-300 has-[:checked]:border-sky-600 has-[:checked]:bg-sky-50 has-[:checked]:text-sky-700"><input type="radio" name={name} value={value} required={question.required} className="sr-only" /><span>{value}</span></label>)}
                  </div>
                ) : null}

                {question.type === SurveyQuestionType.FREE_TEXT ? (
                  <textarea name={name} required={question.required} maxLength={4000} rows={5} placeholder="Uw antwoord (noem geen namen)" className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                ) : null}
              </fieldset>
            );
          })}

          <button type="submit" className="w-full rounded-2xl bg-sky-600 px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2">Antwoorden veilig versturen</button>
          <p className="px-4 text-center text-xs leading-5 text-slate-500">De persoonlijke link werkt één keer en verloopt automatisch.</p>
        </form>
      </div>
    </main>
  );
}
