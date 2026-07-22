"use client";

import { useState } from "react";
import {
  MonitoringAppointmentStatus,
  MonitoringProgram,
  MonitoringReferralSource,
  MonitoringSocialReason,
} from "@prisma/client";

const complaintOptions = [
  "Rug",
  "Nek",
  "Schouder",
  "Elleboog",
  "Pols / hand",
  "Heup",
  "Knie",
  "Enkel",
  "Voet",
  "Meerdere regio's",
  "Overig",
  "Onduidelijk",
];

const socialReasonOptions = [
  { value: MonitoringSocialReason.FINANCIAL, label: "Financiële zorgen" },
  { value: MonitoringSocialReason.LONELINESS, label: "Eenzaamheid" },
  { value: MonitoringSocialReason.PSYCHOSOCIAL_STRESS, label: "Stress / psychosociaal" },
  { value: MonitoringSocialReason.HOUSING, label: "Wonen" },
  { value: MonitoringSocialReason.WORK_INCOME, label: "Werk / inkomen" },
  { value: MonitoringSocialReason.FAMILY, label: "Gezin / opvoeding" },
  { value: MonitoringSocialReason.LIFESTYLE, label: "Leefstijl / bewegen" },
  { value: MonitoringSocialReason.SELF_MANAGEMENT, label: "Zelfredzaamheid" },
  { value: MonitoringSocialReason.OTHER, label: "Overig" },
  { value: MonitoringSocialReason.UNKNOWN, label: "Onduidelijk" },
];

const fieldClass = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100";

export function WeeklyPatientRegistrationForm({
  action,
  weekStart,
  minDate,
  maxDate,
  defaultDate,
}: {
  action: (formData: FormData) => void;
  weekStart: string;
  minDate: string;
  maxDate: string;
  defaultDate: string;
}) {
  const [program, setProgram] = useState<MonitoringProgram>(MonitoringProgram.MOVEMENT);
  const [status, setStatus] = useState<MonitoringAppointmentStatus>(MonitoringAppointmentStatus.ATTENDED);
  const attended = status === MonitoringAppointmentStatus.ATTENDED;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="weekStart" value={weekStart} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Naam patiënt</span>
          <input name="patientName" required minLength={2} maxLength={120} autoComplete="off" placeholder="Voor- en achternaam" className={fieldClass} />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>E-mailadres patiënt</span>
          <input name="patientEmail" type="email" required maxLength={254} autoComplete="off" placeholder="naam@voorbeeld.nl" className={fieldClass} />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Datum spreekuur</span>
          <input name="appointmentDate" type="date" required min={minDate} max={maxDate} defaultValue={defaultDate} className={fieldClass} />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Hoe verwezen?</span>
          <select name="referralSource" required defaultValue={MonitoringReferralSource.ASSISTANT} className={fieldClass}>
            <option value={MonitoringReferralSource.ASSISTANT}>Telefonische triage door doktersassistente</option>
            <option value={MonitoringReferralSource.GP}>Via de huisarts</option>
            <option value={MonitoringReferralSource.OTHER}>Onduidelijk</option>
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Welk spreekuur?</span>
          <select name="program" value={program} onChange={(event) => setProgram(event.target.value as MonitoringProgram)} className={fieldClass}>
            <option value={MonitoringProgram.MOVEMENT}>Beweegspreekuur</option>
            <option value={MonitoringProgram.SOCIAL}>Sociaal spreekuur</option>
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Afspraakstatus</span>
          <select name="appointmentStatus" value={status} onChange={(event) => setStatus(event.target.value as MonitoringAppointmentStatus)} className={fieldClass}>
            <option value={MonitoringAppointmentStatus.ATTENDED}>Geweest</option>
            <option value={MonitoringAppointmentStatus.NO_SHOW}>No-show</option>
          </select>
        </label>
      </div>

      {attended ? (
        <div className="rounded-3xl border border-sky-100 bg-sky-50/60 p-4">
          {program === MonitoringProgram.MOVEMENT ? (
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Klachtregio</span>
              <select name="complaintCategory" required defaultValue="" className={fieldClass}>
                <option value="" disabled>Selecteer klachtregio</option>
                {complaintOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          ) : (
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Type hulpvraag</span>
              <select name="socialReason" required defaultValue="" className={fieldClass}>
                <option value="" disabled>Selecteer hulpvraag</option>
                {socialReasonOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          )}

          <label className="mt-4 flex items-start gap-3 rounded-2xl border border-violet-200 bg-white p-4 text-sm text-slate-700">
            <input name="sendSurvey" value="yes" type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
            <span><strong>Vragenlijst direct versturen</strong><span className="mt-1 block text-xs leading-5 text-slate-500">Ik heb gecontroleerd dat deze patiënt per e-mail een evaluatie-uitnodiging mag ontvangen. Wijkconnect kiest automatisch de juiste vragenlijst.</span></span>
          </label>
        </div>
      ) : (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Bij een no-show zijn klacht/hulpvraag en vragenlijst niet nodig.</div>
      )}

      <button className="w-full rounded-2xl bg-sky-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-sky-700">Patiënt opslaan</button>
    </form>
  );
}
