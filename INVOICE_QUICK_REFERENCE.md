# Invoice History System - Quick Reference

## 🚀 Quick Start (3 Steps)

### Step 1: Apply Database Migration
```bash
npx prisma migrate dev --name add_invoice_history_fields
```

### Step 2: Backfill Existing Invoices
```bash
# Preview first (safe)
npx tsx lib/migrations/backfill-invoice-billing-month.ts --dry-run

# Apply changes
npx tsx lib/migrations/backfill-invoice-billing-month.ts
```

### Step 3: Test in Staging
```bash
npx tsx lib/testing/staging-test.ts
```

---

## 📁 File Locations

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema with new fields |
| `modules/invoices/services/index.ts` | Core invoice logic |
| `lib/cron/generate-monthly-invoices.ts` | Cron job script |
| `lib/migrations/backfill-invoice-billing-month.ts` | Backfill script |
| `lib/testing/staging-test.ts` | Staging test script |
| `app/dashboard/clients/[id]/invoices/page.tsx` | Invoice history UI |
| `INVOICE_HISTORY_SYSTEM.md` | Full documentation |
| `PRODUCTION_DEPLOYMENT_GUIDE.md` | Deployment guide |

---

## 🌐 API Endpoints

### Get Invoice History
```bash
GET /api/clients/{clientId}/invoices?status=paid&billingMonth=2026-04
```

### Generate Monthly Invoice
```bash
POST /api/clients/{clientId}/invoices/generate
Content-Type: application/json

{
  "billingMonth": "2026-04",
  "applyCredits": true,
  "carryForward": true
}
```

### Batch Generate for Company
```bash
POST /api/invoices/generate-monthly
Content-Type: application/json

{
  "billingMonth": "2026-04",
  "applyCredits": true,
  "carryForward": true
}
```

---

## 🤖 Cron Job Setup

### Linux/Mac
```bash
# Edit crontab
crontab -e

# Add this line (runs on 1st of every month at midnight)
0 0 1 * * cd /path/to/isp-cms && npx tsx lib/cron/generate-monthly-invoices.ts >> /var/log/isp-invoice-cron.log 2>&1
```

### Windows Task Scheduler
1. Open Task Scheduler (`taskschd.msc`)
2. Create Basic Task
3. Trigger: Monthly, day 1, time 00:00
4. Action: Start program
   - Program: `npx`
   - Arguments: `tsx lib/cron/generate-monthly-invoices.ts`
   - Start in: `D:\ISP-Client_management-System\isp-cms`

---

## 🗄️ Database Schema

### New Invoice Fields
```prisma
billingMonth       String?   // "2026-04"
carryForwardAmount Float     @default(0)
creditUsed         Float     @default(0)
previousInvoiceId  String?
previousInvoice    Invoice?  @relation("InvoiceChain")
nextInvoices       Invoice[] @relation("InvoiceChain")
```

---

## 💡 Billing Logic Flow

```
Month 1: Invoice Rs. 1000
  Payment: Rs. 500
  Remaining: Rs. 500 ❌
         ↓
Month 2: Invoice Rs. 1000 + Rs. 500 (carry-forward) = Rs. 1500
  Payment: Rs. 2000 (overpaid)
  Remaining: Rs. 0 ✅
  Credit: Rs. 500
         ↓
Month 3: Invoice Rs. 1000 - Rs. 500 (credit) = Rs. 500 net payable
  Payment: Rs. 500
  Remaining: Rs. 0 ✅
```

---

## 🧪 Testing Commands

```bash
# Run staging tests
npx tsx lib/testing/staging-test.ts

# Test single invoice generation
curl -X POST http://localhost:3000/api/clients/CLIENT_ID/invoices/generate \
  -H "Content-Type: application/json" \
  -d '{"billingMonth": "2026-04", "applyCredits": true, "carryForward": true}'

# Test batch generation
curl -X POST http://localhost:3000/api/invoices/generate-monthly \
  -H "Content-Type: application/json" \
  -d '{"billingMonth": "2026-04", "applyCredits": true, "carryForward": true}'

# Check invoice history
curl http://localhost:3000/api/clients/CLIENT_ID/invoices
```

---

## 🔍 Debugging

### Check Logs
```bash
# Cron job logs
tail -f /var/log/isp-invoice-cron.log

# Application logs
pm2 logs  # or your process manager

# Database queries
npx prisma studio
```

### Common Issues

**Issue:** Invoice not generating
```bash
# Check if invoice already exists
npx prisma invoice findMany --where '{"clientId": "xxx", "billingMonth": "2026-04"}'
```

**Issue:** Carry-forward not working
```bash
# Check previous invoice remaining
npx prisma invoice findUnique --where '{"id": "xxx"}' --include payments true
```

**Issue:** Credits not applying
```bash
# Check overpayment amount
npx prisma payment findMany --where '{"invoiceId": "xxx"}'
```

---

## 📊 Database Queries

### View Invoice Chain
```sql
SELECT 
  i.id,
  i.billing_month,
  i.amount,
  i.carry_forward_amount,
  i.credit_used,
  i.previous_invoice_id,
  p.amount as paid_amount,
  (i.amount + i.carry_forward_amount - p.amount) as remaining
FROM invoices i
LEFT JOIN (
  SELECT invoice_id, SUM(amount) as amount
  FROM payments
  WHERE status = 'success'
  GROUP BY invoice_id
) p ON p.invoice_id = i.id
WHERE i.client_id = 'CLIENT_ID'
ORDER BY i.issued_date DESC;
```

### Find Orphan Invoices (No Chain)
```sql
SELECT id, billing_month, issued_date
FROM invoices
WHERE previous_invoice_id IS NULL
  AND billing_month IS NOT NULL
ORDER BY issued_date DESC;
```

### Monthly Summary
```sql
SELECT 
  billing_month,
  COUNT(*) as invoice_count,
  SUM(amount + carry_forward_amount) as total_billed,
  SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
  SUM(CASE WHEN status = 'unpaid' THEN 1 ELSE 0 END) as unpaid_count
FROM invoices
GROUP BY billing_month
ORDER BY billing_month DESC;
```

---

## 🎯 UI Routes

| Route | Description |
|-------|-------------|
| `/dashboard/clients/[id]/invoices` | Invoice history page |
| `/dashboard/clients/[id]/invoice` | Single invoice view/generation |
| `/dashboard/clients/[id]` | Client profile (has invoice history link) |

---

## 🔐 Security Notes

- ✅ Invoices are **immutable** (never update old ones)
- ✅ All endpoints require **authentication**
- ✅ Company-scoped queries (no cross-company access)
- ✅ Role-based access (ADMIN/SUPER_ADMIN for creation)
- ✅ Audit trail maintained via invoice chain

---

## 📈 Performance Tips

- Database indexes already added
- Use pagination for large datasets
- Batch process invoices in cron job
- Monitor database connection pool
- Consider caching for frequently accessed invoices

---

## 📞 Documentation Links

- **Full System Docs:** `INVOICE_HISTORY_SYSTEM.md`
- **Deployment Guide:** `PRODUCTION_DEPLOYMENT_GUIDE.md`
- **Original Financial Model:** `INVOICE_SYSTEM_FIX.md`
- **Accounting Integration:** `ACCOUNTING_SYSTEM_DOCUMENTATION.md`

---

**Last Updated:** April 13, 2026  
**Version:** 1.0.0
