import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('Testing database connection...');

    // Test by counting admins
    const adminCount = await prisma.admin.count();
    console.log(`Number of admins in database: ${adminCount}`);

    // Test by counting packages
    const packageCount = await prisma.package.count();
    console.log(`Number of packages in database: ${packageCount}`);

    // Test by counting clients
    const clientCount = await prisma.client.count();
    console.log(`Number of clients in database: ${clientCount}`);

    console.log('Database connection test successful!');
  } catch (error) {
    console.error('Database connection test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();