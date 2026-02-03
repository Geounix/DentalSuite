import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('123456', 10)

  const user = await prisma.user.create({
    data: {
      name: 'Administrador',
      email: 'admin@dentalcare.com',
      password: passwordHash,
      role: 'Admin',
      status: 'active',
    },
  })

  console.log('Usuario creado:', user.email)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
