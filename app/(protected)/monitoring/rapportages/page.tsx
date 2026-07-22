import { Download, Info } from "lucide-react";
import { MonitoringProgram, WeeklyReviewStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { formatDateInput, getOptionLabel, monitoringOutcomeOptions, monitoringProgramOptions, monitoringReferralSourceOptions, monitoringSocialReasonOptions } from "@/lib/monitoring";
import { getMonitoringDashboardData, getMonitoringPeriod } from "@/lib/monitoring-queries";
import { patientJourneyOutcomeLabel } from "@/lib/patient-journey";
import { prisma } from "@/lib/prisma";

function countBy(values: string[]) {
  return Array.from(values.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map<string, number>()).entries()).sort((a, b) => b[1] - a[1]);
}

function Breakdown({ title, rows, total }: { title: string; rows: Array<[string, number]>; total: number }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <div className="mt-5 space-y-4">
        {rows.slice(0, 10).map(([label, value]) => {
          const width = total > 0 ? Math.max((value / total) * 100, 3) : 0;
          return <div key={label}><div className="flex justify-between gap-4 text-sm"><span className="text-slate-700">{label}</span><span className="font-semibold text-slate-900">{value}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-500" style={{ width: `${width}%` }} /></div></div>;
        })}
        {rows.length === 0 ? <p className="text-sm text-slate-500">Nog geen gegevens beschikbaar.</p> : null}
      </div>
    </div>
  );
}

export default async function MonitoringReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; program?: string }> }) {
  const resolvedSearchParams = await searchParams;
  await requireRole(["ADMIN"]);
  const period = getMonitoringPeriod(resolvedSearchParams.from, resolvedSearchParams.to);
  const program = Object.values(MonitoringProgram).includes(resolvedSearchParams.program as MonitoringProgram) ? resolvedSearchParams.program as MonitoringProgram : undefined;
  const data = await getMonitoringDashboardData({ ...period, program });
  const journeyUpdates = await prisma.patientJourneyUpdate.findMany({
    where: {
      case: {
        referralDate: { gte: period.from, lte: period.to },
        ...(program ? { program } : {}),
      },
    },
    select: { caseId: true, outcome: true },
  });
  const sourceRows = countBy(data.appointments.map((item) => getOptionLabel(monitoringReferralSourceOptions, item.case.referralSource)));
  const outcomeRows = countBy(data.appointments.filter((item) => item.outcome).map((item) => getOptionLabel(monitoringOutcomeOptions, item.outcome)));
  const complaintRows = countBy(data.appointments.filter((item) => item.case.complaintCategory).map((item) => item.case.complaintCategory!));
  const reasonRows = countBy(data.appointments.flatMap((item) => item.case.socialReasons.map((reason) => getOptionLabel(monitoringSocialReasonOptions, reason.reason))));
  const journeyRows = countBy(journeyUpdates.map((item) => patientJourneyOutcomeLabel(item.outcome)));
  const attendedCaseIds = new Set(data.appointments.filter((item) => item.status === "ATTENDED").map((item) => item.caseId));
  const journeyCaseIds = new Set(journeyUpdates.map((item) => item.caseId));
  const journeyCoverage = attendedCaseIds.size > 0 ? Math.round((journeyCaseIds.size / attendedCaseIds.size) * 1000) / 10 : 0;
  const openWeeks = data.reviews.filter((review) => review.status !== WeeklyReviewStatus.CLOSED).length;
  const exportQuery = new URLSearchParams({ from: formatDateInput(period.from), to: formatDateInput(period.to), ...(program ? { program } : {}) }).toString();

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Rapportages</p><h1 className="mt-2 text-3xl font-semibold text-slate-900">Controleerbare cijfers per periode</h1><p className="mt-2 text-sm text-slate-500">Aantallen, percentages en uitsplitsingen worden rechtstreeks uit bronregistraties berekend.</p></div>
          <a href={`/api/monitoring/export?${exportQuery}`} className="inline-flex items-center gap-2 self-start rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"><Download className="h-4 w-4" /> CSV downloaden</a>
        </div>
        <form className="mt-6 grid gap-3 rounded-3xl bg-slate-50 p-4 md:grid-cols-4"><input name="from" type="date" defaultValue={formatDateInput(period.from)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none" /><input name="to" type="date" defaultValue={formatDateInput(period.to)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none" /><select name="program" defaultValue={program ?? ""} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"><option value="">Beide spreekuren</option>{monitoringProgramOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><button className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">Rapport verversen</button></form>
      </section>

      {openWeeks > 0 ? <div className="flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><Info className="mt-0.5 h-5 w-5 shrink-0" /><p>In deze periode zijn {openWeeks} weekregistraties nog niet afgesloten. De cijfers bevatten daardoor voorlopige gegevens.</p></div> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[['Unieke patiënten', data.metrics.uniquePatients], ['Verschenen consulten', data.metrics.attended], ['Binnen 7 dagen', `${data.metrics.withinSevenDaysPercentage}%`], ['Sociale verwijzingen', data.cases.filter((item) => item.program === MonitoringProgram.SOCIAL).length], ['Eenmalig beweegconsult', `${data.metrics.oneOffMovementPercentage}%`], ['No-show', `${data.metrics.noShowPercentage}%`], ['Patiëntreis vastgelegd', `${journeyCoverage}%`], ['Open plekken', data.metrics.openSlots]].map(([label, value]) => <div key={String(label)} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p></div>)}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Breakdown title="Herkomst verwijzing" rows={sourceRows} total={data.appointments.length} />
        <Breakdown title="Uitkomsten" rows={outcomeRows} total={outcomeRows.reduce((sum, row) => sum + row[1], 0)} />
        <Breakdown title="Klachtregio’s beweegspreekuur" rows={complaintRows} total={complaintRows.reduce((sum, row) => sum + row[1], 0)} />
        <Breakdown title="Redenen sociaal spreekuur" rows={reasonRows} total={reasonRows.reduce((sum, row) => sum + row[1], 0)} />
        <Breakdown title="Vervolgstappen in de patiëntreis" rows={journeyRows} total={journeyRows.reduce((sum, row) => sum + row[1], 0)} />
      </section>
    </div>
  );
}
