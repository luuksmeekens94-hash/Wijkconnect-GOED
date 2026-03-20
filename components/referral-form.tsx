"use client";

import { useMemo, useState } from "react";
import { Theme, Urgency } from "@prisma/client";
import { birthYears, themeOptions } from "@/lib/constants";

type Recipient = {
  id: string;
  name: string;
  organization: string;
  email: string;
};

type SuggestedResource = {
  id: string;
  name: string;
  organization: string;
  themes: Theme[];
};

export function ReferralForm({
  recipients,
  favorites,
  resources,
  action,
  preselectedRecipientId,
}: {
  recipients: Recipient[];
  favorites: Recipient[];
  resources: SuggestedResource[];
  action: (formData: FormData) => void;
  preselectedRecipientId?: string;
}) {
  const [selectedThemes, setSelectedThemes] = useState<Theme[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState(preselectedRecipientId ?? favorites[0]?.id ?? recipients[0]?.id ?? "");

  const suggestedResources = useMemo(() => {
    if (selectedThemes.length === 0) return resources.slice(0, 4);
    return resources.filter((resource) => resource.themes.some((theme) => selectedThemes.includes(theme))).slice(0, 4);
  }, [resources, selectedThemes]);

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
      <section className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Nieuwe verwijzing</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Binnen 30 seconden verzenden</h2>
          <p className="mt-2 text-sm text-slate-500">Selecteer een of meer thema&apos;s, kies een ontvanger en vul alleen de minimaal noodzakelijke gegevens in.</p>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">1. Thema&apos;s</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {themeOptions.map((theme) => {
              const checked = selectedThemes.includes(theme.value);
              return (
                <label key={theme.value} className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition ${checked ? "border-sky-400 bg-sky-50 text-sky-900" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}>
                  <input
                    type="checkbox"
                    name="themes"
                    value={theme.value}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    checked={checked}
                    onChange={(event) => setSelectedThemes((current) => (event.target.checked ? [...current, theme.value] : current.filter((item) => item !== theme.value)))}
                  />
                  <span>{theme.label}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">2. Ontvanger</h3>
            <div className="flex flex-wrap gap-2">
              {favorites.map((favorite) => (
                <button key={favorite.id} type="button" onClick={() => setSelectedRecipientId(favorite.id)} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-sky-100 hover:text-sky-700">
                  Verwijs naar {favorite.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
          <select name="assignedToId" required value={selectedRecipientId} onChange={(event) => setSelectedRecipientId(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400">
            {recipients.map((recipient) => (
              <option key={recipient.id} value={recipient.id}>
                {recipient.name} - {recipient.organization}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">3. Patiëntgegevens</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-700">
              <span>Initialen</span>
              <input name="patientInitials" maxLength={4} required className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400" />
            </label>
            <label className="space-y-2 text-sm text-slate-700">
              <span>Geboortejaar</span>
              <select name="patientBirthYear" required className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400">
                {birthYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm text-slate-700">
              <span>Geslacht</span>
              <select name="patientGender" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400">
                <option value="">Niet ingevuld</option>
                <option value="M">M</option>
                <option value="V">V</option>
                <option value="X">X</option>
              </select>
            </label>
            <label className="space-y-2 text-sm text-slate-700">
              <span>Telefoonnummer patiënt</span>
              <input name="patientPhone" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400" />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            <label className="space-y-2 text-sm text-slate-700">
              <span>Urgentie</span>
              <select name="urgency" defaultValue={Urgency.NORMAL} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400">
                <option value={Urgency.NORMAL}>Normaal</option>
                <option value={Urgency.HIGH}>Hoog</option>
              </select>
            </label>
            <label className="space-y-2 text-sm text-slate-700">
              <span>Toelichting</span>
              <textarea name="note" maxLength={500} rows={4} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400" />
            </label>
          </div>
        </div>
        <button type="submit" className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700">
          Verwijzing verzenden
        </button>
      </section>
      <aside className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">Favorieten</p>
          <div className="mt-4 space-y-3">
            {favorites.map((favorite) => (
              <button key={favorite.id} type="button" onClick={() => setSelectedRecipientId(favorite.id)} className={`w-full rounded-2xl border px-4 py-3 text-left transition ${selectedRecipientId === favorite.id ? "border-sky-400 bg-sky-500/15" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                <p className="font-medium">{favorite.name}</p>
                <p className="text-sm text-slate-300">{favorite.organization}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Aanbevolen uit sociale kaart</p>
          <div className="mt-4 space-y-3">
            {suggestedResources.map((resource) => (
              <div key={resource.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="font-medium text-slate-900">{resource.name}</p>
                <p className="text-sm text-slate-500">{resource.organization}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </form>
  );
}
