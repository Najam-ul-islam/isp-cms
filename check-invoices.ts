import { prisma } from './lib/prisma';

async function checkBillingMonth() {
  await prisma.$connect();
  try {
    const invoices = await prisma.invoice.findMany({
      select: {
        id: true,
        billingMonth: true,
        issuedDate: true,
        source: true,
        status: true,
        totalAmount: true,
        client: { select: { name: true, package: { select: { name: true, price: true } } } },
        items: true,
      },
      orderBy: { issuedDate: 'desc' },
      take: 10,
    });
    console.log('Invoices with billingMonth, items, client package:');
    for (const inv of invoices) {
      const itemTypes = inv.items.map(i => i.type).join(',');
      console.log(`ID=${inv.id.slice(0,8)} billingMonth=${inv.billingMonth} source=${inv.source} status=${inv.status} total=${inv.totalAmount} client=${inv.client.name} pkg=${inv.client.package?.name} pkgPrice=${inv.client.package?.price} itemTypes=[${itemTypes}]`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkBillingMonth();
