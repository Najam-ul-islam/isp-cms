const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  try {
    const [admins, packages, clients] = await Promise.all([
      prisma.admin.count(),
      prisma.package.count(),
      prisma.client.count(),
    ]);
    console.log(JSON.stringify({ before: { admins, packages, clients } }));

    const email = 'admin@test.com';
    const existingAdmin = await prisma.admin.findUnique({ where: { email } });
    if (!existingAdmin) {
      const password = await bcrypt.hash('password123', 10);
      await prisma.admin.create({
        data: { name: 'Test Admin', email, password },
      });
      console.log('seeded_admin');
    } else {
      console.log('admin_exists');
    }

    const existingPackage = await prisma.package.findFirst({ where: { name: 'Basic Package' } });
    if (!existingPackage) {
      // Get the admin to assign as the creator
      const admin = await prisma.admin.findFirst({
        select: { id: true }
      });

      await prisma.package.create({
        data: {
          name: 'Basic Package',
          speed: 25,
          price: 29.99,
          durationDays: 30,
          createdBy: admin ? admin.id : '' // Use the admin's ID, or empty string as fallback
        },
      });
      console.log('seeded_package');
    } else {
      console.log('package_exists');
    }

    const [adminsAfter, packagesAfter, clientsAfter] = await Promise.all([
      prisma.admin.count(),
      prisma.package.count(),
      prisma.client.count(),
    ]);
    console.log(JSON.stringify({ after: { admins: adminsAfter, packages: packagesAfter, clients: clientsAfter } }));
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
