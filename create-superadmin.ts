/**
 * Script to create SaaS SuperAdmin with full authentication
 * This script:
 * 1. Detects and loads the correct DATABASE_URL from .env files
 * 2. Creates the SuperAdmin user in the database
 * 3. Generates authentication tokens
 * 4. Creates a session
 * 5. Sets up the SaaS company
 *
 * Usage:
 *   npx tsx create-superadmin.ts                     # Uses .env DATABASE_URL
 *   DATABASE_URL="postgresql://..." npx tsx ...      # Override with custom URL
 *   SUPERADMIN_PASSWORD="custom" npx tsx ...         # Custom password
 *
 * Works with ANY PostgreSQL database (local or cloud)
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Manual .env file loader (FORCE override system variables)
function loadEnvFile() {
  const envFiles = ['.env.local', '.env', '.env.development', '.env.production'];
  
  for (const file of envFiles) {
    const filePath = resolve(process.cwd(), file);
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          
          const match = trimmed.match(/^([^=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            
            // FORCE override - .env always wins
            process.env[key] = value;
          }
        }
        
        console.log(`✅ Loaded environment from ${file}`);
        console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? process.env.DATABASE_URL.split('@').pop() : 'NOT SET'}\n`);
        return true;
      } catch (error) {
        console.warn(`⚠️  Failed to load ${file}: ${error}`);
      }
    }
  }
  
  console.log('ℹ️  No .env file found, using system environment variables');
  return false;
}

// Load .env BEFORE importing Prisma
loadEnvFile();

import { PrismaClient, Prisma } from '@prisma/client';
import { hashPassword, generateToken } from './lib/auth';
import { generateAccessToken, generateRefreshToken } from './lib/token';
import { createSession } from './lib/session-manager';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Setting up SaaS SuperAdmin account...\n');
  console.log('══════════════════════════════════════════════════\n');

  // Show which database we're connecting to
  const dbUrl = process.env.DATABASE_URL || 'NOT SET';
  const dbInfo = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') 
    ? '🖥️  LOCAL DATABASE' 
    : '☁️  CLOUD DATABASE';
  
  console.log(`📊 Database: ${dbInfo}`);
  console.log(`   URL: ${dbUrl.split('?')[0].split('@').pop() || dbUrl}\n`);

  try {
    await prisma.$connect();
    console.log('✅ Database connected\n');
    
    // Verify connection
    const dbCheck = await prisma.$queryRaw`SELECT current_database()`;
    console.log(`   Database name: ${(dbCheck as any)[0].current_database}\n`);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('\n💡 Make sure:');
    console.error('   1. PostgreSQL is running');
    console.error('   2. DATABASE_URL is set in .env file');
    console.error('   3. Database exists\n');
    process.exit(1);
  }

  // Configuration
  const config = {
    name: process.env.SUPERADMIN_NAME || 'Super Administrator',
    email: process.env.SUPERADMIN_EMAIL || 'superadmin@isp.com',
    password: process.env.SUPERADMIN_PASSWORD || 'superadmin@123',
    companyName: 'ISP CMS SaaS',
  };

  console.log('📋 Configuration:');
  console.log(`   Name: ${config.name}`);
  console.log(`   Email: ${config.email}`);
  console.log(`   Company: ${config.companyName}`);
  console.log(`   Role: SUPER_ADMIN\n`);

  // Check if superadmin already exists
  const existingSuperAdmin = await prisma.admin.findUnique({
    where: { email: config.email }
  });

  if (existingSuperAdmin) {
    console.log('══════════════════════════════════════════════════');
    console.log('⚠️  SuperAdmin already exists!\n');
    console.log('   ID:', existingSuperAdmin.id);
    console.log('   Name:', existingSuperAdmin.name);
    console.log('   Email:', existingSuperAdmin.email);
    console.log('   Role:', existingSuperAdmin.role);
    console.log('   Company ID:', existingSuperAdmin.companyId);
    console.log('   Hash prefix:', existingSuperAdmin.password.substring(0, 20) + '...\n');

    // Verify the password works
    const { verifyPassword } = await import('./lib/auth');
    const isValid = await verifyPassword(config.password, existingSuperAdmin.password);
    
    if (isValid) {
      console.log('✅ Password verification: VALID\n');
    } else {
      console.log('❌ Password verification: INVALID\n');
      console.log('💡 To reset password:');
      console.log('   1. Login to database directly');
      console.log('   2. Update password hash with argon2');
      console.log('   3. Or delete the account and re-run this script\n');
    }

    console.log('══════════════════════════════════════════════════');
    await prisma.$disconnect();
    return;
  }

  console.log('⚠️  SuperAdmin not found. Creating...\n');

  // Step 1: Find or create the SaaS company
  console.log('📦 Step 1: Setting up company...');
  let company = await prisma.company.findFirst({
    where: { name: config.companyName }
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: config.companyName,
        isActive: true,
      }
    });
    console.log(`   ✅ Company created: ${company.name}`);
    console.log(`   📌 ID: ${company.id}\n`);
  } else {
    console.log(`   ✅ Using existing company: ${company.name}`);
    console.log(`   📌 ID: ${company.id}\n`);
  }

  // Step 2: Create SuperAdmin with proper role
  console.log('👤 Step 2: Creating SuperAdmin user...');
  const hashedPassword = await hashPassword(config.password);

  const superAdmin = await prisma.admin.create({
    data: {
      name: config.name,
      email: config.email,
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      companyId: company.id,
    }
  });

  console.log(`   ✅ SuperAdmin created: ${superAdmin.name}`);
  console.log(`   📌 ID: ${superAdmin.id}`);
  console.log(`   📧 Email: ${superAdmin.email}`);
  console.log(`   🔐 Hash type: argon2id\n`);

  // Step 3: Generate authentication tokens
  console.log('🎫 Step 3: Generating authentication tokens...');
  const accessToken = await generateAccessToken({
    userId: superAdmin.id,
    role: superAdmin.role,
    companyId: superAdmin.companyId,
  });

  const jti = `${superAdmin.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const refreshToken = await generateRefreshToken({
    userId: superAdmin.id,
    jti,
  });

  console.log(`   ✅ Access token generated (expires in 60m)`);
  console.log(`   ✅ Refresh token generated (expires in 7d)`);
  console.log(`   📌 JWT ID: ${jti}\n`);

  // Step 4: Create session
  console.log('📋 Step 4: Creating session...');
  try {
    const session = await createSession(
      superAdmin.id,
      'Script-Created Session',
      '127.0.0.1'
    );
    console.log(`   ✅ Session created`);
    console.log(`   📌 Session ID: ${session.id}\n`);
  } catch (error) {
    console.warn(`   ⚠️  Session creation failed (non-critical): ${error}`);
    console.log('   ℹ️  Session will be created on first login\n');
  }

  // Summary
  console.log('══════════════════════════════════════════════════');
  console.log('✅ SuperAdmin Setup Complete!\n');
  console.log('🔐 Login Credentials:');
  console.log(`   Email: ${config.email}`);
  console.log(`   Password: ${config.password}\n`);
  
  console.log('⚠️  Security Recommendations:');
  console.log('   1. Change the password after first login');
  console.log('   2. Store credentials securely');
  console.log('   3. Enable 2FA if available\n');

  console.log('🌐 Next Steps:');
  console.log('   1. Start the dev server: npm run dev');
  console.log('   2. Navigate to: http://localhost:3000/login');
  console.log('   3. Login with the credentials above');
  console.log('   4. Access SaaS dashboard at: http://localhost:3000/saas/dashboard\n');

  console.log('══════════════════════════════════════════════════');

  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('   Code:', error.code);
      console.error('   Message:', error.message);
    }
    process.exit(1);
  });

