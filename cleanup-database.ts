/**
 * Database Cleanup Script
 * - Removes all companies and admins except SUPER_ADMIN
 * - Clears dashboard data (clients, packages, payments, complaints, etc.)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting database cleanup...\n');

  try {
    await prisma.$connect();
    console.log('✅ Database connected\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // Find superadmin to preserve
  const superadmin = await prisma.admin.findUnique({
    where: { email: 'superadmin@isp.com' }
  });

  if (!superadmin) {
    console.log('⚠️  SUPER_ADMIN not found! Aborting cleanup.');
    console.log('   Run: npx tsx seed-saas.ts to create superadmin first.');
    return;
  }

  console.log(`✅ Preserving SUPER_ADMIN: ${superadmin.name} (${superadmin.email})\n`);

  // Count data before cleanup
  const beforeCounts = {
    companies: await prisma.company.count(),
    admins: await prisma.admin.count(),
    clients: await prisma.client.count(),
    packages: await prisma.package.count(),
    payments: await prisma.payment.count(),
    expenses: await prisma.expense.count(),
    complaints: await prisma.complaint.count(),
    inventoryItems: await prisma.inventoryItem.count(),
    employees: await prisma.employee.count(),
    invoices: await prisma.invoice.count(),
    subscriptions: await prisma.subscription.count(),
    serviceProviders: await prisma.serviceProvider.count(),
  };

  console.log('📊 Data BEFORE cleanup:');
  Object.entries(beforeCounts).forEach(([key, count]) => {
    console.log(`   - ${key}: ${count}`);
  });
  console.log('');

  console.log('🗑️  Deleting dashboard data...\n');

  // Delete in order to respect foreign key constraints
  // 1. Delete subscriptions
  const deletedSubscriptions = await prisma.subscription.deleteMany({});
  console.log(`   ✅ Deleted ${deletedSubscriptions.count} subscriptions`);

  // 2. Delete invoices
  const deletedInvoices = await prisma.invoice.deleteMany({});
  console.log(`   ✅ Deleted ${deletedInvoices.count} invoices`);

  // 3. Delete payments
  const deletedPayments = await prisma.payment.deleteMany({});
  console.log(`   ✅ Deleted ${deletedPayments.count} payments`);

  // 4. Delete expenses
  const deletedExpenses = await prisma.expense.deleteMany({});
  console.log(`   ✅ Deleted ${deletedExpenses.count} expenses`);

  // 5. Delete complaints
  const deletedComplaints = await prisma.complaint.deleteMany({});
  console.log(`   ✅ Deleted ${deletedComplaints.count} complaints`);

  // 6. Delete inventory transactions first, then inventory items
  const deletedInventoryTx = await prisma.inventoryTransaction.deleteMany({});
  console.log(`   ✅ Deleted ${deletedInventoryTx.count} inventory transactions`);

  const deletedInventoryItems = await prisma.inventoryItem.deleteMany({});
  console.log(`   ✅ Deleted ${deletedInventoryItems.count} inventory items`);

  // 7. Delete employees
  const deletedEmployees = await prisma.employee.deleteMany({});
  console.log(`   ✅ Deleted ${deletedEmployees.count} employees`);

  // 8. Delete clients
  const deletedClients = await prisma.client.deleteMany({});
  console.log(`   ✅ Deleted ${deletedClients.count} clients`);

  // 9. Delete packages
  const deletedPackages = await prisma.package.deleteMany({});
  console.log(`   ✅ Deleted ${deletedPackages.count} packages`);

  // 10. Delete service providers
  const deletedServiceProviders = await prisma.serviceProvider.deleteMany({});
  console.log(`   ✅ Deleted ${deletedServiceProviders.count} service providers`);

  // 11. Delete areas
  const deletedAreas = await prisma.area.deleteMany({});
  console.log(`   ✅ Deleted ${deletedAreas.count} areas`);

  // 12. Delete audit logs (foreign key constraint from admins)
  const deletedAuditLogs = await prisma.auditLog.deleteMany({});
  console.log(`   ✅ Deleted ${deletedAuditLogs.count} audit logs`);

  // 12b. Delete refresh tokens (foreign key constraint from admins)
  const deletedRefreshTokens = await prisma.refreshToken.deleteMany({});
  console.log(`   ✅ Deleted ${deletedRefreshTokens.count} refresh tokens`);

  // 12c. Delete sessions (foreign key constraint from admins)
  const deletedSessions = await prisma.session.deleteMany({});
  console.log(`   ✅ Deleted ${deletedSessions.count} sessions`);

  // 12d. Delete account transactions and ledgers (foreign key from companies)
  const deletedAccountTx = await prisma.accountTransaction.deleteMany({});
  console.log(`   ✅ Deleted ${deletedAccountTx.count} account transactions`);

  const deletedLedgers = await prisma.accountLedger.deleteMany({});
  console.log(`   ✅ Deleted ${deletedLedgers.count} account ledgers`);

  // 13. Delete admins except superadmin
  const deletedAdmins = await prisma.admin.deleteMany({
    where: {
      id: { not: superadmin.id }
    }
  });
  console.log(`   ✅ Deleted ${deletedAdmins.count} admins (kept superadmin)`);

  // 14. Delete companies (delete the company linked to superadmin last, or use raw SQL)
  // First delete all companies except the one superadmin belongs to
  const otherCompanies = await prisma.company.deleteMany({
    where: {
      id: { not: superadmin.companyId || '' }
    }
  });
  console.log(`   ✅ Deleted ${otherCompanies.count} other companies`);

  // 15. Delete companies (this will fail if superadmin still references one)
  // For now, we keep the company that superadmin is linked to
  console.log(`   ⚠️  Kept company linked to superadmin (required by schema)`);

  // If you want to delete ALL companies, first create a dummy company, 
  // update superadmin to reference it, then delete others

  // Count data after cleanup
  const afterCounts = {
    companies: await prisma.company.count(),
    admins: await prisma.admin.count(),
    clients: await prisma.client.count(),
    packages: await prisma.package.count(),
    payments: await prisma.payment.count(),
    expenses: await prisma.expense.count(),
    complaints: await prisma.complaint.count(),
    inventoryItems: await prisma.inventoryItem.count(),
    employees: await prisma.employee.count(),
    invoices: await prisma.invoice.count(),
    subscriptions: await prisma.subscription.count(),
    serviceProviders: await prisma.serviceProvider.count(),
  };

  console.log('\n📊 Data AFTER cleanup:');
  Object.entries(afterCounts).forEach(([key, count]) => {
    console.log(`   - ${key}: ${count}`);
  });

  console.log('\n✅ Database cleanup completed successfully!');
  console.log(`   - Preserved: SUPER_ADMIN (${superadmin.name})`);
  console.log(`   - Removed: ${Object.entries(beforeCounts).reduce((sum, [, c]) => sum + c, 0)} total records`);
}

main()
  .catch((error) => {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
