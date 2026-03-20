"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          setError(null);
          const response = await signIn("credentials", {
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? ""),
            redirect: false,
          });

          if (response?.error) {
            setError("Inloggen is niet gelukt. Controleer je e-mailadres en wachtwoord.");
            return;
          }

          window.location.href = "/dashboard";
        });
      }}
    >
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="email">
          E-mailadres
        </label>
        <input id="email" name="email" type="email" required className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="password">
          Wachtwoord
        </label>
        <input id="password" name="password" type="password" required className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400" />
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <button type="submit" disabled={pending} className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300">
        {pending ? "Bezig..." : "Inloggen"}
      </button>
    </form>
  );
}
