import { prisma } from './lib/prisma';

async function testRevenue() {
  await prisma.$connect();
  try {
    // Get a sample invoice with client and company
    const invoice = await prisma.invoice.findFirst({
      include: {
        client: {
          include: {
            company: true,
            package: true,
          }
        }
      },
    });
    if (!invoice) {
      console.log('No invoices found');
      return;
    }
    const companyId = invoice.client.companyId;
    console.log('Using companyId:', companyId);
    console.log('Client:', invoice.client.name, 'Package:', invoice.client.package?.name, 'Price:', invoice.client.price, 'PurchasePrice:', invoice.client.package?.purchasePrice);

    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    console.log('Month range:', monthStart.toISOString(), '->', monthEnd.toISOString());

    // Count invoices for this company this month
    const totalInvoices = await prisma.invoice.count({
      where: { companyId, issuedDate: { gte: monthStart, lte: monthEnd } }
    });
    console.log('Total invoices this month for company:', totalInvoices);

    const paidInvoices = await prisma.invoice.findMany({
      where: { companyId, status: 'paid', issuedDate: { gte: monthStart, lte: monthEnd } },
      select: { id: true, clientId: true, totalAmount: true, source: true }
    });
    console.log('Paid invoices count:', paidInvoices.length);
    paidInvoices.forEach(inv => console.log(`  ${inv.id.slice(0,8)} source=${inv.source} client=${inv.clientId}`));

    // Now call FinancialService
    const { FinancialService } = await import('./lib/financial-service');
    const revenue = await FinancialService.calculateTotalRevenue(companyId, monthStart, monthEnd);
    console.log('Revenue result:', revenue);
  } finally {
    await prisma.$disconnect();
  }
}

testRevenue();
