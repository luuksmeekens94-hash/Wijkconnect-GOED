import bcrypt from "bcryptjs";
import { PrismaClient, ResourceSource, ResourceType, Role, Theme } from "@prisma/client";

const prisma = new PrismaClient();

const users = [
  ["i.venderbosch@schakel-nijmegen.nl", "Iris Venderbosch", Role.VERWIJZER, "Huisartsenpraktijk De Schakel"],
  ["tom@fysiotherapienijmegen.nl", "Tom van Haaren", Role.VERWIJZER, "Fysiotherapie Fy-fit"],
  ["fleur@fysiotherapienijmegen.nl", "Fleur Frieling", Role.VERWIJZER, "Fysiotherapie Fy-fit"],
  ["andrea.olfen@bindkracht10.nl", "Andrea Olfen", Role.SOCIAAL, "Bindkracht10"],
  ["margot.vandelft@buurtteamsvolwassenen.nl", "Margot van Delft", Role.SOCIAAL, "Buurtteams Volwassenen"],
  ["admin@wijkconnect.nl", "Luuk Smeekens", Role.ADMIN, "WijkConnect"],
] as const;

const resources = [
  {
    name: "Buurtteams Volwassenen Dukenburg",
    description: "Ondersteuning bij geldzaken, wonen, relaties en dagelijkse structuur.",
    category: "Professionele ondersteuning",
    organization: "Buurtteams Volwassenen",
    contactEmail: "dukenburg@buurtteamsvolwassenen.nl",
    contactPhone: "024-3030550",
    address: "Meijhorst 7039, 6537 EP Nijmegen",
    stadsdeel: "Dukenburg",
    wijk: "Meijhorst",
    targetGroup: "Volwassen inwoners",
    costs: "Gratis",
    referralNeeded: true,
    type: ResourceType.PROFESSIONAL,
    source: ResourceSource.VRAAGHULP,
    url: "https://www.buurtteamsvolwassenen.nl",
    themes: [Theme.FINANCIELE_ZORGEN, Theme.WONEN_HULPMIDDELEN, Theme.WERK_INKOMEN, Theme.PSYCHOSOCIAAL_STRESS],
  },
  {
    name: "Bindkracht10 Welzijnscoach",
    description: "Welzijnscoaching gericht op meedoen, sociaal contact en passende activiteiten.",
    category: "Professionele ondersteuning",
    organization: "Bindkracht10",
    contactEmail: "andrea.olfen@bindkracht10.nl",
    contactPhone: "06-82097454",
    address: "Boekweitweg 6, 6534 AC Nijmegen",
    stadsdeel: "Dukenburg",
    wijk: "Zwanenveld",
    targetGroup: "Volwassen inwoners",
    costs: "Gratis",
    referralNeeded: true,
    type: ResourceType.PROFESSIONAL,
    source: ResourceSource.MANUAL,
    url: "https://www.bindkracht10.nl",
    themes: [Theme.EENZAAMHEID, Theme.DAGINVULLING_PARTICIPATIE, Theme.ZINGEVING, Theme.BEWEGINGSARMOEDE],
  },
  {
    name: "Financieel Experts in de Wijk",
    description: "Praktische hulp bij schulden, budgetteren en inkomensvoorzieningen.",
    category: "Professionele ondersteuning",
    organization: "Gemeente Nijmegen",
    contactEmail: "geldzaken@nijmegen.nl",
    contactPhone: "14024",
    address: "Stadswinkel Dukenburg, Nijmegen",
    stadsdeel: "Dukenburg",
    wijk: "Dukenburg",
    targetGroup: "Inwoners met geldzorgen",
    costs: "Gratis",
    referralNeeded: false,
    type: ResourceType.PROFESSIONAL,
    source: ResourceSource.VRAAGHULP,
    url: "https://www.bindkracht10.nl/projecten/financieel-expert-in-de-wijk/",
    themes: [Theme.FINANCIELE_ZORGEN, Theme.WERK_INKOMEN],
  },
  {
    name: "Bibliotheek Informatiepunt Digitale Overheid",
    description: "Ondersteuning bij digitale formulieren, toeslagen en overheidszaken.",
    category: "Professionele ondersteuning",
    organization: "Bibliotheek Gelderland Zuid",
    contactEmail: "info@obgz.nl",
    contactPhone: "024-3274930",
    address: "Zwanenveld 90-02, Nijmegen",
    stadsdeel: "Dukenburg",
    wijk: "Zwanenveld",
    targetGroup: "Iedereen",
    costs: "Gratis",
    referralNeeded: false,
    type: ResourceType.PROFESSIONAL,
    source: ResourceSource.VRAAGHULP,
    url: "https://www.obgz.nl",
    themes: [Theme.FINANCIELE_ZORGEN, Theme.WERK_INKOMEN, Theme.OVERIG],
  },
  {
    name: "Wandelgroep Tolhuis",
    description: "Wekelijkse wandelgroep vanuit Fysiotherapie Dukenburg. Samen op pad voor beweging, ritme en ontmoeting.",
    category: "Bewegen",
    organization: "Fysiotherapie Dukenburg",
    contactEmail: "info@fysiotherapiedukenburg.nl",
    contactPhone: "06-37330358",
    address: "Aldenhof 7003, 6537 DZ Nijmegen",
    stadsdeel: "Dukenburg",
    wijk: "Tolhuis",
    targetGroup: "Volwassenen en ouderen",
    costs: "Gratis",
    referralNeeded: false,
    type: ResourceType.COMMUNITY,
    source: ResourceSource.WEGWIJZER024,
    url: "https://wegwijzer024.nl/activiteiten/wandelgroep-tolhuis/",
    themes: [Theme.BEWEGINGSARMOEDE, Theme.EENZAAMHEID, Theme.DAGINVULLING_PARTICIPATIE],
  },
  {
    name: "Ontmoetingscafe Samen Sterk",
    description: "Ontmoetingsmiddag met koffie, gesprek en activiteiten voor buurtbewoners.",
    category: "Ontmoeting",
    organization: "Wijkcentrum Dukenburg",
    address: "Meijhorst 70-39, Nijmegen",
    stadsdeel: "Dukenburg",
    wijk: "Meijhorst",
    targetGroup: "Volwassenen",
    costs: "Gratis",
    referralNeeded: false,
    type: ResourceType.COMMUNITY,
    source: ResourceSource.WEGWIJZER024,
    themes: [Theme.EENZAAMHEID, Theme.ZINGEVING, Theme.DAGINVULLING_PARTICIPATIE],
  },
  {
    name: "Taal en Werkpunt Dukenburg",
    description: "Vrijwilligers helpen bij taalvragen, solliciteren en participatie.",
    category: "Werk en ontwikkeling",
    organization: "ROC / Vrijwilligersnetwerk",
    address: "Aldenhof 14-01, Nijmegen",
    stadsdeel: "Dukenburg",
    wijk: "Aldenhof",
    targetGroup: "Werkzoekenden en nieuwkomers",
    costs: "Gratis",
    referralNeeded: false,
    type: ResourceType.COMMUNITY,
    source: ResourceSource.WEGWIJZER024,
    themes: [Theme.WERK_INKOMEN, Theme.DAGINVULLING_PARTICIPATIE],
  },
  {
    name: "Mantelzorg en Gezinspunt",
    description: "Ondersteuning bij opvoeding, gezinsvragen en overbelasting thuis.",
    category: "Gezin",
    organization: "Sterker sociaal werk",
    contactEmail: "info@sterker.nl",
    contactPhone: "088-0017121",
    address: "Tolhuis 44-44, Nijmegen",
    stadsdeel: "Dukenburg",
    wijk: "Tolhuis",
    targetGroup: "Gezinnen",
    costs: "Gratis",
    referralNeeded: true,
    type: ResourceType.PROFESSIONAL,
    source: ResourceSource.MANUAL,
    url: "https://www.sterker.nl/",
    themes: [Theme.OPVOEDING_GEZIN, Theme.PSYCHOSOCIAAL_STRESS],
  },
];

async function main() {
  const passwordHash = await bcrypt.hash("WijkConnect2026!", 10);

  await prisma.notification.deleteMany();
  await prisma.referralUpdate.deleteMany();
  await prisma.referralTheme.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.resourceTheme.deleteMany();
  await prisma.socialResource.deleteMany();
  await prisma.caseCounter.deleteMany();

  for (const [email, name, role, organization] of users) {
    await prisma.user.upsert({
      where: { email },
      update: { name, role, organization, passwordHash },
      create: { email, name, role, organization, passwordHash },
    });
  }

  for (const resource of resources) {
    await prisma.socialResource.create({
      data: {
        name: resource.name,
        description: resource.description,
        category: resource.category,
        organization: resource.organization,
        contactEmail: resource.contactEmail,
        contactPhone: resource.contactPhone,
        address: resource.address,
        stadsdeel: resource.stadsdeel,
        wijk: resource.wijk,
        targetGroup: resource.targetGroup,
        costs: resource.costs,
        referralNeeded: resource.referralNeeded,
        type: resource.type,
        source: resource.source,
        url: resource.url,
        themes: {
          create: resource.themes.map((theme) => ({ theme })),
        },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
