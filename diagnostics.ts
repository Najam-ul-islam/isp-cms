import { prisma } from './lib/prisma';

async function runDiagnostics() {
  await prisma.$connect();
  try {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    console.log('📅 Date range for current month:', monthStart.toISOString(), '→', monthEnd.toISOString());

    // Payment status distribution
    const paymentStatus = await prisma.payment.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { amount: true },
    });
    console.log('\n💳 Payment status distribution:');
    paymentStatus.forEach(s => {
      console.log(`  "${s.status}": count=${s._count.id}, totalAmount=${s._sum.amount || 0}`);
    });

    // Invoice status distribution (all time)
    const invoiceStatus = await prisma.invoice.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    console.log('\n📄 Invoice status distribution (all time):');
    invoiceStatus.forEach(s => console.log(`  ${s.status}: ${s._count.id}`));

    // Invoice source distribution
    const invoiceSource = await prisma.invoice.groupBy({
      by: ['source'],
      _count: { id: true },
    });
    console.log('\n📦 Invoice source distribution (all time):');
    invoiceSource.forEach(s => console.log(`  ${s.source}: ${s._count.id}`));

    // Invoices this month (by issuedDate)
    const [totalInvoicesThisMonth, invoicesByStatus] = await Promise.all([
      prisma.invoice.count({ where: { issuedDate: { gte: monthStart, lte: monthEnd } } }),
      prisma.invoice.groupBy({
        by: ['status'],
        where: { issuedDate: { gte: monthStart, lte: monthEnd } },
        _count: { id: true },
      })
    ]);
    console.log(`\n📅 Invoices issued this month (by issuedDate): ${totalInvoicesThisMonth}`);
    console.log('  By status:');
    invoicesByStatus.forEach(s => console.log(`    ${s.status}: ${s._count.id}`));

    // Invoices this month for source=package
    const [totalPackageInvoices, packageByStatus] = await Promise.all([
      prisma.invoice.count({ where: { source: 'package', issuedDate: { gte: monthStart, lte: monthEnd } } }),
      prisma.invoice.groupBy({
        by: ['status'],
        where: { source: 'package', issuedDate: { gte: monthStart, lte: monthEnd } },
        _count: { id: true },
      })
    ]);
    console.log(`\n📦 Package invoices this month: ${totalPackageInvoices}`);
    console.log('  By status:');
    packageByStatus.forEach(s => console.log(`    ${s.status}: ${s._count.id}`));

    // Paid package invoices with client details
    const paidPackageInvoices = await prisma.invoice.findMany({
      where: { status: 'paid', source: 'package', issuedDate: { gte: monthStart, lte: monthEnd } },
      include: {
        client: { select: { id: true, name: true, price: true } },
        items: true,
        payments: true,
      },
      take: 10,
    });
    console.log(`\n✅ Paid package invoices this month: ${paidPackageInvoices.length}`);
    paidPackageInvoices.forEach(inv => {
      const itemTypes = inv.items.map(i => i.type).join(', ');
      console.log(`  Invoice ${inv.id.slice(0,8)}... client=${inv.client.name} total=${inv.totalAmount ?? inv.amount} items=[${itemTypes}] paymentCount=${inv.payments.length}`);
    });

    // Distinct paid client IDs (what the code uses)
    const paidClientIdsResult = await prisma.invoice.findMany({
      where: { status: 'paid', source: 'package', issuedDate: { gte: monthStart, lte: monthEnd } },
      select: { clientId: true },
      distinct: ['clientId'],
    });
    const paidClientIds = paidClientIdsResult.map(i => i.clientId);
    console.log(`\n👥 Distinct paid client IDs (from Invoice): ${paidClientIds.length}`);
    console.log('  IDs:', paidClientIds);

    // Also check product sales
    const productSales = await prisma.productSale.groupBy({
      by: ['status'],
      where: { saleDate: { gte: monthStart, lte: monthEnd } },
      _count: { id: true },
      _sum: { totalOtherIncome: true },
    });
    console.log('\n🛒 Product sales this month:');
    productSales.forEach(s => console.log(`  ${s.status}: count=${s._count.id}, totalProfit=${s._sum.totalOtherIncome || 0}`));

    // Final Revenue calculation from FinancialService
    const { FinancialService } = await import('./lib/financial-service');
    const revenue = await FinancialService.calculateTotalRevenue('(all)', monthStart, monthEnd);
    console.log('\n💰 FinancialService.calculateTotalRevenue result:');
    console.log('  totalRevenue:', revenue.totalRevenue);
    console.log('  packageMargin:', revenue.packageMargin);
    console.log('  otherIncome:', revenue.otherIncome);
    console.log('  paidClientCount:', revenue.paidClientCount);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runDiagnostics();
