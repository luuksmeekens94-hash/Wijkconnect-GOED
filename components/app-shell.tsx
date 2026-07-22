import Link from "next/link";
import { BarChart3, BookOpenCheck, CalendarCheck, ClipboardList, FileQuestion, FileSpreadsheet, LayoutDashboard, ListChecks, MapPinned, Settings, Shield, UserRoundPlus, Waypoints } from "lucide-react";
import { Role } from "@prisma/client";
import { NotificationBell } from "@/components/notification-bell";
import { LogoutButton } from "@/components/logout-button";
import { APP_NAME, roleLabels } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

const navByRole: Record<Role, Array<{ href: string; label: string; icon: typeof LayoutDashboard }>> = {
  VERWIJZER: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/verwijzingen/nieuw", label: "Nieuwe verwijzing", icon: ClipboardList },
    { href: "/sociale-kaart", label: "Sociale kaart", icon: MapPinned },
  ],
  SOCIAAL: [
    { href: "/patientreizen", label: "Patiëntreizen", icon: Waypoints },
  ],
  PHYSIOTHERAPIST: [
    { href: "/patientreizen", label: "Patiëntreizen", icon: Waypoints },
  ],
  ADMIN: [
    { href: "/monitoring", label: "Projectmonitoring", icon: BarChart3 },
    { href: "/monitoring/weekinvoer", label: "Wekelijkse patiëntinvoer", icon: UserRoundPlus },
    { href: "/patientreizen", label: "Patiëntreizen", icon: Waypoints },
    { href: "/monitoring/weken", label: "Weekregistratie", icon: CalendarCheck },
    { href: "/monitoring/registraties", label: "Registraties", icon: ListChecks },
    { href: "/monitoring/vragenlijsten", label: "Vragenlijsten", icon: FileQuestion },
    { href: "/monitoring/projectlog", label: "Projectlog", icon: BookOpenCheck },
    { href: "/monitoring/rapportages", label: "Rapportages", icon: FileSpreadsheet },
    { href: "/dashboard", label: "Systeemoverzicht", icon: Shield },
    { href: "/admin/projectinstellingen", label: "Projectinstellingen", icon: Settings },
    { href: "/admin/gebruikers", label: "Gebruikers", icon: Settings },
    { href: "/admin/sociale-kaart", label: "Sociale kaart", icon: MapPinned },
  ],
  DATA_MANAGER: [
    { href: "/monitoring/weekinvoer", label: "Patiënten deze week", icon: UserRoundPlus },
  ],
  PILOT: [
    { href: "/dashboard", label: "Pilotoverzicht", icon: Shield },
    { href: "/sociale-kaart", label: "Sociale kaart", icon: MapPinned },
  ],
};

const operationalRoleHeadings: Partial<Record<Role, string>> = {
  DATA_MANAGER: "Patiënten van deze week registreren",
  PHYSIOTHERAPIST: "Vervolg na het beweegspreekuur",
  SOCIAAL: "Vervolg na het sociaal spreekuur",
};

export async function AppShell({
  user,
  children,
}: {
  user: { id: string; name?: string | null; email?: string | null; role: Role; organization: string };
  children: React.ReactNode;
}) {
  const operationalHeading = operationalRoleHeadings[user.role];

  if (operationalHeading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_38%),linear-gradient(180deg,_#f8fbff_0%,_#eef5fb_100%)]">
        <div className="mx-auto min-h-screen max-w-6xl px-4 py-5 sm:px-6">
          <header className="mb-6 rounded-[2rem] border border-white/80 bg-white/95 px-5 py-4 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)] sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-600">{APP_NAME}</p>
                <h1 className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">{operationalHeading}</h1>
                <p className="mt-1 text-sm text-slate-500">{user.name} · {user.organization}</p>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">{roleLabels[user.role]}</span>
                <LogoutButton />
              </div>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </div>
    );
  }

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_38%),linear-gradient(180deg,_#f8fbff_0%,_#eef5fb_100%)]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 lg:flex-row lg:px-6">
        <aside className="mb-6 rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur lg:mb-0 lg:w-80">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-600">{APP_NAME}</p>
            <h1 className="text-2xl font-semibold text-slate-900">Samen sneller doorverwijzen</h1>
            <p className="text-sm text-slate-500">{user.organization}</p>
          </div>
          <div className="mt-6 rounded-3xl bg-slate-900 px-5 py-4 text-white">
            <p className="text-sm text-slate-300">{roleLabels[user.role]}</p>
            <p className="mt-1 font-semibold">{user.name}</p>
            <p className="text-sm text-slate-300">{user.email}</p>
          </div>
          <nav className="mt-6 space-y-2">
            {navByRole[user.role].map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-sky-50 hover:text-sky-700">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 lg:pl-6">
          <div className="mb-6 flex items-center justify-between gap-4 rounded-[2rem] border border-white/80 bg-white/90 px-6 py-4 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
            <div>
              <p className="text-sm text-slate-500">WijkConnect MVP</p>
              <p className="text-lg font-semibold text-slate-900">Verwijzingen en terugkoppeling in een beveiligde workflow</p>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell unreadCount={unreadCount} />
              <LogoutButton />
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
