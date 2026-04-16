const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const updates = [
  {
    name: "Beweeg-Je-Fit Dukenburg",
    data: {
      contactPhone: "06-41870194",
      address: "Dukenburg, Nijmegen",
    },
  },
  {
    name: "Breien en haken Dukenburg",
    data: {
      organization: "Ouder-Kindcentrum de Horizon",
      contactEmail: "bonpet@upcmail.nl",
      address: "Meijhorst 2001, 6537 GA Nijmegen",
      wijk: "Meijhorst",
    },
  },
  {
    name: "Duiken",
    data: {
      contactPhone: "06-41859747",
      address: "Zwembad Dukenburg, Meijhorst 7041, 6537 EP Nijmegen",
      wijk: "Meijhorst",
    },
  },
  {
    name: "Juridisch advies Sociaal Raadslieden Dukenburg",
    data: {
      contactEmail: "gemeente@nijmegen.nl",
      address: "Meijhorst 7041, 6537 EP Nijmegen",
      wijk: "Meijhorst",
    },
  },
  {
    name: "Onbeperkt (wijk)sporten Dukenburg",
    data: {
      contactEmail: "dukenburginbeweging@nijmegen.nl",
      address: "Sporthal Meijhorst, Meijhorst 1107, 6537 ER Nijmegen",
      wijk: "Meijhorst",
    },
  },
  {
    name: "Ontmoetingscafé",
    data: {
      contactPhone: "024-3441446",
      address: "Meijhorst 7033, 6537 EP Nijmegen",
      wijk: "Meijhorst",
    },
  },
  {
    name: "Sociaal spreekuur",
    data: {
      address: "Meijhorst 1003B, 6537 EE Nijmegen",
      wijk: "Meijhorst",
    },
  },
  {
    name: "Voorleespret voor peuters",
    data: {
      contactPhone: "024-3274911",
      address: "Mariënburg 29, 6511 PS Nijmegen",
    },
  },
];

async function main() {
  let updated = 0;
  for (const item of updates) {
    const existing = await prisma.socialResource.findFirst({ where: { name: item.name } });
    if (!existing) continue;
    await prisma.socialResource.update({
      where: { id: existing.id },
      data: item.data,
    });
    updated += 1;
  }
  console.log(`Bijgewerkt: ${updated}`);
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
