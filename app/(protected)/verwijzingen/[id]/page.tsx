import Link from "next/link";
import { notFound } from "next/navigation";
import { ReferralStatus } from "@prisma/client";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { updateReferral } from "@/lib/actions";
import { getThemeLabel, urgencyLabels } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export default async function ReferralDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const referral = await prisma.referral.findUnique({
    where: { id: params.id },
    include: {
      createdBy: true,
      assignedTo: true,
      themes: true,
      updates: {
        include: { updatedBy: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!referral) notFound();

  const allowed =
    user.role === "ADMIN" ||
    referral.createdById === user.id ||
    referral.assignedToId === user.id;

  if (!allowed) notFound();

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Casus detail</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">{referral.caseId}</h1>
            <p className="mt-2 text-sm text-slate-500">Aangemaakt op {formatDateTime(referral.createdAt)}</p>
          </div>
          <StatusBadge status={referral.status} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">Patiënt</p>
            <p className="mt-2 font-semibold text-slate-900">
              {referral.patientInitials} ({referral.patientBirthYear})
            </p>
            <p className="mt-1 text-sm text-slate-500">Geslacht: {referral.patientGender ?? "Niet ingevuld"}</p>
            <p className="mt-1 text-sm text-slate-500">Telefoon: {referral.patientPhone || "Niet ingevuld"}</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">Context</p>
            <p className="mt-2 font-semibold text-slate-900">Urgentie: {urgencyLabels[referral.urgency]}</p>
            <p className="mt-1 text-sm text-slate-500">Verwijzer: {referral.createdBy.name}</p>
            <p className="mt-1 text-sm text-slate-500">Ontvanger: {referral.assignedTo.name}</p>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Thema&apos;s</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {referral.themes.map((theme) => (
              <span key={theme.id} className="rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-700">
                {getThemeLabel(theme.theme)}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Toelichting</p>
          <p className="mt-3 rounded-3xl bg-slate-50 p-5 text-sm leading-6 text-slate-700">{referral.note || "Geen toelichting toegevoegd."}</p>
        </div>
      </section>

      <section className="space-y-6">
        {(user.role === "SOCIAAL" || user.role === "ADMIN") && (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Status bijwerken</p>
            <form action={updateReferral} className="mt-4 space-y-3">
              <input type="hidden" name="referralId" value={referral.id} />
              <select name="status" defaultValue={referral.status} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400">
                {Object.values(ReferralStatus).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <input name="handlerName" placeholder="Naam behandelaar" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400" />
              <textarea name="feedback" rows={4} maxLength={500} placeholder="Terugkoppeling voor verwijzer" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400" />
              <button type="submit" className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700">
                Update opslaan
              </button>
            </form>
          </div>
        )}
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Historie</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Statuswijzigingen en feedback</h2>
            </div>
            <Link href="/dashboard" className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200">
              Terug
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            {referral.updates.map((update) => (
              <div key={update.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <p className="font-semibold text-slate-900">{update.updatedBy.name}</p>
                  <p className="text-sm text-slate-500">{formatDateTime(update.createdAt)}</p>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {update.previousStatus ? `${update.previousStatus} -> ${update.newStatus}` : update.newStatus}
                </p>
                {update.handlerName ? <p className="mt-2 text-sm text-slate-600">Behandelaar: {update.handlerName}</p> : null}
                {update.note ? <p className="mt-3 text-sm leading-6 text-slate-700">{update.note}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
