import { KpiComparator, KpiUnit } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { formatDateInput, getOptionLabel, monitoringProgramOptions } from "@/lib/monitoring";
import { saveKpiTarget } from "@/lib/monitoring-actions";
import { prisma } from "@/lib/prisma";

const unitLabels: Record<KpiUnit, string> = { COUNT: "Aantal", PERCENTAGE: "Percentage", DAYS: "Dagen" };
const comparatorLabels: Record<KpiComparator, string> = { AT_LEAST: "Minimaal", AT_MOST: "Maximaal" };

export default async function ProjectSettingsPage() {
  await requireRole(["ADMIN"]);
  const targets = await prisma.kpiTarget.findMany({ orderBy: [{ active: "desc" }, { periodStart: "desc" }, { label: "asc" }] });

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Projectinstellingen</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">KPI-doelstelling toevoegen</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Doelen zijn gekoppeld aan een verslagperiode en worden niet hardcoded in het dashboard.</p>
        <form action={saveKpiTarget} className="mt-6 space-y-4">
          <label className="space-y-2 text-sm text-slate-700"><span>Technische code</span><input name="code" required placeholder="Bijvoorbeeld UNIQUE_PATIENTS" className="w-full rounded-2xl border border-slate-200 px-4 py-3 uppercase outline-none focus:border-sky-400" /></label>
          <label className="space-y-2 text-sm text-slate-700"><span>Naam</span><input name="label" required placeholder="Unieke patiënten beweegspreekuur" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" /></label>
          <label className="space-y-2 text-sm text-slate-700"><span>Spreekuur</span><select name="program" defaultValue="" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"><option value="">Beide / algemeen</option>{monitoringProgramOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-2 text-sm text-slate-700"><span>Norm</span><select name="comparator" className="w-full rounded-2xl border border-slate-200 px-3 py-3 outline-none">{Object.values(KpiComparator).map((item) => <option key={item} value={item}>{comparatorLabels[item]}</option>)}</select></label>
            <label className="space-y-2 text-sm text-slate-700"><span>Waarde</span><input name="targetValue" type="number" step="0.1" min={0} required className="w-full rounded-2xl border border-slate-200 px-3 py-3 outline-none" /></label>
            <label className="space-y-2 text-sm text-slate-700"><span>Eenheid</span><select name="unit" className="w-full rounded-2xl border border-slate-200 px-3 py-3 outline-none">{Object.values(KpiUnit).map((item) => <option key={item} value={item}>{unitLabels[item]}</option>)}</select></label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-2 text-sm text-slate-700"><span>Start periode</span><input name="periodStart" type="date" required className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none" /></label><label className="space-y-2 text-sm text-slate-700"><span>Einde periode</span><input name="periodEnd" type="date" required className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none" /></label></div>
          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700"><input name="active" type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-sky-600" /> Actief doel</label>
          <button className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700">Doelstelling opslaan</button>
        </form>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Doelstellingen</p><h2 className="mt-2 text-2xl font-semibold text-slate-900">Versiebeheer per periode</h2>
        <div className="mt-6 space-y-3">{targets.map((target) => <div key={target.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-5"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-slate-900">{target.label}</p><p className="mt-1 text-sm text-slate-500">{target.program ? getOptionLabel(monitoringProgramOptions, target.program) : "Algemeen"} · {comparatorLabels[target.comparator]} {target.targetValue} {unitLabels[target.unit].toLowerCase()}</p><p className="mt-2 text-xs text-slate-400">{formatDateInput(target.periodStart)} t/m {formatDateInput(target.periodEnd)} · {target.code}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${target.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{target.active ? "Actief" : "Inactief"}</span></div></div>)}{targets.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 px-5 py-12 text-center text-sm text-slate-500">Nog geen doelen vastgelegd. Neem de nieuwe verslagperiode mee in het overleg.</div> : null}</div>
      </section>
    </div>
  );
}
