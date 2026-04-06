/**
 * Quick diagnostic to check if superadmin exists in database
 */

import { PrismaClient } from '@prisma/client';
import { verifyPassword } from './lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking database for admin users...\n');

  // Check database connection
  try {
    await prisma.$connect();
    console.log('✅ Database connected\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // Count all admins
  const adminCount = await prisma.admin.count();
  console.log(`📊 Total admins in database: ${adminCount}\n`);

  if (adminCount === 0) {
    console.log('⚠️  NO ADMINS FOUND! You need to run the seed script:');
    console.log('   npx tsx seed-saas.ts\n');
    console.log('This will create:');
    console.log('   - SUPER_ADMIN: superadmin@isp.com');
    console.log('   - Password: superadmin@123\n');
    return;
  }

  // List all admins
  const admins = await prisma.admin.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      companyId: true,
      createdAt: true
    }
  });

  console.log('👥 Admin users:');
  admins.forEach(admin => {
    console.log(`   - ${admin.name} (${admin.email}) - Role: ${admin.role}`);
  });
  console.log('');

  // Specifically check for superadmin
  const superadmin = await prisma.admin.findUnique({
    where: { email: 'superadmin@isp.com' }
  });

  if (superadmin) {
    console.log('✅ SUPER_ADMIN found: superadmin@isp.com');
    console.log(`   Name: ${superadmin.name}`);
    console.log(`   Role: ${superadmin.role}`);
    console.log(`   Company ID: ${superadmin.companyId}`);
    console.log(`   Password hash starts with: ${superadmin.password.substring(0, 20)}...`);
    console.log('\n🔐 Testing password verification...');
    
    // Test the expected password
    const isValid = await verifyPassword('superadmin@123', superadmin.password);
    console.log(`   Password "superadmin@123" valid: ${isValid ? '✅ YES' : '❌ NO'}`);
    
    if (!isValid) {
      console.log('\n⚠️  PASSWORD MISMATCH! The stored password is not "superadmin@123"');
      console.log('   You may need to re-seed or reset the password.');
    }
  } else {
    console.log('❌ SUPER_ADMIN not found for email: superadmin@isp.com');
    console.log('   Run seed script to create it: npx tsx seed-saas.ts');
  }

  console.log('');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
