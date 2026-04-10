/**
 * Check and fix admin role
 */

import { prisma } from './lib/prisma';

(async () => {
  console.log('🔍 Checking admin@sns.com role...\n');

  try {
    await prisma.$connect();

    const admin = await prisma.admin.findUnique({
      where: { email: 'admin@sns.com' }
    });

    if (!admin) {
      console.log('❌ admin@sns.com not found');
      await prisma.$disconnect();
      process.exit(1);
    }

    console.log('✅ Admin found:');
    console.log('   Name:', admin.name);
    console.log('   Email:', admin.email);
    console.log('   Current Role:', admin.role);
    console.log('   Company ID:', admin.companyId);

    if (admin.role !== 'ADMIN') {
      console.log('\n🔧 Updating role from EMPLOYEE to ADMIN...');
      
      const updated = await prisma.admin.update({
        where: { id: admin.id },
        data: { role: 'ADMIN' }
      });

      console.log('✅ Role updated to:', updated.role);
      console.log('\n💡 You need to LOGOUT and LOGIN again for the change to take effect');
    } else {
      console.log('\n✅ Role is already ADMIN');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
