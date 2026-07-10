const bcrypt = require("bcryptjs");
const { PrismaClient, Role } = require("@prisma/client");

const prisma = new PrismaClient();

const observers = [
  {
    name: "Nicolette Broekhuisen",
    email: "nbroekhuisen@ggdgelderlandzuid.nl",
    organization: "GGD Gelderland-Zuid",
  },
  {
    name: "Marion Brouwer",
    email: "marion@fysiotherapienijmegen.nl",
    organization: "Fysiotherapie Fy-fit",
  },
  {
    name: "Anneke Stoks",
    email: "praktijkmanager@schakel-nijmegen.nl",
    organization: "Huisartsenpraktijk De Schakel",
  },
];

async function main() {
  const seedPassword = process.env.SEED_PASSWORD;
  if (!seedPassword || seedPassword.length < 12) {
    throw new Error("Stel SEED_PASSWORD in op een uniek wachtwoord van minimaal 12 tekens voordat je accounts aanmaakt");
  }
  const passwordHash = await bcrypt.hash(seedPassword, 12);
  let updated = 0;

  for (const observer of observers) {
    await prisma.user.upsert({
      where: { email: observer.email },
      update: {
        name: observer.name,
        organization: observer.organization,
        role: Role.PILOT,
      },
      create: {
        name: observer.name,
        email: observer.email,
        organization: observer.organization,
        role: Role.PILOT,
        passwordHash,
      },
    });
    updated += 1;
  }

  console.log(`Pilotaccounts verwerkt: ${updated}`);
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
