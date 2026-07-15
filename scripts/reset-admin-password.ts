import bcrypt from "bcryptjs";
import { Role, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function requiredValue(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} ontbreekt`);
  return value;
}

async function main() {
  const email = requiredValue("ADMIN_RESET_EMAIL").toLowerCase();
  const password = requiredValue("ADMIN_RESET_PASSWORD");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("ADMIN_RESET_EMAIL is geen geldig e-mailadres");
  if (password.length < 14 || password.length > 128) {
    throw new Error("ADMIN_RESET_PASSWORD moet tussen 14 en 128 tekens lang zijn");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });
  if (!user) throw new Error("Er bestaat geen gebruiker met dit e-mailadres");
  if (user.role !== Role.ADMIN) throw new Error("Alleen een bestaand ADMIN-account kan met dit script worden hersteld");

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, isActive: true },
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ADMIN_PASSWORD_RESET_CLI",
        entityType: "USER",
        entityId: user.id,
        details: { method: "one-time-script" },
      },
    }),
  ]);

  console.log("Adminwachtwoord is bijgewerkt. Verwijder nu direct de twee resetvariabelen.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Adminwachtwoord kon niet worden bijgewerkt");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
