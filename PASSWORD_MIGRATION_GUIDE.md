# Password Hashing Migration: bcrypt → argon2

## Problem
- Script-created admin accounts couldn't login ("Invalid credentials" error)
- The `verifyPassword` function had a bug: it tried argon2 first, which returned `false` for bcrypt hashes instead of throwing an error, so the bcrypt fallback never executed
- bcrypt has native dependencies that can cause issues on cPanel deployment

## Solution

### 1. Fixed Password Verification (lib/auth.ts)
**Before:**
```typescript
try {
  return await argon2.verify(hashedPassword, password)
} catch {
  // This never ran for bcrypt hashes!
  if (hashedPassword.startsWith('$2')) {
    return await bcrypt.compare(password, hashedPassword)
  }
}
```

**After:**
```typescript
// Check hash type FIRST
if (hashedPassword.startsWith('$2')) {
  // Dynamic import - bcrypt is optional
  const bcrypt = await import('bcrypt').catch(() => null);
  if (!bcrypt) {
    console.warn('⚠️  Bcrypt not available - skipping legacy password');
    return false;
  }
  return await bcrypt.compare(password, hashedPassword);
}

// Otherwise use argon2
return await argon2.verify(hashedPassword, password)
```

### 2. Made bcrypt Optional (package.json)
```json
{
  "dependencies": {
    "argon2": "^0.44.0"  // Primary hashing method
  },
  "optionalDependencies": {
    "bcrypt": "^6.0.0"   // Only for legacy password migration
  }
}
```

### 3. Auto-Migration on Login
The signin route (`/api/auth/signin`) already has automatic migration:
- When a user with bcrypt password logs in successfully
- The password is re-hashed with argon2
- The database is updated with the new hash
- Next login uses argon2 directly (no bcrypt needed)

## cPanel Deployment

### If you have NO bcrypt accounts:
You can safely remove bcrypt entirely:
```bash
npm uninstall bcrypt @types/bcrypt
```

### If you have bcrypt accounts:
1. Install bcrypt locally for development: `npm install bcrypt`
2. Deploy to cPanel - it will skip bcrypt (optional dependency)
3. When users login, they'll get a warning but the system continues
4. **Recommended:** Run migration script to convert all passwords:
   ```bash
   npx tsx migrate-passwords.ts
   ```

## How It Works Now

### New Accounts (signup or scripts):
1. Password hashed with **argon2id** ✅
2. Login uses argon2 verification ✅
3. No bcrypt needed ✅

### Legacy Accounts (bcrypt):
1. First login: bcrypt verification → auto-migrate to argon2
2. Subsequent logins: argon2 only
3. One-time migration, then bcrypt not needed

## Testing
Run the test to verify both methods work:
```bash
npx tsx test-password-hashing.ts
```

Expected output:
- ✅ argon2 verification works
- ✅ bcrypt verification works (if bcrypt installed)
- ❌ plain text verification fails (correct behavior)

## Files Changed
- `lib/auth.ts` - Fixed verifyPassword, made bcrypt dynamic import
- `package.json` - Moved bcrypt to optionalDependencies
- `migrate-passwords.ts` - Migration script for existing accounts
