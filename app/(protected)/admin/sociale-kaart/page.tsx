import { ResourceSource, ResourceType } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { saveResource } from "@/lib/actions";
import { getThemeLabel, themeOptions } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export default async function AdminResourcesPage() {
  await requireRole(["ADMIN"]);
  const resources = await prisma.socialResource.findMany({
    include: { themes: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Resource toevoegen</h1>
        <form action={saveResource} className="mt-6 space-y-3">
          <input name="name" required placeholder="Naam" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400" />
          <input name="organization" required placeholder="Organisatie" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400" />
          <input name="category" required placeholder="Categorie" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400" />
          <textarea name="description" required rows={4} placeholder="Beschrijving" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400" />
          <div className="grid gap-3 md:grid-cols-2">
            <select name="type" defaultValue={ResourceType.PROFESSIONAL} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400">
              {Object.values(ResourceType).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <select name="source" defaultValue={ResourceSource.MANUAL} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400">
              {Object.values(ResourceSource).map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input name="contactEmail" placeholder="Contact e-mail" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400" />
            <input name="contactPhone" placeholder="Contact telefoon" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input name="address" placeholder="Adres" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400" />
            <input name="wijk" placeholder="Wijk" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400" />
          </div>
          <input name="stadsdeel" placeholder="Stadsdeel" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400" />
          <div className="grid gap-3 md:grid-cols-2">
            <input name="targetGroup" placeholder="Doelgroep" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400" />
            <input name="costs" placeholder="Kosten" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400" />
          </div>
          <input name="url" placeholder="Externe URL" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400" />
          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input type="checkbox" name="referralNeeded" className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
            Verwijzing nodig
          </label>
          <div className="grid gap-2 md:grid-cols-2">
            {themeOptions.map((theme) => (
              <label key={theme.value} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input type="checkbox" name="themes" value={theme.value} className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                {theme.label}
              </label>
            ))}
          </div>
          <button type="submit" className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700">
            Resource opslaan
          </button>
        </form>
      </section>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Sociale kaart items</p>
        <div className="mt-6 space-y-3">
          {resources.map((resource) => (
            <div key={resource.id} className="rounded-3xl border border-slate-100 bg-slate-50 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{resource.name}</p>
                  <p className="text-sm text-slate-500">
                    {resource.organization} • {resource.type}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">{resource.source}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {resource.themes.map((theme) => (
                  <span key={theme.id} className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                    {getThemeLabel(theme.theme)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
