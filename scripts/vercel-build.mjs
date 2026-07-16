import { spawnSync } from "node:child_process";

function runNpmScript(script) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npm, ["run", script], {
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function adminResetRequested() {
  const emailConfigured = Boolean(process.env.ADMIN_RESET_EMAIL?.trim());
  const passwordConfigured = Boolean(process.env.ADMIN_RESET_PASSWORD?.trim());

  if (emailConfigured !== passwordConfigured) {
    console.error("Adminreset is incompleet: stel ADMIN_RESET_EMAIL en ADMIN_RESET_PASSWORD allebei in of verwijder ze allebei.");
    process.exit(1);
  }

  return emailConfigured && passwordConfigured;
}

if (process.env.VERCEL_ENV === "production") {
  console.log("Productiedeployment: goedgekeurde Prisma-migraties worden toegepast.");
  runNpmScript("db:migrate");

  if (adminResetRequested()) {
    console.log("Tijdelijke adminreset aangevraagd: het bestaande ADMIN-account wordt veilig bijgewerkt.");
    runNpmScript("admin:reset");
  }
} else {
  console.log("Preview/lokale build: database-migratie en adminreset worden veilig overgeslagen.");
}

runNpmScript("build");
