import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testApiRoutes() {
  console.log('🧪 Testing API Routes and Dashboard...\n');

  // Start the server in the background
  console.log('🚀 Starting development server...');
  const serverProcess = exec('npm run dev', { cwd: process.cwd() });

  // Wait a bit for the server to start
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Test the routes using curl
  const testUrls = [
    { name: 'Health Check', url: 'http://localhost:3000/api/health', method: 'GET' },
    { name: 'Login Page', url: 'http://localhost:3000/login', method: 'GET' },
    { name: 'Dashboard API', url: 'http://localhost:3000/api/dashboard/overview', method: 'GET' },
    { name: 'Signin API', url: 'http://localhost:3000/api/auth/signin', method: 'POST' },
    { name: 'Signup API', url: 'http://localhost:3000/api/auth/signup', method: 'POST' },
  ];

  console.log('📡 Testing API endpoints...\n');

  for (const test of testUrls) {
    try {
      let cmd;
      if (test.method === 'POST') {
        // For POST requests, send minimal data
        if (test.url.includes('/signin') || test.url.includes('/signup')) {
          cmd = `curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"test"}' "${test.url}"`;
        } else {
          cmd = `curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{}" "${test.url}"`;
        }
      } else {
        cmd = `curl -s -o /dev/null -w "%{http_code}" "${test.url}"`;
      }

      const { stdout } = await execAsync(cmd);
      const statusCode = stdout.trim();

      if (statusCode.startsWith('2') || statusCode === '401' || statusCode === '403') {
        console.log(`✅ ${test.name}: ${statusCode} (${test.url})`);
      } else if (statusCode === '404') {
        console.log(`⚠️  ${test.name}: ${statusCode} - Endpoint not found (${test.url})`);
      } else {
        console.log(`❌ ${test.name}: ${statusCode} (${test.url})`);
      }
    } catch (error) {
      console.log(`⚠️  ${test.name}: Error accessing - ${test.url}`);
    }
  }

  // Stop the server
  if (serverProcess) {
    serverProcess.kill();
  }

  console.log('\n📋 Testing complete!');
}

// Run the tests
testApiRoutes().catch(console.error);