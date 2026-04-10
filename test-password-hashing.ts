/**
 * Compare password hashes from signup vs script
 */

import { hashPassword, verifyPassword } from './lib/auth';
import bcrypt from 'bcrypt';

(async () => {
  console.log('🔍 Testing password hashing methods...\n');

  const testPassword = 'admin@123';

  // Test 1: Current hashPassword (argon2)
  console.log('1. Testing hashPassword (current method - argon2):');
  const argon2Hash = await hashPassword(testPassword);
  console.log(`   Hash: ${argon2Hash.substring(0, 40)}...`);
  console.log(`   Verify: ${await verifyPassword(testPassword, argon2Hash) ? '✅' : '❌'}\n`);

  // Test 2: Old bcrypt method (what some scripts might have used)
  console.log('2. Testing bcrypt method (legacy):');
  const bcryptHash = await bcrypt.hash(testPassword, 10);
  console.log(`   Hash: ${bcryptHash.substring(0, 40)}...`);
  console.log(`   Verify with verifyPassword: ${await verifyPassword(testPassword, bcryptHash) ? '✅' : '❌'}\n`);

  // Test 3: Plain text (common mistake in scripts)
  console.log('3. Testing plain text password (should fail):');
  console.log(`   Verify plain text: ${await verifyPassword(testPassword, testPassword) ? '✅' : '❌'}\n`);

  console.log('✅ Test complete!');
  console.log('\n💡 The verifyPassword function should handle BOTH argon2 and bcrypt.');
  console.log('   If script-created accounts fail, the issue is likely:');
  console.log('   - Script used a different hashing method');
  console.log('   - Script stored plain text password');
  console.log('   - Script used a different salt/rounds configuration\n');
})();
