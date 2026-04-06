# SaaS Admin Dashboard - Phase 1 Documentation

## Overview
This is Phase 1 of the SaaS Admin Dashboard (SUPER ADMIN panel) for the ISP Management System. It provides platform-level visibility and company management capabilities without modifying existing business logic.

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Styling**: TailwindCSS
- **Icons**: Lucide React
- **Authentication**: JWT with role-based access control

### Key Design Decisions
1. **No impact on existing business logic** - All new code is isolated in `/saas/*` routes and `/api/saas/*` endpoints
2. **Service layer pattern** - Clean separation between API routes and database operations
3. **Soft deletes** - Companies are marked as inactive rather than hard-deleted
4. **Role-based access** - Only users with `SUPER_ADMIN` role can access `/saas/*` routes

---

## Features Implemented

### 1. Authentication & Access Control

**Route Protection**: All `/saas/*` routes are protected via Next.js middleware.

**Access Rules**:
- Only users with `role = SUPER_ADMIN` can access
- Invalid/expired tokens redirect to login
- Non-SUPER_ADMIN users are redirected to login

**Files Modified**:
- `middleware.ts` - Added `/saas/*` route protection

---

### 2. Dashboard Overview (`/saas/dashboard`)

**Features**:
- Total Companies (active vs suspended)
- Total Clients (active vs expired)
- Total Revenue (sum of all payments across all companies)
- Recent Companies list (last 5)

**API Endpoint**:
```
GET /api/saas/dashboard
```

**Response**:
```json
{
  "totalCompanies": 10,
  "activeCompanies": 8,
  "suspendedCompanies": 2,
  "totalClients": 150,
  "activeClients": 120,
  "expiredClients": 30,
  "totalRevenue": 500000,
  "recentCompanies": [
    { "id": "...", "name": "Company A", "createdAt": "2024-01-01" }
  ]
}
```

**Service Layer**: `lib/saas/dashboardService.ts`

---

### 3. Company Management (`/saas/companies`)

**Features**:
- List all companies with search
- Add new company (modal)
- Edit company (navigate to detail page)
- Soft delete company (sets `isActive = false`)
- Toggle company status (active/suspended)

**Computed Fields**:
- `totalClients` - Count of clients per company
- `totalRevenue` - Sum of payments per company

**API Endpoints**:

```
GET /api/saas/companies
- Returns all companies with stats

POST /api/saas/companies
- Body: { name: string, modulesEnabled?: object }
- Creates new company

PATCH /api/saas/companies/:id
- Body: { name?: string, isActive?: boolean, modulesEnabled?: object, action?: "toggleStatus" }
- Updates company details

DELETE /api/saas/companies/:id
- Soft deletes company (sets isActive = false)
```

**Service Layer**: `lib/saas/companyService.ts`

**Functions**:
- `getCompanies()` - Get all companies with stats
- `getCompanyById(id)` - Get single company
- `createCompany(input)` - Create new company
- `updateCompany(id, input)` - Update company
- `deleteCompany(id)` - Soft delete
- `toggleCompanyStatus(id)` - Toggle active/suspended
- `updateCompanyModules(id, modulesEnabled)` - Update module access

---

### 4. Company Detail Page (`/saas/companies/[id]`)

**Features**:
- View company基本信息 (name, status, created date)
- View computed stats (total clients, total revenue)
- Module access control with toggle switches
- Save changes to company settings

**Module Access Control**:
```json
{
  "billing": true,
  "inventory": false,
  "employees": true
}
```

**Available Modules**:
1. Billing & Invoicing
2. Inventory Management
3. Employee Management

**UI Components**:
- Toggle switches for each module
- Save button to persist changes
- Success/error message display

---

## Database Schema Changes

### Company Model Updates

Added two new fields to the `Company` model:

```prisma
model Company {
  // ... existing fields
  
  isActive       Boolean  @default(true)
  modulesEnabled Json     @default("{\"billing\":true,\"inventory\":false,\"employees\":true}")
  
  // ... relations
}
```

**Migration**: Used `prisma db push` to sync schema without data loss.

---

## File Structure

```
isp-cms/
├── prisma/
│   └── schema.prisma (updated)
├── middleware.ts (updated)
├── lib/
│   └── saas/
│       ├── dashboardService.ts (new)
│       └── companyService.ts (new)
├── app/
│   ├── saas/
│   │   ├── layout.tsx (new)
│   │   ├── dashboard/
│   │   │   └── page.tsx (new)
│   │   └── companies/
│   │       ├── page.tsx (new)
│   │       └── [id]/
│   │           └── page.tsx (new)
│   └── api/
│       └── saas/
│           ├── dashboard/
│           │   └── route.ts (new)
│           └── companies/
│               ├── route.ts (new)
│               └── [id]/
│                   └── route.ts (new)
├── components/
│   └── saas/
│       ├── MetricCards.tsx (new)
│       ├── RecentCompanies.tsx (new)
│       ├── CompaniesTable.tsx (new)
│       ├── AddCompanyModal.tsx (new)
│       └── CompanyDetail.tsx (new)
└── saas-test.ts (new)
```

---

## UI/UX Design

### Layout
- **Sidebar Navigation**: Clean, minimal sidebar with Dashboard and Companies links
- **Logout Button**: Easy access to logout in sidebar footer
- **Responsive**: Works on all screen sizes

### Dashboard Page
- **Metric Cards**: 3 cards showing Total Companies, Total Clients, Total Revenue
- **Color Coding**: Blue (companies), Green (clients), Purple (revenue)
- **Recent Companies**: List of last 5 companies with creation dates

### Companies Page
- **Search Bar**: Filter companies by name
- **Table View**: Clean table with columns for Name, Status, Clients, Revenue, Created, Actions
- **Action Buttons**: Edit (blue), Toggle Status (yellow), Delete (red)
- **Add Button**: Prominent "Add Company" button

### Company Detail Page
- **Back Button**: Easy navigation back to companies list
- **Edit Form**: Editable company name field
- **Stats Display**: Read-only display of computed stats
- **Module Toggles**: Toggle switches for each module with save button

---

## Testing

### Automated Tests
Run the test suite:
```bash
npx tsx saas-test.ts
```

**Test Coverage**:
- ✅ Route protection via middleware
- ✅ Service layer files exist
- ✅ UI component files exist
- ✅ Database schema updated
- ✅ API routes compiled successfully

### Manual Testing

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Login as SUPER_ADMIN**:
   - Navigate to `/login`
   - Login with a user that has `role = SUPER_ADMIN`

3. **Test Dashboard**:
   - Navigate to `/saas/dashboard`
   - Verify metric cards show correct data
   - Verify recent companies list

4. **Test Companies List**:
   - Navigate to `/saas/companies`
   - Test search functionality
   - Test "Add Company" modal
   - Test edit, toggle status, and delete actions

5. **Test Company Detail**:
   - Click edit on any company
   - Modify company name
   - Toggle module access
   - Save changes and verify

6. **Test Route Protection**:
   - Logout and try to access `/saas/dashboard`
   - Should redirect to login page
   - Login as non-SUPER_ADMIN user
   - Should redirect to login page

---

## API Documentation

### GET /api/saas/dashboard
**Description**: Get platform-wide dashboard metrics

**Response**: `200 OK`
```json
{
  "totalCompanies": number,
  "activeCompanies": number,
  "suspendedCompanies": number,
  "totalClients": number,
  "activeClients": number,
  "expiredClients": number,
  "totalRevenue": number,
  "recentCompanies": Array<{id, name, createdAt}>
}
```

---

### GET /api/saas/companies
**Description**: Get all companies with stats

**Response**: `200 OK`
```json
[
  {
    "id": string,
    "name": string,
    "isActive": boolean,
    "modulesEnabled": object,
    "createdAt": Date,
    "totalClients": number,
    "totalRevenue": number
  }
]
```

---

### POST /api/saas/companies
**Description**: Create a new company

**Request Body**:
```json
{
  "name": string (required),
  "modulesEnabled": object (optional)
}
```

**Response**: `201 Created`
```json
{
  "id": string,
  "name": string,
  "isActive": boolean,
  "modulesEnabled": object,
  "createdAt": Date
}
```

---

### PATCH /api/saas/companies/:id
**Description**: Update company details

**Request Body** (all fields optional):
```json
{
  "name": string,
  "isActive": boolean,
  "modulesEnabled": object,
  "action": "toggleStatus"
}
```

**Response**: `200 OK`
```json
{
  "id": string,
  "name": string,
  "isActive": boolean,
  "modulesEnabled": object,
  "createdAt": Date
}
```

---

### DELETE /api/saas/companies/:id
**Description**: Soft delete a company

**Response**: `200 OK`
```json
{
  "id": string,
  "name": string,
  "isActive": false,
  "modulesEnabled": object,
  "createdAt": Date
}
```

---

### GET /api/saas/companies/:id
**Description**: Get company details with stats

**Response**: `200 OK`
```json
{
  "id": string,
  "name": string,
  "isActive": boolean,
  "modulesEnabled": object,
  "createdAt": Date,
  "totalClients": number,
  "totalRevenue": number
}
```

---

## Security Considerations

1. **Route Protection**: All `/saas/*` routes protected by middleware
2. **Role Verification**: Only `SUPER_ADMIN` role can access
3. **Soft Deletes**: Prevents accidental data loss
4. **Input Validation**: API endpoints validate required fields
5. **No Business Logic Impact**: Existing client/payment/invoice logic unchanged

---

## Future Enhancements (Phase 2+)

- [ ] Advanced filtering and pagination for companies
- [ ] Company activity logs
- [ ] Bulk operations (delete, suspend)
- [ ] Export companies list to CSV
- [ ] Charts and graphs for revenue trends
- [ ] Company-specific user management
- [ ] Email notifications for company status changes
- [ ] Company plan/subscription management

---

## Troubleshooting

### Issue: Cannot access /saas/* routes
**Solution**: Ensure you're logged in as a user with `SUPER_ADMIN` role.

### Issue: Database schema out of sync
**Solution**: Run `npx prisma db push` to sync schema.

### Issue: Build fails
**Solution**: Run `npm run build` and check for TypeScript errors.

### Issue: Companies not showing data
**Solution**: Ensure there are existing companies in the database. Add test data if needed.

---

## Support

For issues or questions, refer to:
- Main README: `README.md`
- Test script: `saas-test.ts`
- Service layer: `lib/saas/`

---

## License

Same as parent project (ISP Management System)
