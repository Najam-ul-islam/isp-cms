import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function hashPassword(password: string) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

async function setupTestData() {
  try {
    console.log('Setting up test data...');

    // Create a test admin if one doesn't exist
    const adminCount = await prisma.admin.count();
    if (adminCount === 0) {
      const hashedPassword = await hashPassword('password123');
      await prisma.admin.create({
        data: {
          name: 'Test Admin',
          email: 'admin@test.com',
          password: hashedPassword
        }
      });
      console.log('Created test admin: admin@test.com / password123');
    } else {
      console.log('Admin already exists');
    }

    // Create a test package if one doesn't exist
    const packageCount = await prisma.package.count();
    if (packageCount === 0) {
      // Find the admin to associate with the package
      const admin = await prisma.admin.findFirst({
        select: {
          id: true
        }
      });

      if (admin) {
        await prisma.package.create({
          data: {
            name: 'Basic Package',
            speed: 25,
            price: 29.99,
            durationDays: 30,
            createdBy: admin.id
          }
        });
        console.log('Created test package: Basic Package');
      } else {
        console.log('No admin found to create package with');
      }
    } else {
      console.log('Package already exists');
    }

    console.log('Test data setup complete!');
  } catch (error) {
    console.error('Error setting up test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestData();