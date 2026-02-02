import prisma from '../src/prisma';
import { hash } from '../src/utils/hash';

async function main(){
  const pwd = await hash('admin123');
  const existing = await prisma.user.findUnique({ where: { email: 'admin@dentacare.com' } });
  if (!existing) {
    await prisma.user.create({ data: { name: 'Admin', email: 'admin@dentacare.com', password: pwd, role: 'admin' } });
    console.log('admin created');
  } else {
    console.log('admin already exists');
  }
  process.exit(0);
}
main();
