import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getThemeLabel, themeOptions } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

const sourceLabels = {
  VRAAGHULP: "Vraaghulp Nijmegen",
  WEGWIJZER024: "Wegwijzer024",
  MANUAL: "Handmatig toegevoegd",
} as const;

function getContactStatus(resource: {
  contactPhone: string | null;
  contactEmail: string | null;
  url: string | null;
}) {
  if (resource.contactPhone || resource.contactEmail) {
    return {
      label: "Direct contact beschikbaar",
      tone: "bg-emerald-100 text-emerald-700",
      helper: null,
    };
  }

  if (resource.url) {
    return {
      label: "Contact via bronpagina",
      tone: "bg-amber-100 text-amber-700",
      helper: "Open de bronpagina voor actuele contactinformatie.",
    };
  }

  return {
    label: "Contactinfo ontbreekt",
    tone: "bg-slate-100 text-slate-600",
    helper: "Nog geen direct contactkanaal vastgelegd.",
  };
}

function getResourceScore(resource: {
  stadsdeel: string | null;
  wijk: string | null;
  address: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  url: string | null;
}) {
  let score = 0;

  if (resource.stadsdeel?.toLowerCase() === "dukenburg") score += 4;
  if (resource.wijk) score += 2;
  if (resource.address) score += 2;
  if (resource.contactPhone) score += 3;
  if (resource.contactEmail) score += 2;
  if (resource.url) score += 1;

  return score;
}

function getAreaBadge(resource: { stadsdeel: string | null; wijk: string | null }) {
  if (resource.stadsdeel?.toLowerCase() === "dukenburg") {
    return {
      label: resource.wijk ? `Dukenburg • ${resource.wijk}` : "Dukenburg",
      tone: "bg-sky-100 text-sky-700",
    };
  }

  if (resource.stadsdeel?.toLowerCase() === "stadsbreed") {
    return {
      label: "Stadsbreed",
      tone: "bg-violet-100 text-violet-700",
    };
  }

  return resource.stadsdeel
    ? {
        label: resource.stadsdeel,
        tone: "bg-slate-100 text-slate-700",
      }
    : null;
}

export default async function SocialMapPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; theme?: string; type?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  await requireUser();
  const q = resolvedSearchParams.q?.trim() ?? "";
  const theme = resolvedSearchParams.theme;
  const type = resolvedSearchParams.type;

  const resources = await prisma.socialResource.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { organization: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(type ? { type: type as "PROFESSIONAL" | "COMMUNITY" } : {}),
      ...(theme ? { themes: { some: { theme: theme as never } } } : {}),
    },
    include: { themes: true },
    orderBy: [{ type: "asc" }, { organization: "asc" }, { name: "asc" }],
  });

  const sortedResources = [...resources].sort((a, b) => {
    const scoreDifference = getResourceScore(b) - getResourceScore(a);
    if (scoreDifference !== 0) return scoreDifference;

    const directContactDifference =
      Number(Boolean(b.contactPhone || b.contactEmail)) - Number(Boolean(a.contactPhone || a.contactEmail));
    if (directContactDifference !== 0) return directContactDifference;

    const stadsdeelDifference =
      Number(b.stadsdeel?.toLowerCase() === "dukenburg") - Number(a.stadsdeel?.toLowerCase() === "dukenburg");
    if (stadsdeelDifference !== 0) return stadsdeelDifference;

    return a.name.localeCompare(b.name, "nl");
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
        {sortedResources.map((resource) => (
          <div key={resource.id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            {(() => {
              const contactStatus = getContactStatus(resource);
              const areaBadge = getAreaBadge(resource);
              return (
                <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">{resource.organization}</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">{resource.name}</h2>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">{resource.type}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${contactStatus.tone}`}>{contactStatus.label}</span>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{resource.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {areaBadge ? (
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${areaBadge.tone}`}>
                  {areaBadge.label}
                </span>
              ) : null}
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
              <p>Bron: {sourceLabels[resource.source]}</p>
            </div>
            {contactStatus.helper ? (
              <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{contactStatus.helper}</p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              {resource.contactPhone ? (
                <Link href={`tel:${resource.contactPhone.replace(/\s+/g, "")}`} className="inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200">
                  Bel {resource.contactPhone}
                </Link>
              ) : null}
              {resource.contactEmail ? (
                <Link href={`mailto:${resource.contactEmail}`} className="inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200">
                  Mail
                </Link>
              ) : null}
              {resource.url ? (
                <Link
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-full bg-sky-100 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-200"
                >
                  {resource.source === "WEGWIJZER024" ? "Bekijk op Wegwijzer024" : "Ga naar website"}
                </Link>
              ) : null}
            </div>
                </>
              );
            })()}
          </div>
        ))}
        {sortedResources.length === 0 ? <p className="text-sm text-slate-500">Geen resultaten voor deze filters.</p> : null}
      </section>
    </div>
  );
}
