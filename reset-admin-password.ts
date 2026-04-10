/**
 * Script to reset admin password
 * Usage: npx tsx reset-admin-password.ts
 */

import { PrismaClient } from '@prisma/client';
import { hashPassword } from './lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Resetting admin password...\n');

  try {
    await prisma.$connect();
    console.log('✅ Database connected\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // Find admin
  const admin = await prisma.admin.findUnique({
    where: { email: 'admin@isp.com' }
  });

  if (!admin) {
    console.log('❌ Admin with email admin@isp.com not found');
    await prisma.$disconnect();
    return;
  }

  console.log('✅ Admin found:');
  console.log('   Name:', admin.name);
  console.log('   Email:', admin.email);
  console.log('   Current hash prefix:', admin.password.substring(0, 20));

  // Reset password
  const newPassword = 'admin@123';
  console.log('\n🔐 Resetting password to: admin@123');
  
  const hashedPassword = await hashPassword(newPassword);
  console.log('✅ New hash prefix:', hashedPassword.substring(0, 20));

  await prisma.admin.update({
    where: { id: admin.id },
    data: { password: hashedPassword }
  });

  console.log('\n✅ Password reset successful!');
  console.log('\n🔐 New login credentials:');
  console.log('   Email: admin@isp.com');
  console.log('   Password: admin@123\n');

  // Verify the new password works
  const { verifyPassword } = await import('./lib/auth');
  const isValid = await verifyPassword(newPassword, hashedPassword);
  
  if (isValid) {
    console.log('✅ Password verification: VALID\n');
  } else {
    console.log('❌ Password verification: INVALID - Something went wrong!\n');
  }

  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
