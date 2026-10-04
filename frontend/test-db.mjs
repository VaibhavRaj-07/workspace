import { PrismaClient } from '../algo bknd/node_modules/@prisma/client/index.js';

const passwords = ['postgrespassword', 'postgres', 'admin', 'root', '123456', 'password', '1234', 'test', 'master', 'HP', 'hp', 'postgresql'];
const users = ['postgres', 'postgrespassword', 'root', 'admin'];

async function run() {
  for (const u of users) {
    for (const p of passwords) {
      const url = `postgresql://${u}:${p}@localhost:5432/algo_workspace?schema=public`;
      const prisma = new PrismaClient({ datasources: { db: { url } } });
      try {
        await prisma.$queryRaw`SELECT 1`;
        console.log(`\n========================================\n>>> SUCCESS! Connected as user="${u}", password="${p}"\n========================================\n`);
        await prisma.$disconnect();
        process.exit(0);
      } catch (err) {
        console.log(`Failed user="${u}", pass="${p}": ${err.message?.split('\n')[0]}`);
        await prisma.$disconnect();
      }
    }
  }
  console.log('\nCould not connect with common passwords. Trying postgres database instead of algo_workspace...');
  for (const u of users) {
    for (const p of passwords) {
      const url = `postgresql://${u}:${p}@localhost:5432/postgres?schema=public`;
      const prisma = new PrismaClient({ datasources: { db: { url } } });
      try {
        await prisma.$queryRaw`SELECT 1`;
        console.log(`\n========================================\n>>> SUCCESS on DB "postgres"! User="${u}", password="${p}"\n========================================\n`);
        await prisma.$disconnect();
        process.exit(0);
      } catch (err) {
        await prisma.$disconnect();
      }
    }
  }
  process.exit(1);
}

run();
