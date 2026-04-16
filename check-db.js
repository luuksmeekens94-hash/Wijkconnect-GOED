const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const count = await p.socialResource.count();
  console.log('Total resources:', count);
  const resources = await p.socialResource.findMany({ select: { name: true, type: true }, orderBy: { name: 'asc' } });
  resources.forEach(r => console.log(`  ${r.type} - ${r.name}`));
}

main().then(() => p.$disconnect()).catch(e => { console.error(e); p.$disconnect(); });
