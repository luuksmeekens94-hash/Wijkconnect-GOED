import { AlertCircle, CheckCircle2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { formatDateInput, getOptionLabel, projectActivityTypeOptions } from "@/lib/monitoring";
import { createProjectActivity, toggleProjectActivity } from "@/lib/monitoring-actions";
import { prisma } from "@/lib/prisma";

export default async function ProjectLogPage() {
  await requireRole(["ADMIN", "DATA_MANAGER"]);
  const activities = await prisma.projectActivity.findMany({ orderBy: [{ completed: "asc" }, { activityDate: "desc" }], take: 200 });
  const now = new Date();

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Projectlogboek</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Activiteit of actie vastleggen</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Voor MDO’s, trainingen, evaluaties, knelpunten, borging en opschaling.</p>
        <form action={createProjectActivity} className="mt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-700"><span>Datum</span><input name="activityDate" type="date" required defaultValue={formatDateInput(new Date())} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" /></label>
            <label className="space-y-2 text-sm text-slate-700"><span>Type</span><select name="type" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400">{projectActivityTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          </div>
          <label className="space-y-2 text-sm text-slate-700"><span>Titel</span><input name="title" required minLength={3} maxLength={160} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" /></label>
          <label className="space-y-2 text-sm text-slate-700"><span>Samenvatting, besluit of vervolgactie</span><textarea name="description" maxLength={1000} rows={4} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-700"><span>Eigenaar vervolgactie</span><input name="ownerName" maxLength={120} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" /></label>
            <label className="space-y-2 text-sm text-slate-700"><span>Opvolgdatum</span><input name="followUpDate" type="date" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" /></label>
          </div>
          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700"><input name="completed" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-sky-600" /> Direct als afgerond markeren</label>
          <button className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700">Opslaan in projectlog</button>
        </form>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Historie en acties</p><h2 className="mt-2 text-2xl font-semibold text-slate-900">{activities.filter((item) => !item.completed).length} openstaand</h2></div></div>
        <div className="mt-6 space-y-3">
          {activities.map((activity) => {
            const overdue = !activity.completed && activity.followUpDate && activity.followUpDate < now;
            return (
              <article key={activity.id} className={`rounded-3xl border p-5 ${activity.completed ? "border-slate-100 bg-slate-50" : overdue ? "border-rose-200 bg-rose-50" : "border-sky-100 bg-sky-50/50"}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">{getOptionLabel(projectActivityTypeOptions, activity.type)}</span>{overdue ? <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700"><AlertCircle className="h-3.5 w-3.5" /> Verlopen</span> : null}</div><h3 className="mt-3 font-semibold text-slate-900">{activity.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{activity.description || "Geen aanvullende toelichting."}</p><p className="mt-3 text-xs text-slate-500">{new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(activity.activityDate)}{activity.ownerName ? ` · Eigenaar: ${activity.ownerName}` : ""}{activity.followUpDate ? ` · Opvolgen: ${new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(activity.followUpDate)}` : ""}</p></div>
                  <form action={toggleProjectActivity}><input type="hidden" name="id" value={activity.id} /><input type="hidden" name="completed" value={activity.completed ? "false" : "true"} /><button className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${activity.completed ? "bg-white text-slate-600" : "bg-emerald-600 text-white"}`}><CheckCircle2 className="h-4 w-4" />{activity.completed ? "Heropenen" : "Afronden"}</button></form>
                </div>
              </article>
            );
          })}
          {activities.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 px-5 py-12 text-center text-sm text-slate-500">Nog geen projectactiviteiten vastgelegd.</div> : null}
        </div>
      </section>
    </div>
  );
}
