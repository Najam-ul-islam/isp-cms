/**
 * Script to delete all invoices from the database
 * WARNING: This is a destructive operation!
 */

import { prisma } from './lib/prisma';

async function deleteAllInvoices() {
  console.log('⚠️  WARNING: This will delete ALL invoices from the database!');
  console.log('⚠️  This action CANNOT be undone!\n');

  try {
    // Step 1: Count existing invoices
    const invoiceCount = await prisma.invoice.count();
    console.log(`📊 Found ${invoiceCount} invoices in the database\n`);

    if (invoiceCount === 0) {
      console.log('✅ No invoices to delete. Database is clean.');
      return;
    }

    // Step 2: Delete all payments (they reference invoices)
    console.log('🗑️  Step 1: Deleting all payments...');
    const deletedPayments = await prisma.payment.deleteMany({});
    console.log(`   ✅ Deleted ${deletedPayments.count} payments\n`);

    // Step 3: Delete all invoices
    console.log('🗑️  Step 2: Deleting all invoices...');
    const deletedInvoices = await prisma.invoice.deleteMany({});
    console.log(`   ✅ Deleted ${deletedInvoices.count} invoices\n`);

    // Step 4: Verify deletion
    const remainingInvoices = await prisma.invoice.count();
    const remainingPayments = await prisma.payment.count();
    
    console.log('✅ All invoices deleted successfully!');
    console.log(`   Remaining invoices: ${remainingInvoices}`);
    console.log(`   Remaining payments: ${remainingPayments}\n`);

  } catch (error) {
    console.error('❌ Error deleting invoices:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
deleteAllInvoices()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
