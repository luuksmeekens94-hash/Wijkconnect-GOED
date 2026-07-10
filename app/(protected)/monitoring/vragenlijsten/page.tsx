import { FileQuestion, LockKeyhole, Send, Settings2 } from "lucide-react";
import { SurveyInvitationStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { formatDateInput, surveyAudienceLabels } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";
import { createSurveyInvitation, initializeVeznSurveyTemplates, updateSurveyInvitationStatus } from "@/lib/survey-actions";

const invitationStatusLabels: Record<SurveyInvitationStatus, string> = {
  DRAFT: "Concept",
  READY: "Klaar om te versturen",
  SENT: "Verstuurd",
  OPENED: "Geopend",
  COMPLETED: "Afgerond",
  EXPIRED: "Verlopen",
  CANCELLED: "Geannuleerd",
};

export default async function SurveyCenterPage() {
  await requireRole(["ADMIN", "DATA_MANAGER"]);
  const [templates, invitations, eligibleAppointments] = await Promise.all([
    prisma.surveyTemplate.findMany({ include: { _count: { select: { questions: true, invitations: true } } }, orderBy: [{ audience: "asc" }, { version: "desc" }] }),
    prisma.surveyInvitation.findMany({ include: { template: true, case: { include: { participant: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.monitoringAppointment.findMany({ where: { evaluationEligible: true }, include: { case: { include: { participant: true } } }, orderBy: { scheduledAt: "desc" }, take: 100 }),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Vragenlijstcentrum</p><h1 className="mt-2 text-3xl font-semibold text-slate-900">Templates, uitnodigingen en respons</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">De vijf VEZN-vragenlijsten worden versieerbaar opgeslagen. Een lopende versie blijft ongewijzigd voor betrouwbare vergelijking.</p></div>
          {templates.length === 0 ? <form action={initializeVeznSurveyTemplates}><button className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"><Settings2 className="h-4 w-4" /> VEZN-templates laden</button></form> : <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700"><LockKeyhole className="h-4 w-4" /> Versie 1 geborgd</span>}
        </div>
        <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          De uitnodigingen kunnen al worden voorbereid en gevolgd. Automatische verzending via e-mail of sms wordt pas geactiveerd nadat kanaal, toestemming en afzender in het overleg zijn bevestigd.
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {templates.map((template) => (
          <div key={template.id} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"><FileQuestion className="h-5 w-5 text-violet-600" /><p className="mt-4 font-semibold text-slate-900">{template.name}</p><p className="mt-2 text-xs leading-5 text-slate-500">{surveyAudienceLabels[template.audience]} · versie {template.version}</p><div className="mt-4 flex justify-between text-xs text-slate-500"><span>{template._count.questions} vragen</span><span>{template._count.invitations} uitnodigingen</span></div></div>
        ))}
        {templates.length === 0 ? <div className="col-span-full rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Laad eerst de vijf geverifieerde VEZN-vragenlijsten.</div> : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3"><Send className="h-5 w-5 text-sky-600" /><h2 className="text-xl font-semibold text-slate-900">Uitnodiging voorbereiden</h2></div>
          <form action={createSurveyInvitation} className="mt-5 space-y-4">
            <label className="space-y-2 text-sm text-slate-700"><span>Vragenlijst</span><select name="templateId" required className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"><option value="">Selecteer template</option>{templates.filter((item) => item.active).map((template) => <option key={template.id} value={template.id}>{template.name} · v{template.version}</option>)}</select></label>
            <label className="space-y-2 text-sm text-slate-700"><span>Gekoppelde patiëntreis, optioneel</span><select name="caseId" defaultValue="" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"><option value="">Geen casuskoppeling / professionalssurvey</option>{eligibleAppointments.map((appointment) => <option key={appointment.id} value={appointment.caseId}>···{appointment.case.participant.pseudonymCode.slice(-8)} · {new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(appointment.scheduledAt)}</option>)}</select></label>
            <label className="space-y-2 text-sm text-slate-700"><span>Verloopt op</span><input name="expiresAt" type="date" min={formatDateInput(new Date())} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" /></label>
            <button disabled={templates.length === 0} className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-300">Uitnodiging klaarzetten</button>
          </form>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Uitnodigingen</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Voortgang en respons</h2>
          <div className="mt-5 space-y-3">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="font-medium text-slate-900">{invitation.template.name}</p><p className="mt-1 text-xs text-slate-500">{invitation.case ? `Patiëntcode ···${invitation.case.participant.pseudonymCode.slice(-8)}` : "Professionele doelgroep"} · aangemaakt {new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(invitation.createdAt)}</p></div>
                  <form action={updateSurveyInvitationStatus} className="flex gap-2"><input type="hidden" name="invitationId" value={invitation.id} /><select name="status" defaultValue={invitation.status} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none">{Object.values(SurveyInvitationStatus).map((status) => <option key={status} value={status}>{invitationStatusLabels[status]}</option>)}</select><button className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">Opslaan</button></form>
                </div>
              </div>
            ))}
            {invitations.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">Nog geen uitnodigingen voorbereid.</div> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
