# SaaS Admin Dashboard - Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Client)                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │  Companies   │  │  Company     │      │
│  │   /saas/     │  │   /saas/     │  │  Detail      │      │
│  │  dashboard   │  │  companies   │  │  /saas/com-  │      │
│  │              │  │              │  │  panies/[id] │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
└─────────┼─────────────────┼──────────────────┼───────────────┘
          │                 │                  │
          ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│              Next.js App Router (Server)                 │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Middleware (middleware.ts)             │   │
│  │  • Verify JWT token                            │   │
│  │  • Check role = SUPER_ADMIN                    │   │
│  │  • Redirect if unauthorized                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Pages (Server Components)              │   │
│  │  • /saas/dashboard/page.tsx                     │   │
│  │  • /saas/companies/page.tsx                     │   │
│  │  • /saas/companies/[id]/page.tsx                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │           API Routes                             │   │
│  │  • GET  /api/saas/dashboard                     │   │
│  │  • GET  /api/saas/companies                     │   │
│  │  • POST /api/saas/companies                     │   │
│  │  • PATCH /api/saas/companies/:id                │   │
│  │  • DELETE /api/saas/companies/:id               │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │           UI Components                          │   │
│  │  • MetricCards                                   │   │
│  │  • RecentCompanies                               │   │
│  │  • CompaniesTable                                │   │
│  │  • AddCompanyModal                               │   │
│  │  • CompanyDetail                                 │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────┐
│              Service Layer (lib/saas/)                   │
│                                                          │
│  ┌────────────────────────┐  ┌──────────────────────┐   │
│  │ dashboardService.ts    │  │ companyService.ts    │   │
│  │                        │  │                      │   │
│  │ • getDashboardMetrics  │  │ • getCompanies       │   │
│  │                        │  │ • createCompany      │   │
│  │                        │  │ • updateCompany      │   │
│  │                        │  │ • deleteCompany      │   │
│  │                        │  │ • toggleCompany-     │   │
│  │                        │  │     Status           │   │
│  │                        │  │ • updateCompany-     │   │
│  │                        │  │     Modules          │   │
│  └────────────────────────┘  └──────────────────────┘   │
└──────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────┐
│                    Prisma ORM                            │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Company Model                                     │ │
│  │  • id (String, @default(cuid()))                  │ │
│  │  • name (String)                                  │ │
│  │  • isActive (Boolean, @default(true))             │ │
│  │  • modulesEnabled (Json)                          │ │
│  │  • createdAt (DateTime, @default(now()))          │ │
│  │  • relations: clients, payments, admins, etc.     │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                     │
│                  (Neon Cloud DB)                         │
│                                                          │
│  Tables: companies, clients, payments, admins, etc.     │
└──────────────────────────────────────────────────────────┘
```

---

## Request Flow

### Dashboard Page Load

```
1. User navigates to /saas/dashboard
                ↓
2. Middleware checks:
   • Is user authenticated? (JWT valid)
   • Is user role = SUPER_ADMIN?
                ↓
3. If YES → Continue, If NO → Redirect to /login
                ↓
4. Server Component (page.tsx) calls:
   getDashboardMetrics() from dashboardService.ts
                ↓
5. Service layer queries database:
   • prisma.company.count()
   • prisma.client.count()
   • prisma.payment.aggregate()
                ↓
6. Returns data to page component
                ↓
7. Page renders:
   • MetricCards component
   • RecentCompanies component
                ↓
8. HTML sent to browser (Server-Side Rendering)
```

### Company Update Flow

```
1. User on /saas/companies/[id]
                ↓
2. Edits company name or toggles modules
                ↓
3. Clicks "Save Changes"
                ↓
4. Client-side fetch to:
   PATCH /api/saas/companies/:id
   Body: { name, modulesEnabled }
                ↓
5. Middleware validates token & role
                ↓
6. API route handler calls:
   updateCompany(id, input) from companyService.ts
                ↓
7. Service layer executes:
   prisma.company.update()
                ↓
8. Returns updated company object
                ↓
9. Client shows success message
```

---

## Data Flow Diagram

```
┌─────────────┐
│   Browser   │
│  (Client)   │
└──────┬──────┘
       │
       │ HTTP Request
       │ (with JWT cookie)
       ▼
┌──────────────────┐
│   Middleware     │
│  • Verify token  │
│  • Check role    │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│   API Route      │
│  • Validate      │
│    input         │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Service Layer   │
│  • Business      │
│    logic         │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│   Prisma ORM     │
│  • Query         │
│    builder       │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  PostgreSQL DB   │
│  • Data storage  │
└──────┬───────────┘
       │
       ▼
   (Reverse flow with response data)
```

---

## Component Hierarchy

```
app/saas/layout.tsx
├── Sidebar
│   ├── Logo/Title
│   ├── Navigation Links
│   │   ├── Dashboard
│   │   └── Companies
│   └── Logout Button
│
└── Main Content Area
    │
    ├── /saas/dashboard/page.tsx
    │   ├── MetricCards
    │   │   ├── Total Companies Card
    │   │   ├── Total Clients Card
    │   │   └── Total Revenue Card
    │   └── RecentCompanies
    │       └── Company List Items
    │
    ├── /saas/companies/page.tsx
    │   └── CompaniesTable
    │       ├── Search Bar
    │       ├── Add Company Button
    │       │   └── AddCompanyModal
    │       └── Table
    │           ├── Header Row
    │           └── Company Rows
    │               ├── Edit Button
    │               ├── Toggle Status Button
    │               └── Delete Button
    │
    └── /saas/companies/[id]/page.tsx
        └── CompanyDetail
            ├── Company Info Form
            ├── Stats Display
            └── Module Access Control
                └── Toggle Switches
```

---

## Security Layers

```
┌────────────────────────────────────────┐
│  Layer 1: Middleware                   │
│  • JWT token verification              │
│  • Role check (SUPER_ADMIN only)       │
│  • Redirect unauthorized users         │
└────────────────┬───────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│  Layer 2: API Routes                   │
│  • Input validation                    │
│  • Error handling                      │
│  • Proper HTTP status codes            │
└────────────────┬───────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│  Layer 3: Service Layer                │
│  • Business logic validation           │
│  • Data transformation                 │
│  • Safe database operations            │
└────────────────┬───────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│  Layer 4: Database                     │
│  • Prisma type safety                  │
│  • Soft deletes (isActive flag)        │
│  • Foreign key constraints             │
└────────────────────────────────────────┘
```

---

## Module Access Control Flow

```
Company Detail Page
       │
       │ User toggles module switch
       ▼
   Update Local State
       │
       │ User clicks "Save Changes"
       ▼
   PATCH /api/saas/companies/:id
   Body: { modulesEnabled: {...} }
       │
       ▼
   Middleware Validates
       │
       ▼
   API Route Handler
       │
       ▼
   updateCompanyModules(id, modulesEnabled)
       │
       ▼
   prisma.company.update({
     data: { modulesEnabled }
   })
       │
       ▼
   Database Updated
       │
       ▼
   Return Updated Company
       │
       ▼
   Show Success Message
```

---

## Technology Stack

```
┌─────────────────────────────────────────┐
│           Frontend Layer                │
│  • Next.js 16 (App Router)             │
│  • React 19                            │
│  • TypeScript                          │
│  • TailwindCSS                         │
│  • Lucide React (Icons)                │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────┴───────────────────────┐
│           Backend Layer                 │
│  • Next.js API Routes                  │
│  • Server Components                    │
│  • Middleware (Edge Runtime)            │
│  • JWT (jose library)                  │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────┴───────────────────────┐
│          Data Layer                     │
│  • Prisma ORM (v5.22)                  │
│  • Service Layer Pattern                │
│  • Type-safe Queries                    │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────┴───────────────────────┐
│         Database Layer                  │
│  • PostgreSQL (Neon Cloud)              │
│  • Relational Data Model                │
│  • Foreign Key Constraints              │
└─────────────────────────────────────────┘
```

---

## File Organization

```
isp-cms/
│
├── prisma/
│   └── schema.prisma .................... Database schema (UPDATED)
│
├── middleware.ts ........................ Route protection (UPDATED)
│
├── lib/
│   ├── prisma.ts ........................ Prisma client
│   ├── token.ts ......................... JWT utilities
│   └── saas/ ............................ NEW: SaaS services
│       ├── dashboardService.ts
│       └── companyService.ts
│
├── app/
│   ├── layout.tsx ....................... Root layout
│   │
│   ├── saas/ ............................ NEW: SaaS pages
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   └── companies/
│   │       ├── page.tsx
│   │       └── [id]/
│   │           └── page.tsx
│   │
│   └── api/
│       └── saas/ ........................ NEW: SaaS APIs
│           ├── dashboard/
│           │   └── route.ts
│           └── companies/
│               ├── route.ts
│               └── [id]/
│                   └── route.ts
│
├── components/
│   └── saas/ ............................ NEW: SaaS UI components
│       ├── MetricCards.tsx
│       ├── RecentCompanies.tsx
│       ├── CompaniesTable.tsx
│       ├── AddCompanyModal.tsx
│       └── CompanyDetail.tsx
│
└── Documentation/
    ├── SAAS_DASHBOARD_PHASE1.md
    ├── SAAS_QUICK_START.md
    └── SAAS_IMPLEMENTATION_SUMMARY.md
```

---

## State Management

```
┌─────────────────────────────────────────┐
│  Server Components (SSR)                │
│  • Initial data fetching                │
│  • Page rendering                       │
│  • No client-side state                 │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Client Components ("use client")       │
│  • useState for local state             │
│  • fetch for API calls                  │
│  • Form state management                │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Optimistic Updates                     │
│  • Update UI immediately                │
│  • Revert on error                      │
│  • Better UX                            │
└─────────────────────────────────────────┘
```

---

**Architecture designed for:**
✅ Scalability  
✅ Maintainability  
✅ Security  
✅ Performance  
✅ Clean separation of concerns  
