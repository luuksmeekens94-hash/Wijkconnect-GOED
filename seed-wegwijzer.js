// Seed Wegwijzer024 scraped data into WijkConnect production DB
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Better theme mapping based on activity titles
const themeOverrides = {
  'Chi-Kung Weezenhof': ['BEWEGINGSARMOEDE', 'ZINGEVING'],
  'Otago valpreventie Fysiotherapie Dukenburg': ['BEWEGINGSARMOEDE'],
  'De Heeren van Nijmegen, wooncomplex': ['WONEN_HULPMIDDELEN'],
  'Beweeg-Je-Fit Dukenburg': ['BEWEGINGSARMOEDE'],
  'Onvergetelijke Kookclub': ['EENZAAMHEID', 'DAGINVULLING_PARTICIPATIE'],
  'Buikdanslessen': ['BEWEGINGSARMOEDE', 'DAGINVULLING_PARTICIPATIE'],
  'Kringloopwinkel Terre des Hommes': ['FINANCIELE_ZORGEN', 'DAGINVULLING_PARTICIPATIE'],
  'Ontmoetingscafé': ['EENZAAMHEID', 'DAGINVULLING_PARTICIPATIE'],
  'Moestuingroep de Groene Tol': ['DAGINVULLING_PARTICIPATIE', 'EENZAAMHEID'],
  'Kringloopwinkel Ries Ruimt': ['FINANCIELE_ZORGEN'],
  'Duiken': ['BEWEGINGSARMOEDE', 'DAGINVULLING_PARTICIPATIE'],
  'Stoelgym Tolhuis': ['BEWEGINGSARMOEDE'],
  'Schaatsen op Maat': ['BEWEGINGSARMOEDE', 'DAGINVULLING_PARTICIPATIE'],
  'Sociaal spreekuur': ['PSYCHOSOCIAAL_STRESS', 'FINANCIELE_ZORGEN', 'EENZAAMHEID'],
  'Voorleespret voor peuters': ['OPVOEDING_GEZIN'],
  'Duofietsen Park Malderborgh': ['BEWEGINGSARMOEDE', 'EENZAAMHEID'],
  'Fotograferen': ['DAGINVULLING_PARTICIPATIE', 'ZINGEVING'],
  'Biljarten Hatert': ['DAGINVULLING_PARTICIPATIE', 'EENZAAMHEID'],
};

// Better descriptions for activities where scraper only got "Stadsdeel: ..."
const descriptionOverrides = {
  'Chi-Kung Weezenhof': 'Chi-Kung oefeningen voor ontspanning, balans en vitaliteit. Geschikt voor alle niveaus.',
  'Otago valpreventie Fysiotherapie Dukenburg': 'Valpreventie-programma met kracht- en balansoefeningen onder begeleiding van fysiotherapeuten.',
  'De Heeren van Nijmegen, wooncomplex': 'Seniorenwooncomplex met gemeenschappelijke voorzieningen en activiteiten.',
  'Beweeg-Je-Fit Dukenburg': 'Laagdrempelig beweegprogramma voor kinderen om op een speelse manier te bewegen.',
  'Onvergetelijke Kookclub': 'Gezamenlijk koken voor mensen met dementie en hun naasten. Gezelligheid en verbinding door samen te koken.',
  'Buikdanslessen': 'Danslessen buikdans voor volwassenen. Bewegen, plezier en sociale contacten.',
  'Kringloopwinkel Terre des Hommes': 'Tweedehands winkel met kleding, boeken en huisraad. Opbrengst gaat naar kinderrechten.',
  'Ontmoetingscafé': 'Laagdrempelige ontmoetingsplek voor buurtbewoners. Koffie, gesprek en verbinding.',
  'Moestuingroep de Groene Tol': 'Samen tuinieren in de wijk. Sociale contacten, beweging en vers voedsel uit eigen tuin.',
  'Kringloopwinkel Ries Ruimt': 'Tweedehands winkel met huisraad, kleding en meer. Betaalbaar winkelen in de wijk.',
  'Duiken': 'Duiklessen en duikactiviteiten voor alle leeftijden en niveaus.',
  'Stoelgym Tolhuis': 'Stoelgymnastiek onder begeleiding van fysiotherapeuten. Geschikt voor ouderen en mensen met beperkte mobiliteit.',
  'Schaatsen op Maat': 'Schaatslessen voor kinderen en jongeren op alle niveaus.',
  'Sociaal spreekuur': 'Laagdrempelig spreekuur bij de huisarts voor sociale vragen. Ondersteuning bij financiën, eenzaamheid en welzijn.',
  'Voorleespret voor peuters': 'Interactief voorlezen voor peuters in de bibliotheek. Stimuleert taalontwikkeling en is gezellig.',
  'Duofietsen Park Malderborgh': 'Op de duofiets de omgeving verkennen. Voor ouderen die niet meer zelfstandig kunnen fietsen.',
  'Fotograferen': 'Fotografieclub voor jongeren en volwassenen. Leren fotograferen en samen op pad.',
  'Biljarten Hatert': 'Recreatief biljarten voor volwassenen. Gezelligheid en sociale contacten.',
  'Afhaalmaaltijden': 'Betaalbare afhaalmaaltijden vanuit het wijkatelier.',
  'Goede Dag Neerbosch-Oost': 'Dagprogramma voor ouderen met activiteiten, beweging en ontmoeting.',
};

async function main() {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'wegwijzer024-parsed.json'), 'utf8'));
  
  // Filter: only Dukenburg or Stadsbreed, skip bad entries
  const activities = raw.filter(a => {
    if (!a.title) return false;
    const sd = (a.stadsdeel || '').toLowerCase();
    return sd.includes('dukenburg') || sd.includes('stadsbreed') || sd === '';
  });

  console.log(`Seeding ${activities.length} Wegwijzer024 activities...`);
  
  let created = 0;
  for (const a of activities) {
    const themes = themeOverrides[a.title] || a.themes || ['OVERIG'];
    const description = descriptionOverrides[a.title] || a.description || a.title;
    const organization = (a.organization && a.organization !== 'Filters') ? a.organization : 'Onbekend';
    const phone = (a.contactPhone && a.contactPhone !== '09906245') ? a.contactPhone : null;
    
    // Check if already exists (by name + organization)
    const existing = await prisma.socialResource.findFirst({
      where: { name: a.title, organization }
    });
    if (existing) {
      console.log(`  ⏭ Skip (exists): ${a.title}`);
      continue;
    }

    await prisma.socialResource.create({
      data: {
        name: a.title,
        description: description.substring(0, 500),
        category: themes.includes('BEWEGINGSARMOEDE') ? 'Bewegen' 
          : themes.includes('EENZAAMHEID') ? 'Ontmoeting'
          : themes.includes('FINANCIELE_ZORGEN') ? 'Financieel'
          : themes.includes('DAGINVULLING_PARTICIPATIE') ? 'Daginvulling'
          : themes.includes('PSYCHOSOCIAAL_STRESS') ? 'Welzijn'
          : themes.includes('OPVOEDING_GEZIN') ? 'Gezin'
          : themes.includes('WONEN_HULPMIDDELEN') ? 'Wonen'
          : themes.includes('ZINGEVING') ? 'Zingeving'
          : 'Overig',
        organization,
        contactEmail: a.contactEmail || null,
        contactPhone: phone,
        address: a.address || null,
        stadsdeel: a.stadsdeel || 'Dukenburg',
        wijk: a.wijk || null,
        targetGroup: a.targetGroup || null,
        costs: a.costs || null,
        referralNeeded: a.needsReferral || false,
        type: 'COMMUNITY',
        source: 'WEGWIJZER024',
        url: a.url || null,
        themes: {
          create: themes.map(t => ({ theme: t })),
        },
      },
    });
    console.log(`  ✓ ${a.title} (${themes.join(', ')})`);
    created++;
  }
  
  console.log(`\nDone! Created ${created} new resources.`);
  const total = await prisma.socialResource.count();
  console.log(`Total resources in DB: ${total}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
