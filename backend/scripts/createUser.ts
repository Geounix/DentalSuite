import prisma from '../src/prisma';
import { hash } from '../src/utils/hash';

async function main(){
  const [, , email, name, password = 'changeme', role = 'staff'] = process.argv;
  if (!email || !name) {
    console.log('Usage: npx ts-node-dev scripts/createUser.ts <email> <name> [password] [role]');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('User already exists:', email);
    process.exit(0);
  }

  const pwd = await hash(password);
  const user = await prisma.user.create({ data: { name, email, password: pwd, role } });
  console.log('created user:', { id: user.id, email: user.email, role: user.role });
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
