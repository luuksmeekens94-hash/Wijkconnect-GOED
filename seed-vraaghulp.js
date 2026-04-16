// Seed VraagHulpNijmegen organizations into WijkConnect production DB
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const resources = [
  {
    name: 'Buurtteams Jeugd en Gezin',
    description: 'Ondersteuning voor gezinnen met kinderen tot 18 jaar. Hulp bij opvoeding, problemen thuis, school en meer. Gratis en in jouw buurt.',
    category: 'Gezin',
    organization: 'Buurtteams Jeugd en Gezin Nijmegen',
    contactEmail: 'info@buurtteamsjeugdengezin.nl',
    contactPhone: '024-2022899',
    address: 'Meijhorst 7039, 6537 EP Nijmegen',
    stadsdeel: 'Dukenburg',
    wijk: 'Meijhorst',
    targetGroup: 'Gezinnen met kinderen',
    costs: 'Gratis',
    referralNeeded: false,
    type: 'PROFESSIONAL',
    source: 'VRAAGHULP',
    url: 'https://buurtteamsjeugdengezin.nl/',
    themes: ['OPVOEDING_GEZIN', 'PSYCHOSOCIAAL_STRESS'],
  },
  {
    name: 'Ouderenadviseurs (Sterker Ouderenwerk)',
    description: 'Informatie, advies en ondersteuning voor ouderen in Nijmegen. Hulp bij wonen, zorg, eenzaamheid en dagelijkse vragen. Gratis en laagdrempelig.',
    category: 'Professionele ondersteuning',
    organization: 'Sterker Ouderenwerk',
    contactPhone: '024-3226060',
    stadsdeel: 'Stadsbreed',
    targetGroup: 'Senioren',
    costs: 'Gratis',
    referralNeeded: false,
    type: 'PROFESSIONAL',
    source: 'VRAAGHULP',
    url: 'https://sterkerouderenwerk.nl/diensten/informatie-en-advies/ouderenadvies',
    themes: ['EENZAAMHEID', 'WONEN_HULPMIDDELEN', 'ZINGEVING'],
  },
  {
    name: 'Mantelzorg Nijmegen',
    description: 'Eerste aanspreekpunt voor mantelzorgers. Tips, advies, antwoord op praktische vragen, steun en een luisterend oor. Brengt je in contact met andere mantelzorgers.',
    category: 'Professionele ondersteuning',
    organization: 'Mantelzorg Nijmegen',
    contactEmail: 'info@mantelzorg-nijmegen.nl',
    contactPhone: '088-0011333',
    stadsdeel: 'Stadsbreed',
    targetGroup: 'Mantelzorgers',
    costs: 'Gratis',
    referralNeeded: false,
    type: 'PROFESSIONAL',
    source: 'VRAAGHULP',
    url: 'https://mantelzorg-nijmegen.nl/',
    themes: ['PSYCHOSOCIAAL_STRESS', 'OVERIG'],
  },
  {
    name: 'Scouters',
    description: 'Toegankelijke informatie, onafhankelijk advies en innovatieve hulpmiddelen voor mensen die beter willen bewegen. Voor gebruikers, mantelzorgers en professionals.',
    category: 'Hulpmiddelen',
    organization: 'Scouters',
    contactEmail: 'info@scouters.nl',
    stadsdeel: 'Stadsbreed',
    targetGroup: 'Mensen met mobiliteitsvragen',
    costs: 'Gratis advies',
    referralNeeded: false,
    type: 'PROFESSIONAL',
    source: 'VRAAGHULP',
    url: 'https://www.scouters.nl/',
    themes: ['WONEN_HULPMIDDELEN', 'BEWEGINGSARMOEDE'],
  },
  {
    name: 'De Luisterlijn',
    description: 'Anoniem en vertrouwelijk praten, 24/7. Bellen, chatten of mailen. Voor iedereen die behoefte heeft aan een luisterend oor.',
    category: 'Welzijn',
    organization: 'De Luisterlijn',
    contactPhone: '0900-0767',
    stadsdeel: 'Stadsbreed',
    targetGroup: 'Iedereen',
    costs: 'Gratis',
    referralNeeded: false,
    type: 'PROFESSIONAL',
    source: 'VRAAGHULP',
    url: 'https://deluisterlijn.nl/',
    themes: ['PSYCHOSOCIAAL_STRESS', 'EENZAAMHEID'],
  },
  {
    name: 'Zelfregiecentrum Nijmegen',
    description: 'Helpt je om meer grip op je leven te krijgen. Voor mensen met een kwetsbaarheid of beperking (lichamelijk, zintuiglijk, licht verstandelijk of psychisch).',
    category: 'Welzijn',
    organization: 'Zelfregiecentrum Nijmegen',
    contactEmail: 'info@zrcn.nl',
    contactPhone: '024-7511120',
    address: 'St. Jorisstraat 72, 6511 TD Nijmegen',
    stadsdeel: 'Stadsbreed',
    targetGroup: 'Mensen met een beperking of kwetsbaarheid',
    costs: 'Gratis',
    referralNeeded: false,
    type: 'PROFESSIONAL',
    source: 'VRAAGHULP',
    url: 'https://www.zrcn.nl/',
    themes: ['PSYCHOSOCIAAL_STRESS', 'DAGINVULLING_PARTICIPATIE', 'ZINGEVING'],
  },
  {
    name: 'Meldpunt Bijzondere Zorg (GGD)',
    description: 'Voor zorgen over iemand die verward lijkt, zich anders gedraagt of vervuild oogt. Laagdrempelig advies en zo nodig hulp inschakelen.',
    category: 'Welzijn',
    organization: 'GGD Gelderland-Zuid',
    contactPhone: '088-1443300',
    stadsdeel: 'Stadsbreed',
    targetGroup: 'Iedereen (meldingen over kwetsbare personen)',
    costs: 'Gratis',
    referralNeeded: false,
    type: 'PROFESSIONAL',
    source: 'VRAAGHULP',
    url: 'https://ggdgelderlandzuid.nl/gezondheid/maatschappelijke-zorg/bijzondere-zorg/meldpunt-bijzondere-zorg/',
    themes: ['PSYCHOSOCIAAL_STRESS'],
  },
];

async function main() {
  console.log(`Seeding ${resources.length} VraagHulpNijmegen organizations...`);
  
  let created = 0;
  for (const r of resources) {
    const existing = await prisma.socialResource.findFirst({
      where: { name: r.name, organization: r.organization }
    });
    if (existing) {
      console.log(`  ⏭ Skip (exists): ${r.name}`);
      continue;
    }

    await prisma.socialResource.create({
      data: {
        name: r.name,
        description: r.description,
        category: r.category,
        organization: r.organization,
        contactPhone: r.contactPhone || null,
        contactEmail: r.contactEmail || null,
        address: r.address || null,
        stadsdeel: r.stadsdeel || null,
        wijk: r.wijk || null,
        targetGroup: r.targetGroup || null,
        costs: r.costs || null,
        referralNeeded: r.referralNeeded,
        type: r.type,
        source: r.source,
        url: r.url || null,
        themes: {
          create: r.themes.map(t => ({ theme: t })),
        },
      },
    });
    console.log(`  ✓ ${r.name}`);
    created++;
  }
  
  console.log(`\nDone! Created ${created} new resources.`);
  const total = await prisma.socialResource.count();
  console.log(`Total resources in DB: ${total}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
