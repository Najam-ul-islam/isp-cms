
// Mock Next.js request object for testing
class MockRequest {
  headers: Map<string, string>;
  cookies: Map<string, string>;

  constructor(init?: { headers?: Record<string, string>, cookies?: Record<string, string> }) {
    this.headers = new Map(Object.entries(init?.headers || {}));
    this.cookies = new Map(Object.entries(init?.cookies || {}));
  }

  get(url: string) {
    return {
      nextUrl: {
        pathname: url
      }
    };
  }
}

async function testApiRoutes() {
  console.log('Testing API Routes...\n');

  // Test 1: Check if required environment variables are available
  console.log('1. Checking environment variables...');
  if (!process.env.JWT_SECRET) {
    console.log('❌ JWT_SECRET is not set - authentication will fail');
  } else {
    console.log('✅ JWT_SECRET is set');
  }

  // Test 2: Check middleware functionality
  console.log('\n2. Testing middleware...');
  try {
    const middlewareModule = await import('./proxy');
    console.log('✅ Middleware module loaded successfully');

    // Check if required exports exist
    const { proxy, config } = middlewareModule;
    if (typeof proxy === 'function' && typeof config === 'object') {
      console.log('✅ Proxy exports are correct');
    } else {
      console.log('❌ Missing required middleware exports');
    }
  } catch (error) {
    console.log(`❌ Error loading middleware: ${error}`);
  }

  // Test 3: Check auth routes
  console.log('\n3. Testing auth routes...');
  try {
    const signinRoute = await import('./app/api/auth/signin/route');
    const signupRoute = await import('./app/api/auth/signup/route');
    const logoutRoute = await import('./app/api/auth/logout/route');

    if (typeof signinRoute.POST === 'function' && typeof signupRoute.POST === 'function' && typeof logoutRoute.POST === 'function') {
      console.log('✅ Auth routes loaded successfully');
    } else {
      console.log('❌ Missing POST methods in auth routes');
    }
  } catch (error) {
    console.log(`❌ Error loading auth routes: ${error}`);
  }

  // Test 4: Check dashboard route
  console.log('\n4. Testing dashboard route...');
  try {
    // Since the dashboard route is a server component, we can't import it directly in Node.js
    // Instead, we'll check if the file exists and has the expected structure
    const fs = require('fs');
    const dashboardRoutePath = './app/api/dashboard/overview/route.ts';

    if (fs.existsSync(dashboardRoutePath)) {
      const content = fs.readFileSync(dashboardRoutePath, 'utf8');
      if (content.includes('export async function GET')) {
        console.log('✅ Dashboard route file exists with GET method');
      } else {
        console.log('❌ Dashboard route file missing GET method');
      }
    } else {
      console.log('❌ Dashboard route file does not exist');
    }
  } catch (error) {
    console.log(`❌ Error checking dashboard route: ${error}`);
  }

  // Test 5: Check JWT utilities
  console.log('\n5. Testing JWT utilities...');
  try {
    const jwtModule = await import('./lib/jwt');

    if (typeof jwtModule.getAdminFromToken === 'function') {
      console.log('✅ JWT utilities loaded successfully');
    } else {
      console.log('❌ Missing getAdminFromToken function in JWT module');
    }
  } catch (error) {
    console.log(`❌ Error loading JWT utilities: ${error}`);
  }

  // Test 6: Check RBAC middleware
  console.log('\n6. Testing RBAC middleware...');
  try {
    const rbacModule = await import('./modules/users/middleware/rbac.middleware');

    if (typeof rbacModule.checkPermission === 'function' && typeof rbacModule.enforceRBAC === 'function') {
      console.log('✅ RBAC middleware loaded successfully');
    } else {
      console.log('❌ Missing required functions in RBAC middleware');
    }
  } catch (error) {
    console.log(`❌ Error loading RBAC middleware: ${error}`);
  }

  // Test 7: Check auth service
  console.log('\n7. Testing auth service...');
  try {
    const authServicePath = './lib/auth-service.ts';
    try {
      const authService = await import(authServicePath);

      if (authService.authenticateAndGenerateTokens) {
        console.log('✅ Auth service loaded successfully');
      } else {
        console.log('❌ Missing authenticateAndGenerateTokens function in auth service');
      }
    } catch (innerError) {
      console.log(`⚠️  Auth service not found at ${authServicePath} - checking alternative paths`);
      // Check if it might be in a different location
      try {
        const authServiceAlt = await import('./lib/auth-service');
        if (typeof authServiceAlt.authenticateAndGenerateTokens === 'function') {
          console.log('✅ Auth service found at alternative path');
        }
      } catch (altError) {
        console.log(`❌ Auth service not found at alternative path either: ${altError}`);
      }
    }
  } catch (error) {
    console.log(`❌ Error loading auth service: ${error}`);
  }

  console.log('\n--- API Route Testing Complete ---');
}

// Run the tests
testApiRoutes().catch(console.error);