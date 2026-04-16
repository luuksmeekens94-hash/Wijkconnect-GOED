const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const emailUpdates = [
  {
    currentEmail: "iris@schakel-nijmegen.nl",
    nextEmail: "i.venderbosch@schakel-nijmegen.nl",
  },
  {
    currentEmail: "andrea@bindkracht10.nl",
    nextEmail: "andrea.olfen@bindkracht10.nl",
  },
  {
    currentEmail: "margot@buurtteamsvolwassenen.nl",
    nextEmail: "margot.vandelft@buurtteamsvolwassenen.nl",
  },
];

async function main() {
  let updated = 0;

  for (const item of emailUpdates) {
    const existing = await prisma.user.findUnique({
      where: { email: item.currentEmail },
    });

    if (!existing) {
      continue;
    }

    await prisma.user.update({
      where: { id: existing.id },
      data: { email: item.nextEmail },
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
