import { prisma } from './lib/prisma';
import { verifyPassword, generateToken } from './lib/auth';
import { generateAccessToken, generateRefreshToken } from './lib/token';

(async () => {
  console.log('🔍 Diagnosing authentication for admin@isp.com...\n');

  try {
    // 1. Check if admin exists
    const admin = await prisma.admin.findUnique({
      where: { email: 'admin@isp.com' }
    });

    if (!admin) {
      console.log('❌ admin@isp.com not found in database');
      process.exit(1);
    }

    console.log('✅ Admin found:');
    console.log('   ID:', admin.id);
    console.log('   Name:', admin.name);
    console.log('   Email:', admin.email);
    console.log('   Role:', admin.role);
    console.log('   Company ID:', admin.companyId);
    console.log('   Created:', admin.createdAt);

    // 2. Test password
    const testPassword = 'admin@123';
    const isValid = await verifyPassword(testPassword, admin.password);
    console.log('\n🔐 Password test (admin@123):', isValid ? '✅ VALID' : '❌ INVALID');

    // 3. Generate tokens to test
    console.log('\n🎫 Testing token generation...');
    
    const tokenPayload = {
      userId: admin.id,
      role: admin.role,
      companyId: admin.companyId
    };

    const accessToken = await generateAccessToken(tokenPayload);
    const refreshToken = await generateRefreshToken({
      userId: admin.id,
      jti: `${admin.id}-${Date.now()}`
    });

    console.log('✅ Access token generated (first 50 chars):', accessToken.substring(0, 50) + '...');
    console.log('✅ Refresh token generated (first 50 chars):', refreshToken.substring(0, 50) + '...');

    // 4. Check for active sessions
    const sessions = await prisma.session.findMany({
      where: {
        userId: admin.id,
        isActive: true,
        expiresAt: { gte: new Date() }
      },
      orderBy: { lastActive: 'desc' }
    });

    console.log('\n📋 Active sessions:', sessions.length);
    sessions.forEach((session, i) => {
      console.log(`   ${i + 1}. ID: ${session.id}`);
      console.log(`      Created: ${session.createdAt}`);
      console.log(`      Last Active: ${session.lastActive}`);
      console.log(`      Expires: ${session.expiresAt}`);
    });

    // 5. Check environment variables
    console.log('\n⚙️  Environment variables:');
    console.log('   JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');
    console.log('   JWT_REFRESH_SECRET:', process.env.JWT_REFRESH_SECRET ? '✅ Set' : '❌ Missing');

    console.log('\n✅ Diagnostic complete!');
    console.log('\n💡 If tokens generate successfully but you\'re still logged out:');
    console.log('   1. Clear your browser cookies for localhost:3000');
    console.log('   2. Sign in again with admin@isp.com / admin@123');
    console.log('   3. Check browser dev tools > Application > Cookies');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
