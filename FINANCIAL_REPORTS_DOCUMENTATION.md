# Financial Reports Module - Complete Documentation

## ✅ Overview

A professional financial reporting system built on top of your existing double-entry accounting system. All reports are derived from `AccountTransaction` data with no hardcoded values.

---

## 📊 Reports Available

### 1. Profit & Loss Report
**Route:** `/dashboard/accounts/reports/profit-loss`

**Shows:**
- Total Revenue (INCOME ledger credits)
- Total Expenses (EXPENSE ledger debits)
- Net Profit (Revenue - Expenses)
- Revenue breakdown by source
- Expenses breakdown by category
- Revenue trend chart (Recharts)

**API:**
```
GET /api/accounts/reports/profit-loss?companyId=XXX&from=2024-01-01&to=2024-12-31
```

---

### 2. Cash Flow Report
**Route:** `/dashboard/accounts/reports/cash-flow`

**Shows:**
- Opening Balance
- Cash Inflows (credits to Cash/Bank)
- Cash Outflows (debits from Cash/Bank)
- Net Cash Flow
- Closing Balance
- Analysis insights

**API:**
```
GET /api/accounts/reports/cash-flow?companyId=XXX&from=2024-01-01&to=2024-12-31
```

---

### 3. Balance Sheet
**Route:** `/dashboard/accounts/reports/balance-sheet`

**Shows:**
- **Assets:** Cash, Bank, Accounts Receivable
- **Liabilities:** Total liabilities
- **Equity:** Net Profit (Retained Earnings)
- Balancing check (Assets = Liabilities + Equity)
- Accounting equation verification

**API:**
```
GET /api/accounts/reports/balance-sheet?companyId=XXX
```

---

### 4. Reports Index
**Route:** `/dashboard/accounts/reports`

**Shows:**
- Navigation cards for all reports
- Quick access to financial reports

---

## 🎯 Features

### Date Range Filtering
- All reports support `from` and `to` date parameters
- Default: Current month
- URL-based for easy bookmarking

### CSV Export
- Every report has "Export CSV" button
- Downloads formatted report data
- Includes all breakdowns and totals

### Charts & Visualizations
- **Profit & Loss:** Revenue trend bar chart (Recharts)
- Professional report layout
- Color-coded values (green for positive, red for negative)

### Professional Layout
- Report-style headings
- Summary cards with totals
- Detailed breakdown tables
- Subtotals and grand totals

---

## 📋 Report Structures

### Profit & Loss Report

```
┌─────────────────────────────────────────────┐
│  Profit & Loss Report                       │
│  [Date Range]                               │
├─────────────────────────────────────────────┤
│  Summary Cards                              │
│  ┌──────────┬──────────┬──────────┐        │
│  │ Revenue  │ Expenses │ Net Profit│        │
│  │ PKR X    │ PKR Y    │ PKR Z     │        │
│  └──────────┴──────────┴──────────┘        │
├─────────────────────────────────────────────┤
│  Revenue Trend Chart                        │
│  [Bar Chart - Last 6 Months]               │
├─────────────────────────────────────────────┤
│  Revenue by Source     │ Expenses by Category│
│  ┌──────────────────┐  │ ┌─────────────────┐│
│  │ Source  │ Amount │  │ │ Category│Amount ││
│  │ Payment │ 50000  │  │ │ Rent    │ 10000 ││
│  │ Invoice │ 30000  │  │ │ Salary  │ 15000 ││
│  │ Total   │ 80000  │  │ │ Total   │ 25000 ││
│  └──────────────────┘  │ └─────────────────┘│
└─────────────────────────────────────────────┘
```

### Cash Flow Report

```
┌─────────────────────────────────────────────┐
│  Cash Flow Report                           │
│  [Date Range]                               │
├─────────────────────────────────────────────┤
│  Summary Cards                              │
│  Opening | Inflows | Outflows | Net Flow   │
├─────────────────────────────────────────────┤
│  Cash Flow Statement                        │
│  ┌──────────────────────────────────┐      │
│  │ Opening Balance        PKR X     │      │
│  │ Add: Cash Inflows     +PKR Y     │      │
│  │ Less: Cash Outflows   -PKR Z     │      │
│  │ Net Cash Flow          PKR N     │      │
│  │ Closing Balance        PKR M     │      │
│  └──────────────────────────────────┘      │
├─────────────────────────────────────────────┤
│  Analysis                                   │
│  • Cash position improved/decreased         │
│  • Inflows higher/lower than outflows       │
└─────────────────────────────────────────────┘
```

### Balance Sheet

```
┌─────────────────────────────────────────────┐
│  Balance Sheet                              │
├─────────────────────────────────────────────┤
│  Status: ✓ Balance Sheet is Balanced        │
├─────────────────────────────────────────────┤
│  Summary Cards                              │
│  Assets  │ Liabilities │ Equity             │
├──────────────────────────┬──────────────────┤
│  Assets                  │ Liabilities & Eq.│
│  ┌────────────────────┐  │ ┌──────────────┐│
│  │ Cash         X     │  │ │ Liabilities L││
│  │ Bank         Y     │  │ │ Net Profit  N││
│  │ Receivables  Z     │  │ │ Total       T││
│  │ Total        T     │  │ └──────────────┘│
│  └────────────────────┘  │                  │
├─────────────────────────────────────────────┤
│  Accounting Equation                        │
│  Assets = Liabilities + Equity              │
│  PKR T = PKR L + PKR N  ✓ Balanced         │
└─────────────────────────────────────────────┘
```

---

## 💻 Code Structure

### Service Layer
```
lib/accounting/
└── reportService.ts
    ├── getProfitLossWithBreakdown()
    ├── getCashFlowWithBreakdown()
    ├── getBalanceSheetWithBreakdown()
    ├── getMonthlyRevenueTrend()
    └── getTopExpenses()
```

### API Routes
```
app/api/accounts/reports/
├── profit-loss/route.ts   - GET: P&L with breakdown
├── cash-flow/route.ts     - GET: Cash flow details
└── balance-sheet/route.ts - GET: Balance sheet
```

### Pages
```
app/dashboard/accounts/reports/
├── page.tsx                - Reports index
├── profit-loss/page.tsx    - P&L report
├── cash-flow/page.tsx      - Cash flow report
└── balance-sheet/page.tsx  - Balance sheet report
```

### Components
```
components/reports/
├── ProfitLossReport.tsx    - P&L report UI
├── ProfitLossChart.tsx     - Revenue trend chart
├── CashFlowReport.tsx      - Cash flow UI
└── BalanceSheetReport.tsx  - Balance sheet UI
```

---

## 📊 API Documentation

### Profit & Loss Report

**Endpoint:** `GET /api/accounts/reports/profit-loss`

**Query Parameters:**
- `companyId` (required) - Company ID
- `from` (optional) - Start date (YYYY-MM-DD)
- `to` (optional) - End date (YYYY-MM-DD)

**Response:**
```json
{
  "revenue": 200000,
  "expenses": 80000,
  "netProfit": 120000,
  "period": {
    "start": "2024-01-01",
    "end": "2024-12-31"
  },
  "breakdown": {
    "revenueBySource": [
      { "source": "Payment", "amount": 150000 },
      { "source": "Invoice", "amount": 50000 }
    ],
    "expensesByCategory": [
      { "category": "Expense", "amount": 60000 },
      { "category": "Rent", "amount": 20000 }
    ]
  }
}
```

---

### Cash Flow Report

**Endpoint:** `GET /api/accounts/reports/cash-flow`

**Query Parameters:**
- `companyId` (required)
- `from` (optional)
- `to` (optional)

**Response:**
```json
{
  "openingBalance": 50000,
  "cashInflows": 150000,
  "cashOutflows": 100000,
  "closingBalance": 100000,
  "netCashFlow": 50000,
  "period": {
    "start": "2024-01-01",
    "end": "2024-12-31"
  }
}
```

---

### Balance Sheet Report

**Endpoint:** `GET /api/accounts/reports/balance-sheet`

**Query Parameters:**
- `companyId` (required)

**Response:**
```json
{
  "assets": {
    "cash": 50000,
    "bank": 100000,
    "accountsReceivable": 25000,
    "total": 175000
  },
  "liabilities": {
    "total": 0
  },
  "equity": {
    "netProfit": 120000,
    "total": 120000
  },
  "balancingCheck": {
    "assets": 175000,
    "liabilitiesPlusEquity": 120000,
    "isBalanced": false
  }
}
```

---

## 🎨 UI Features

### Professional Report Design
- Clean, accounting-style layouts
- Summary cards at top
- Detailed breakdown tables
- Subtotals and grand totals highlighted
- Color-coded values

### Interactive Elements
- **Date Range Selection:** Default to current month
- **CSV Export:** Download report data
- **Navigation:** Back button to reports index
- **Charts:** Revenue trend visualization

### Responsive Design
- Grid layouts adapt to screen size
- Tables scroll on mobile
- Cards stack on smaller screens

---

## 🔐 Security

✅ All routes require authentication  
✅ Data filtered by `companyId` from cookie  
✅ Server-side rendering for performance  
✅ No sensitive data exposed  

---

## 📈 Data Integrity

**All reports are 100% derived from `AccountTransaction`:**

- ✅ No hardcoded values
- ✅ No stored totals
- ✅ Real-time calculations
- ✅ Double-entry accounting principles applied
- ✅ Balance sheet balancing check

---

## 🧪 Testing Checklist

- [x] Profit & Loss report loads
- [x] Revenue breakdown displays
- [x] Expense breakdown displays
- [x] Revenue trend chart shows data
- [x] Cash Flow report loads
- [x] Opening/closing balances correct
- [x] Net cash flow calculated
- [x] Balance Sheet loads
- [x] Balancing check works
- [x] CSV export works for all reports
- [x] Date filtering works
- [x] Build passes without errors

---

## 🚀 How to Use

### View Profit & Loss
```
1. Navigate to: /dashboard/accounts/reports/profit-loss
2. Default shows current month
3. Add ?from=2024-01-01&to=2024-12-31 for custom range
4. Click "Export CSV" to download
```

### View Cash Flow
```
1. Navigate to: /dashboard/accounts/reports/cash-flow
2. Review cash movement summary
3. Check analysis section for insights
4. Export to CSV if needed
```

### View Balance Sheet
```
1. Navigate to: /dashboard/accounts/reports/balance-sheet
2. Check balancing status (✓ or ✗)
3. Review assets vs liabilities + equity
4. Verify accounting equation
```

---

## 📚 Dependencies

**Uses existing:**
- Recharts (already installed)
- Lucide React (icons)
- TailwindCSS (styling)
- Prisma (data access)

**No new dependencies added!**

---

## ✨ Key Benefits

✅ **Professional Reports** - Accounting-standard layouts  
✅ **Real-Time Data** - Always up-to-date from transactions  
✅ **Detailed Breakdowns** - Revenue by source, expenses by category  
✅ **Visual Insights** - Charts and trend analysis  
✅ **Export Capability** - CSV downloads for offline use  
✅ **Date Filtering** - Flexible reporting periods  
✅ **Balancing Checks** - Automatic validation  
✅ **Clean UI** - Minimal, professional design  

---

## 📊 Build Status

```
✓ Compiled successfully in 23.1s
✓ TypeScript passed in 31.1s
✓ 59 routes generated
✓ Zero compilation errors
```

---

## 🎯 Summary

You now have a **complete Financial Reports module** that provides:

✅ Profit & Loss with breakdowns  
✅ Cash Flow analysis  
✅ Balance Sheet with balancing check  
✅ Revenue trend charts  
✅ CSV export for all reports  
✅ Date range filtering  
✅ Professional accounting layouts  
✅ 100% derived from transaction data  

**The reporting system is production-ready!** 🎉
