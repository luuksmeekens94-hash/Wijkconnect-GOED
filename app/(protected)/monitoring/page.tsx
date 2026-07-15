import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardPlus, Clock3, FileQuestion, Gauge, UsersRound } from "lucide-react";
import { MonitoringProgram, SurveyInvitationStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { formatDateInput, getIsoWeekRange, getMonitoringWeeklyCapacity, getOptionLabel, monitoringProgramOptions, percentage, weeklyReviewStatusLabels } from "@/lib/monitoring";
import { getMonitoringDashboardData, getMonitoringPeriod } from "@/lib/monitoring-queries";

function StatCard({ label, value, detail, tone = "sky" }: { label: string; value: string | number; detail: string; tone?: "sky" | "emerald" | "amber" | "violet" }) {
  const tones = {
    sky: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}>{detail}</span>
    </div>
  );
}

export default async function MonitoringDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; program?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  await requireRole(["ADMIN", "DATA_MANAGER"]);
  const program = Object.values(MonitoringProgram).includes(resolvedSearchParams.program as MonitoringProgram)
    ? (resolvedSearchParams.program as MonitoringProgram)
    : undefined;
  const period = getMonitoringPeriod(resolvedSearchParams.from, resolvedSearchParams.to);
  const data = await getMonitoringDashboardData({ ...period, program });
  const socialReferrals = data.cases.filter((item) => item.program === MonitoringProgram.SOCIAL).length;
  const completedSurveys = data.surveyCounts.find((item) => item.status === SurveyInvitationStatus.COMPLETED)?._count._all ?? 0;
  const totalSurveyInvitations = data.surveyCounts.reduce((sum, item) => sum + item._count._all, 0);
  const sentSurveyInvitations = data.surveyCounts
    .filter((item) => item.status === SurveyInvitationStatus.SENT || item.status === SurveyInvitationStatus.OPENED || item.status === SurveyInvitationStatus.COMPLETED || item.status === SurveyInvitationStatus.EXPIRED)
    .reduce((sum, item) => sum + item._count._all, 0);
  const currentWeek = getIsoWeekRange();
  const currentReviews = data.reviews.filter((review) => review.weekStart >= currentWeek.start && review.weekStart <= currentWeek.end);
  const blockingIssues = data.qualityIssues.filter((issue) => issue.severity === "blocking").length;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Projectmonitoring</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Beweeg Mee in één actueel overzicht</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Alle cijfers worden automatisch berekend uit registraties. Open weken gelden als voorlopige cijfers.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/monitoring/registraties/nieuw" className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700">
              <ClipboardPlus className="h-4 w-4" /> Nieuwe registratie
            </Link>
            <Link href="/monitoring/weken" className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
              Week controleren <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <form className="mt-6 grid gap-3 rounded-3xl bg-slate-50 p-4 md:grid-cols-4">
          <label className="space-y-2 text-sm text-slate-700">
            <span>Van</span>
            <input name="from" type="date" defaultValue={formatDateInput(period.from)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-sky-400" />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span>Tot</span>
            <input name="to" type="date" defaultValue={formatDateInput(period.to)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-sky-400" />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span>Spreekuur</span>
            <select name="program" defaultValue={program ?? ""} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-sky-400">
              <option value="">Beide spreekuren</option>
              {monitoringProgramOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <button className="self-end rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-sky-50">Filters toepassen</button>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Unieke patiënten" value={data.metrics.uniquePatients} detail="Verschenen in gekozen periode" />
        <StatCard label="Verschenen consulten" value={data.metrics.attended} detail={`${data.metrics.registrations} afspraakregistraties`} tone="emerald" />
        <StatCard label="Binnen 7 dagen" value={`${data.metrics.withinSevenDaysPercentage}%`} detail={`${data.metrics.withinSevenDays} consulten · VEZN-norm 80%`} tone="violet" />
        <StatCard label="Sociale verwijzingen" value={socialReferrals} detail="Casussen in gekozen periode" tone="amber" />
        <StatCard label="Eenmalig beweegconsult" value={`${data.metrics.oneOffMovementPercentage}%`} detail="Van verschenen beweegconsulten" tone="emerald" />
        <StatCard label="No-show" value={`${data.metrics.noShowPercentage}%`} detail={`${data.metrics.noShows} geregistreerd`} tone="amber" />
        <StatCard label="Terugkoppeling vastgelegd" value={`${data.metrics.feedbackPercentage}%`} detail="Van verschenen consulten" />
        <StatCard label="Surveyrespons" value={`${percentage(completedSurveys, sentSurveyInvitations)}%`} detail={`${completedSurveys} van ${sentSurveyInvitations} verstuurde uitnodigingen`} tone="violet" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Datakwaliteit</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Wat vraagt aandacht?</h2>
            </div>
            <div className={`rounded-full px-3 py-1 text-xs font-semibold ${blockingIssues > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
              {blockingIssues > 0 ? `${blockingIssues} blokkerend` : "Geen blokkerende fouten"}
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {data.qualityIssues.slice(0, 7).map((issue, index) => (
              <Link key={`${issue.appointmentId}-${index}`} href={`/monitoring/registraties/${issue.caseId}`} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-sky-200 hover:bg-sky-50">
                <div className="flex items-start gap-3">
                  {issue.severity === "blocking" ? <AlertTriangle className="mt-0.5 h-4 w-4 text-rose-600" /> : <Clock3 className="mt-0.5 h-4 w-4 text-amber-600" />}
                  <div>
                    <p className="text-sm font-medium text-slate-800">{issue.label}</p>
                    <p className="text-xs text-slate-500">Patiëntcode ···{issue.participantCode}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            ))}
            {data.qualityIssues.length === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-4 text-sm text-emerald-800"><CheckCircle2 className="h-5 w-5" /> Alle geregistreerde afspraken zijn compleet.</div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3"><Gauge className="h-5 w-5 text-sky-600" /><h2 className="text-xl font-semibold text-slate-900">Deze week</h2></div>
            <div className="mt-5 space-y-3">
              {monitoringProgramOptions.map((option) => {
                const review = currentReviews.find((item) => item.program === option.value);
                const availableSlots = getMonitoringWeeklyCapacity(option.value, review?.availableSlots);
                return (
                  <div key={option.value} className="rounded-2xl bg-slate-50 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-800">{option.label}</p>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">{review ? weeklyReviewStatusLabels[review.status] : "Nog niet geopend"}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{review?.clinicPlanned === false ? "Geen spreekuur gepland" : `${availableSlots} plekken ${review ? "geregistreerd" : "standaardcapaciteit"}`}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/monitoring/vragenlijsten" className="rounded-[1.75rem] bg-violet-600 p-5 text-white shadow-sm transition hover:bg-violet-700"><FileQuestion className="h-5 w-5" /><p className="mt-4 font-semibold">Vragenlijsten</p><p className="mt-1 text-sm text-violet-100">{totalSurveyInvitations} uitnodigingen</p></Link>
            <Link href="/monitoring/projectlog" className="rounded-[1.75rem] bg-slate-900 p-5 text-white shadow-sm transition hover:bg-slate-800"><UsersRound className="h-5 w-5" /><p className="mt-4 font-semibold">Projectacties</p><p className="mt-1 text-sm text-slate-300">{data.openActivities} openstaand</p></Link>
          </div>
        </div>
      </section>

      <p className="text-xs text-slate-400">Spreekuurfilter: {program ? getOptionLabel(monitoringProgramOptions, program) : "beide spreekuren"}. Datastand: {new Intl.DateTimeFormat("nl-NL", { dateStyle: "long", timeStyle: "short" }).format(new Date())}.</p>
    </div>
  );
}
