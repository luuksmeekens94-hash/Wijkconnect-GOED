import Link from "next/link";
import { addWeeks, endOfWeek, format, isWithinInterval, startOfWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, UserRoundPlus } from "lucide-react";
import { MonitoringAppointmentStatus, SurveyInvitationStatus } from "@prisma/client";
import { WeeklyPatientRegistrationForm } from "@/components/weekly-patient-registration-form";
import { requireRole } from "@/lib/auth";
import {
  decryptMonitoringPatientEmail,
  decryptMonitoringPatientName,
  maskMonitoringPatientEmail,
} from "@/lib/monitoring-contact-security";
import {
  formatDateInput,
  getOptionLabel,
  monitoringAppointmentStatusOptions,
  monitoringProgramOptions,
  monitoringSocialReasonOptions,
} from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";
import { createWeeklyPatientRegistration } from "@/lib/weekly-patient-actions";

function safePatientContact(participant: { pseudonymCode: string; displayNameEncrypted: string | null; emailEncrypted: string | null }) {
  try {
    return {
      name: participant.displayNameEncrypted ? decryptMonitoringPatientName(participant.displayNameEncrypted) : `Patiënt ···${participant.pseudonymCode.slice(-8)}`,
      email: participant.emailEncrypted ? decryptMonitoringPatientEmail(participant.emailEncrypted) : null,
    };
  } catch {
    return { name: `Patiënt ···${participant.pseudonymCode.slice(-8)}`, email: null };
  }
}

function surveyLabel(status?: SurveyInvitationStatus) {
  if (!status) return "Niet verstuurd";
  if (status === SurveyInvitationStatus.COMPLETED) return "Ingevuld";
  if (status === SurveyInvitationStatus.READY) return "Klaargezet";
  if (status === SurveyInvitationStatus.CANCELLED || status === SurveyInvitationStatus.EXPIRED) return "Niet actief";
  return "Verstuurd";
}

export default async function WeeklyPatientEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; saved?: string; survey?: string }>;
}) {
  const params = await searchParams;
  const user = await requireRole(["ADMIN", "DATA_MANAGER"]);
  const requested = params.week ? new Date(`${params.week}T12:00:00.000Z`) : new Date();
  const validRequested = Number.isNaN(requested.getTime()) ? new Date() : requested;
  const weekStart = startOfWeek(validRequested, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const today = new Date();
  const canEnterWeek = weekStart <= today;
  const defaultDate = isWithinInterval(today, { start: weekStart, end: weekEnd }) ? today : weekEnd;
  const maxDate = weekEnd < today ? weekEnd : today;

  const appointments = await prisma.monitoringAppointment.findMany({
    where: { scheduledAt: { gte: weekStart, lte: weekEnd } },
    include: {
      case: {
        include: {
          participant: true,
          socialReasons: true,
          patientJourneyUpdates: { orderBy: { occurredAt: "desc" }, take: 1 },
        },
      },
      surveyInvitations: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
  });
  const attended = appointments.filter((item) => item.status === MonitoringAppointmentStatus.ATTENDED).length;
  const noShows = appointments.filter((item) => item.status === MonitoringAppointmentStatus.NO_SHOW).length;
  const surveys = appointments.filter((item) => item.surveyInvitations.length > 0).length;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Wekelijkse patiëntinvoer</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Week van {format(weekStart, "d MMMM", { locale: nl })} t/m {format(weekEnd, "d MMMM yyyy", { locale: nl })}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Kies eerst de juiste week. Voeg daarna de patiënten van het beweegspreekuur en sociaal spreekuur één voor één toe.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/monitoring/weekinvoer?week=${formatDateInput(addWeeks(weekStart, -1))}`} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700"><ArrowLeft className="h-4 w-4" /> Vorige week</Link>
            <Link href={`/monitoring/weekinvoer?week=${formatDateInput(addWeeks(weekStart, 1))}`} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">Volgende week <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
        <form className="mt-5 flex flex-col gap-3 rounded-3xl bg-slate-50 p-4 sm:flex-row sm:items-end">
          <label className="flex-1 space-y-2 text-sm font-medium text-slate-700"><span>Controleer of kies de week</span><input name="week" type="date" defaultValue={formatDateInput(weekStart)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-sky-400" /></label>
          <button className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Week openen</button>
        </form>
      </section>

      {params.saved === "1" ? (
        <div className={`flex items-start gap-3 rounded-3xl border p-4 text-sm ${params.survey === "failed" || params.survey === "not-sent" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{params.survey === "sent" ? "Patiënt opgeslagen en de juiste vragenlijst is verstuurd." : params.survey === "failed" || params.survey === "not-sent" ? "Patiënt is opgeslagen, maar de vragenlijst kon niet worden verstuurd. De beheerder kan dit controleren en opnieuw aanbieden." : "Patiënt is opgeslagen."}</p>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3"><UserRoundPlus className="h-5 w-5 text-sky-600" /><h2 className="text-2xl font-semibold text-slate-900">Patiënt toevoegen</h2></div>
          <p className="mt-2 text-sm text-slate-500">Naam en e-mail worden versleuteld opgeslagen. De rapportage gebruikt alleen de niet-herleidbare patiëntcode.</p>
          {canEnterWeek ? <div className="mt-6">
            <WeeklyPatientRegistrationForm
              action={createWeeklyPatientRegistration}
              weekStart={formatDateInput(weekStart)}
              minDate={formatDateInput(weekStart)}
              maxDate={formatDateInput(maxDate)}
              defaultDate={formatDateInput(defaultDate > maxDate ? maxDate : defaultDate)}
            />
          </div> : <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Deze week ligt in de toekomst. Je kunt patiënten na afloop van het spreekuur registreren.</div>}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[["Geweest", attended], ["No-show", noShows], ["Vragenlijsten", surveys]].map(([label, value]) => <div key={String(label)} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p></div>)}
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Patiënten in deze week</h2>
            <div className="mt-4 space-y-3">
              {appointments.map((appointment) => {
                const contact = safePatientContact(appointment.case.participant);
                const socialReason = appointment.case.socialReasons[0]?.reason;
                const latestSurvey = appointment.surveyInvitations[0];
                const content = (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div><p className="font-semibold text-slate-900">{contact.name}</p><p className="mt-1 text-xs text-slate-500">{contact.email ? maskMonitoringPatientEmail(contact.email) : "Contactgegevens niet meer beschikbaar"} · {format(appointment.scheduledAt, "EEEE d MMMM", { locale: nl })}</p></div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${appointment.status === MonitoringAppointmentStatus.ATTENDED ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{getOptionLabel(monitoringAppointmentStatusOptions, appointment.status)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-white px-3 py-1 text-slate-600">{getOptionLabel(monitoringProgramOptions, appointment.case.program)}</span>
                      {appointment.status === MonitoringAppointmentStatus.ATTENDED ? <span className="rounded-full bg-white px-3 py-1 text-slate-600">{appointment.case.complaintCategory ?? getOptionLabel(monitoringSocialReasonOptions, socialReason)}</span> : null}
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-slate-600"><Mail className="h-3 w-3" /> {surveyLabel(latestSurvey?.status)}</span>
                      <span className="rounded-full bg-white px-3 py-1 text-slate-600">{appointment.case.patientJourneyUpdates.length ? "Patiëntreis bijgewerkt" : "Vervolg nog open"}</span>
                    </div>
                  </>
                );
                return user.role === "ADMIN" ? (
                  <Link key={appointment.id} href={`/monitoring/registraties/${appointment.case.id}`} className="block rounded-3xl border border-slate-100 bg-slate-50 p-4 transition hover:border-sky-200 hover:bg-sky-50/60">{content}</Link>
                ) : (
                  <div key={appointment.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">{content}</div>
                );
              })}
              {appointments.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">Nog geen patiënten toegevoegd voor deze week.</div> : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
