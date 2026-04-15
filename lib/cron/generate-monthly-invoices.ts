import { generateMonthlyInvoicesForCompany } from '@/modules/invoices/services';
import { prisma } from '@/lib/prisma';

/**
 * Automated Monthly Invoice Generation
 * This script should be run on the 1st of every month via cron job
 * 
 * Usage:
 * - Local: npx tsx lib/cron/generate-monthly-invoices.ts
 * - Production: Set up cron job to run on 1st of each month at 00:00
 * 
 * Cron expression: 0 0 1 * * (At 00:00 on day-of-month 1)
 */

async function generateMonthlyInvoices() {
  console.log('=== Monthly Invoice Generation Started ===');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  try {
    // Get current billing month (format: "2026-04")
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const billingMonth = `${year}-${month}`;

    console.log(`Billing Month: ${billingMonth}`);

    // Get all active companies
    const companies = await prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, name: true }
    });

    console.log(`Found ${companies.length} active companies`);

    // Generate invoices for each company
    for (const company of companies) {
      console.log(`\n--- Processing Company: ${company.name} (${company.id}) ---`);

      try {
        const results = await generateMonthlyInvoicesForCompany(
          company.id,
          billingMonth,
          {
            applyCredits: true,
            carryForward: true
          }
        );

        console.log(`Results for ${company.name}:`);
        console.log(`  ✅ Success: ${results.success}`);
        console.log(`  ⏭️  Skipped: ${results.skipped}`);
        console.log(`  ❌ Failed: ${results.failed}`);

        // Log any failures
        if (results.failed > 0) {
          const failures = results.results.filter(r => r.error);
          console.log('  Failures:');
          failures.forEach(f => {
            console.log(`    - Client ${f.clientId}: ${f.error}`);
          });
        }
      } catch (error: any) {
        console.error(`Error processing company ${company.id}:`, error);
      }
    }

    console.log('\n=== Monthly Invoice Generation Completed ===');
  } catch (error: any) {
    console.error('Fatal error in monthly invoice generation:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
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
  generateMonthlyInvoices();
}

export { generateMonthlyInvoices };
