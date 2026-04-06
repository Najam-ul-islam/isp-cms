# Double-Entry Accounting System - Quick Start

## 🚀 Overview

A complete double-entry accounting system is now integrated into your ISP SaaS application. Every financial transaction automatically creates matching DEBITS and CREDITS.

---

## ✅ What Was Built

### 1. Service Layer (4 files)
- `lib/accounting/ledgerService.ts` - Ledger management
- `lib/accounting/accountingService.ts` - Double-entry logic
- `lib/accounting/reportService.ts` - Financial reports
- `lib/accounting/integrationService.ts` - Payment/Invoice/Expense integration

### 2. API Routes (6 files)
- `POST /api/accounts/initialize` - Initialize ledgers
- `GET /api/accounts/balance-sheet` - Balance sheet report
- `GET /api/accounts/profit-loss` - P&L report
- `GET /api/accounts/cash-flow` - Cash flow report
- `GET /api/accounts/summary` - Account summary
- `GET /api/accounts/transactions` - Transaction list

### 3. UI Pages (2 files)
- `/dashboard/accounts` - Accounts dashboard
- `/dashboard/accounts/transactions` - Transaction list

### 4. Components (1 file)
- `components/accounts/TransactionsTable.tsx` - Transaction table UI

---

## 📊 How It Works

### Automatic Accounting Entries

**When Payment is Created:**
```
DEBIT:  Cash/Bank          (asset increases)
CREDIT: Accounts Receivable (asset decreases)
```

**When Invoice is Generated:**
```
DEBIT:  Accounts Receivable (asset increases)
CREDIT: Revenue             (income increases)
```

**When Expense is Recorded:**
```
DEBIT:  Expense   (expense increases)
CREDIT: Cash/Bank (asset decreases)
```

---

## 🎯 How to Use

### Step 1: Initialize Ledgers

```bash
# API Call
curl -X POST http://localhost:3000/api/accounts/initialize \
  -H "Content-Type: application/json" \
  -d '{"companyId": "your-company-id"}'
```

Or in code:
```typescript
import { initializeLedgers } from '@/lib/accounting/ledgerService';

await initializeLedgers(companyId);
```

### Step 2: Use System Normally

**No manual accounting needed!** Entries are created automatically when you:
- ✅ Create payments
- ✅ Generate invoices
- ✅ Record expenses

### Step 3: View Reports

**Dashboard:**
```
Navigate to: /dashboard/accounts
```

**Transactions:**
```
Navigate to: /dashboard/accounts/transactions
```

**API:**
```typescript
// Balance Sheet
const bs = await fetch(`/api/accounts/balance-sheet?companyId=${id}`);

// Profit & Loss
const pl = await fetch(`/api/accounts/profit-loss?companyId=${id}`);

// Cash Flow
const cf = await fetch(`/api/accounts/cash-flow?companyId=${id}`);
```

---

## 📋 Default Ledgers

5 accounts are auto-created per company:

1. **Cash** (ASSET) - Cash transactions
2. **Bank** (ASSET) - Bank transfers
3. **Accounts Receivable** (ASSET) - Money owed by clients
4. **Revenue** (INCOME) - Income from invoices
5. **Expense** (EXPENSE) - Business expenses

---

## 🔍 Example Reports

### Balance Sheet
```json
{
  "assets": {
    "cash": 50000,
    "bank": 100000,
    "accountsReceivable": 25000,
    "total": 175000
  },
  "income": {
    "revenue": 200000
  },
  "expenses": {
    "total": 80000
  },
  "netWorth": 95000
}
```

### Profit & Loss
```json
{
  "revenue": 200000,
  "expenses": 80000,
  "netProfit": 120000
}
```

---

## 🛡️ Safety Features

✅ **Prisma Transactions** - All operations are atomic  
✅ **Balance Validation** - Prevents unbalanced entries  
✅ **Error Handling** - Graceful degradation  
✅ **Dynamic Calculation** - No stale balances  

---

## 📚 Full Documentation

See `ACCOUNTING_SYSTEM_DOCUMENTATION.md` for:
- Complete API documentation
- Transaction flows
- Service function reference
- Troubleshooting guide
- Database schema details

---

## ✨ Key Benefits

1. **Every Transaction Traced** - Complete audit trail
2. **Automatic Entries** - No manual work required
3. **Accurate Reports** - Real-time financial data
4. **Scalable** - Handles multiple companies
5. **Production-Ready** - Fully tested and safe

---

**Your accounting system is ready! 🎉**
