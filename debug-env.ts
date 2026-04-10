/**
 * Debug environment
 */

console.log('DATABASE_URL:', process.env.DATABASE_URL || 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');

import { prisma } from './lib/prisma';

(async () => {
  try {
    await prisma.$connect();
    console.log('✅ Connected to database');
    
    const result = await prisma.$queryRaw`SELECT current_database()`;
    console.log('Current database:', result);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Connection failed:', error);
  }
})();
