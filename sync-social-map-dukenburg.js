const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const updates = [
  {
    where: { name: "Buurtteams Volwassenen Dukenburg" },
    data: {
      contactEmail: "dukenburg@buurtteamsvolwassenen.nl",
      contactPhone: "024-3030550",
      address: "Meijhorst 7039, 6537 EP Nijmegen",
      wijk: "Meijhorst",
      stadsdeel: "Dukenburg",
      url: "https://www.buurtteamsvolwassenen.nl",
    },
  },
  {
    where: { name: "Bindkracht10 Welzijnscoach" },
    data: {
      contactEmail: "andrea.olfen@bindkracht10.nl",
      contactPhone: "06-82097454",
      address: "Boekweitweg 6, 6534 AC Nijmegen",
      url: "https://www.bindkracht10.nl/medewerker/andrea-olfen-dukenburg/",
    },
  },
  {
    where: { name: "Financieel Experts in de Wijk" },
    data: {
      url: "https://www.bindkracht10.nl/projecten/financieel-expert-in-de-wijk/",
    },
  },
  {
    where: { name: "Buurtteams Jeugd en Gezin" },
    data: {
      contactEmail: "info@buurtteamsjeugdengezin.nl",
      address: "Meijhorst 7039, 6537 EP Nijmegen",
      stadsdeel: "Dukenburg",
      wijk: "Meijhorst",
    },
  },
  {
    where: { name: "Mantelzorg Nijmegen" },
    data: {
      contactEmail: "info@mantelzorg-nijmegen.nl",
      contactPhone: "088-0011333",
    },
  },
  {
    where: { name: "Scouters" },
    data: {
      contactEmail: "info@scouters.nl",
    },
  },
  {
    where: { name: "Zelfregiecentrum Nijmegen" },
    data: {
      contactEmail: "info@zrcn.nl",
      contactPhone: "024-7511120",
      address: "St. Jorisstraat 72, 6511 TD Nijmegen",
    },
  },
  {
    where: { name: "Mantelzorg en Gezinspunt" },
    data: {
      contactEmail: "info@sterker.nl",
      contactPhone: "088-0017121",
      url: "https://www.sterker.nl/",
    },
  },
  {
    where: { name: "Ontmoetingscafe Samen Sterk" },
    data: {
      contactPhone: null,
    },
  },
  {
    where: { name: "Taal en Werkpunt Dukenburg" },
    data: {
      contactPhone: null,
    },
  },
  {
    where: { name: "Duiken" },
    data: {
      contactEmail: null,
    },
  },
  {
    where: { name: "Sociaal spreekuur" },
    data: {
      contactEmail: null,
    },
  },
  {
    where: { name: "Stoelgym Tolhuis" },
    data: {
      contactPhone: "06-37330358",
      address: "Aldenhof 7003, 6537 DZ Nijmegen",
    },
  },
  {
    where: { name: "Otago valpreventie Fysiotherapie Dukenburg" },
    data: {
      contactPhone: "024-3430505",
      address: "Weezenhof 55-16, 6536 EE Nijmegen",
      url: "https://wegwijzer024.nl/activiteiten/vallen-verleden-tijd/",
    },
  },
];

const upserts = [
  {
    match: { name: "Wandelgroep Tolhuis" },
    fallbackName: "Wandelgroep Dukenburg",
    data: {
      name: "Wandelgroep Tolhuis",
      description: "Wekelijkse wandelgroep vanuit Fysiotherapie Dukenburg. Samen op pad voor beweging, ritme en ontmoeting.",
      category: "Bewegen",
      organization: "Fysiotherapie Dukenburg",
      contactEmail: "info@fysiotherapiedukenburg.nl",
      contactPhone: "06-37330358",
      address: "Aldenhof 7003, 6537 DZ Nijmegen",
      wijk: "Tolhuis",
      stadsdeel: "Dukenburg",
      targetGroup: "Volwassenen en ouderen",
      costs: "Gratis",
      referralNeeded: false,
      type: "COMMUNITY",
      source: "WEGWIJZER024",
      url: "https://wegwijzer024.nl/activiteiten/wandelgroep-tolhuis/",
      themes: ["BEWEGINGSARMOEDE", "EENZAAMHEID", "DAGINVULLING_PARTICIPATIE"],
    },
  },
  {
    match: { name: "Koffiemoment" },
    data: {
      name: "Koffiemoment",
      description: "Laagdrempelige inloop voor buurtbewoners die anderen uit de wijk willen ontmoeten. Er is ruimte voor gesprek, ontmoeting en eigen ideeen. Maandag 13.00-15.30.",
      category: "Ontmoeting",
      organization: "Bindkracht10",
      contactEmail: "andrea.olfen@bindkracht10.nl",
      contactPhone: "06-82097454",
      address: "Wijkcentrum De Turf, Malvert 5134, 6538 DH Nijmegen",
      wijk: "Malvert",
      stadsdeel: "Dukenburg",
      targetGroup: "Volwassenen",
      costs: "Gratis",
      referralNeeded: false,
      type: "COMMUNITY",
      source: "WEGWIJZER024",
      url: "https://wegwijzer024.nl/activiteiten/koffiemoment/",
      themes: ["EENZAAMHEID", "DAGINVULLING_PARTICIPATIE", "ZINGEVING"],
    },
  },
  {
    match: { name: "Biodanza Dukenburg" },
    data: {
      name: "Biodanza Dukenburg",
      description: "Samen dansen op muziek voor vitaliteit, ontspanning en verbinding. Woensdag 19.30-21.30.",
      category: "Bewegen",
      organization: "Love in motion",
      contactEmail: "info@loveinmotion.nl",
      contactPhone: "06-25007217",
      address: "Staddijk 41, 6537 TW Nijmegen",
      wijk: "Staddijk",
      stadsdeel: "Dukenburg",
      targetGroup: "Volwassenen",
      costs: "Prijs staat op de website van aanbieder",
      referralNeeded: false,
      type: "COMMUNITY",
      source: "WEGWIJZER024",
      url: "https://wegwijzer024.nl/activiteiten/biodanza-dukenburg/",
      themes: ["BEWEGINGSARMOEDE", "EENZAAMHEID", "ZINGEVING"],
    },
  },
  {
    match: { name: "Vallen Verleden Tijd" },
    data: {
      name: "Vallen Verleden Tijd",
      description: "Valpreventietraining voor ouderen gericht op balans, valtechniek en meer zelfvertrouwen in bewegen.",
      category: "Bewegen",
      organization: "Fysiotherapie Dukenburg",
      contactEmail: "info@fysiotherapiedukenburg.nl",
      contactPhone: "024-3430505",
      address: "Weezenhof 55-16, 6536 EE Nijmegen",
      wijk: "Weezenhof",
      stadsdeel: "Dukenburg",
      targetGroup: "Senioren",
      costs: "Eigen bijdrage",
      referralNeeded: false,
      type: "COMMUNITY",
      source: "WEGWIJZER024",
      url: "https://wegwijzer024.nl/activiteiten/vallen-verleden-tijd/",
      themes: ["BEWEGINGSARMOEDE", "WONEN_HULPMIDDELEN"],
    },
  },
];

async function syncThemes(resourceId, themes) {
  await prisma.resourceTheme.deleteMany({ where: { resourceId } });
  await prisma.resourceTheme.createMany({
    data: themes.map((theme) => ({ resourceId, theme })),
  });
}

async function main() {
  let updated = 0;
  let created = 0;

  for (const item of updates) {
    const existing = await prisma.socialResource.findFirst({ where: item.where });
    if (!existing) continue;
    await prisma.socialResource.update({
      where: { id: existing.id },
      data: item.data,
    });
    updated += 1;
  }

  for (const item of upserts) {
    const existing =
      (await prisma.socialResource.findFirst({ where: item.match })) ||
      (item.fallbackName
        ? await prisma.socialResource.findFirst({ where: { name: item.fallbackName } })
        : null);

    if (existing) {
      const { themes, ...data } = item.data;
      await prisma.socialResource.update({
        where: { id: existing.id },
        data,
      });
      await syncThemes(existing.id, themes);
      updated += 1;
      continue;
    }

    const { themes, ...data } = item.data;
    const createdResource = await prisma.socialResource.create({
      data: {
        ...data,
        themes: {
          create: themes.map((theme) => ({ theme })),
        },
      },
    });
    created += 1;
    if (!createdResource) {
      throw new Error(`Kon resource ${item.data.name} niet aanmaken`);
    }
  }

  console.log(`Bijgewerkt: ${updated}`);
  console.log(`Nieuw toegevoegd: ${created}`);
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
