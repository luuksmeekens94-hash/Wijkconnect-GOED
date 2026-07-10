import { ReferralStatus, Role, Theme, Urgency } from "@prisma/client";

export const APP_NAME = "WijkConnect";

export const themeOptions: { value: Theme; label: string; icon: string }[] = [
  { value: Theme.FINANCIELE_ZORGEN, label: "Financiele zorgen", icon: "EUR" },
  { value: Theme.EENZAAMHEID, label: "Eenzaamheid", icon: "Hart" },
  { value: Theme.DAGINVULLING_PARTICIPATIE, label: "Daginvulling / participatie", icon: "Kalender" },
  { value: Theme.BEWEGINGSARMOEDE, label: "Bewegingsarmoede", icon: "Beweging" },
  { value: Theme.PSYCHOSOCIAAL_STRESS, label: "Psychosociaal / stress", icon: "Mentaal" },
  { value: Theme.OPVOEDING_GEZIN, label: "Opvoeding / gezin", icon: "Gezin" },
  { value: Theme.WONEN_HULPMIDDELEN, label: "Wonen / hulpmiddelen", icon: "Wonen" },
  { value: Theme.WERK_INKOMEN, label: "Werk / inkomen", icon: "Werk" },
  { value: Theme.ZINGEVING, label: "Zingeving", icon: "Kompas" },
  { value: Theme.OVERIG, label: "Overig", icon: "Overig" },
];

export const statusOptions: { value: ReferralStatus; label: string; tone: string }[] = [
  { value: ReferralStatus.SENT, label: "Verzonden", tone: "bg-slate-100 text-slate-700" },
  { value: ReferralStatus.RECEIVED, label: "Ontvangen", tone: "bg-sky-100 text-sky-700" },
  { value: ReferralStatus.PICKED_UP, label: "Opgepakt", tone: "bg-blue-100 text-blue-700" },
  { value: ReferralStatus.IN_PROGRESS, label: "In behandeling", tone: "bg-amber-100 text-amber-700" },
  { value: ReferralStatus.REFERRED, label: "Doorverwezen", tone: "bg-violet-100 text-violet-700" },
  { value: ReferralStatus.COMPLETED, label: "Afgerond", tone: "bg-emerald-100 text-emerald-700" },
  { value: ReferralStatus.UNREACHABLE, label: "Niet bereikbaar", tone: "bg-rose-100 text-rose-700" },
  { value: ReferralStatus.DECLINED, label: "Geen contact gewenst", tone: "bg-zinc-200 text-zinc-700" },
];

export const urgencyLabels: Record<Urgency, string> = {
  NORMAL: "Normaal",
  HIGH: "Hoog",
};

export const roleLabels: Record<Role, string> = {
  VERWIJZER: "Verwijzer",
  SOCIAAL: "Sociaal professional",
  ADMIN: "Beheerder",
  DATA_MANAGER: "Projectbeheerder",
  PILOT: "Pilot / meekijken",
};

export const birthYears = Array.from({ length: 100 }, (_, index) => new Date().getFullYear() - index);

export const favoriteRecipientEmails = [
  "andrea.olfen@bindkracht10.nl",
  "margot.vandelft@buurtteamsvolwassenen.nl",
];

export function getThemeLabel(theme: Theme) {
  return themeOptions.find((option) => option.value === theme)?.label ?? theme;
}

export function getStatusMeta(status: ReferralStatus) {
  return statusOptions.find((option) => option.value === status) ?? statusOptions[0];
}
