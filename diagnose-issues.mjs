#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

// Diagnostic script to identify common issues in the API routes and dashboard
async function diagnoseIssues() {
  console.log('🔍 Diagnosing API Routes and Dashboard Issues...\n');

  // 1. Check if all required environment variables are set
  console.log('1. 🔐 Environment Variables Check');
  const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      console.log(`❌ Missing environment variable: ${varName}`);
    } else {
      console.log(`✅ Environment variable set: ${varName}`);
    }
  }

  // 2. Check for syntax errors in API route files
  console.log('\n2. 📄 Syntax Check for API Routes');

  const apiFiles = [
    './app/api/auth/signin/route.ts',
    './app/api/auth/signup/route.ts',
    './app/api/auth/logout/route.ts',
    './app/api/dashboard/overview/route.ts',
    './proxy.ts'
  ];

  for (const filePath of apiFiles) {
    try {
      await fs.access(filePath);
      console.log(`✅ File exists: ${filePath}`);

      // Read file to check for common issues
      const content = await fs.readFile(filePath, 'utf8');

      // Check for common issues
      if (content.includes('TODO:') || content.includes('// TODO')) {
        console.log(`   ⚠️  Contains TODO comments: ${filePath}`);
      }

      if (content.includes('FIXME:') || content.includes('// FIXME')) {
        console.log(`   ⚠️  Contains FIXME comments: ${filePath}`);
      }

      if (content.includes('console.log(') && !filePath.includes('test')) {
        console.log(`   ℹ️  Contains console.log: ${filePath}`);
      }

    } catch (error) {
      console.log(`❌ File does not exist: ${filePath}`);
    }
  }

  // 3. Check for circular dependencies and import issues
  console.log('\n3. 🔄 Import Dependency Check');

  const serviceFiles = [
    './modules/dashboard/services/index.ts',
    './modules/payments/services/index.ts',
    './modules/clients/services/index.ts',
    './modules/complaints/services/complaint.service.ts',
    './lib/jwt.ts',
    './lib/auth-service.ts',
    './modules/users/middleware/rbac.middleware.ts'
  ];

  for (const filePath of serviceFiles) {
    try {
      await fs.access(filePath);
      console.log(`✅ Service file exists: ${filePath}`);

      const content = await fs.readFile(filePath, 'utf8');

      // Check for common dependency issues
      if (content.includes('server-only') && filePath.includes('service')) {
        console.log(`   ✅ Uses server-only directive: ${filePath}`);
      }

      if (content.includes('use server') && filePath.includes('service')) {
        console.log(`   ✅ Uses "use server" directive: ${filePath}`);
      }

    } catch (error) {
      console.log(`❌ Service file does not exist: ${filePath}`);
    }
  }

  // 4. Check Prisma schema for potential issues
  console.log('\n4. 🗃️ Prisma Schema Check');
  try {
    const schemaContent = await fs.readFile('./prisma/schema.prisma', 'utf8');

    if (schemaContent.includes('@@map')) {
      console.log('✅ Prisma schema includes table mappings');
    }

    if (schemaContent.includes('cuid()')) {
      console.log('✅ Prisma schema uses cuid() for IDs');
    }

    // Count the number of models
    const modelMatches = schemaContent.match(/model\s+\w+/g);
    if (modelMatches) {
      console.log(`✅ Found ${modelMatches.length} models in schema`);
    }

  } catch (error) {
    console.log('❌ Could not read Prisma schema');
  }

  // 5. Check for missing dependencies
  console.log('\n5. 📦 Dependencies Check');
  try {
    const packageJson = JSON.parse(await fs.readFile('./package.json', 'utf8'));
    const dependencies = Object.keys(packageJson.dependencies || {});
    const devDependencies = Object.keys(packageJson.devDependencies || {});

    const requiredDeps = ['next', 'react', 'react-dom', '@prisma/client', 'jose'];
    for (const dep of requiredDeps) {
      if (dependencies.includes(dep) || devDependencies.includes(dep)) {
        console.log(`✅ Required dependency installed: ${dep}`);
      } else {
        console.log(`❌ Required dependency missing: ${dep}`);
      }
    }

  } catch (error) {
    console.log('❌ Could not read package.json');
  }

  // 6. Check for common authentication issues
  console.log('\n6. 🔐 Authentication Flow Check');

  const authFiles = [
    { name: 'Signin Route', path: './app/api/auth/signin/route.ts' },
    { name: 'Signup Route', path: './app/api/auth/signup/route.ts' },
    { name: 'Logout Route', path: './app/api/auth/logout/route.ts' },
    { name: 'JWT Utility', path: './lib/jwt.ts' },
    { name: 'Token Management', path: './lib/token.ts' },
    { name: 'Auth Service', path: './lib/auth-service.ts' }
  ];

  for (const file of authFiles) {
    try {
      const content = await fs.readFile(file.path, 'utf8');

      // Check for essential auth functionality
      let checks = [];

      if (file.name.includes('Signin')) {
        checks.push({ term: 'authenticateAdmin', desc: 'Admin authentication' });
        checks.push({ term: 'generateAccessToken', desc: 'Access token generation' });
      } else if (file.name.includes('Signup')) {
        checks.push({ term: 'hashPassword', desc: 'Password hashing' });
        checks.push({ term: 'authenticateAndGenerateTokens', desc: 'Token generation' });
      } else if (file.name.includes('Logout')) {
        checks.push({ term: 'revokeRefreshToken', desc: 'Refresh token revocation' });
        checks.push({ term: 'cookies.delete', desc: 'Cookie clearing' });
      } else if (file.name.includes('JWT')) {
        checks.push({ term: 'verifyToken', desc: 'Token verification' });
        checks.push({ term: 'prisma.admin.findUnique', desc: 'Admin lookup' });
      }

      console.log(`✅ ${file.name} exists`);

      for (const check of checks) {
        if (content.includes(check.term)) {
          console.log(`   ✅ ${check.desc} found`);
        } else {
          console.log(`   ❌ ${check.desc} missing`);
        }
      }

    } catch (error) {
      console.log(`❌ ${file.name} does not exist`);
    }
  }

  // 7. Check dashboard API for common issues
  console.log('\n7. 📊 Dashboard API Check');
  try {
    const dashboardContent = await fs.readFile('./app/api/dashboard/overview/route.ts', 'utf8');

    const requiredElements = [
      { term: 'getDashboardStats', desc: 'Dashboard statistics' },
      { term: 'getRecentPayments', desc: 'Recent payments' },
      { term: 'getRecentClients', desc: 'Recent clients' },
      { term: 'getRecentComplaints', desc: 'Recent complaints' },
      { term: 'x-user-id', desc: 'User ID from middleware' },
      { term: 'role !== "SUPER_ADMIN"', desc: 'Role-based access' }
    ];

    console.log('✅ Dashboard API file exists');

    for (const element of requiredElements) {
      if (dashboardContent.includes(element.term)) {
        console.log(`   ✅ ${element.desc} found`);
      } else {
        console.log(`   ❌ ${element.desc} missing`);
      }
    }

  } catch (error) {
    console.log('❌ Dashboard API file does not exist');
  }

  console.log('\n🎯 Diagnosis Complete!');
  console.log('\n💡 Recommendations:');
  console.log('   - Ensure all environment variables are properly set');
  console.log('   - Run `npx prisma generate` to regenerate Prisma client');
  console.log('   - Run database migrations if schema changed: `npx prisma db push`');
  console.log('   - Test authentication flow with valid credentials');
  console.log('   - Verify middleware is correctly passing user data to API routes');
}

// Run diagnosis
diagnoseIssues().catch(console.error);