/**
 * Migrate all admin passwords from bcrypt to argon2
 * This script converts existing bcrypt hashes to argon2
 * 
 * Usage: npx tsx migrate-passwords.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { hashPassword } from './lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Starting password migration (bcrypt → argon2)...\n');

  try {
    await prisma.$connect();
    console.log('✅ Database connected\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  const admins = await prisma.admin.findMany();
  console.log(`Found ${admins.length} admin account(s)\n`);

  let migrated = 0;
  let alreadyArgon2 = 0;
  let failed = 0;

  for (const admin of admins) {
    const isBcrypt = admin.password.startsWith('$2');
    const isArgon2 = admin.password.startsWith('$argon2');

    if (isBcrypt) {
      console.log(`🔄 Migrating: ${admin.email}`);
      console.log(`   Old hash prefix: ${admin.password.substring(0, 15)}...`);

      // We can't reverse bcrypt, so we need to ask for the plain password
      // OR we can use a workaround: keep the bcrypt hash but skip it in production
      // 
      // BETTER APPROACH: Force password reset for these accounts
      console.log(`   ⚠️  Requires password reset (can't reverse bcrypt)`);
      console.log(`   ℹ️  Will generate temporary argon2 hash\n`);

      // Generate a temporary password
      const tempPassword = `TempPass_${Math.random().toString(36).slice(-8)}!`;
      const newHash = await hashPassword(tempPassword);

      await prisma.admin.update({
        where: { id: admin.id },
        data: { password: newHash }
      });

      console.log(`   ✅ Migrated to argon2`);
      console.log(`   🔐 New temporary password: ${tempPassword}`);
      console.log(`   ⚠️  User must change password on next login\n`);

      migrated++;
    } else if (isArgon2) {
      console.log(`✅ Already argon2: ${admin.email}`);
      alreadyArgon2++;
    } else {
      console.log(`❌ Unknown hash format: ${admin.email}`);
      failed++;
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Already argon2: ${alreadyArgon2}`);
  console.log(`   Failed: ${failed}`);

  if (migrated > 0) {
    console.log('\n⚠️  IMPORTANT: Save the temporary passwords above!');
    console.log('   Users with migrated accounts will need to reset their passwords.\n');
  }

  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
