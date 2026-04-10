import { prisma } from './lib/prisma';

(async () => {
  console.log('🔍 Checking payment status values in database...\n');

  try {
    await prisma.$connect();

    // Get all unique status values
    const statusValues = await prisma.payment.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { amount: true }
    });

    console.log('Payment status values found:\n');
    statusValues.forEach(s => {
      console.log(`  Status: "${s.status}"`);
      console.log(`  Count: ${s._count.id}`);
      console.log(`  Total Amount: ${s._sum.amount || 0}\n`);
    });

    // Also check what's being used for "successful" payments
    const successCount = await prisma.payment.count({
      where: { status: 'success' }
    });

    const paidCount = await prisma.payment.count({
      where: { status: 'paid' }
    });

    console.log('\n📊 Summary:');
    console.log(`  Payments with status='success': ${successCount}`);
    console.log(`  Payments with status='paid': ${paidCount}`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
