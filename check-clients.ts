/**
 * Diagnostic: Check why a client isn't showing in the UI
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking clients and companies...\n');

  try {
    await prisma.$connect();
    console.log('✅ Database connected\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // 1. List all admins with their company IDs
  const admins = await prisma.admin.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      companyId: true,
    }
  });

  console.log('👥 Admins:');
  admins.forEach(admin => {
    console.log(`   - ${admin.name} (${admin.email}) - Role: ${admin.role} - CompanyId: ${admin.companyId}`);
  });
  console.log('');

  // 2. List all companies
  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      isActive: true,
    }
  });

  console.log('🏢 Companies:');
  companies.forEach(company => {
    console.log(`   - ${company.name} (ID: ${company.id}) - Active: ${company.isActive}`);
  });
  console.log('');

  // 3. List all clients with their company assignments
  const clients = await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      phone: true,
      companyId: true,
      status: true,
      price: true,
      packageId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`👤 Clients (${clients.length} total):`);
  clients.forEach(client => {
    const matchedCompany = companies.find(c => c.id === client.companyId);
    const companyMatch = matchedCompany ? `✅ ${matchedCompany.name}` : '❌ NO MATCH';
    console.log(`   - ${client.name} (${client.phone})`);
    console.log(`     ID: ${client.id}`);
    console.log(`     CompanyId: ${client.companyId} (${companyMatch})`);
    console.log(`     Status: ${client.status} | Price: Rs. ${client.price}`);
    console.log(`     Created: ${client.createdAt.toLocaleString()}`);
    console.log('');
  });

  // 4. Check for mismatched companyIds
  const superadmin = admins.find(a => a.role === 'SUPER_ADMIN');
  if (superadmin) {
    console.log('📊 Analysis:');
    console.log(`   Superadmin CompanyId: ${superadmin.companyId}`);
    
    const clientsWithCorrectCompany = clients.filter(c => c.companyId === superadmin.companyId);
    const clientsWithWrongCompany = clients.filter(c => c.companyId !== superadmin.companyId);
    const clientsWithNoCompany = clients.filter(c => !c.companyId);

    console.log(`   Clients with correct companyId: ${clientsWithCorrectCompany.length}`);
    console.log(`   Clients with wrong companyId: ${clientsWithWrongCompany.length}`);
    console.log(`   Clients with no companyId: ${clientsWithNoCompany.length}`);

    if (clientsWithWrongCompany.length > 0) {
      console.log('\n⚠️  Clients with WRONG companyId:');
      clientsWithWrongCompany.forEach(client => {
        console.log(`   - ${client.name} (has: ${client.companyId}, needs: ${superadmin.companyId})`);
      });
    }

    if (clientsWithNoCompany.length > 0) {
      console.log('\n⚠️  Clients with NO companyId:');
      clientsWithNoCompany.forEach(client => {
        console.log(`   - ${client.name}`);
      });
    }

    // 5. Show fix commands
    if (clientsWithWrongCompany.length > 0 || clientsWithNoCompany.length > 0) {
      console.log('\n🔧 To fix, run this SQL in your database:');
      console.log(`   UPDATE clients SET companyId = '${superadmin.companyId}' WHERE companyId IS NULL OR companyId != '${superadmin.companyId}';`);
    }
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
