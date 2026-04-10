/**
 * Quick diagnostic to check admin account and password
 */

import { prisma } from './lib/prisma';
import { verifyPassword } from './lib/auth';

(async () => {
  console.log('🔍 Checking admin accounts...\n');

  try {
    await prisma.$connect();

    const admins = await prisma.admin.findMany({
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${admins.length} admin account(s):\n`);

    for (const admin of admins) {
      console.log(`Admin: ${admin.name}`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  Role: ${admin.role}`);
      console.log(`  Hash prefix: ${admin.password.substring(0, 20)}`);
      console.log(`  Created: ${admin.createdAt}`);
      
      // Test common passwords
      const testPasswords = ['admin@123', 'password', 'admin'];
      for (const testPwd of testPasswords) {
        const isValid = await verifyPassword(testPwd, admin.password);
        if (isValid) {
          console.log(`  ✅ Valid password: "${testPwd}"`);
        }
      }
      console.log('');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
