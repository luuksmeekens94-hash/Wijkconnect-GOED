import Link from "next/link";
import { ArrowLeft, CalendarPlus, CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";
import { MonitoringAppointmentStatus, MonitoringCaseStatus, MonitoringProgram } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import {
  formatDateInput,
  getOptionLabel,
  monitoringAppointmentStatusOptions,
  monitoringFeedbackChannelOptions,
  monitoringOutcomeOptions,
  monitoringProgramOptions,
  monitoringReferralBasisOptions,
  monitoringReferralSourceOptions,
  monitoringSocialReasonOptions,
} from "@/lib/monitoring";
import { addMonitoringAppointment, setMonitoringCaseStatus, updateMonitoringAppointment } from "@/lib/monitoring-actions";
import { prisma } from "@/lib/prisma";

export default async function MonitoringRegistrationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole(["ADMIN"]);
  const monitoringCase = await prisma.monitoringCase.findUnique({
    where: { id },
    include: {
      participant: true,
      sourceReferral: { select: { caseId: true } },
      createdBy: { select: { name: true } },
      socialReasons: true,
      appointments: { orderBy: { scheduledAt: "asc" } },
    },
  });
  if (!monitoringCase) notFound();
  const outcomes = monitoringOutcomeOptions.filter((option) => (option.programs as readonly MonitoringProgram[]).includes(monitoringCase.program));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/monitoring/registraties" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-sky-700"><ArrowLeft className="h-4 w-4" /> Terug naar registraties</Link>
        <form action={setMonitoringCaseStatus}>
          <input type="hidden" name="caseId" value={monitoringCase.id} />
          <input type="hidden" name="status" value={monitoringCase.status === MonitoringCaseStatus.CLOSED ? MonitoringCaseStatus.OPEN : MonitoringCaseStatus.CLOSED} />
          <button className={`rounded-full px-4 py-2 text-sm font-semibold ${monitoringCase.status === MonitoringCaseStatus.CLOSED ? "bg-slate-100 text-slate-700" : "bg-emerald-600 text-white"}`}>{monitoringCase.status === MonitoringCaseStatus.CLOSED ? "Casus heropenen" : "Casus afronden"}</button>
        </form>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Registratie</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold text-slate-900">···{monitoringCase.participant.pseudonymCode.slice(-8)}</h1>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${monitoringCase.program === MonitoringProgram.MOVEMENT ? "bg-sky-100 text-sky-700" : "bg-violet-100 text-violet-700"}`}>{getOptionLabel(monitoringProgramOptions, monitoringCase.program)}</span>
          </div>
          <dl className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-xs uppercase tracking-wide text-slate-500">Verwijzingsdatum</dt><dd className="mt-1 font-medium text-slate-900">{new Intl.DateTimeFormat("nl-NL", { dateStyle: "long" }).format(monitoringCase.referralDate)}</dd></div>
            <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-xs uppercase tracking-wide text-slate-500">Herkomst</dt><dd className="mt-1 font-medium text-slate-900">{getOptionLabel(monitoringReferralSourceOptions, monitoringCase.referralSource)}</dd></div>
            <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-xs uppercase tracking-wide text-slate-500">Basis inplanning</dt><dd className="mt-1 font-medium text-slate-900">{getOptionLabel(monitoringReferralBasisOptions, monitoringCase.referralBasis)}</dd></div>
            <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-xs uppercase tracking-wide text-slate-500">Bron</dt><dd className="mt-1 font-medium text-slate-900">{monitoringCase.sourceReferral?.caseId ?? "Handmatige registratie"}</dd></div>
          </dl>
          {monitoringCase.program === MonitoringProgram.MOVEMENT ? (
            <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 p-4"><p className="text-xs uppercase tracking-wide text-sky-700">Klachtregio</p><p className="mt-1 font-medium text-slate-900">{monitoringCase.complaintCategory}</p></div>
          ) : (
            <div className="mt-4 space-y-3 rounded-2xl border border-violet-100 bg-violet-50 p-4">
              <div className="flex flex-wrap gap-2">{monitoringCase.socialReasons.map((item) => <span key={item.id} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-violet-700">{getOptionLabel(monitoringSocialReasonOptions, item.reason)}</span>)}</div>
              <p className="text-sm leading-6 text-slate-700">{monitoringCase.helpRequest || "Geen aanvullende hulpvraagtekst."}</p>
              <p className="text-xs text-slate-500">Uitvoering: {monitoringCase.assignedOrganization || "nog niet toegewezen"}{monitoringCase.assignedProfessional ? ` · ${monitoringCase.assignedProfessional}` : ""}</p>
            </div>
          )}
          <p className="mt-4 text-xs text-slate-400">Aangemaakt door {monitoringCase.createdBy.name}. De oorspronkelijke interne patiëntcode is niet opgeslagen.</p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3"><CalendarPlus className="h-5 w-5 text-sky-600" /><h2 className="text-xl font-semibold text-slate-900">Afspraak toevoegen</h2></div>
          <form action={addMonitoringAppointment} className="mt-5 grid gap-3">
            <input type="hidden" name="caseId" value={monitoringCase.id} />
            <input name="scheduledDate" type="date" required min={formatDateInput(monitoringCase.referralDate)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-400" />
            <select name="status" defaultValue={MonitoringAppointmentStatus.SCHEDULED} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-400">{monitoringAppointmentStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            <select name="outcome" defaultValue="" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-400"><option value="">Uitkomst nog niet ingevuld</option>{outcomes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            <button className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">Afspraak toevoegen</button>
          </form>
        </div>
      </section>

      <section className="space-y-4">
        <div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Afspraken en opvolging</p><h2 className="mt-2 text-2xl font-semibold text-slate-900">Volledige patiëntreis</h2></div>
        {monitoringCase.appointments.map((appointment, index) => (
          <form key={appointment.id} action={updateMonitoringAppointment} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <input type="hidden" name="appointmentId" value={appointment.id} />
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-slate-900">Afspraak {index + 1}</p><p className="text-sm text-slate-500">{new Intl.DateTimeFormat("nl-NL", { dateStyle: "long" }).format(appointment.scheduledAt)}</p></div>{appointment.status === MonitoringAppointmentStatus.ATTENDED && appointment.outcome && appointment.feedbackSentAt ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Compleet</span> : null}</div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-2 text-sm text-slate-700"><span>Status</span><select name="status" defaultValue={appointment.status} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400">{monitoringAppointmentStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label className="space-y-2 text-sm text-slate-700"><span>Uitkomst</span><select name="outcome" defaultValue={appointment.outcome ?? ""} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"><option value="">Nog niet ingevuld</option>{outcomes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label className="space-y-2 text-sm text-slate-700"><span>Vervolgorganisatie</span><input name="followUpOrganization" defaultValue={appointment.followUpOrganization ?? ""} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" /></label>
              <label className="space-y-2 text-sm text-slate-700"><span>Geschikt voor evaluatie</span><select name="evaluationEligible" defaultValue={appointment.evaluationEligible === null ? "" : appointment.evaluationEligible ? "yes" : "no"} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"><option value="">Nog niet bepaald</option><option value="yes">Ja</option><option value="no">Nee</option></select></label>
              <label className="space-y-2 text-sm text-slate-700"><span>Herinnering verstuurd</span><input name="reminderDate" type="date" defaultValue={appointment.reminderSentAt ? formatDateInput(appointment.reminderSentAt) : ""} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" /></label>
              <label className="space-y-2 text-sm text-slate-700"><span>Terugkoppeling verzonden</span><input name="feedbackDate" type="date" defaultValue={appointment.feedbackSentAt ? formatDateInput(appointment.feedbackSentAt) : ""} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" /></label>
              <label className="space-y-2 text-sm text-slate-700"><span>Ontvanger</span><input name="feedbackRecipient" defaultValue={appointment.feedbackRecipient ?? ""} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" /></label>
              <label className="space-y-2 text-sm text-slate-700"><span>Kanaal</span><select name="feedbackChannel" defaultValue={appointment.feedbackChannel ?? ""} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"><option value="">Nog niet ingevuld</option>{monitoringFeedbackChannelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label className="space-y-2 text-sm text-slate-700 md:col-span-2 xl:col-span-3"><span>Korte uitkomstnotitie</span><textarea name="outcomeNote" defaultValue={appointment.outcomeNote ?? ""} maxLength={500} rows={2} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" /></label>
            </div>
            <div className="mt-4 flex justify-end"><button className="rounded-2xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700">Wijzigingen opslaan</button></div>
          </form>
        ))}
        {monitoringCase.appointments.length === 0 ? <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">Deze verwijzing is nog niet ingepland.</div> : null}
      </section>
    </div>
  );
}
