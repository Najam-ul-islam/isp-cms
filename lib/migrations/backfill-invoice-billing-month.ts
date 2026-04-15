import { prisma } from '@/lib/prisma';

/**
 * Backfill Script for Existing Invoices
 * 
 * This script populates the billingMonth field for existing invoices
 * that were created before the invoice history system was implemented.
 * 
 * Usage:
 *   npx tsx lib/migrations/backfill-invoice-billing-month.ts
 * 
 * What it does:
 * 1. Finds all invoices where billingMonth is null
 * 2. Extracts year/month from issuedDate
 * 3. Updates billingMonth to "YYYY-MM" format
 * 4. Links invoices to their previous invoice (chain building)
 * 
 * Safe to run multiple times - only updates null values.
 */

async function backfillBillingMonth() {
  console.log('=== Backfill Invoice Billing Month Started ===');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  try {
    // Step 1: Find invoices without billingMonth
    const invoicesWithoutBillingMonth = await prisma.invoice.findMany({
      where: {
        billingMonth: null
      },
      select: {
        id: true,
        clientId: true,
        companyId: true,
        issuedDate: true,
        amount: true
      },
      orderBy: {
        issuedDate: 'asc'
      }
    });

    console.log(`\nFound ${invoicesWithoutBillingMonth.length} invoices without billingMonth`);

    if (invoicesWithoutBillingMonth.length === 0) {
      console.log('✅ All invoices already have billingMonth populated');
      return;
    }

    // Step 2: Update billingMonth for each invoice
    let updated = 0;
    let errors = 0;

    for (const invoice of invoicesWithoutBillingMonth) {
      try {
        const year = invoice.issuedDate.getFullYear();
        const month = String(invoice.issuedDate.getMonth() + 1).padStart(2, '0');
        const billingMonth = `${year}-${month}`;

        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { billingMonth }
        });

        updated++;
        
        if (updated % 100 === 0) {
          console.log(`  Progress: ${updated}/${invoicesWithoutBillingMonth.length}`);
        }
      } catch (error: any) {
        errors++;
        console.error(`  ❌ Failed to update invoice ${invoice.id}:`, error.message);
      }
    }

    console.log(`\n✅ BillingMonth Backfill Complete:`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Errors: ${errors}`);

    // Step 3: Build invoice chains (link to previous invoice)
    console.log('\n=== Building Invoice Chains ===');
    
    const companies = await prisma.company.findMany({
      select: { id: true, name: true }
    });

    for (const company of companies) {
      console.log(`\nProcessing company: ${company.name}`);

      const clients = await prisma.client.findMany({
        where: { companyId: company.id },
        select: { id: true, name: true }
      });

      let chainsBuilt = 0;

      for (const client of clients) {
        // Get all invoices for this client ordered by date
        const clientInvoices = await prisma.invoice.findMany({
          where: { clientId: client.id },
          orderBy: { issuedDate: 'asc' },
          select: { id: true, previousInvoiceId: true }
        });

        if (clientInvoices.length <= 1) continue;

        // Link each invoice to the previous one
        for (let i = 1; i < clientInvoices.length; i++) {
          const currentInvoice = clientInvoices[i];
          const previousInvoice = clientInvoices[i - 1];

          // Only update if not already linked
          if (!currentInvoice.previousInvoiceId) {
            try {
              await prisma.invoice.update({
                where: { id: currentInvoice.id },
                data: { previousInvoiceId: previousInvoice.id }
              });
              chainsBuilt++;
            } catch (error: any) {
              console.error(`  Failed to link invoice ${currentInvoice.id}:`, error.message);
            }
          }
        }
      }

      console.log(`  Invoice chains built: ${chainsBuilt} links`);
    }

    console.log('\n=== Migration Complete ===');
    console.log('✅ All invoices now have billingMonth and are properly chained');

  } catch (error: any) {
    console.error('Fatal error in backfill script:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Dry run function - shows what would be updated without making changes
async function dryRun() {
  console.log('=== DRY RUN - No Changes Will Be Made ===\n');

  const invoicesWithoutBillingMonth = await prisma.invoice.findMany({
    where: { billingMonth: null },
    select: {
      id: true,
      clientId: true,
      issuedDate: true,
      amount: true
    },
    orderBy: { issuedDate: 'asc' },
    take: 20 // Limit to first 20 for preview
  });

  if (invoicesWithoutBillingMonth.length === 0) {
    console.log('✅ All invoices already have billingMonth populated');
    return;
  }

  console.log(`Found ${invoicesWithoutBillingMonth.length} invoices without billingMonth (showing first 20):\n`);

  for (const invoice of invoicesWithoutBillingMonth) {
    const year = invoice.issuedDate.getFullYear();
    const month = String(invoice.issuedDate.getMonth() + 1).padStart(2, '0');
    const billingMonth = `${year}-${month}`;

    console.log(`Invoice ${invoice.id.slice(-8)}`);
    console.log(`  Client: ${invoice.clientId.slice(-8)}`);
    console.log(`  Issued: ${invoice.issuedDate.toISOString().split('T')[0]}`);
    console.log(`  Amount: Rs. ${invoice.amount}`);
    console.log(`  Will set billingMonth to: ${billingMonth}`);
    console.log('');
  }
}

// Run if executed directly
const isMainModule = (() => {
  try {
    return require.main === module;
  } catch {
    return false;
  }
})();

if (isMainModule) {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  if (isDryRun) {
    dryRun().then(() => process.exit(0));
  } else {
    backfillBillingMonth();
  }
}

export { backfillBillingMonth, dryRun };
