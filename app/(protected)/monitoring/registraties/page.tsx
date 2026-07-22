import Link from "next/link";
import { ArrowRight, ClipboardPlus, Search } from "lucide-react";
import { MonitoringCaseStatus, MonitoringProgram } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import {
  formatDateInput,
  getOptionLabel,
  monitoringAppointmentStatusOptions,
  monitoringOutcomeOptions,
  monitoringProgramOptions,
  monitoringReferralSourceOptions,
} from "@/lib/monitoring";
import { getMonitoringPeriod } from "@/lib/monitoring-queries";
import { prisma } from "@/lib/prisma";

export default async function MonitoringRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; program?: string; status?: string; q?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  await requireRole(["ADMIN"]);
  const period = getMonitoringPeriod(resolvedSearchParams.from, resolvedSearchParams.to);
  const program = Object.values(MonitoringProgram).includes(resolvedSearchParams.program as MonitoringProgram) ? resolvedSearchParams.program as MonitoringProgram : undefined;
  const status = Object.values(MonitoringCaseStatus).includes(resolvedSearchParams.status as MonitoringCaseStatus) ? resolvedSearchParams.status as MonitoringCaseStatus : undefined;
  const query = resolvedSearchParams.q?.trim() ?? "";

  const cases = await prisma.monitoringCase.findMany({
    where: {
      referralDate: { gte: period.from, lte: period.to },
      ...(program ? { program } : {}),
      ...(status ? { status } : {}),
      ...(query ? { OR: [{ complaintCategory: { contains: query, mode: "insensitive" } }, { assignedOrganization: { contains: query, mode: "insensitive" } }, { participant: { pseudonymCode: { contains: query.toUpperCase() } } }] } : {}),
    },
    include: {
      participant: true,
      appointments: { orderBy: { scheduledAt: "desc" }, take: 1 },
      socialReasons: true,
      sourceReferral: { select: { caseId: true } },
    },
    orderBy: { referralDate: "desc" },
    take: 250,
  });

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Bronregistraties</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Alle patiëntreizen</h1>
            <p className="mt-2 text-sm text-slate-500">De KPI’s worden uitsluitend uit deze registraties berekend.</p>
          </div>
          <Link href="/monitoring/registraties/nieuw" className="inline-flex items-center gap-2 self-start rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"><ClipboardPlus className="h-4 w-4" /> Nieuwe registratie</Link>
        </div>
        <form className="mt-6 grid gap-3 rounded-3xl bg-slate-50 p-4 md:grid-cols-5">
          <input name="q" defaultValue={query} placeholder="Zoek klacht, organisatie of code" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400" />
          <input name="from" type="date" defaultValue={formatDateInput(period.from)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400" />
          <input name="to" type="date" defaultValue={formatDateInput(period.to)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400" />
          <select name="program" defaultValue={program ?? ""} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400"><option value="">Beide spreekuren</option>{monitoringProgramOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200"><Search className="h-4 w-4" /> Zoeken</button>
        </form>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4"><p className="text-sm text-slate-500">{cases.length} registraties gevonden</p></div>
        <div className="divide-y divide-slate-100">
          {cases.map((monitoringCase) => {
            const appointment = monitoringCase.appointments[0];
            const programLabel = getOptionLabel(monitoringProgramOptions, monitoringCase.program);
            return (
              <Link key={monitoringCase.id} href={`/monitoring/registraties/${monitoringCase.id}`} className="grid gap-3 px-6 py-5 transition hover:bg-sky-50/50 md:grid-cols-[0.8fr_1.1fr_1fr_1fr_0.7fr] md:items-center">
                <div>
                  <p className="font-semibold text-slate-900">···{monitoringCase.participant.pseudonymCode.slice(-8)}</p>
                  <p className="text-xs text-slate-500">{monitoringCase.sourceReferral?.caseId ?? "Losse registratie"}</p>
                </div>
                <div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${monitoringCase.program === MonitoringProgram.MOVEMENT ? "bg-sky-100 text-sky-700" : "bg-violet-100 text-violet-700"}`}>{programLabel}</span><p className="mt-2 text-sm text-slate-500">Verwezen {new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(monitoringCase.referralDate)}</p></div>
                <div><p className="text-sm font-medium text-slate-800">{monitoringCase.complaintCategory ?? monitoringCase.assignedOrganization ?? "Hulpvraag geregistreerd"}</p><p className="text-xs text-slate-500">{getOptionLabel(monitoringReferralSourceOptions, monitoringCase.referralSource)}</p></div>
                <div><p className="text-sm font-medium text-slate-800">{appointment ? getOptionLabel(monitoringAppointmentStatusOptions, appointment.status) : "Nog niet ingepland"}</p><p className="text-xs text-slate-500">{appointment ? getOptionLabel(monitoringOutcomeOptions, appointment.outcome) : "Geen afspraak"}</p></div>
                <div className="flex items-center justify-between gap-3 md:justify-end"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${monitoringCase.status === MonitoringCaseStatus.CLOSED ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{monitoringCase.status === MonitoringCaseStatus.CLOSED ? "Afgerond" : "Open"}</span><ArrowRight className="h-4 w-4 text-slate-400" /></div>
              </Link>
            );
          })}
          {cases.length === 0 ? <div className="px-6 py-14 text-center"><p className="font-medium text-slate-800">Nog geen registraties in deze periode</p><p className="mt-2 text-sm text-slate-500">Voeg de eerste patiëntreis toe om het dashboard te vullen.</p></div> : null}
        </div>
      </section>
    </div>
  );
}
