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

if (process.env.VERCEL_ENV === "production") {
  console.log("Productiedeployment: goedgekeurde Prisma-migraties worden toegepast.");
  runNpmScript("db:migrate");
} else {
  console.log("Preview/lokale build: database-migratie wordt veilig overgeslagen.");
}

runNpmScript("build");
