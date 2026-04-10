/**
 * Quick check - what admins exist in the database?
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { prisma } from './lib/prisma';

(async () => {
  console.log('🔍 Checking database for admin accounts...\n');

  try {
    await prisma.$connect();

    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${admins.length} admin(s):\n`);

    if (admins.length === 0) {
      console.log('❌ No admins found in database!');
      console.log('\n💡 Run: npx tsx create-superadmin.ts');
    } else {
      admins.forEach((admin, i) => {
        console.log(`${i + 1}. ${admin.name} (${admin.role})`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   ID: ${admin.id}`);
        console.log(`   Created: ${admin.createdAt}\n`);
      });
    }

    // Also check database URL
    const dbUrl = process.env.DATABASE_URL || 'Not set';
    console.log('📊 Database URL:', dbUrl.split('?')[0]);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
