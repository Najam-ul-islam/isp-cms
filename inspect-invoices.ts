import { prisma } from './lib/prisma';

async function inspectInvoices() {
  await prisma.$connect();
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        client: { select: { name: true, id: true } },
        items: true,
        payments: true,
      },
      orderBy: { issuedDate: 'desc' },
      take: 10,
    });
    console.log('Invoices:');
    for (const inv of invoices) {
      const itemTypes = inv.items.map(i => `${i.type}:${i.name}:${i.amount}`).join('; ');
      const paymentCount = inv.payments.length;
      console.log(`ID ${inv.id.slice(0,8)}... status=${inv.status} source=${inv.source} client=${inv.client.name} items=[${itemTypes}] payments=${paymentCount}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

inspectInvoices();
