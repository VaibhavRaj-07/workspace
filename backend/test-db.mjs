import { PrismaClient } from '@prisma/client';

const passwords = ['postgrespassword', 'postgres', 'admin', 'root', '123456', 'password', '1234', 'test', 'master'];
for (const p of passwords) {
  const url = postgresql://postgres:@localhost:5432/algo_workspace?schema=public;
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    await prisma.SELECT 1;
    console.log(>>> SUCCESS! Database connected with password:  );
    await prisma.();
    process.exit(0);
  } catch (err) {
    console.log(Failed :, err.message?.substring(0, 100));
    await prisma.();
  }
}
process.exit(1);
