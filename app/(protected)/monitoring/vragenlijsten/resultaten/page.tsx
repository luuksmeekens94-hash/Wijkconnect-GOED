import Link from "next/link";
import { ArrowLeft, BarChart3, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { formatDateInput, percentage, surveyAudienceLabels } from "@/lib/monitoring";
import { getMonitoringPeriod } from "@/lib/monitoring-queries";
import { prisma } from "@/lib/prisma";
import { summarizeSurveyQuestion } from "@/lib/survey-reporting";

const MINIMUM_REPORT_GROUP_SIZE = 5;

export default async function SurveyResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ templateId?: string; from?: string; to?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const resolvedSearchParams = await searchParams;
  const period = getMonitoringPeriod(resolvedSearchParams.from, resolvedSearchParams.to);
  const templates = await prisma.surveyTemplate.findMany({
    where: { active: true },
    include: { questions: { orderBy: { position: "asc" } } },
    orderBy: [{ audience: "asc" }, { version: "desc" }],
  });
  const selectedTemplate = templates.find((template) => template.id === resolvedSearchParams.templateId) ?? templates[0];

  if (!selectedTemplate) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Nog geen vragenlijstresultaten beschikbaar</h1>
        <p className="mt-3 text-sm text-slate-500">Laad eerst de VEZN-templates in het vragenlijstcentrum.</p>
        <Link href="/monitoring/vragenlijsten" className="mt-6 inline-flex rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white">Naar vragenlijsten</Link>
      </section>
    );
  }

  const [responses, sentInvitations] = await Promise.all([
    prisma.surveyResponse.findMany({
      where: {
        submittedAt: { gte: period.from, lte: period.to },
        invitation: { templateId: selectedTemplate.id },
      },
      include: { answers: true },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.surveyInvitation.findMany({
      where: {
        templateId: selectedTemplate.id,
        sentAt: { gte: period.from, lte: period.to },
      },
      select: { response: { select: { id: true } } },
    }),
  ]);

  const completedFromSentCohort = sentInvitations.filter((invitation) => invitation.response).length;
  const answersByQuestion = new Map<string, (typeof responses)[number]["answers"]>();
  for (const response of responses) {
    for (const answer of response.answers) {
      const answers = answersByQuestion.get(answer.questionId) ?? [];
      answers.push(answer);
      answersByQuestion.set(answer.questionId, answers);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <Link href="/monitoring/vragenlijsten" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-sky-700"><ArrowLeft className="h-4 w-4" /> Vragenlijstcentrum</Link>
        <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-600">Resultaten</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Bevindingen per vraag</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Dit overzicht is geaggregeerd en toont geen e-mailadres, patiëntcode of casusnummer. Vraaguitkomsten verschijnen pas vanaf vijf antwoorden.</p>
          </div>
        </div>

        <form className="mt-6 grid gap-3 rounded-3xl bg-slate-50 p-4 lg:grid-cols-[2fr_1fr_1fr_auto]">
          <label className="space-y-2 text-sm text-slate-700"><span>Vragenlijst</span><select name="templateId" defaultValue={selectedTemplate.id} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-sky-400">{templates.map((template) => <option key={template.id} value={template.id}>{template.name} · v{template.version}</option>)}</select></label>
          <label className="space-y-2 text-sm text-slate-700"><span>Van</span><input name="from" type="date" defaultValue={formatDateInput(period.from)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-sky-400" /></label>
          <label className="space-y-2 text-sm text-slate-700"><span>Tot</span><input name="to" type="date" defaultValue={formatDateInput(period.to)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-sky-400" /></label>
          <button className="self-end rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-sky-50">Tonen</button>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Doelgroep</p><p className="mt-2 text-xl font-semibold text-slate-900">{surveyAudienceLabels[selectedTemplate.audience]}</p><p className="mt-2 text-xs text-slate-500">{selectedTemplate.name} · versie {selectedTemplate.version}</p></div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Verstuurd in periode</p><p className="mt-2 text-3xl font-semibold text-slate-900">{sentInvitations.length}</p><p className="mt-2 text-xs text-slate-500">Uitnodigingen met verzenddatum</p></div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Respons op verstuurde cohort</p><p className="mt-2 text-3xl font-semibold text-slate-900">{percentage(completedFromSentCohort, sentInvitations.length)}%</p><p className="mt-2 text-xs text-slate-500">{completedFromSentCohort} van {sentInvitations.length} ingevuld</p></div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Ingevuld in periode</p><p className="mt-2 text-3xl font-semibold text-slate-900">{responses.length}</p><p className="mt-2 text-xs text-slate-500">Gebruikt voor onderstaande uitkomsten</p></div>
      </section>

      <section className="space-y-4">
        {selectedTemplate.questions.map((question, index) => {
          const summary = summarizeSurveyQuestion(question, answersByQuestion.get(question.id) ?? []);
          const reportable = summary.answered >= MINIMUM_REPORT_GROUP_SIZE;
          return (
            <article key={question.id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">Vraag {index + 1}</p><h2 className="mt-2 text-lg font-semibold leading-7 text-slate-900">{question.prompt}</h2></div>
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{summary.answered} antwoorden</span>
              </div>

              {!reportable && summary.answered > 0 ? <div className="mt-5 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900"><ShieldCheck className="mt-1 h-4 w-4 shrink-0" /><p>Uitkomst afgeschermd: er zijn minimaal {MINIMUM_REPORT_GROUP_SIZE} antwoorden nodig om herleidbaarheid in kleine groepen te beperken.</p></div> : null}

              {reportable && summary.average !== null ? <div className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-800"><BarChart3 className="h-4 w-4" /> Gemiddelde: {summary.average}</div> : null}

              {reportable && summary.counts.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {summary.counts.map((item) => (
                    <div key={item.label}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="text-slate-700">{item.label}</span><span className="font-semibold text-slate-900">{item.count} · {item.percentage}%</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.min(item.percentage, 100)}%` }} /></div>
                    </div>
                  ))}
                </div>
              ) : null}

              {reportable && summary.textAnswers.length > 0 ? <div className="mt-5 flex items-start gap-3 rounded-2xl bg-violet-50 p-4 text-sm leading-6 text-violet-900"><ShieldCheck className="mt-1 h-4 w-4 shrink-0" /><p>{summary.textAnswers.length} open antwoorden zijn beveiligd opgeslagen. De teksten worden hier bewust niet individueel getoond; eerst is een redactieflow nodig om per ongeluk ingevoerde namen of andere herkenbare gegevens te verwijderen.</p></div> : null}

              {summary.answered === 0 ? <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Nog geen antwoord op deze vraag in de gekozen periode.</p> : null}
            </article>
          );
        })}
      </section>
    </div>
  );
}
