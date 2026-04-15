# Invoice History & Billing Engine System

## 📋 Overview

This document describes the comprehensive invoice history and billing engine system for the ISP Billing SaaS platform.

---

## 🎯 Key Features

### 1. **Invoice History & Chaining**
- ✅ All invoices are immutable financial records
- ✅ Each invoice links to the previous one via `previousInvoiceId`
- ✅ Complete audit trail and traceability
- ✅ Full history maintained forever

### 2. **Carry-Forward Logic**
- ✅ Unpaid balances automatically carry forward to next month
- ✅ Transparent tracking of outstanding amounts
- ✅ Clear visual indicators in UI

### 3. **Credit System**
- ✅ Overpayments are tracked as credits
- ✅ Credits can be automatically applied to next invoice
- ✅ Prevents negative balances

### 4. **Monthly Invoice Generation**
- ✅ Automated cron job for monthly billing
- ✅ Runs on 1st of every month
- ✅ Processes all active clients in all companies
- ✅ Smart duplicate prevention

---

## 🗄️ Database Schema

### Invoice Model Enhancements

```prisma
model Invoice {
  id                String      @id @default(cuid())
  clientId          String
  amount            Float
  issuedDate        DateTime    @default(now())
  dueDate           DateTime
  status            InvoiceStatus @default(unpaid)
  description       String?
  billingMonth      String?     // Format: "2026-04" (YYYY-MM)
  carryForwardAmount Float      @default(0)  // Amount carried from previous invoice
  creditUsed        Float       @default(0)  // Credits/overpayments applied
  additionalCharges Json?       // { items: [{name: "Router", amount: 1000}] }
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  companyId         String
  
  // Invoice chaining relations
  previousInvoiceId String?
  previousInvoice   Invoice?    @relation("InvoiceChain", fields: [previousInvoiceId], references: [id])
  nextInvoices      Invoice[]   @relation("InvoiceChain")
  
  client            Client      @relation(fields: [clientId], references: [id])
  company           Company     @relation(fields: [companyId], references: [id])
  payments          Payment[]

  @@index([clientId])
  @@index([companyId])
  @@index([issuedDate])
  @@index([billingMonth])
  @@index([previousInvoiceId])
}
```

### Key Fields Explained

| Field | Type | Description |
|-------|------|-------------|
| `billingMonth` | String | Format "YYYY-MM" (e.g., "2026-04") |
| `carryForwardAmount` | Float | Remaining balance from previous invoice |
| `creditUsed` | Float | Overpayment credits applied |
| `previousInvoiceId` | String? | Link to previous invoice (chain) |
| `additionalCharges` | Json? | One-time charges array |

---

## 🔧 Core Services

### 1. `generateMonthlyInvoice()`

Generates a single monthly invoice for a client with carry-forward and credit logic.

**Location:** `modules/invoices/services/index.ts`

**Parameters:**
```typescript
{
  clientId: string,
  companyId: string,
  billingMonth: string, // "2026-04"
  options?: {
    allowDuplicate?: boolean,
    applyCredits?: boolean,
    carryForward?: boolean
  }
}
```

**Logic Flow:**
1. Check if invoice already exists for this month
2. Get client details and package price
3. Find last invoice for this client
4. Calculate carry-forward amount (if remaining > 0)
5. Calculate available credits (if overpaid)
6. Create new invoice with all fields populated
7. Link to previous invoice via `previousInvoiceId`

**Example:**
```typescript
const invoice = await generateMonthlyInvoice(
  'client-123',
  'company-456',
  '2026-04',
  { applyCredits: true, carryForward: true }
);
```

### 2. `generateMonthlyInvoicesForCompany()`

Batch operation to generate invoices for all active clients in a company.

**Parameters:**
```typescript
{
  companyId: string,
  billingMonth: string,
  options?: GenerateMonthlyInvoiceOptions
}
```

**Returns:**
```typescript
{
  success: number,
  skipped: number,
  failed: number,
  results: Array<{
    clientId: string,
    invoiceId?: string,
    error?: string
  }>
}
```

### 3. `getInvoiceHistory()`

Returns complete invoice history with pagination and filtering.

**Parameters:**
```typescript
{
  clientId: string,
  companyId: string,
  filters?: {
    status?: 'unpaid' | 'partial' | 'paid',
    billingMonth?: string,
    limit?: number,
    offset?: number
  }
}
```

**Returns:**
```typescript
{
  invoices: InvoiceWithPayments[],
  total: number,
  summary: {
    totalBilled: number,
    totalPaid: number,
    totalRemaining: number
  }
}
```

---

## 🌐 API Endpoints

### 1. GET `/api/clients/[id]/invoices`

Get complete invoice history for a client.

**Query Parameters:**
- `status` (optional): Filter by status (`unpaid`, `partial`, `paid`)
- `billingMonth` (optional): Filter by month (`2026-04`)
- `limit` (optional): Number of results (default: 100)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "invoices": [
    {
      "id": "cxyz123",
      "amount": 1000,
      "billingMonth": "2026-04",
      "carryForwardAmount": 500,
      "creditUsed": 0,
      "previousInvoiceId": "cabc456",
      "status": "partial",
      "totalPaid": 800,
      "remainingAmount": 700,
      "payments": [...]
    }
  ],
  "total": 15,
  "summary": {
    "totalBilled": 15000,
    "totalPaid": 12000,
    "totalRemaining": 3000
  }
}
```

### 2. POST `/api/clients/[id]/invoices/generate`

Generate a new monthly invoice for a client.

**Body:**
```json
{
  "billingMonth": "2026-04",
  "applyCredits": true,
  "carryForward": true
}
```

**Response:**
```json
{
  "message": "Invoice generated successfully",
  "invoice": { ... }
}
```

### 3. POST `/api/invoices/generate-monthly`

Batch generate invoices for all active clients in a company.

**Body:**
```json
{
  "billingMonth": "2026-04",
  "applyCredits": true,
  "carryForward": true
}
```

**Response:**
```json
{
  "message": "Generated 45 invoices, skipped 5, failed 2",
  "results": {
    "success": 45,
    "skipped": 5,
    "failed": 2,
    "results": [...]
  }
}
```

---

## 🤖 Automated Cron Job

### Setup

The cron job script is located at: `lib/cron/generate-monthly-invoices.ts`

**Local Execution:**
```bash
npx tsx lib/cron/generate-monthly-invoices.ts
```

**Production Cron (Linux/Mac):**
```bash
# Edit crontab
crontab -e

# Add this line to run on 1st of every month at midnight
0 0 1 * * cd /path/to/project && npx tsx lib/cron/generate-monthly-invoices.ts >> /var/log/invoice-cron.log 2>&1
```

**Production Cron (Windows Task Scheduler):**
1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Monthly on day 1 at 12:00 AM
4. Action: Start program
   - Program: `npx`
   - Arguments: `tsx lib/cron/generate-monthly-invoices.ts`
   - Start in: `D:\ISP-Client_management-System\isp-cms`

### What It Does

1. Gets current billing month (YYYY-MM format)
2. Finds all active companies
3. For each company, finds all active clients
4. Generates invoice for each client with:
   - Base package price
   - Carry-forward from last invoice (if unpaid)
   - Credit application (if overpaid)
   - Link to previous invoice
5. Logs results (success, skipped, failed)

---

## 💡 Billing Flow Example

### Month 1: March 2026

**Client:** John Doe  
**Package Price:** Rs. 1000  
**Previous Balance:** Rs. 0 (first invoice)

```json
{
  "id": "inv-march-001",
  "amount": 1000,
  "billingMonth": "2026-03",
  "carryForwardAmount": 0,
  "creditUsed": 0,
  "previousInvoiceId": null,
  "totalDue": 1000
}
```

**Payment Made:** Rs. 500  
**Remaining:** Rs. 500

---

### Month 2: April 2026

**Client:** John Doe  
**Package Price:** Rs. 1000  
**Previous Balance:** Rs. 500 (from March)

```json
{
  "id": "inv-april-001",
  "amount": 1000,
  "billingMonth": "2026-04",
  "carryForwardAmount": 500,
  "creditUsed": 0,
  "previousInvoiceId": "inv-march-001",
  "totalDue": 1500
}
```

**Payment Made:** Rs. 2000 (overpaid)  
**Remaining:** Rs. 0  
**Credit Created:** Rs. 500

---

### Month 3: May 2026

**Client:** John Doe  
**Package Price:** Rs. 1000  
**Credits Available:** Rs. 500

```json
{
  "id": "inv-may-001",
  "amount": 1000,
  "billingMonth": "2026-05",
  "carryForwardAmount": 0,
  "creditUsed": 500,
  "previousInvoiceId": "inv-april-001",
  "totalDue": 1000,
  "netPayable": 500
}
```

**Payment Required:** Rs. 500 (after credits)

---

## 🎨 UI Components

### 1. Invoice History Page

**Location:** `/dashboard/clients/[id]/invoices`

**Features:**
- Summary cards (Total Billed, Paid, Outstanding)
- Filterable table with status, search
- Visual status indicators (🟢 Paid, 🟡 Partial, 🔴 Unpaid)
- Carry-forward amount highlighting
- Invoice detail modal with full breakdown

**Table Columns:**
- Invoice #
- Billing Month
- Issued Date
- Base Amount
- Carry Forward (orange if > 0)
- Total
- Paid (green)
- Remaining (red if > 0)
- Status (badge with icon)
- Actions (View button)

### 2. Client Profile Link

Added "View Invoice History" button in Quick Actions section of client detail page.

---

## 🔐 Security

- ✅ All endpoints verify admin authentication via JWT
- ✅ Company-scoped queries prevent cross-company data leakage
- ✅ Role-based access control (ADMIN, SUPER_ADMIN for creation)
- ✅ Invoices are immutable once created (no UPDATE allowed on financial fields)

---

## ⚡ Performance

### Indexes

```prisma
@@index([clientId])
@@index([companyId])
@@index([issuedDate])
@@index([billingMonth])
@@index([previousInvoiceId])
@@index([clientId, issuedDate])
@@index([companyId, issuedDate])
@@index([clientId, billingMonth])
@@index([companyId, billingMonth])
```

### Best Practices

- ✅ Uses Prisma aggregate functions
- ✅ Avoids N+1 queries with `include`
- ✅ Pagination support for large datasets
- ✅ Selective field projection
- ✅ Cached summaries where appropriate

---

## 🧪 Testing Checklist

- [ ] Invoice creation with carry-forward
- [ ] Invoice creation with credit application
- [ ] Duplicate invoice prevention
- [ ] Monthly cron job execution
- [ ] Invoice history pagination
- [ ] Invoice status updates on payment
- [ ] Previous invoice linking
- [ ] Additional charges calculation
- [ ] UI rendering of invoice history
- [ ] Modal details display
- [ ] Filter and search functionality

---

## 📝 Migration Guide

### Existing Invoices

Existing invoices without the new fields will have default values:
- `billingMonth`: `null` (should be backfilled)
- `carryForwardAmount`: `0`
- `creditUsed`: `0`
- `previousInvoiceId`: `null`

### Backfill Script (Optional)

```typescript
// Run this once to backfill billingMonth for existing invoices
const invoices = await prisma.invoice.findMany({
  where: { billingMonth: null },
  select: { id: true, issuedDate: true }
});

for (const invoice of invoices) {
  const year = invoice.issuedDate.getFullYear();
  const month = String(invoice.issuedDate.getMonth() + 1).padStart(2, '0');
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { billingMonth: `${year}-${month}` }
  });
}
```

---

## 🚨 Important Rules

1. **NEVER** modify old invoices (they are immutable)
2. **ALWAYS** create new invoices for each billing cycle
3. **MUST** maintain invoice chain via `previousInvoiceId`
4. **MUST** show full history in UI
5. **MUST** include carry-forward and credits in calculations

---

## 📚 Related Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema |
| `modules/invoices/services/index.ts` | Core invoice logic |
| `modules/invoices/repository/index.ts` | Database operations |
| `lib/payment-calculator.ts` | Payment calculations |
| `app/api/clients/[id]/invoices/route.ts` | Invoice history API |
| `app/api/invoices/generate-monthly/route.ts` | Batch generation API |
| `lib/cron/generate-monthly-invoices.ts` | Cron job script |
| `app/dashboard/clients/[id]/invoices/page.tsx` | Invoice history UI |

---

## 🎯 Expected Behavior

### Example Scenario

**Client:** ABC Corporation  
**Package:** Premium (Rs. 5000/month)

| Month | Base | Carry Fwd | Credits | Total | Paid | Remaining | Status |
|-------|------|-----------|---------|-------|------|-----------|--------|
| Jan | 5000 | 0 | 0 | 5000 | 3000 | 2000 | Partial |
| Feb | 5000 | 2000 | 0 | 7000 | 7000 | 0 | Paid |
| Mar | 5000 | 0 | 0 | 5000 | 6000 | 0 | Paid (Credit: 1000) |
| Apr | 5000 | 0 | 1000 | 5000 | 4000 | 0 | Paid (Credit used) |

---

## 📞 Support

For questions or issues, refer to:
- `INVOICE_SYSTEM_FIX.md` - Original financial model documentation
- `ACCOUNTING_SYSTEM_DOCUMENTATION.md` - Accounting integration guide

---

**Last Updated:** April 13, 2026  
**Version:** 1.0.0
