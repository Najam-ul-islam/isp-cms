/**
 * Verify SuperAdmin account
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { prisma } from './lib/prisma';
import { verifyPassword } from './lib/auth';

(async () => {
  console.log('🔍 Verifying SuperAdmin account...\n');

  try {
    await prisma.$connect();

    const superAdmin = await prisma.admin.findUnique({
      where: { email: 'superadmin@isp.com' }
    });

    if (!superAdmin) {
      console.log('❌ SuperAdmin not found in database');
      console.log('\n💡 Run: npx tsx create-superadmin.ts');
      await prisma.$disconnect();
      process.exit(1);
    }

    console.log('✅ SuperAdmin found:');
    console.log('   ID:', superAdmin.id);
    console.log('   Name:', superAdmin.name);
    console.log('   Email:', superAdmin.email);
    console.log('   Role:', superAdmin.role);
    console.log('   Company ID:', superAdmin.companyId);
    console.log('   Hash prefix:', superAdmin.password.substring(0, 20) + '...');
    console.log('');

    // Test password
    const testPassword = 'superadmin@123';
    const isValid = await verifyPassword(testPassword, superAdmin.password);
    
    console.log('🔐 Password test (superadmin@123):', isValid ? '✅ VALID' : '❌ INVALID');
    
    if (!isValid) {
      console.log('\n⚠️  Password verification failed!');
      console.log('\n💡 To fix this, run the script with a custom password:');
      console.log('   SUPERADMIN_PASSWORD="yourpassword" npx tsx create-superadmin.ts');
      console.log('\nOr delete and recreate:');
      console.log('   1. Delete current account from database');
      console.log('   2. Run: npx tsx create-superadmin.ts');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
