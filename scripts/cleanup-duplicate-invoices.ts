/**
 * Cleanup Duplicate Invoices Script
 * 
 * This script removes duplicate unpaid invoices for the same client,
 * keeping only the most recent unpaid invoice per client.
 * 
 * Usage: npx tsx scripts/cleanup-duplicate-invoices.ts
 */

import { prisma } from '@/lib/prisma';

async function cleanupDuplicateInvoices() {
  try {
    console.log('🧹 Starting duplicate invoice cleanup...\n');

    // Get all clients with invoices
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        companyId: true,
        _count: {
          select: {
            invoices: true
          }
        }
      }
    });

    let totalDuplicatesRemoved = 0;
    let clientsProcessed = 0;

    for (const client of clients) {
      // Get all unpaid invoices for this client
      const unpaidInvoices = await prisma.invoice.findMany({
        where: {
          clientId: client.id,
          status: 'unpaid'
        },
        orderBy: {
          issuedDate: 'desc'
        }
      });

      // If there's more than one unpaid invoice, remove duplicates
      if (unpaidInvoices.length > 1) {
        // Keep the most recent one (first in the list)
        const [keepInvoice, ...duplicates] = unpaidInvoices;

        console.log(`👤 Client: ${client.name} (${client.id})`);
        console.log(`   Keeping invoice: ${keepInvoice.id} (issued: ${keepInvoice.issuedDate.toISOString()})`);

        // Remove duplicate invoices
        for (const duplicate of duplicates) {
          console.log(`   ❌ Removing duplicate: ${duplicate.id} (issued: ${duplicate.issuedDate.toISOString()}, amount: ${duplicate.amount})`);
          
          // First, remove any payments associated with this duplicate invoice
          const paymentCount = await prisma.payment.count({
            where: { invoiceId: duplicate.id }
          });

          if (paymentCount > 0) {
            console.log(`   ⚠️  Warning: Removing ${paymentCount} payment(s) associated with this invoice`);
            await prisma.payment.deleteMany({
              where: { invoiceId: duplicate.id }
            });
          }

          // Delete the duplicate invoice
          await prisma.invoice.delete({
            where: { id: duplicate.id }
          });

          totalDuplicatesRemoved++;
        }

        clientsProcessed++;
        console.log('');
      }
    }

    console.log('\n✅ Cleanup completed!');
    console.log(`   Clients processed: ${clientsProcessed}`);
    console.log(`   Duplicate invoices removed: ${totalDuplicatesRemoved}`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupDuplicateInvoices()
  .then(() => {
    console.log('\n🎉 Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
