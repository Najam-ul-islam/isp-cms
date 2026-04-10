import { prisma } from './lib/prisma';

(async () => {
  console.log('🧹 Cleaning up multiple sessions for admin@isp.com...\n');

  try {
    const admin = await prisma.admin.findUnique({
      where: { email: 'admin@isp.com' }
    });

    if (!admin) {
      console.log('❌ admin@isp.com not found');
      process.exit(1);
    }

    console.log('👤 Admin:', admin.name, `(${admin.email})`);

    // Deactivate all sessions except the most recent one
    const sessions = await prisma.session.findMany({
      where: { userId: admin.id },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`\n📋 Found ${sessions.length} total sessions`);

    if (sessions.length > 1) {
      // Keep the most recent session, deactivate the rest
      const sessionsToDeactivate = sessions.slice(1);
      
      const result = await prisma.session.updateMany({
        where: {
          id: { in: sessionsToDeactivate.map(s => s.id) }
        },
        data: { isActive: false }
      });

      console.log(`✅ Deactivated ${result.count} old sessions`);
      console.log(`✅ Kept 1 active session (ID: ${sessions[0].id.substring(0, 20)}...)`);
    } else {
      console.log('✅ Only 1 session found, no cleanup needed');
    }

    // Also clean up expired sessions globally
    const cleanupResult = await prisma.session.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isActive: false }
        ]
      }
    });

    console.log(`🗑️  Deleted ${cleanupResult.count} expired/inactive sessions\n`);

    // Verify remaining sessions
    const remainingSessions = await prisma.session.count({
      where: {
        userId: admin.id,
        isActive: true,
        expiresAt: { gte: new Date() }
      }
    });

    console.log(`✅ Active sessions remaining: ${remainingSessions}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
