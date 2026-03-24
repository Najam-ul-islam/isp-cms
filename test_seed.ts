// # Create a seed script: seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();

async function main() {
  // Hash the password
  const hashedPassword = await bcrypt.hash('admin@123', 10);

  // Create default admin
  await prisma.admin.upsert({
    where: { email: 'admin@isp.com' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@isp.com',
      password: hashedPassword, // Hashed password
      role: 'ADMIN',
    },
  });

  // Create common areas
  const areas = ['Downtown', 'North Zone', 'South Zone', 'Industrial'];
  for (const name of areas) {
    await prisma.area.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} service area` },
    });
  }

  console.log('✅ Database seeded!');
}
main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());