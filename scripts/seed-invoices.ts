import { prisma } from '@/lib/prisma';
import { createInvoiceForClient } from '@/modules/invoices/services';

async function seedInvoices() {
  try {
    console.log('Starting invoice seeding...');

    // Get all existing clients
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        price: true,
        companyId: true
      }
    });

    console.log(`Found ${clients.length} clients to create invoices for...`);

    for (const client of clients) {
      // Check if client already has invoices to avoid duplicates
      const existingInvoices = await prisma.invoice.count({
        where: { clientId: client.id }
      });

      if (existingInvoices === 0) {
        // Create an invoice based on the client's price
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // Due in 30 days

        await createInvoiceForClient(
          client.id,
          client.price,
          dueDate,
          `Initial invoice for ${client.price} package`,
          client.companyId
        );

        console.log(`Created invoice for client ${client.id}`);
      } else {
        console.log(`Client ${client.id} already has ${existingInvoices} invoices, skipping...`);
      }
    }

    console.log('Invoice seeding completed!');
  } catch (error) {
    console.error('Error seeding invoices:', error);
  }
}

// Run the seeding function
seedInvoices();