/**
 * Test Database Connection
 * 
 * Run: npx tsx test-db-connection.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  console.log('🔌 Testing database connection...\n');

  try {
    // Try to query the database
    const adminCount = await prisma.admin.count();
    const companyCount = await prisma.company.count();

    console.log('✅ Database connection successful!\n');
    console.log('📊 Current Data:');
    console.log(`   Admins: ${adminCount}`);
    console.log(`   Companies: ${companyCount}\n`);

    if (adminCount === 0) {
      console.log('⚠️  No admins found. Run: npm run seed:saas');
    }

  } catch (error: any) {
    console.error('❌ Database connection failed!\n');
    console.error('Error:', error.message);
    console.error('\n🔧 Solutions:');
    console.error('1. Check if Neon database is awake: https://console.neon.tech');
    console.error('2. Wait 15 seconds and try again');
    console.error('3. Check your DATABASE_URL in .env file');
    console.error('4. Consider using local PostgreSQL');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
