# SaaS Admin Dashboard - Quick Start Guide

## 🚀 Getting Started

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Login as SUPER_ADMIN
- Navigate to `http://localhost:3000/login`
- Login with credentials of a user that has `SUPER_ADMIN` role
- If you don't have a SUPER_ADMIN account, create one in the database

### 3. Access the Dashboard
- Navigate to `http://localhost:3000/saas/dashboard`
- You should see the dashboard with platform metrics

---

## 📋 Available Routes

| Route | Description |
|-------|-------------|
| `/saas/dashboard` | Dashboard overview with metrics |
| `/saas/companies` | List and manage all companies |
| `/saas/companies/[id]` | Edit company details and modules |

---

## 🎯 Key Features

### Dashboard Overview
- **Total Companies**: See how many companies are registered
- **Active vs Suspended**: Monitor company status distribution
- **Total Clients**: View client count across all companies
- **Total Revenue**: Track platform-wide revenue
- **Recent Companies**: Last 5 companies that joined

### Company Management
- **Add Company**: Click "Add Company" button
- **Search**: Use search bar to filter by name
- **Edit**: Click edit icon to view/edit company details
- **Toggle Status**: Suspend/activate companies
- **Soft Delete**: Remove companies (marks as inactive)

### Module Access Control
- Navigate to company detail page
- Toggle modules on/off:
  - ✅ Billing & Invoicing
  - ✅ Inventory Management
  - ✅ Employee Management
- Click "Save Changes" to persist

---

## 🔐 Access Control

**Who can access?**
- Only users with `role = SUPER_ADMIN`

**What happens if non-admin tries to access?**
- Redirected to login page

**API Protection:**
- All `/api/saas/*` endpoints require valid SUPER_ADMIN token
- Returns `401 Unauthorized` if token is invalid
- Returns `403 Forbidden` if role is not SUPER_ADMIN

---

## 📊 API Endpoints

### Dashboard
```bash
# Get dashboard metrics
curl http://localhost:3000/api/saas/dashboard \
  -H "Cookie: access_token=YOUR_TOKEN"
```

### Companies
```bash
# List all companies
curl http://localhost:3000/api/saas/companies \
  -H "Cookie: access_token=YOUR_TOKEN"

# Create company
curl -X POST http://localhost:3000/api/saas/companies \
  -H "Cookie: access_token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "New ISP Company"}'

# Update company
curl -X PATCH http://localhost:3000/api/saas/companies/COMPANY_ID \
  -H "Cookie: access_token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'

# Toggle status
curl -X PATCH http://localhost:3000/api/saas/companies/COMPANY_ID \
  -H "Cookie: access_token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "toggleStatus"}'

# Delete company
curl -X DELETE http://localhost:3000/api/saas/companies/COMPANY_ID \
  -H "Cookie: access_token=YOUR_TOKEN"
```

---

## 🧪 Testing

### Run Test Suite
```bash
npx tsx saas-test.ts
```

### What Gets Tested?
✅ Route protection via middleware  
✅ Service layer files exist  
✅ UI components exist  
✅ Database schema updated  
✅ API routes compiled  

---

## 🛠️ Troubleshooting

### Can't Access /saas/* Routes
**Problem**: Getting redirected to login  
**Solution**: 
1. Verify you're logged in
2. Check your user role in database:
   ```sql
   SELECT role FROM admins WHERE email = 'your@email.com';
   ```
3. Role must be `SUPER_ADMIN`

### Companies Page Shows Empty
**Problem**: No companies in the list  
**Solution**: 
- This is normal for new installations
- Click "Add Company" to create your first company

### Build Fails
**Problem**: TypeScript errors during build  
**Solution**:
```bash
# Check for errors
npm run build

# Regenerate Prisma client
npx prisma generate
```

### Database Schema Issues
**Problem**: Missing fields (isActive, modulesEnabled)  
**Solution**:
```bash
# Sync schema
npx prisma db push

# Verify schema
npx prisma studio
```

---

## 📁 File Locations

### Service Layer
- `lib/saas/dashboardService.ts` - Dashboard metrics
- `lib/saas/companyService.ts` - Company CRUD operations

### Pages
- `app/saas/dashboard/page.tsx` - Dashboard
- `app/saas/companies/page.tsx` - Companies list
- `app/saas/companies/[id]/page.tsx` - Company detail

### API Routes
- `app/api/saas/dashboard/route.ts` - Dashboard API
- `app/api/saas/companies/route.ts` - Companies API
- `app/api/saas/companies/[id]/route.ts` - Company detail API

### Components
- `components/saas/MetricCards.tsx` - Dashboard metrics
- `components/saas/RecentCompanies.tsx` - Recent companies list
- `components/saas/CompaniesTable.tsx` - Companies table with actions
- `components/saas/AddCompanyModal.tsx` - Add company modal
- `components/saas/CompanyDetail.tsx` - Company detail view

---

## 💡 Tips

1. **Performance**: Dashboard uses parallel database queries for fast loading
2. **Data Safety**: Soft deletes prevent accidental data loss
3. **Search**: Use the search bar to quickly find companies
4. **Module Control**: Enable/disable features per company
5. **Clean UI**: Minimal, functional design without over-engineering

---

## 📞 Need Help?

- **Full Documentation**: `SAAS_DASHBOARD_PHASE1.md`
- **Test Script**: `saas-test.ts`
- **Main README**: `README.md`

---

**Happy Managinging! 🎉**
