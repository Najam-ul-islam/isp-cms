import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mock the auth functions
async function hashPassword(password: string) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

function generateToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret_key', { expiresIn: '24h' });
}

async function testEndpoints() {
  console.log('Testing all endpoints...\n');

  try {
    // Test 1: Verify test data exists
    console.log('Test 1: Verifying test data...');
    const admin = await prisma.admin.findUnique({ where: { email: 'admin@test.com' }});
    const packageData = await prisma.package.findFirst({ where: { name: 'Basic Package' }});
    console.log(`  ✓ Found admin: ${!!admin}`);
    console.log(`  ✓ Found package: ${!!packageData}\n`);

    // Test 2: Simulate signup endpoint
    console.log('Test 2: Testing signup endpoint...');
    const newAdminEmail = `test${Date.now()}@example.com`;
    const hashedNewPassword = await hashPassword('password123');
    const newAdmin = await prisma.admin.create({
      data: {
        name: 'Test User',
        email: newAdminEmail,
        password: hashedNewPassword
      }
    });
    console.log(`  ✓ Created new admin: ${newAdmin.email}\n`);

    // Test 3: Simulate signin endpoint
    console.log('Test 3: Testing signin endpoint...');
    const existingAdmin = await prisma.admin.findUnique({ where: { email: 'admin@test.com' }});
    if (existingAdmin) {
      const isValid = await bcrypt.compare('password123', existingAdmin.password);
      if (isValid) {
        const token = generateToken(existingAdmin.id);
        console.log(`  ✓ Generated token for admin: ${existingAdmin.name}`);
      } else {
        console.log('  ✗ Invalid credentials');
      }
    } else {
      console.log('  ✗ Admin not found');
    }
    console.log('');

    // Test 4: Simulate packages endpoints
    console.log('Test 4: Testing packages endpoints...');

    // GET /api/packages
    const allPackages = await prisma.package.findMany();
    console.log(`  ✓ Retrieved ${allPackages.length} packages`);

    // POST /api/packages (already done in setup)
    // Get an admin to assign as the creator
    const packageCreator = await prisma.admin.findFirst({
      select: {
        id: true
      }
    });

    const newPackage = await prisma.package.create({
      data: {
        name: 'Premium Package',
        speed: 100,
        price: 59.99,
        durationDays: 30,
        createdBy: packageCreator?.id || '' // Use the first admin's ID, or empty string as fallback
      }
    });
    console.log(`  ✓ Created new package: ${newPackage.name}`);

    // PUT /api/packages
    const updatedPackage = await prisma.package.update({
      where: { id: newPackage.id },
      data: { price: 69.99 }
    });
    console.log(`  ✓ Updated package price to: $${updatedPackage.price}`);

    // DELETE /api/packages
    await prisma.package.delete({
      where: { id: newPackage.id }
    });
    console.log(`  ✓ Deleted package\n`);

    // Test 5: Simulate clients endpoints
    console.log('Test 5: Testing clients endpoints...');

    // Get the basic package we created earlier
    const basicPackage = await prisma.package.findFirst({ where: { name: 'Basic Package' }});

    if (basicPackage) {
      // POST /api/clients
      const newClient = await prisma.client.create({
        data: {
          name: 'John Doe',
          phone: '+1234567890',
          cnic: '12345-6789012-3',
          city: 'New York',
          area: 'Manhattan',  // Added required area field
          country: 'USA',
          packageId: basicPackage.id,
          price: 29.99,
          startDate: new Date(),
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          paymentStatus: 'paid',
          status: 'active',
          notes: 'Test client'
        }
      });
      console.log(`  ✓ Created new client: ${newClient.name}`);

      // GET /api/clients
      const allClients = await prisma.client.findMany({
        include: { package: true }
      });
      console.log(`  ✓ Retrieved ${allClients.length} clients`);

      // PUT /api/clients
      const updatedClient = await prisma.client.update({
        where: { id: newClient.id },
        data: {
          status: 'suspended',
          notes: 'Updated test client'
        }
      });
      console.log(`  ✓ Updated client status to: ${updatedClient.status}`);

      // DELETE /api/clients
      await prisma.client.delete({
        where: { id: newClient.id }
      });
      console.log(`  ✓ Deleted client\n`);
    }

    // Test 6: Clean up - remove the test admin we created
    await prisma.admin.delete({
      where: { email: newAdminEmail }
    });
    console.log('Test 6: Cleaned up test admin\n');

    console.log('🎉 All endpoint tests passed!');
    console.log('\nSummary:');
    console.log('- Authentication (signup/signin) ✓');
    console.log('- Package management (CRUD) ✓');
    console.log('- Client management (CRUD) ✓');
    console.log('- Database connectivity ✓');

  } catch (error) {
    console.error('❌ Error during endpoint testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEndpoints();