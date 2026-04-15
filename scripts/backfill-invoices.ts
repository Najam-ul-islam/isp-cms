import { prisma } from '@/lib/prisma';

async function backfillTotalAmount() {
  console.log('Backfilling totalAmount for existing invoices...');

  // Find all invoices where totalAmount is NULL
  const invoices = await prisma.invoice.findMany({
    where: {
      totalAmount: null
    },
    select: {
      id: true,
      amount: true
    }
  });

  console.log(`Found ${invoices.length} invoices without totalAmount`);

  let updated = 0;

  for (const invoice of invoices) {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { totalAmount: invoice.amount }
    });
    updated++;
  }

  console.log(`Successfully backfilled totalAmount for ${updated} invoices`);

  // Also create InvoiceItems from additionalCharges if they exist
  const allInvoices = await prisma.invoice.findMany({
    select: {
      id: true,
      additionalCharges: true
    }
  });

  const invoicesWithCharges = allInvoices.filter(
    (inv) => inv.additionalCharges !== null && inv.additionalCharges !== undefined
  );

  console.log(`Found ${invoicesWithCharges.length} invoices with additionalCharges`);

  let itemsCreated = 0;

  for (const invoice of invoicesWithCharges) {
    try {
      const charges = invoice.additionalCharges as any;
      const items = typeof charges === 'string' ? JSON.parse(charges) : charges;

      if (Array.isArray(items)) {
        for (const item of items) {
          await prisma.invoiceItem.create({
            data: {
              invoiceId: invoice.id,
              name: item.name || 'Additional Charge',
              description: null,
              amount: item.amount || 0,
              quantity: 1
            }
          });
          itemsCreated++;
        }
      }
    } catch (error) {
      console.error(`Error processing additionalCharges for invoice ${invoice.id}:`, error);
    }
  }

  console.log(`Created ${itemsCreated} invoice items from additionalCharges`);
  console.log('Backfill complete!');
}

backfillTotalAmount()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  });
