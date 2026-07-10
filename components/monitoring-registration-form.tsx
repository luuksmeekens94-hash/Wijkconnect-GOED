"use client";

import { useMemo, useState } from "react";
import {
  MonitoringAppointmentStatus,
  MonitoringHelpRequestClarity,
  MonitoringProgram,
} from "@prisma/client";
import {
  monitoringAppointmentStatusOptions,
  monitoringFeedbackChannelOptions,
  monitoringOutcomeOptions,
  monitoringProgramOptions,
  monitoringReferralBasisOptions,
  monitoringReferralSourceOptions,
  monitoringSocialReasonOptions,
} from "@/lib/monitoring";

type ReferralOption = {
  id: string;
  caseId: string;
  createdAt: string;
};

export function MonitoringRegistrationForm({
  action,
  today,
  referrals,
}: {
  action: (formData: FormData) => void;
  today: string;
  referrals: ReferralOption[];
}) {
  const [program, setProgram] = useState<MonitoringProgram>(MonitoringProgram.MOVEMENT);
  const [scheduledDate, setScheduledDate] = useState("");
  const [appointmentStatus, setAppointmentStatus] = useState<MonitoringAppointmentStatus>(MonitoringAppointmentStatus.SCHEDULED);
  const visibleOutcomes = useMemo(
    () => monitoringOutcomeOptions.filter((option) => (option.programs as readonly MonitoringProgram[]).includes(program)),
    [program],
  );

  return (
    <form action={action} className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Nieuwe registratie</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Patiëntreis vastleggen</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Leg alleen vast wat nodig is voor monitoring. Gebruik geen naam, BSN of medische details in vrije tekst.
            </p>
          </div>
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            De interne patiëntcode wordt eenrichtings gehasht en niet leesbaar opgeslagen.
          </div>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Spreekuurtype</span>
            <select
              name="program"
              value={program}
              onChange={(event) => setProgram(event.target.value as MonitoringProgram)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            >
              {monitoringProgramOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Interne patiëntcode</span>
            <input name="participantReference" required minLength={2} maxLength={80} autoComplete="off" placeholder="Bijvoorbeeld intern dossiernummer" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Verwijzings- of triagedatum</span>
            <input name="referralDate" type="date" required defaultValue={today} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Herkomst verwijzing</span>
            <select name="referralSource" required className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100">
              {monitoringReferralSourceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Basis voor inplanning</span>
            <select name="referralBasis" defaultValue="" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100">
              <option value="">Nog niet ingevuld</option>
              {monitoringReferralBasisOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          {program === MonitoringProgram.SOCIAL && referrals.length > 0 ? (
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Koppelen aan bestaande WijkConnect-verwijzing</span>
              <select name="sourceReferralId" defaultValue="" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100">
                <option value="">Geen koppeling</option>
                {referrals.map((referral) => <option key={referral.id} value={referral.id}>{referral.caseId} · {referral.createdAt}</option>)}
              </select>
            </label>
          ) : null}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Inhoud en passendheid</p>
        {program === MonitoringProgram.MOVEMENT ? (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Primaire klachtregio</span>
              <input name="complaintCategory" list="complaint-categories" required placeholder="Bijvoorbeeld rug" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              <datalist id="complaint-categories">
                {["Rug", "Schouder", "Knie", "Nek", "Heup", "Enkel / voet", "Elleboog", "Pols / hand", "Meerdere regio's", "Overig"].map((item) => <option key={item} value={item} />)}
              </datalist>
            </label>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <fieldset>
              <legend className="text-sm font-medium text-slate-700">Hulpvraagthema’s</legend>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {monitoringSocialReasonOptions.map((option) => (
                  <label key={option.value} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                    <input type="checkbox" name="socialReasons" value={option.value} className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
                <span>Hulpvraag in maximaal twee zinnen</span>
                <textarea name="helpRequest" maxLength={500} rows={3} placeholder="Geen namen of medische details" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Helderheid overdracht</span>
                <select name="helpRequestClarity" defaultValue="" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100">
                  <option value="">Nog niet beoordeeld</option>
                  <option value={MonitoringHelpRequestClarity.CLEAR}>Volledig helder</option>
                  <option value={MonitoringHelpRequestClarity.PARTIAL}>Gedeeltelijk helder</option>
                  <option value={MonitoringHelpRequestClarity.UNCLEAR}>Onvoldoende helder</option>
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Uitvoerende organisatie</span>
                <input name="assignedOrganization" placeholder="Bindkracht10, Buurtteam of anders" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Toegewezen professional</span>
                <input name="assignedProfessional" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </label>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Afspraak, uitkomst en terugkoppeling</p>
        <p className="mt-2 text-sm text-slate-500">Laat de afspraakdatum leeg wanneer de verwijzing nog niet is ingepland.</p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Afspraak- of eerste-contactdatum</span>
            <input name="scheduledDate" type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Afspraakstatus</span>
            <select name="appointmentStatus" disabled={!scheduledDate} value={appointmentStatus} onChange={(event) => setAppointmentStatus(event.target.value as MonitoringAppointmentStatus)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition disabled:bg-slate-100 focus:border-sky-400 focus:ring-2 focus:ring-sky-100">
              {monitoringAppointmentStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Uitkomst</span>
            <select name="outcome" disabled={!scheduledDate || appointmentStatus !== MonitoringAppointmentStatus.ATTENDED} defaultValue="" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition disabled:bg-slate-100 focus:border-sky-400 focus:ring-2 focus:ring-sky-100">
              <option value="">Nog niet ingevuld</option>
              {visibleOutcomes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Vervolgorganisatie</span>
            <input name="followUpOrganization" disabled={!scheduledDate} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition disabled:bg-slate-100 focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
            <span>Korte uitkomstnotitie</span>
            <textarea name="outcomeNote" disabled={!scheduledDate} maxLength={500} rows={2} placeholder="Alleen indien nodig; geen medische details" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition disabled:bg-slate-100 focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Geschikt voor evaluatie</span>
            <select name="evaluationEligible" disabled={!scheduledDate} defaultValue="" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition disabled:bg-slate-100 focus:border-sky-400 focus:ring-2 focus:ring-sky-100">
              <option value="">Nog niet bepaald</option>
              <option value="yes">Ja</option>
              <option value="no">Nee</option>
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Herinnering verstuurd op</span>
            <input name="reminderDate" type="date" disabled={!scheduledDate} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition disabled:bg-slate-100 focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Terugkoppeling verzonden op</span>
            <input name="feedbackDate" type="date" disabled={!scheduledDate} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition disabled:bg-slate-100 focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Ontvanger terugkoppeling</span>
            <input name="feedbackRecipient" disabled={!scheduledDate} placeholder="Naam huisarts of verwijzer" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition disabled:bg-slate-100 focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Kanaal terugkoppeling</span>
            <select name="feedbackChannel" disabled={!scheduledDate} defaultValue="" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition disabled:bg-slate-100 focus:border-sky-400 focus:ring-2 focus:ring-sky-100">
              <option value="">Nog niet ingevuld</option>
              {monitoringFeedbackChannelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <button type="submit" className="rounded-2xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2">
          Registratie opslaan
        </button>
      </div>
    </form>
  );
}
