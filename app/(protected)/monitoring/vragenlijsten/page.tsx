import Link from "next/link";
import { BarChart3, FileQuestion, LockKeyhole, Send, Settings2 } from "lucide-react";
import {
  MonitoringAppointmentStatus,
  MonitoringProgram,
  SurveyAudience,
  SurveyDeliveryStatus,
  SurveyInvitationStatus,
  SurveyRecipientType,
} from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { isBrevoConfigured } from "@/lib/brevo";
import { formatDateInput, surveyAudienceLabels } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";
import { surveyCampaignPeriodForDate, surveyCampaignPeriodOptions } from "@/lib/survey-campaign";
import { decryptSurveyRecipientEmail, maskSurveyRecipientEmail } from "@/lib/survey-security";
import { createSurveyInvitation, initializeVeznSurveyTemplates, sendPreparedSurveyInvitation, updateSurveyInvitationStatus } from "@/lib/survey-actions";

const invitationStatusLabels: Record<SurveyInvitationStatus, string> = {
  DRAFT: "Concept",
  READY: "Klaar om te versturen",
  SENT: "Verstuurd",
  OPENED: "Geopend",
  COMPLETED: "Afgerond",
  EXPIRED: "Verlopen",
  CANCELLED: "Geannuleerd",
};

const deliveryStatusLabels: Record<SurveyDeliveryStatus, string> = {
  PENDING: "Nog niet aangeboden",
  QUEUED: "In wachtrij",
  SENT: "Verstuurd",
  DELIVERED: "Bezorgd",
  BOUNCED: "Niet bezorgd",
  FAILED: "Verzending mislukt",
  SUPPRESSED: "Geblokkeerd",
};

const patientAudiences = new Set<SurveyAudience>([
  SurveyAudience.MOVEMENT_PATIENT,
  SurveyAudience.SOCIAL_PATIENT,
]);

function recipientEmailLabel(recipient: { emailEncrypted: string | null } | null) {
  if (!recipient?.emailEncrypted) return "contactgegevens verwijderd";
  try {
    return maskSurveyRecipientEmail(decryptSurveyRecipientEmail(recipient.emailEncrypted));
  } catch {
    return "contactgegevens niet leesbaar";
  }
}

export default async function SurveyCenterPage() {
  await requireRole(["ADMIN", "DATA_MANAGER"]);
  const emailDeliveryConfigured = isBrevoConfigured();
  const campaignPeriods = surveyCampaignPeriodOptions();
  const currentCampaignPeriod = surveyCampaignPeriodForDate(new Date());
  const [templates, invitations, eligibleAppointments] = await Promise.all([
    prisma.surveyTemplate.findMany({ include: { _count: { select: { questions: true, invitations: true } } }, orderBy: [{ audience: "asc" }, { version: "desc" }] }),
    prisma.surveyInvitation.findMany({ include: { template: true, recipient: true, response: true, case: { include: { participant: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.monitoringAppointment.findMany({
      where: {
        evaluationEligible: true,
        status: MonitoringAppointmentStatus.ATTENDED,
        surveyInvitations: {
          none: { status: { notIn: [SurveyInvitationStatus.CANCELLED, SurveyInvitationStatus.EXPIRED] } },
        },
      },
      include: { case: { include: { participant: true } } },
      orderBy: { scheduledAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Vragenlijstcentrum</p><h1 className="mt-2 text-3xl font-semibold text-slate-900">Templates, uitnodigingen en respons</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">De vijf VEZN-vragenlijsten worden versieerbaar opgeslagen. Een lopende versie blijft ongewijzigd voor betrouwbare vergelijking.</p></div>
          <div className="flex flex-wrap gap-2">
            {templates.length === 0 ? <form action={initializeVeznSurveyTemplates}><button className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"><Settings2 className="h-4 w-4" /> VEZN-templates laden</button></form> : <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700"><LockKeyhole className="h-4 w-4" /> Versie 1 geborgd</span>}
            <Link href="/monitoring/vragenlijsten/resultaten" className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"><BarChart3 className="h-4 w-4" /> Resultaten bekijken</Link>
          </div>
        </div>
        <div className={`mt-5 rounded-3xl border p-4 text-sm leading-6 ${emailDeliveryConfigured ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          {emailDeliveryConfigured
            ? "E-mailverzending is ingericht. Controleer vóór verzending altijd het e-mailadres en de toestemming. Antwoorden blijven in WijkConnect."
            : "Uitnodigingen kunnen worden voorbereid, maar verzending blijft uitgeschakeld totdat de beveiligde Brevo-variabelen in Vercel zijn ingesteld."}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {templates.map((template) => (
          <div key={template.id} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"><FileQuestion className="h-5 w-5 text-violet-600" /><p className="mt-4 font-semibold text-slate-900">{template.name}</p><p className="mt-2 text-xs leading-5 text-slate-500">{surveyAudienceLabels[template.audience]} · versie {template.version}</p><div className="mt-4 flex justify-between text-xs text-slate-500"><span>{template._count.questions} vragen</span><span>{template._count.invitations} uitnodigingen</span></div></div>
        ))}
        {templates.length === 0 ? <div className="col-span-full rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Laad eerst de vijf geverifieerde VEZN-vragenlijsten.</div> : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3"><Send className="h-5 w-5 text-sky-600" /><h2 className="text-xl font-semibold text-slate-900">Patiënt uitnodigen</h2></div>
            <p className="mt-2 text-sm leading-6 text-slate-500">Een uitnodiging is altijd gekoppeld aan één daadwerkelijk bezochte afspraak.</p>
            <form action={createSurveyInvitation} className="mt-5 space-y-4">
              <input type="hidden" name="recipientType" value={SurveyRecipientType.PATIENT} />
              <label className="space-y-2 text-sm text-slate-700"><span>Vragenlijst</span><select name="templateId" required className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"><option value="">Selecteer patiëntvragenlijst</option>{templates.filter((item) => item.active && patientAudiences.has(item.audience)).map((template) => <option key={template.id} value={template.id}>{template.name} · v{template.version}</option>)}</select></label>
              <label className="space-y-2 text-sm text-slate-700"><span>Bezochte afspraak</span><select name="appointmentId" required defaultValue="" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"><option value="">Selecteer afspraak</option>{eligibleAppointments.map((appointment) => <option key={appointment.id} value={appointment.id}>{appointment.case.program === MonitoringProgram.MOVEMENT ? "Beweegspreekuur" : "Sociaal spreekuur"} · ···{appointment.case.participant.pseudonymCode.slice(-8)} · {new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(appointment.scheduledAt)}</option>)}</select></label>
              <label className="space-y-2 text-sm text-slate-700"><span>E-mailadres patiënt</span><input name="recipientEmail" type="email" required autoComplete="off" maxLength={254} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" /><span className="block text-xs leading-5 text-slate-500">Wordt apart en versleuteld opgeslagen; niet in het patiëntdossier of de rapportage.</span></label>
              <label className="space-y-2 text-sm text-slate-700"><span>Verloopt op</span><input name="expiresAt" type="date" min={formatDateInput(new Date())} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" /></label>
              <label className="flex gap-3 rounded-2xl border border-slate-200 p-4 text-xs leading-5 text-slate-600"><input name="permissionConfirmed" value="yes" type="checkbox" required className="mt-0.5 h-4 w-4" /><span>Ik heb gecontroleerd dat dit e-mailadres klopt en dat de patiënt een evaluatie-uitnodiging mag ontvangen.</span></label>
              <button disabled={templates.length === 0 || eligibleAppointments.length === 0} className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-300">Patiëntuitnodiging klaarzetten</button>
            </form>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3"><Send className="h-5 w-5 text-violet-600" /><h2 className="text-xl font-semibold text-slate-900">Professional uitnodigen</h2></div>
            <form action={createSurveyInvitation} className="mt-5 space-y-4">
              <input type="hidden" name="recipientType" value={SurveyRecipientType.PROFESSIONAL} />
              <label className="space-y-2 text-sm text-slate-700"><span>Vragenlijst</span><select name="templateId" required className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"><option value="">Selecteer professionalsurvey</option>{templates.filter((item) => item.active && !patientAudiences.has(item.audience)).map((template) => <option key={template.id} value={template.id}>{template.name} · v{template.version}</option>)}</select></label>
              <label className="space-y-2 text-sm text-slate-700"><span>Zakelijk e-mailadres</span><input name="recipientEmail" type="email" required autoComplete="off" maxLength={254} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" /></label>
              <label className="space-y-2 text-sm text-slate-700"><span>Campagneperiode</span><select name="campaignPeriod" required defaultValue={currentCampaignPeriod} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400">{campaignPeriods.map((period) => <option key={period} value={period}>{period}</option>)}</select><span className="block text-xs leading-5 text-slate-500">Per vragenlijst ontvangt hetzelfde e-mailadres maximaal één uitnodiging per kwartaal.</span></label>
              <label className="space-y-2 text-sm text-slate-700"><span>Verloopt op</span><input name="expiresAt" type="date" min={formatDateInput(new Date())} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" /></label>
              <label className="flex gap-3 rounded-2xl border border-slate-200 p-4 text-xs leading-5 text-slate-600"><input name="permissionConfirmed" value="yes" type="checkbox" required className="mt-0.5 h-4 w-4" /><span>Ik heb gecontroleerd dat deze professional deze evaluatie-uitnodiging mag ontvangen.</span></label>
              <button disabled={templates.length === 0} className="w-full rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-300">Professionaluitnodiging klaarzetten</button>
            </form>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Uitnodigingen</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Voortgang en respons</h2>
          <div className="mt-5 space-y-3">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="font-medium text-slate-900">{invitation.template.name}</p><p className="mt-1 text-xs text-slate-500">{invitation.case ? `Patiëntcode ···${invitation.case.participant.pseudonymCode.slice(-8)}` : `Professionele doelgroep${invitation.campaignPeriod ? ` · campagne ${invitation.campaignPeriod}` : ""}`} · {recipientEmailLabel(invitation.recipient)} · aangemaakt {new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(invitation.createdAt)}</p><p className="mt-1 text-xs text-slate-500">{invitation.response ? "Respons ontvangen" : invitationStatusLabels[invitation.status]} · {deliveryStatusLabels[invitation.deliveryStatus]}</p></div>
                  <div className="flex flex-wrap gap-2">
                    {invitation.status === SurveyInvitationStatus.READY && (invitation.deliveryStatus === SurveyDeliveryStatus.PENDING || invitation.deliveryStatus === SurveyDeliveryStatus.FAILED) ? (
                      <form action={sendPreparedSurveyInvitation}>
                        <input type="hidden" name="invitationId" value={invitation.id} />
                        <button disabled={!emailDeliveryConfigured} className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white disabled:bg-slate-300">{invitation.deliveryStatus === SurveyDeliveryStatus.FAILED ? "Opnieuw versturen" : "Nu versturen"}</button>
                      </form>
                    ) : null}
                    {[SurveyInvitationStatus.DRAFT, SurveyInvitationStatus.READY, SurveyInvitationStatus.SENT, SurveyInvitationStatus.OPENED].some((status) => status === invitation.status) ? (
                      <form action={updateSurveyInvitationStatus}>
                        <input type="hidden" name="invitationId" value={invitation.id} />
                        <input type="hidden" name="status" value={SurveyInvitationStatus.CANCELLED} />
                        <button className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">Annuleren</button>
                      </form>
                    ) : null}
                  </div>
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
