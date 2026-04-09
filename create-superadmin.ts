/**
 * Script to create superadmin if it doesn't exist
 * Usage: npx tsx create-superadmin.ts
 */

import { PrismaClient } from '@prisma/client';
import { hashPassword } from './lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Setting up SuperAdmin account...\n');

  try {
    await prisma.$connect();
    console.log('✅ Database connected\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // Check if superadmin already exists
  const existingSuperAdmin = await prisma.admin.findUnique({
    where: { email: 'superadmin@isp.com' }
  });

  if (existingSuperAdmin) {
    console.log('✅ SuperAdmin already exists!');
    console.log(`   Name: ${existingSuperAdmin.name}`);
    console.log(`   Email: ${existingSuperAdmin.email}`);
    console.log(`   Role: ${existingSuperAdmin.role}`);
    console.log(`   Company ID: ${existingSuperAdmin.companyId}`);
    console.log('\n🔐 Current credentials:');
    console.log('   Email: superadmin@isp.com');
    console.log('   Password: superadmin@123 (if not changed)\n');
    
    // Verify the password works
    const isValid = await require('./lib/auth').verifyPassword('superadmin@123', existingSuperAdmin.password);
    if (isValid) {
      console.log('✅ Password verification: VALID\n');
    } else {
      console.log('⚠️  Password "superadmin@123" is NOT valid\n');
      console.log('To reset password, run:');
      console.log('   npx tsx reset-admin-password.ts\n');
    }
    
    await prisma.$disconnect();
    return;
  }

  console.log('⚠️  SuperAdmin not found. Creating...\n');

  // Find or create the SaaS company
  let company = await prisma.company.findFirst({
    where: { name: 'ISP CMS SaaS' }
  });

  if (!company) {
    console.log('📦 Creating default company...');
    company = await prisma.company.create({
      data: {
        name: 'ISP CMS SaaS',
        isActive: true
      }
    });
    console.log(`✅ Company created: ${company.name} (ID: ${company.id})\n`);
  } else {
    console.log(`✅ Using existing company: ${company.name} (ID: ${company.id})\n`);
  }

  // Create the superadmin
  console.log('👤 Creating SuperAdmin user...');
  const hashedPassword = await hashPassword('superadmin@123');
  
  const superAdmin = await prisma.admin.create({
    data: {
      name: 'Super Administrator',
      email: 'superadmin@isp.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      companyId: company.id
    }
  });

  console.log('✅ SuperAdmin created successfully!\n');
  console.log('🔐 Login Credentials:');
  console.log('   Email: superadmin@isp.com');
  console.log('   Password: superadmin@123\n');
  console.log('⚠️  Please change the password after first login!\n');

  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
