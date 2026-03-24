import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateRole() {
  try {
    const user = await prisma.admin.update({
      where: { email: 'syedusama997@gmail.com' },
      data: { role: 'ADMIN' }
    });

    console.log('User role updated successfully:', user);
  } catch (error) {
    console.error('Error updating user role:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateRole();