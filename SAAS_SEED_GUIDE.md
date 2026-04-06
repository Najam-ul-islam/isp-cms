# SaaS Admin Dashboard - Seed Script Guide

## 🌱 Overview

The seed script (`seed-saas.ts`) creates all the necessary data to start using the SaaS Admin Dashboard immediately.

---

## 📦 What Gets Created

### 1. SUPER_ADMIN Account
```
Email:    superadmin@isp.com
Password: superadmin@123
Role:     SUPER_ADMIN
Company:  SaaS Platform
```

**This is your main account for managing the entire platform.**

### 2. Sample Companies
- **FastNet ISP** - All modules enabled
- **ConnectPro Solutions** - Billing & Employees enabled
- **NetZone Communications** - Billing & Inventory enabled

### 3. Company Admins
```
admin@fastnet.com     - Admin for FastNet ISP
admin@connectpro.com  - Admin for ConnectPro Solutions
admin@netzone.com     - Admin for NetZone Communications
Password: admin@123 (for all)
Role: ADMIN
```

### 4. Sample Packages
Each company gets 3 internet packages (10Mbps, 20Mbps, 50Mbps) for testing.

---

## 🚀 How to Use

### Option 1: Fresh Start (Recommended)

```bash
# 1. Run the seed script
npx tsx seed-saas.ts

# 2. Start the dev server
npm run dev

# 3. Open browser
http://localhost:3000/login
```

### Option 2: Re-seed (Reset Data)

If you want to reset and re-seed:

```bash
# Run seed again (it uses upsert, so it's safe)
npx tsx seed-saas.ts
```

The script uses `upsert` operations, so running it multiple times is safe and won't create duplicates.

---

## 🔐 Login Instructions

### Step 1: Navigate to Login
```
http://localhost:3000/login
```

### Step 2: Enter SUPER_ADMIN Credentials
```
Email:    superadmin@isp.com
Password: superadmin@123
```

### Step 3: Access SaaS Dashboard
After login, navigate to:
```
http://localhost:3000/saas/dashboard
```

---

## ✅ What You Can Do After Login

### As SUPER_ADMIN (superadmin@isp.com)

**Dashboard Overview:**
- View platform-wide metrics
- See monthly revenue trends
- View top companies by revenue

**Companies:**
- View all 3 sample companies
- Add new companies
- Edit company details
- Toggle company status
- Enable/disable modules

**Admins:**
- View all admins (including company admins)
- Add new admins to any company
- Reset admin passwords
- Delete admins

**Reports:**
- View total revenue across platform
- See company-wise revenue breakdown
- Track outstanding payments

**Audit Logs:**
- Monitor all system activities
- Filter by company, user, or action
- Track who did what and when

---

## 🧪 Testing Workflow

### 1. Explore Dashboard
```
1. Login as superadmin@isp.com
2. Go to /saas/dashboard
3. Check metric cards
4. View revenue trends
5. See top companies
```

### 2. Manage Companies
```
1. Go to /saas/companies
2. Search for "FastNet"
3. Click edit icon
4. Change company name
5. Toggle modules
6. Save changes
```

### 3. Add Admin
```
1. Go to /saas/admins
2. Click "Add Admin"
3. Fill form:
   - Name: Test Admin
   - Email: test@fastnet.com
   - Password: test@123
   - Role: ADMIN
   - Company: FastNet ISP
4. Click "Add Admin"
5. Verify appears in list
```

### 4. View Audit Logs
```
1. Go to /saas/audit-logs
2. Click "Filters"
3. Select "FastNet ISP"
4. See filtered activities
```

### 5. Check Reports
```
1. Go to /saas/reports
2. View total revenue
3. Switch to "Outstanding" tab
4. See company breakdown
```

---

## 🔑 All Created Accounts

### SUPER_ADMIN (Full Platform Access)
```
Email:    superadmin@isp.com
Password: superadmin@123
Access:   All /saas/* routes
```

### Company Admins (Limited Access)
```
Email:    admin@fastnet.com
Password: admin@123
Access:   Company-specific routes (NOT /saas/*)

Email:    admin@connectpro.com
Password: admin@123
Access:   Company-specific routes (NOT /saas/*)

Email:    admin@netzone.com
Password: admin@123
Access:   Company-specific routes (NOT /saas/*)
```

⚠️ **Important:** Company admins (role = ADMIN) CANNOT access `/saas/*` routes. Only SUPER_ADMIN can.

---

## 🛠️ Troubleshooting

### Can't Login
**Problem:** Login fails with correct credentials  
**Solution:**
- Verify seed script ran successfully
- Check console for errors
- Try running seed again

### Can't Access /saas/* Routes
**Problem:** Getting redirected to login  
**Solution:**
- Ensure you logged in as `superadmin@isp.com`
- Check your role is SUPER_ADMIN
- Other accounts (ADMIN role) cannot access /saas/*

### Duplicate Data
**Problem:** Seeing duplicate companies or admins  
**Solution:**
- The script uses `upsert`, so this shouldn't happen
- If it does, clear database and re-run seed

### Password Not Working
**Problem:** Credentials don't work after seeding  
**Solution:**
- Re-run seed script: `npx tsx seed-saas.ts`
- Check console output for any errors
- Verify bcrypt is installed: `npm list bcrypt`

---

## 📝 Seed Script Details

### File Location
```
/seed-saas.ts
```

### Dependencies
- `@prisma/client` - Database operations
- `bcrypt` - Password hashing

### Run Command
```bash
npx tsx seed-saas.ts
```

### What It Does
1. Creates SaaS Platform company
2. Creates SUPER_ADMIN account
3. Creates 3 sample companies
4. Creates admin for each company
5. Creates service providers
6. Creates internet packages
7. Prints credentials to console

### Safety Features
- ✅ Uses `upsert` (no duplicates)
- ✅ Checks if data exists before creating
- ✅ Safe to run multiple times
- ✅ Doesn't delete existing data
- ✅ Prints clear summary

---

## 🔄 Reset Everything

If you want to start fresh:

```bash
# 1. Reset database (CAUTION: Deletes all data)
npx prisma db push --force-reset

# 2. Re-run seed
npx tsx seed-saas.ts

# 3. Start server
npm run dev
```

⚠️ **Warning:** `--force-reset` deletes ALL data. Use with caution in production.

---

## 📊 Database Structure After Seeding

### Companies (4 total)
1. SaaS Platform (SUPER_ADMIN's company)
2. FastNet ISP
3. ConnectPro Solutions
4. NetZone Communications

### Admins (4 total)
1. Platform Administrator (SUPER_ADMIN)
2. FastNet Admin (ADMIN)
3. ConnectPro Admin (ADMIN)
4. NetZone Admin (ADMIN)

### Packages (9 total)
- 3 packages for each of the 3 sample companies

---

## 🎯 Quick Start Checklist

- [ ] Run seed script: `npx tsx seed-saas.ts`
- [ ] Start dev server: `npm run dev`
- [ ] Open browser: `http://localhost:3000/login`
- [ ] Login as: `superadmin@isp.com` / `superadmin@123`
- [ ] Navigate to: `http://localhost:3000/saas/dashboard`
- [ ] Explore dashboard and features
- [ ] Add your own companies and admins

---

## 📞 Support

- **Full Phase 2 Docs:** `SAAS_PHASE2_IMPLEMENTATION.md`
- **Quick Start:** `SAAS_PHASE2_QUICK_START.md`
- **Architecture:** `SAAS_ARCHITECTURE.md`
- **Phase 1 Docs:** `SAAS_DASHBOARD_PHASE1.md`

---

**Ready to manage your platform! 🚀**
