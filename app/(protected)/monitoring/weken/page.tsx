import Link from "next/link";
import { addWeeks, endOfWeek, format, startOfWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { MonitoringProgram, WeeklyReviewStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { calculateMonitoringMetrics, formatDateInput, getMonitoringWeeklyCapacity, monitoringProgramOptions, weeklyReviewStatusLabels } from "@/lib/monitoring";
import { saveWeeklyReview } from "@/lib/monitoring-actions";
import { getMonitoringDashboardData } from "@/lib/monitoring-queries";

export default async function MonitoringWeeksPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const resolvedSearchParams = await searchParams;
  await requireRole(["ADMIN", "DATA_MANAGER"]);
  const selected = resolvedSearchParams.week ? new Date(`${resolvedSearchParams.week}T12:00:00.000Z`) : new Date();
  const weekStart = startOfWeek(Number.isNaN(selected.getTime()) ? new Date() : selected, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const [movement, social] = await Promise.all([
    getMonitoringDashboardData({ from: weekStart, to: weekEnd, program: MonitoringProgram.MOVEMENT }),
    getMonitoringDashboardData({ from: weekStart, to: weekEnd, program: MonitoringProgram.SOCIAL }),
  ]);

  const programData = new Map([
    [MonitoringProgram.MOVEMENT, movement],
    [MonitoringProgram.SOCIAL, social],
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Weekregistratie</p><h1 className="mt-2 text-3xl font-semibold text-slate-900">{format(weekStart, "d MMMM", { locale: nl })} – {format(weekEnd, "d MMMM yyyy", { locale: nl })}</h1><p className="mt-2 text-sm text-slate-500">Controleer capaciteit, registraties en terugkoppeling voordat je de week afsluit.</p></div>
          <div className="flex gap-2">
            <Link href={`/monitoring/weken?week=${formatDateInput(addWeeks(weekStart, -1))}`} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700"><ArrowLeft className="h-4 w-4" /> Vorige</Link>
            <Link href={`/monitoring/weken?week=${formatDateInput(addWeeks(weekStart, 1))}`} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">Volgende <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {monitoringProgramOptions.map((option) => {
          const data = programData.get(option.value)!;
          const review = data.reviews[0];
          const availableSlots = getMonitoringWeeklyCapacity(option.value, review?.availableSlots);
          const metrics = calculateMonitoringMetrics(
            data.appointments.map((appointment) => ({
              participantId: appointment.case.participantId,
              referralDate: appointment.case.referralDate,
              scheduledAt: appointment.scheduledAt,
              status: appointment.status,
              outcome: appointment.outcome,
              feedbackSentAt: appointment.feedbackSentAt,
              program: appointment.case.program,
            })),
            availableSlots,
          );
          const blockingIssues = data.qualityIssues.filter((issue) => issue.severity === "blocking");
          return (
            <div key={option.value} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">{option.label}</p><h2 className="mt-2 text-2xl font-semibold text-slate-900">Weekcontrole</h2></div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${review?.status === WeeklyReviewStatus.CLOSED ? "bg-emerald-100 text-emerald-700" : blockingIssues.length ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{review ? weeklyReviewStatusLabels[review.status] : "Open"}</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  ["Capaciteit", availableSlots],
                  ["Ingepland", metrics.scheduled],
                  ["Geweest", metrics.attended],
                  ["No-show", metrics.noShows],
                  ["Geannuleerd", metrics.cancelled],
                  ["Open", metrics.openSlots],
                ].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p></div>)}
              </div>
              <div className="mt-5 space-y-2">
                {metrics.overbookedBy > 0 ? <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" /> Overboeking: {metrics.scheduled} afspraken ingepland bij {availableSlots} beschikbare plekken ({metrics.overbookedBy} te veel).</div> : null}
                {data.qualityIssues.slice(0, 5).map((issue, index) => <Link key={`${issue.appointmentId}-${index}`} href={`/monitoring/registraties/${issue.caseId}`} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{issue.severity === "blocking" ? <AlertTriangle className="h-4 w-4 text-rose-600" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}{issue.label}</Link>)}
                {data.qualityIssues.length === 0 && metrics.overbookedBy === 0 ? <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4" /> Alle registraties zijn compleet.</div> : null}
              </div>
              <form action={saveWeeklyReview} className="mt-6 space-y-4 border-t border-slate-100 pt-5">
                <input type="hidden" name="program" value={option.value} />
                <input type="hidden" name="weekStart" value={formatDateInput(weekStart)} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-700"><span>Beschikbare plekken</span><input name="availableSlots" type="number" min={0} defaultValue={availableSlots} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" /></label>
                  <label className="space-y-2 text-sm text-slate-700"><span>Status</span><select name="status" defaultValue={review?.status ?? WeeklyReviewStatus.OPEN} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400">{Object.values(WeeklyReviewStatus).map((status) => <option key={status} value={status}>{weeklyReviewStatusLabels[status]}</option>)}</select></label>
                </div>
                <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700"><input name="clinicPlanned" type="checkbox" defaultChecked={review?.clinicPlanned ?? true} className="h-4 w-4 rounded border-slate-300 text-sky-600" /> Er was deze week een spreekuur gepland</label>
                <label className="space-y-2 text-sm text-slate-700"><span>Weeknotitie</span><textarea name="notes" defaultValue={review?.notes ?? ""} maxLength={1000} rows={3} placeholder="Bijzonderheden, oorzaken of vervolgacties" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" /></label>
                <button className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700">Weekcontrole opslaan</button>
              </form>
            </div>
          );
        })}
      </section>
    </div>
  );
}
