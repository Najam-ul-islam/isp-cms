# Testing the Secure Authentication System

To verify that the secure authentication system is working properly, you can test the following:

## 1. Verify Database Tables
Make sure the new tables were created:
- `refresh_tokens` table
- `sessions` table

## 2. Test Authentication Flow
1. Start the development server: `npm run dev`
2. Navigate to `/signup` to create a new account
3. Verify you can log in at `/login`
4. Check that cookies are set as HTTP-only in browser dev tools
5. Verify you're redirected to dashboard after login

## 3. Test CSRF Protection
- The system should generate and validate CSRF tokens
- Requests without proper CSRF tokens should be rejected

## 4. Test Rate Limiting
- Try submitting invalid credentials multiple times
- After exceeding rate limits, requests should be rejected with 429 status

## 5. Test Session Management
- Logging in should create a session in the database
- Logging out should deactivate the session
- Session timeouts should work as configured

## Environment Variables Required
Make sure your .env file includes:
```
JWT_SECRET="your-super-secret-jwt-key-here-make-it-long-and-random"
JWT_REFRESH_SECRET="your-super-secret-refresh-token-key-here-make-it-long-and-random"
DATABASE_URL="your-database-connection-string"
```

## Security Features Verified
✅ JWT Access + Refresh Token Strategy
✅ HTTP-only Cookies
✅ CSRF Protection
✅ Rate Limiting
✅ Session Management
✅ Secure Password Hashing
✅ Database Token Storage