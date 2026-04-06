/**
 * SaaS Admin Dashboard - Seed Script
 * 
 * This script creates:
 * 1. A SUPER_ADMIN account for managing the entire platform
 * 2. Sample companies for testing
 * 3. Sample admins for each company
 * 4. Test data for dashboard visualization
 * 
 * Usage: npx tsx seed-saas.ts
 */

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting SaaS Admin Dashboard seed...\n');

  // ==========================================
  // 1. Create SUPER_ADMIN
  // ==========================================
  console.log('👤 Creating SUPER_ADMIN account...');
  
  const superAdminPassword = await bcrypt.hash('superadmin@123', 12);
  
  // Create a default company for the super admin
  let saasCompany = await prisma.company.findFirst({
    where: { name: 'SaaS Platform' }
  });

  if (!saasCompany) {
    saasCompany = await prisma.company.create({
      data: {
        name: 'SaaS Platform',
        isActive: true,
        modulesEnabled: {
          billing: true,
          inventory: true,
          employees: true
        }
      }
    });
    console.log('   ✅ Created company: SaaS Platform');
  } else {
    console.log('   ⏭️  Company "SaaS Platform" already exists');
  }

  // Create SUPER_ADMIN
  const superAdmin = await prisma.admin.upsert({
    where: { email: 'superadmin@isp.com' },
    update: {},
    create: {
      name: 'Platform Administrator',
      email: 'superadmin@isp.com',
      password: superAdminPassword,
      role: Role.SUPER_ADMIN,
      companyId: saasCompany.id
    }
  });
  console.log('   ✅ Created SUPER_ADMIN: superadmin@isp.com\n');

  // ==========================================
  // 2. Create Sample Companies
  // ==========================================
  console.log('🏢 Creating sample companies...');
  
  const companiesData = [
    {
      name: 'FastNet ISP',
      modulesEnabled: { billing: true, inventory: true, employees: true }
    },
    {
      name: 'ConnectPro Solutions',
      modulesEnabled: { billing: true, inventory: false, employees: true }
    },
    {
      name: 'NetZone Communications',
      modulesEnabled: { billing: true, inventory: true, employees: false }
    }
  ];

  const createdCompanies = [];

  for (const companyData of companiesData) {
    let company = await prisma.company.findFirst({
      where: { name: companyData.name }
    });

    if (!company) {
      company = await prisma.company.create({
        data: {
          name: companyData.name,
          isActive: true,
          modulesEnabled: companyData.modulesEnabled
        }
      });
      console.log(`   ✅ Created company: ${company.name}`);
    } else {
      console.log(`   ⏭️  Company "${company.name}" already exists`);
    }
    createdCompanies.push(company);
  }
  console.log('');

  // ==========================================
  // 3. Create Company Admins
  // ==========================================
  console.log('👥 Creating company admins...');
  
  const adminsData = [
    {
      name: 'FastNet Admin',
      email: 'admin@fastnet.com',
      role: Role.ADMIN,
      companyId: createdCompanies[0].id
    },
    {
      name: 'ConnectPro Admin',
      email: 'admin@connectpro.com',
      role: Role.ADMIN,
      companyId: createdCompanies[1].id
    },
    {
      name: 'NetZone Admin',
      email: 'admin@netzone.com',
      role: Role.ADMIN,
      companyId: createdCompanies[2].id
    }
  ];

  const adminPassword = await bcrypt.hash('admin@123', 12);

  for (const adminData of adminsData) {
    const admin = await prisma.admin.upsert({
      where: { email: adminData.email },
      update: {},
      create: {
        name: adminData.name,
        email: adminData.email,
        password: adminPassword,
        role: adminData.role,
        companyId: adminData.companyId
      }
    });
    console.log(`   ✅ Created admin: ${admin.email} (${admin.role})`);
  }
  console.log('');

  // ==========================================
  // 4. Create Sample Data for Dashboard
  // ==========================================
  console.log('📊 Creating sample dashboard data...');

  // Create packages for each company
  for (const company of createdCompanies) {
    // Create service provider
    let provider = await prisma.serviceProvider.findFirst({
      where: { name: `${company.name} Provider` }
    });

    if (!provider) {
      provider = await prisma.serviceProvider.create({
        data: {
          name: `${company.name} Provider`,
          contactInfo: `contact@${company.name.toLowerCase().replace(/\s+/g, '')}.com`,
          companyId: company.id
        }
      });
    }

    // Create packages
    const packages = [
      { name: `${company.name} - 10Mbps`, speed: 10, price: 1000 },
      { name: `${company.name} - 20Mbps`, speed: 20, price: 1800 },
      { name: `${company.name} - 50Mbps`, speed: 50, price: 3500 }
    ];

    for (const pkg of packages) {
      const existingPackage = await prisma.package.findFirst({
        where: { name: pkg.name }
      });

      if (!existingPackage) {
        await prisma.package.create({
          data: {
            name: pkg.name,
            speed: pkg.speed,
            price: pkg.price,
            durationDays: 30,
            description: `${pkg.speed}Mbps internet package`,
            isActive: true,
            createdBy: superAdmin.id,
            companyId: company.id,
            serviceProviderId: provider.id
          }
        });
        console.log(`   ✅ Created package: ${pkg.name}`);
      }
    }
  }
  console.log('');

  // ==========================================
  // 5. Summary
  // ==========================================
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ Database seeded successfully!\n');
  
  console.log('🔐 SUPER_ADMIN Credentials:');
  console.log('   Email:    superadmin@isp.com');
  console.log('   Password: superadmin@123');
  console.log('   Role:     SUPER_ADMIN\n');

  console.log('👥 Company Admin Credentials:');
  console.log('   Email:    admin@fastnet.com');
  console.log('   Email:    admin@connectpro.com');
  console.log('   Email:    admin@netzone.com');
  console.log('   Password: admin@123');
  console.log('   Role:     ADMIN\n');

  console.log('🚀 Next Steps:');
  console.log('   1. Start the dev server: npm run dev');
  console.log('   2. Navigate to: http://localhost:3000/login');
  console.log('   3. Login with SUPER_ADMIN credentials');
  console.log('   4. Access dashboard: http://localhost:3000/saas/dashboard');
  console.log('═══════════════════════════════════════════════════════\n');
}

main()
  .catch((error) => {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
