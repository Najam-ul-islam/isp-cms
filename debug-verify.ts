/**
 * Debug verifyPassword function
 */

import * as argon2 from 'argon2';
import bcrypt from 'bcrypt';

(async () => {
  console.log('🔍 Debugging verifyPassword...\n');

  const testPassword = 'admin@123';
  
  // Create a bcrypt hash
  const bcryptHash = await bcrypt.hash(testPassword, 10);
  console.log('Testing with bcrypt hash:', bcryptHash);
  console.log('Starts with $2:', bcryptHash.startsWith('$2'));
  console.log('');

  // Test argon2.verify with bcrypt hash
  console.log('1. Testing argon2.verify() with bcrypt hash:');
  try {
    const result = await argon2.verify(bcryptHash, testPassword);
    console.log('   Result:', result);
  } catch (error: any) {
    console.log('   Threw error:', error.message);
  }
  console.log('');

  // Test bcrypt.compare
  console.log('2. Testing bcrypt.compare():');
  try {
    const result = await bcrypt.compare(testPassword, bcryptHash);
    console.log('   Result:', result);
  } catch (error: any) {
    console.log('   Threw error:', error.message);
  }
  console.log('');

  // Test what happens if we swap the arguments
  console.log('3. Testing bcrypt.compare(hash, password) [WRONG ORDER]:');
  try {
    const result = await bcrypt.compare(bcryptHash, testPassword);
    console.log('   Result:', result);
  } catch (error: any) {
    console.log('   Threw error:', error.message);
  }
  console.log('');

  console.log('4. Testing bcrypt.compare(password, hash) [CORRECT ORDER]:');
  try {
    const result = await bcrypt.compare(testPassword, bcryptHash);
    console.log('   Result:', result);
  } catch (error: any) {
    console.log('   Threw error:', error.message);
  }

  console.log('\n✅ Test complete!');
})();
