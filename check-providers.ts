import { prisma } from './lib/prisma';

async function checkProviders() {
  try {
    const providers = await prisma.serviceProvider.findMany({
      select: {
        id: true,
        name: true,
        companyId: true,
        _count: {
          select: { packages: true }
        }
      },
      take: 10,
    });

    console.log('First 10 providers:');
    providers.forEach(p => {
      console.log(`ID: ${p.id}`);
      console.log(`Name: ${p.name}`);
      console.log(`Company ID: ${p.companyId}`);
      console.log(`Packages: ${p._count.packages}`);
      console.log('---');
    });

    // Check specific provider
    const targetId = 'cmnun1rb90003o3w0ntmr0pv0';
    const target = await prisma.serviceProvider.findUnique({
      where: { id: targetId },
    });

    console.log('\nTarget provider:');
    if (target) {
      console.log(`Found: ${target.name}`);
      console.log(`Company ID: ${target.companyId}`);
    } else {
      console.log(`Provider ${targetId} does not exist`);
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkProviders();
