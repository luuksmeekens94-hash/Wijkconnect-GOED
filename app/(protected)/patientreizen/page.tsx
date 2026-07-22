import Link from "next/link";
import { subMonths } from "date-fns";
import { CheckCircle2, Search, Waypoints } from "lucide-react";
import {
  MonitoringAppointmentStatus,
  MonitoringProgram,
  PatientJourneyDiscipline,
} from "@prisma/client";
import { requireRole } from "@/lib/auth";
import {
  decryptMonitoringPatientEmail,
  decryptMonitoringPatientName,
} from "@/lib/monitoring-contact-security";
import { getOptionLabel, monitoringProgramOptions } from "@/lib/monitoring";
import { savePatientJourneyUpdate } from "@/lib/patient-journey-actions";
import {
  patientJourneyDisciplineLabel,
  patientJourneyOutcomeLabel,
  patientJourneyOptionsForDiscipline,
} from "@/lib/patient-journey";
import { prisma } from "@/lib/prisma";

function patientContact(participant: { pseudonymCode: string; displayNameEncrypted: string | null; emailEncrypted: string | null }) {
  try {
    return {
      name: participant.displayNameEncrypted ? decryptMonitoringPatientName(participant.displayNameEncrypted) : `Patiënt ···${participant.pseudonymCode.slice(-8)}`,
      email: participant.emailEncrypted ? decryptMonitoringPatientEmail(participant.emailEncrypted) : "Contactgegevens niet meer beschikbaar",
    };
  } catch {
    return { name: `Patiënt ···${participant.pseudonymCode.slice(-8)}`, email: "Contactgegevens niet beschikbaar" };
  }
}

export default async function PatientJourneysPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; program?: string; saved?: string }>;
}) {
  const params = await searchParams;
  const user = await requireRole(["ADMIN", "PHYSIOTHERAPIST", "SOCIAAL"]);
  const status = params.status === "all" || params.status === "completed" ? params.status : "pending";
  const query = params.q?.trim().toLocaleLowerCase("nl-NL") ?? "";
  const roleProgram = user.role === "PHYSIOTHERAPIST"
    ? MonitoringProgram.MOVEMENT
    : user.role === "SOCIAAL"
      ? MonitoringProgram.SOCIAL
      : undefined;
  const requestedProgram = Object.values(MonitoringProgram).includes(params.program as MonitoringProgram)
    ? params.program as MonitoringProgram
    : undefined;
  const program = roleProgram ?? requestedProgram;

  const cases = await prisma.monitoringCase.findMany({
    where: {
      ...(program ? { program } : {}),
      appointments: { some: { status: MonitoringAppointmentStatus.ATTENDED } },
      referralDate: { gte: subMonths(new Date(), 12) },
    },
    include: {
      participant: true,
      appointments: {
        where: { status: MonitoringAppointmentStatus.ATTENDED },
        orderBy: { scheduledAt: "desc" },
        take: 1,
      },
      patientJourneyUpdates: {
        include: { recordedBy: { select: { name: true, organization: true } } },
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      },
    },
    orderBy: { referralDate: "desc" },
    take: 250,
  });

  const visibleCases = cases.map((monitoringCase) => {
    const contact = patientContact(monitoringCase.participant);
    const discipline = monitoringCase.program === MonitoringProgram.MOVEMENT
      ? PatientJourneyDiscipline.PHYSIOTHERAPY
      : PatientJourneyDiscipline.SOCIAL;
    const relevantUpdates = monitoringCase.patientJourneyUpdates.filter((update) => update.discipline === discipline);
    return { ...monitoringCase, contact, discipline, relevantUpdates };
  }).filter((monitoringCase) => {
    const hasUpdate = monitoringCase.relevantUpdates.length > 0;
    if (status === "pending" && hasUpdate) return false;
    if (status === "completed" && !hasUpdate) return false;
    if (!query) return true;
    return [monitoringCase.contact.name, monitoringCase.contact.email, monitoringCase.participant.pseudonymCode]
      .some((value) => value.toLocaleLowerCase("nl-NL").includes(query));
  });

  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-sky-50 p-3 text-sky-700"><Waypoints className="h-6 w-6" /></div>
          <div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Patiëntreis</p><h1 className="mt-2 text-3xl font-semibold text-slate-900">Wat gebeurde er na het spreekuur?</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Kies de patiënt uit de lijst. Naam en e-mail zijn al door de praktijkmanager vastgelegd; je hoeft ze niet opnieuw in te typen.</p></div>
        </div>

        <form className="mt-6 grid gap-3 rounded-3xl bg-slate-50 p-4 md:grid-cols-4">
          <label className="relative md:col-span-2"><Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" /><input name="q" defaultValue={params.q ?? ""} placeholder="Zoek op naam of e-mail" className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-sky-400" /></label>
          {user.role === "ADMIN" ? <select name="program" defaultValue={program ?? ""} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"><option value="">Beide spreekuren</option>{monitoringProgramOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input type="hidden" name="program" value={program} />}
          <input type="hidden" name="status" value={status} />
          <button className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">Zoeken</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {[["pending", "Nog invullen"], ["completed", "Ingevuld"], ["all", "Alle"]].map(([value, label]) => <Link key={value} href={`/patientreizen?status=${value}${program ? `&program=${program}` : ""}`} className={`rounded-full px-4 py-2 text-sm font-medium ${status === value ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700"}`}>{label}</Link>)}
        </div>
      </section>

      {params.saved === "1" ? <div className="flex items-center gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><CheckCircle2 className="h-5 w-5" /> De patiëntreis is bijgewerkt en direct gekoppeld aan de registratie van de praktijkmanager.</div> : null}

      <section className="space-y-4">
        {visibleCases.map((monitoringCase) => {
          const appointment = monitoringCase.appointments[0];
          const latest = monitoringCase.relevantUpdates[0];
          const options = patientJourneyOptionsForDiscipline(monitoringCase.discipline);
          return (
            <article key={monitoringCase.id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div><p className="text-xl font-semibold text-slate-900">{monitoringCase.contact.name}</p><p className="mt-1 text-sm text-slate-500">{monitoringCase.contact.email}</p><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">{getOptionLabel(monitoringProgramOptions, monitoringCase.program)}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">Spreekuur {new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(appointment.scheduledAt)}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">Code ···{monitoringCase.participant.pseudonymCode.slice(-8)}</span></div></div>
                {latest ? <div className="max-w-md rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900"><p className="font-semibold">Laatste update: {patientJourneyOutcomeLabel(latest.outcome)}</p><p className="mt-1 text-xs text-emerald-700">{new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(latest.occurredAt)} · {latest.recordedBy.name} ({latest.recordedBy.organization})</p>{latest.destination ? <p className="mt-2">Naar: {latest.destination}</p> : null}{latest.note ? <p className="mt-1">{latest.note}</p> : null}</div> : <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Nog niet ingevuld</span>}
              </div>

              <form action={savePatientJourneyUpdate} className="mt-5 grid gap-3 border-t border-slate-100 pt-5 lg:grid-cols-2">
                <input type="hidden" name="caseId" value={monitoringCase.id} />
                <input type="hidden" name="discipline" value={monitoringCase.discipline} />
                <label className="space-y-2 text-sm text-slate-700"><span>Wat is er met de patiënt gebeurd?</span><select name="outcome" required defaultValue="" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"><option value="" disabled>Selecteer vervolgstap</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                <label className="space-y-2 text-sm text-slate-700"><span>Datum vervolgstap</span><input name="occurredAt" type="date" required min={appointment.scheduledAt.toISOString().slice(0, 10)} max={today} defaultValue={today} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" /></label>
                <label className="space-y-2 text-sm text-slate-700"><span>Naar welke praktijk, instantie of professional?</span><input name="destination" maxLength={160} placeholder="Alleen invullen indien van toepassing" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" /></label>
                <label className="space-y-2 text-sm text-slate-700"><span>Korte toelichting</span><input name="note" maxLength={500} placeholder="Vrije tekst, zonder onnodige medische details" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" /></label>
                <div className="flex items-end justify-between gap-4 lg:col-span-2"><p className="text-xs text-slate-400">Omgeving: {patientJourneyDisciplineLabel(monitoringCase.discipline)}</p><button className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700">Patiëntreis opslaan</button></div>
              </form>
            </article>
          );
        })}
        {visibleCases.length === 0 ? <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><p className="font-medium text-slate-800">Geen patiënten in deze selectie</p><p className="mt-2 text-sm text-slate-500">Controleer de filter of kies ‘Alle’.</p></div> : null}
      </section>
    </div>
  );
}
