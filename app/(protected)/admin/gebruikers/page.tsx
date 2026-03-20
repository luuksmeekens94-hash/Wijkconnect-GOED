import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { roleLabels } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { saveUser } from "@/lib/actions";

export default async function AdminUsersPage() {
  await requireRole(["ADMIN"]);
  const users = await prisma.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] });

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Gebruiker toevoegen</h1>
        <form action={saveUser} className="mt-6 space-y-3">
          <input name="name" required placeholder="Naam" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400" />
          <input name="email" type="email" required placeholder="E-mailadres" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400" />
          <input name="organization" required placeholder="Organisatie" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400" />
          <select name="role" defaultValue={Role.VERWIJZER} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400">
            {Object.values(Role).map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </select>
          <input name="password" type="password" placeholder="Wachtwoord (optioneel)" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400" />
          <button type="submit" className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700">
            Gebruiker opslaan
          </button>
        </form>
      </section>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Gebruikers</p>
        <div className="mt-6 space-y-3">
          {users.map((user) => (
            <div key={user.id} className="rounded-3xl border border-slate-100 bg-slate-50 px-5 py-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{user.name}</p>
                  <p className="text-sm text-slate-500">
                    {user.email} • {user.organization}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">{roleLabels[user.role]}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
