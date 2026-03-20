import Link from "next/link";
import { ReferralStatus } from "@prisma/client";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { getFavoriteRecipients, updateReferral } from "@/lib/actions";
import { getThemeLabel, urgencyLabels } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

const openStatuses: ReferralStatus[] = [
  ReferralStatus.SENT,
  ReferralStatus.RECEIVED,
  ReferralStatus.PICKED_UP,
  ReferralStatus.IN_PROGRESS,
  ReferralStatus.REFERRED,
  ReferralStatus.UNREACHABLE,
];
const unpickedStatuses: ReferralStatus[] = [ReferralStatus.SENT, ReferralStatus.RECEIVED];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { filter?: string; q?: string };
}) {
  const user = await requireUser();
  const query = searchParams.q?.trim() ?? "";
  const filter = searchParams.filter ?? "all";

  if (user.role === "VERWIJZER") {
    const where = {
      createdById: user.id,
      ...(query
        ? {
            OR: [
              { caseId: { contains: query } },
              { patientInitials: { contains: query } },
              { assignedTo: { name: { contains: query } } },
            ],
          }
        : {}),
      ...(filter === "open" ? { status: { in: openStatuses } } : filter === "completed" ? { status: ReferralStatus.COMPLETED } : {}),
    };

    const [referrals, favorites] = await Promise.all([
      prisma.referral.findMany({
        where,
        include: {
          assignedTo: true,
          themes: true,
        },
        orderBy: { updatedAt: "desc" },
      }),
      getFavoriteRecipients(),
    ]);

    const openCount = referrals.filter((item) => openStatuses.includes(item.status)).length;
    const completedCount = referrals.filter((item) => item.status === ReferralStatus.COMPLETED).length;

    return (
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Totaal verwijzingen</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{referrals.length}</p>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Open casussen</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{openCount}</p>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Afgerond</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{completedCount}</p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Mijn verwijzingen</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Overzicht en snelle acties</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {favorites.map((favorite) => (
                <Link key={favorite.id} href={`/verwijzingen/nieuw?recipient=${favorite.id}`} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-sky-100 hover:text-sky-700">
                  Verwijs naar {favorite.name.split(" ")[0]}
                </Link>
              ))}
              <Link href="/verwijzingen/nieuw" className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700">
                Nieuwe verwijzing
              </Link>
            </div>
          </div>
          <form className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                ["all", "Alle"],
                ["open", "Open"],
                ["completed", "Afgerond"],
              ].map(([value, label]) => (
                <Link key={value} href={`/dashboard?filter=${value}${query ? `&q=${encodeURIComponent(query)}` : ""}`} className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === value ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                  {label}
                </Link>
              ))}
            </div>
            <input name="q" defaultValue={query} placeholder="Zoek op casus, initialen of ontvanger" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400 lg:max-w-sm" />
          </form>
          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-100">
            <div className="grid grid-cols-1 divide-y divide-slate-100">
              {referrals.map((referral) => (
                <Link key={referral.id} href={`/verwijzingen/${referral.id}`} className="grid gap-3 bg-white px-5 py-4 transition hover:bg-slate-50 md:grid-cols-[1.1fr_0.7fr_1fr_0.8fr_0.7fr] md:items-center">
                  <div>
                    <p className="font-semibold text-slate-900">{referral.caseId}</p>
                    <p className="text-sm text-slate-500">
                      {referral.patientInitials} ({referral.patientBirthYear})
                    </p>
                  </div>
                  <p className="text-sm text-slate-600">{referral.themes.map((item) => getThemeLabel(item.theme)).join(", ")}</p>
                  <p className="text-sm text-slate-600">{referral.assignedTo.name}</p>
                  <p className="text-sm text-slate-600">{formatDateTime(referral.updatedAt)}</p>
                  <div className="md:justify-self-end">
                    <StatusBadge status={referral.status} />
                  </div>
                </Link>
              ))}
              {referrals.length === 0 ? <p className="px-5 py-10 text-sm text-slate-500">Nog geen verwijzingen gevonden voor deze filter.</p> : null}
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (user.role === "SOCIAAL") {
    const referrals = await prisma.referral.findMany({
      where: {
        assignedToId: user.id,
        ...(query
          ? {
              OR: [{ caseId: { contains: query } }, { patientInitials: { contains: query } }, { createdBy: { name: { contains: query } } }],
            }
          : {}),
      },
      include: {
        createdBy: true,
        themes: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return (
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Binnenkomend</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{referrals.length}</p>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Nog niet opgepakt</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{referrals.filter((item) => unpickedStatuses.includes(item.status)).length}</p>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Afgerond</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{referrals.filter((item) => item.status === ReferralStatus.COMPLETED).length}</p>
          </div>
        </section>
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Binnenkomende verwijzingen</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Status en terugkoppeling beheren</h2>
            </div>
            <form>
              <input name="q" defaultValue={query} placeholder="Zoek op casus of verwijzer" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400 lg:w-80" />
            </form>
          </div>
          <div className="mt-6 grid gap-4">
            {referrals.map((referral) => (
              <div key={referral.id} className="rounded-[1.75rem] border border-slate-100 bg-slate-50 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <Link href={`/verwijzingen/${referral.id}`} className="text-lg font-semibold text-slate-900 hover:text-sky-700">
                      {referral.caseId}
                    </Link>
                    <p className="text-sm text-slate-600">
                      {referral.patientInitials} ({referral.patientBirthYear}) • {referral.createdBy.name} • {urgencyLabels[referral.urgency]}
                    </p>
                    <p className="text-sm text-slate-500">{referral.themes.map((item) => getThemeLabel(item.theme)).join(", ")}</p>
                  </div>
                  <StatusBadge status={referral.status} />
                </div>
                <form action={updateReferral} className="mt-4 grid gap-3 lg:grid-cols-[220px_1fr_220px_150px]">
                  <input type="hidden" name="referralId" value={referral.id} />
                  <select name="status" defaultValue={referral.status} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400">
                    {Object.values(ReferralStatus).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <input name="feedback" maxLength={500} placeholder="Terugkoppeling of notitie" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400" />
                  <input name="handlerName" maxLength={100} placeholder="Naam behandelaar" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400" />
                  <button type="submit" className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700">
                    Opslaan
                  </button>
                </form>
              </div>
            ))}
            {referrals.length === 0 ? <p className="text-sm text-slate-500">Er zijn nog geen verwijzingen aan jou toegewezen.</p> : null}
          </div>
        </section>
      </div>
    );
  }

  const [userCount, referralCount, resourceCount, recentAuditLogs] = await Promise.all([
    prisma.user.count(),
    prisma.referral.count(),
    prisma.socialResource.count(),
    prisma.auditLog.findMany({
      take: 8,
      include: { user: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Gebruikers</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{userCount}</p>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Verwijzingen</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{referralCount}</p>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Sociale kaart items</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{resourceCount}</p>
        </div>
      </section>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Audit log</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Laatste acties</h2>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/gebruikers" className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200">
              Gebruikers beheren
            </Link>
            <Link href="/admin/sociale-kaart" className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700">
              Sociale kaart beheren
            </Link>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {recentAuditLogs.map((log) => (
            <div key={log.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="font-medium text-slate-900">{log.action}</p>
              <p className="text-sm text-slate-500">
                {log.user?.name ?? "Systeem"} • {log.entityType} • {formatDateTime(log.createdAt)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
