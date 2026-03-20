import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getThemeLabel, themeOptions } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export default async function SocialMapPage({
  searchParams,
}: {
  searchParams: { q?: string; theme?: string; type?: string };
}) {
  await requireUser();
  const q = searchParams.q?.trim() ?? "";
  const theme = searchParams.theme;
  const type = searchParams.type;

  const resources = await prisma.socialResource.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { organization: { contains: q } },
              { description: { contains: q } },
            ],
          }
        : {}),
      ...(type ? { type: type as "PROFESSIONAL" | "COMMUNITY" } : {}),
      ...(theme ? { themes: { some: { theme: theme as never } } } : {}),
    },
    include: { themes: true },
    orderBy: [{ type: "asc" }, { organization: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Sociale kaart Dukenburg</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Zoek door voorzieningen en activiteiten</h1>
        <form className="mt-6 grid gap-3 lg:grid-cols-[1.1fr_0.8fr_0.6fr_140px]">
          <input name="q" defaultValue={q} placeholder="Zoek op naam, organisatie of beschrijving" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400" />
          <select name="theme" defaultValue={theme ?? ""} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400">
            <option value="">Alle thema&apos;s</option>
            {themeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select name="type" defaultValue={type ?? ""} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400">
            <option value="">Alle typen</option>
            <option value="PROFESSIONAL">Professioneel</option>
            <option value="COMMUNITY">Community</option>
          </select>
          <button type="submit" className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700">
            Filter
          </button>
        </form>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        {resources.map((resource) => (
          <div key={resource.id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">{resource.organization}</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">{resource.name}</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">{resource.type}</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{resource.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {resource.themes.map((item) => (
                <span key={item.id} className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                  {getThemeLabel(item.theme)}
                </span>
              ))}
            </div>
            <div className="mt-5 space-y-1 text-sm text-slate-500">
              <p>Categorie: {resource.category}</p>
              <p>Doelgroep: {resource.targetGroup || "Niet gespecificeerd"}</p>
              <p>Kosten: {resource.costs || "Onbekend"}</p>
              <p>Locatie: {resource.address || resource.wijk || "Niet ingevuld"}</p>
            </div>
            {resource.url ? (
              <Link href={resource.url} target="_blank" className="mt-5 inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200">
                Externe informatie
              </Link>
            ) : null}
          </div>
        ))}
        {resources.length === 0 ? <p className="text-sm text-slate-500">Geen resultaten voor deze filters.</p> : null}
      </section>
    </div>
  );
}
