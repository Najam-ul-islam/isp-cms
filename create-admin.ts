/**
 * Script to create admin accounts
 * Usage: npx tsx create-admin.ts
 */

import { PrismaClient } from '@prisma/client';
import { hashPassword } from './lib/auth';

const prisma = new PrismaClient();

// Admin accounts to create
const ADMINS_TO_CREATE = [
  {
    name: 'Administrator',
    email: 'admin@isp.com',
    password: 'admin@123',
    role: 'ADMIN' as const,
  },
  {
    name: 'SNS Administrator',
    email: 'admin@sns.net.pk',
    password: 'admin@sns@123',
    role: 'ADMIN' as const,
  },
];

async function main() {
  console.log('🔧 Creating admin accounts...\n');

  try {
    await prisma.$connect();
    console.log('✅ Database connected\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // Find or create default company
  let company = await prisma.company.findFirst({
    where: { name: 'ISP CMS' }
  });

  if (!company) {
    console.log('📦 Creating default company...');
    company = await prisma.company.create({
      data: {
        name: 'ISP CMS',
        isActive: true
      }
    });
    console.log(`✅ Company created: ${company.name} (ID: ${company.id})\n`);
  } else {
    console.log(`✅ Using existing company: ${company.name} (ID: ${company.id})\n`);
  }

  // Process each admin account
  for (const adminConfig of ADMINS_TO_CREATE) {
    console.log(`\n🔍 Checking admin: ${adminConfig.email}`);
    
    const existingAdmin = await prisma.admin.findUnique({
      where: { email: adminConfig.email }
    });

    if (existingAdmin) {
      console.log(`✅ Admin already exists: ${existingAdmin.name}`);
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Role: ${existingAdmin.role}`);
      
      // Verify password
      const { verifyPassword } = await import('./lib/auth');
      const isValid = await verifyPassword(adminConfig.password, existingAdmin.password);
      
      if (isValid) {
        console.log('✅ Password verification: VALID\n');
      } else {
        console.log('❌ Password verification: INVALID - Resetting password...\n');
        const hashedPassword = await hashPassword(adminConfig.password);
        await prisma.admin.update({
          where: { id: existingAdmin.id },
          data: { password: hashedPassword }
        });
        console.log('✅ Password reset successful!\n');
      }
      continue;
    }

    // Create new admin
    console.log(`⚠️  Admin not found. Creating: ${adminConfig.email}`);
    const hashedPassword = await hashPassword(adminConfig.password);

    const admin = await prisma.admin.create({
      data: {
        name: adminConfig.name,
        email: adminConfig.email,
        password: hashedPassword,
        role: adminConfig.role,
        companyId: company.id
      }
    });

    console.log(`✅ Admin created: ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}\n`);
  }

  // Summary
  console.log('\n🎉 Setup Complete!');
  console.log('🔐 Login Credentials:');
  for (const adminConfig of ADMINS_TO_CREATE) {
    console.log(`   • ${adminConfig.email} / ${adminConfig.password}`);
  }
  console.log('');

  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });




// /**
//  * Script to create admin account
//  * Usage: npx tsx create-admin.ts
//  */

// import { PrismaClient } from '@prisma/client';
// import { hashPassword } from './lib/auth';

// const prisma = new PrismaClient();

// async function main() {
//   console.log('🔧 Creating admin account...\n');

//   try {
//     await prisma.$connect();
//     console.log('✅ Database connected\n');
//   } catch (error) {
//     console.error('❌ Database connection failed:', error);
//     process.exit(1);
//   }

//   // Check if admin already exists
//   const existingAdmin = await prisma.admin.findUnique({
//     where: { 
//       email: 'admin@isp.com'
//      }
//   });

//   if (existingAdmin) {
//     console.log('✅ Admin already exists!');
//     console.log(`   Name: ${existingAdmin.name}`);
//     console.log(`   Email: ${existingAdmin.email}`);
//     console.log(`   Role: ${existingAdmin.role}`);
//     console.log('\n🔐 Login credentials:');
//     console.log('   Email: admin@isp.com');
//     console.log('   Password: admin@123\n');
    
//     // Verify the password works
//     const { verifyPassword } = await import('./lib/auth');
//     const isValid = await verifyPassword('admin@123', existingAdmin.password);
//     if (isValid) {
//       console.log('✅ Password verification: VALID\n');
//     } else {
//       console.log('❌ Password verification: INVALID - Password needs reset\n');
//       console.log('Running password reset...\n');
      
//       const newPassword = 'admin@123';
//       const hashedPassword = await hashPassword(newPassword);
      
//       await prisma.admin.update({
//         where: { id: existingAdmin.id },
//         data: { password: hashedPassword }
//       });
      
//       console.log('✅ Password reset successful!\n');
//     }
    
//     await prisma.$disconnect();
//     return;
//   }

//   console.log('⚠️  Admin not found. Creating...\n');

//   // Find or create a company
//   let company = await prisma.company.findFirst({
//     where: { name: 'ISP CMS' }
//   });

//   if (!company) {
//     console.log('📦 Creating default company...');
//     company = await prisma.company.create({
//       data: {
//         name: 'ISP CMS',
//         isActive: true
//       }
//     });
//     console.log(`✅ Company created: ${company.name} (ID: ${company.id})\n`);
//   } else {
//     console.log(`✅ Using existing company: ${company.name} (ID: ${company.id})\n`);
//   }

//   // Create the admin
//   console.log('👤 Creating Admin user...');
//   const hashedPassword = await hashPassword('admin@123');

//   const admin = await prisma.admin.create({
//     data: {
//       name: 'Administrator',
//       email: 'admin@isp.com',
//       password: hashedPassword,
//       role: 'ADMIN',
//       companyId: company.id
//     }
//   });

//   console.log('✅ Admin created successfully!\n');
//   console.log('🔐 Login Credentials:');
//   console.log('   Email: admin@isp.com');
//   console.log('   Password: admin@123\n');

//   await prisma.$disconnect();
// }

// main()
//   .catch((error) => {
//     console.error('❌ Error:', error);
//     process.exit(1);
//   });
