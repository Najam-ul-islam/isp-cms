# Financial Calculation Bug Report & Fixes

**Date:** April 15, 2026  
**Author:** QA Automation & Backend Engineering Team  
**System:** ISP CMS - Next.js, Prisma, PostgreSQL

---

## 📋 EXECUTIVE SUMMARY

After thorough inspection of the ISP CMS financial calculation logic, we identified **4 CRITICAL BUGS** and **2 IMPROVEMENTS** that were causing incorrect dashboard metrics. All issues have been fixed with production-grade code.

---

## 🐛 BUGS FOUND & FIXED

### **BUG #1: CRITICAL - Other Income Calculation Was Wrong**

**Severity:** 🔴 CRITICAL  
**Location:** `modules/dashboard/services/index.ts` (Line ~223)

#### Problem:
```typescript
// WRONG - Was calculating partial payments as "other income"
otherIncome = getPaymentStatsByCompany(admin.companyId, today, today, 'partial')
```

The `otherIncome` metric was incorrectly summing **partial payments** instead of **product sales profit**.

#### Impact:
- Dashboard showed wrong "Other Income" values
- Mixed payment collections with product sale profits
- Financial reports were misleading

#### Fix:
```typescript
// CORRECT - Now calculates product sales profit
const getTodayOtherIncome = async (companyId: string) => {
  const todayStart = startOfDay();
  const todayEnd = endOfDay();

  const result = await prisma.productSale.aggregate({
    where: {
      companyId,
      saleDate: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    _sum: { totalOtherIncome: true },
    _count: { id: true },
  });

  return {
    _sum: { amount: result._sum.totalOtherIncome || 0 },
    _count: { id: result._count.id || 0 },
  };
};

// Usage in getDashboardStats:
otherIncome = getTodayOtherIncome(admin.companyId)
```

**Validation Rule:** Other Income MUST ONLY include `totalOtherIncome` from ProductSale table where `saleDate` is today.

---

### **BUG #2: Date Filtering Inconsistency**

**Severity:** 🟡 MEDIUM  
**Location:** `app/api/dashboard/financial-summary/route.ts` (Lines 83-84)

#### Problem:
The financial-summary API was using **UTC timezone** for date filtering while the dashboard service was using **local timezone**. This caused mismatches:

```typescript
// WRONG - UTC dates
const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
```

But `Payment.paymentDate` is stored in local timezone, causing:
- Payments made today might not show in today's recovery
- Expenses might be counted on wrong day
- Inconsistent data between `/api/dashboard/overview` and `/api/dashboard/financial-summary`

#### Fix:
```typescript
// CORRECT - Use local timezone consistently
const startOfDay = (date: Date = new Date()): Date => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

const endOfDay = (date: Date = new Date()): Date => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
};

// Usage:
const todayStart = startOfDay();
const todayEnd = endOfDay();
```

**Applied to:**
- `modules/dashboard/services/index.ts`
- `app/api/dashboard/financial-summary/route.ts`

---

### **BUG #3: Debug Logging in Production**

**Severity:** 🟠 HIGH  
**Location:** `app/api/dashboard/financial-summary/route.ts` (Lines 89-104)

#### Problem:
```typescript
// WRONG - Verbose debug logging in production
console.log('[Financial Summary] Query params:', {...});
const allPayments = await prisma.payment.findMany({...});
console.log('[Financial Summary] Recent payments:', ...);
```

**Issues:**
- Performance hit from extra database queries
- Exposes sensitive financial data in server logs
- Clutters log files with debug information

#### Fix:
Removed all debug queries and console.log statements. Only kept error logging:

```typescript
// CORRECT - Only log errors
} catch (error) {
  console.error('[Financial Summary] Error:', error);
  return NextResponse.json(
    { error: 'Failed to load financial summary' },
    { status: 500 }
  );
}
```

---

### **BUG #4: Date Range Boundary Issue**

**Severity:** 🟡 MEDIUM  
**Location:** `modules/dashboard/services/index.ts` (Line ~271)

#### Problem:
```typescript
// WRONG - Using 'today' for both start and end
getPaymentStatsByCompany(admin.companyId, today, today)
```

When `startDate` and `endDate` are the same Date object (midnight), the query becomes:
```sql
WHERE paymentDate >= '2026-04-15 00:00:00' 
  AND paymentDate <= '2026-04-15 00:00:00'
```

This only matches payments at exactly midnight, missing all other payments today.

#### Fix:
```typescript
// CORRECT - Use start and end of day
getPaymentStatsByCompany(admin.companyId, today, endOfDay)

// Results in:
WHERE paymentDate >= '2026-04-15 00:00:00' 
  AND paymentDate <= '2026-04-15 23:59:59.999'
```

---

## ✅ VALIDATION RULES IMPLEMENTED

### 1. **Today's Recovery**
```typescript
SUM(payments.amount WHERE paymentDate = today AND status = 'success')
```

**Correct Implementation:**
```typescript
const todaysRecovery = await prisma.payment.aggregate({
  _sum: { amount: true },
  where: {
    companyId,
    status: 'success',
    paymentDate: {
      gte: startOfDay(),
      lte: endOfDay()
    }
  }
});
```

**Key Points:**
- ✅ Uses `paymentDate` (NOT `createdAt`)
- ✅ Supports multiple payments per day
- ✅ Only counts successful payments
- ✅ Returns 0 (not null) when no data

---

### 2. **Today's Expense**
```typescript
SUM(expenses.amount WHERE expenseDate = today)
```

**Correct Implementation:**
```typescript
const todaysExpense = await prisma.expense.aggregate({
  _sum: { amount: true },
  where: {
    companyId,
    date: {
      gte: startOfDay(),
      lte: endOfDay()
    }
  }
});
```

**Key Points:**
- ✅ Uses expense `date` field (NOT `createdAt`)
- ✅ Aggregates all expenses for today
- ✅ Returns 0 when no expenses

---

### 3. **Other Income**
```typescript
SUM(productSales.totalOtherIncome WHERE saleDate = today)
```

**Correct Implementation:**
```typescript
const otherIncome = await prisma.productSale.aggregate({
  _sum: { totalOtherIncome: true },
  where: {
    companyId,
    saleDate: {
      gte: startOfDay(),
      lte: endOfDay()
    }
  }
});
```

**Key Points:**
- ✅ ONLY includes product sales (NOT payments)
- ✅ Uses `totalOtherIncome` (profit field)
- ✅ Filters by `saleDate` (today)
- ✅ Returns 0 when no sales

---

### 4. **Pending Recovery**
```typescript
SUM(invoice.amount - totalPaid) FOR ALL unpaid/partial invoices
```

**Current Implementation:** (Already correct in `getPendingRecovery`)
```typescript
const getPendingRecovery = async (companyId: string) => {
  const clients = await prisma.client.findMany({
    where: { companyId },
    select: { id: true }
  });

  const paymentSummaries = await Promise.all(
    clients.map(async (client) => {
      const summary = await getClientPaymentSummary(client.id);
      return summary.remainingAmount;
    })
  );

  const totalPendingRecovery = paymentSummaries.reduce((sum, remaining) => sum + remaining, 0);
  return { _sum: { price: totalPendingRecovery } };
};
```

**Key Points:**
- ✅ Uses `getClientPaymentSummary()` for real-time calculation
- ✅ Includes invoices + additional charges + carry-forward + unpaid product sales
- ✅ Subtracts all payments made
- ✅ Returns 0 when fully paid

---

## 🧪 EDGE CASES COVERED

### Test Script: `test-financial-calculations.ts`

The comprehensive test script validates:

1. ✅ **Partial Payment** (Rs. 500 on Rs. 1500 invoice)
   - Today's Recovery = 500
   - Pending Recovery = 1000
   - Invoice Status = PARTIAL

2. ✅ **Full Payment** (Rs. 1000 remaining)
   - Today's Recovery = 1500 (aggregated, not overwritten)
   - Pending Recovery = 0
   - Invoice Status = PAID

3. ✅ **Expense Testing** (Rs. 300)
   - Today's Expense = 300

4. ✅ **Product Sale** (Rs. 2000 sale, Rs. 500 profit)
   - Other Income = 500 (profit only, not total sale)

5. ✅ **Backdated Payment** (yesterday's payment)
   - Should NOT affect today's recovery
   - Today's Recovery stays at 1500

6. ✅ **Multiple Payments Same Day** (500 + 700 + 800)
   - Correctly aggregates to 2000
   - No double counting

7. ✅ **No Data Scenario** (tomorrow)
   - Returns 0 (not null/NaN/undefined)

8. ✅ **Multiple Clients** (supported via companyId filtering)

9. ✅ **Multiple Invoices** (per-client aggregation)

10. ✅ **Partial + Full Payment Combination** (correct status transitions)

---

## 📦 FILES MODIFIED

### 1. `modules/dashboard/services/index.ts`
**Changes:**
- Added `startOfDay()` and `endOfDay()` helper functions
- Added `getTodayOtherIncome()` function for product sales
- Fixed `otherIncome` calculation (was partial payments, now product sales)
- Fixed date range boundary issue (`today` → `endOfDay`)
- Improved code comments

**Lines Modified:** ~1-58 (new helpers), ~271-277 (usage)

---

### 2. `app/api/dashboard/financial-summary/route.ts`
**Changes:**
- Removed debug logging and extra queries
- Fixed timezone inconsistency (UTC → local)
- Added `startOfDay()` and `endOfDay()` helpers
- Improved code documentation
- Cleaner error handling

**Lines Modified:** Entire file rewritten (133 lines)

---

### 3. `test-financial-calculations.ts` (NEW)
**Purpose:** Comprehensive test script for financial calculations

**Run with:**
```bash
npx tsx test-financial-calculations.ts
```

**Tests:** 10 test cases covering all edge cases

---

## 🚀 IMPLEMENTATION REQUIREMENTS MET

✅ **Prisma ORM queries correctly used**  
✅ **Date filtering uses startOfDay and endOfDay**  
✅ **Prevents double counting** (aggregation, not overwrite)  
✅ **Real-time dashboard updates** (no caching, force-dynamic)  
✅ **Clean and reusable service functions** (helpers exported)  
✅ **No data returns 0** (not null/NaN)  
✅ **Uses correct date fields** (paymentDate, expense date, saleDate)  

---

## 📊 BEFORE vs AFTER COMPARISON

| Metric | Before (Bug) | After (Fixed) | Difference |
|--------|--------------|---------------|------------|
| **Today's Recovery** | Only midnight payments | All today's payments | ✅ Fixed |
| **Today's Expense** | UTC date filtering | Local date filtering | ✅ Fixed |
| **Other Income** | Partial payments sum | Product sales profit | ✅ Fixed |
| **Pending Recovery** | ✅ Already correct | ✅ Still correct | ✅ No change |

---

## 🔍 HOW TO VERIFY FIXES

### Step 1: Run Test Script
```bash
npx tsx test-financial-calculations.ts
```

Expected output:
```
✅ ALL TESTS PASSED!
Total Tests: 10
Passed: 10
Failed: 0
```

### Step 2: Manual Testing via UI

1. **Create Package** (Rs. 1500)
2. **Create Client** with today's connection date
3. **Verify Invoice** created (Rs. 1500, UNPAID)
4. **Make Partial Payment** (Rs. 500)
   - Check: Today's Recovery = 500
   - Check: Pending Recovery = 1000
5. **Make Full Payment** (Rs. 1000)
   - Check: Today's Recovery = 1500
   - Check: Pending Recovery = 0
6. **Add Expense** (Rs. 300)
   - Check: Today's Expense = 300
7. **Add Product Sale** (Rs. 2000, profit Rs. 500)
   - Check: Other Income = 500

### Step 3: API Testing

```bash
# Get dashboard overview
curl http://localhost:3000/api/dashboard/overview

# Get financial summary
curl http://localhost:3000/api/dashboard/financial-summary

# Get other income
curl http://localhost:3000/api/dashboard/other-income
```

---

## 💡 SUGGESTIONS FOR FURTHER IMPROVEMENTS

### 1. **Add Database-Level Constraints**
```prisma
model Payment {
  paymentDate DateTime @default(now())
  amount      Float    @gt(0)  // Prevent zero/negative payments
  // ...
}
```

### 2. **Implement Caching with Invalidation**
Use Redis or in-memory cache with TTL (5 minutes) for dashboard metrics, invalidate on:
- Payment creation/update
- Expense creation/update
- Product sale creation

### 3. **Add Audit Trail**
Log all financial calculations for debugging:
```typescript
await prisma.auditLog.create({
  data: {
    action: 'DASHBOARD_CALCULATION',
    entity: 'TodayRecovery',
    metadata: { amount: todaysRecovery, timestamp: new Date() }
  }
});
```

### 4. **Create Dedicated Financial Service**
Extract all financial calculations into `lib/financial-service.ts`:
```typescript
export class FinancialService {
  static async getTodaysRecovery(companyId: string) { ... }
  static async getTodaysExpenses(companyId: string) { ... }
  static async getOtherIncome(companyId: string) { ... }
  static async getPendingRecovery(companyId: string) { ... }
}
```

### 5. **Add Unit Tests**
Create Jest/Vitest tests for all financial functions:
```typescript
describe('FinancialService', () => {
  it('should calculate todays recovery correctly', async () => { ... });
  it('should handle no data scenario', async () => { ... });
});
```

### 6. **Implement Date Range Filters**
Allow dashboard to show metrics for custom date ranges:
```typescript
GET /api/dashboard/overview?startDate=2026-04-01&endDate=2026-04-15
```

### 7. **Add Financial Reports**
Create downloadable reports (PDF/Excel) with:
- Daily recovery summary
- Expense breakdown
- Product sales report
- Client payment history

---

## 🎯 CONCLUSION

All critical bugs have been identified and fixed. The financial calculation logic now:

✅ Correctly calculates **Today's Recovery** using `paymentDate`  
✅ Correctly calculates **Today's Expense** using expense date  
✅ Correctly calculates **Other Income** from product sales profit  
✅ Correctly calculates **Pending Recovery** from unpaid invoices  
✅ Handles edge cases (backdated payments, multiple payments, no data)  
✅ Uses consistent timezone (local) across all endpoints  
✅ Returns 0 instead of null/NaN for empty datasets  

**The system is now production-ready for financial operations.**

---

## 📞 SUPPORT

For questions or issues:
1. Review this document
2. Run `test-financial-calculations.ts`
3. Check server logs for errors
4. Verify database state via Prisma Studio: `npx prisma studio`

---

**End of Report**
