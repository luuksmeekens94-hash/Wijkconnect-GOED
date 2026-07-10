import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { auth } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_35%),linear-gradient(180deg,_#f8fbff_0%,_#e7f1f8_100%)] px-4 py-10">
      <div className="mx-auto grid min-h-[85vh] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2.5rem] border border-white/70 bg-slate-950 p-10 text-white shadow-[0_30px_100px_-50px_rgba(15,23,42,0.6)]">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-300">WijkConnect MVP</p>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-tight">Een beveiligde verwijsroute tussen zorg en sociaal domein.</h1>
          <p className="mt-4 max-w-2xl text-base text-slate-300">
            Speciaal voor de pilot in Dukenburg: minder mailverkeer, snellere warme overdracht en directe terugkoppeling per casus.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-3xl font-semibold">30 sec</p>
              <p className="mt-2 text-sm text-slate-300">Nieuwe verwijzing aanmaken</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-3xl font-semibold">Rolvast</p>
              <p className="mt-2 text-sm text-slate-300">Iedere gebruiker ziet alleen wat nodig is</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-3xl font-semibold">100%</p>
              <p className="mt-2 text-sm text-slate-300">Audittrail op acties en statuswijzigingen</p>
            </div>
          </div>
        </section>
        <section className="rounded-[2.5rem] border border-white/70 bg-white p-8 shadow-[0_30px_100px_-50px_rgba(14,116,144,0.35)]">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Inloggen</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">Welkom terug</h2>
            <p className="mt-2 text-sm text-slate-500">Gebruik je professionele account om verder te gaan.</p>
          </div>
          <LoginForm />
        </section>
      </div>
    </div>
  );
}
