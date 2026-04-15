# SaaS Billing & Invoicing System

## Overview
The SaaS billing system is a **completely isolated** invoice and payment management system for SaaS companies, separate from the client billing module.

## Database Schema

### SaaSInvoice Model
- **Table**: `saas_invoices`
- **Purpose**: Track subscription invoices for SaaS companies
- **Key Fields**:
  - `companyId` - Links to the Company
  - `amount` - Base invoice amount
  - `carryForwardAmount` - Unpaid amount from previous invoice
  - `creditUsed` - Credits/overpayments applied
  - `billingPeriod` - Format: "2026-04" or "2026-Q1"
  - `planId` - Optional link to subscription plan
  - `status` - unpaid, partial, paid, overdue, cancelled
  - `previousInvoiceId` - Links to previous invoice for chaining

### SaaSPayment Model
- **Table**: `saas_payments`
- **Purpose**: Track payments made against SaaS invoices
- **Key Fields**:
  - `invoiceId` - Links to SaaSInvoice
  - `amount` - Payment amount
  - `method` - bank_transfer, credit_card, jazzcash, easypaisa, etc.
  - `gateway` - Payment gateway name
  - `transactionId` - Gateway transaction reference
  - `status` - pending, success, failed, refunded

## Features

### 1. Invoice Management
- **Create Invoices**: Generate subscription invoices with amounts, descriptions, and due dates
- **Invoice Chaining**: Automatically carries forward unpaid amounts from previous invoices
- **Duplicate Prevention**: Prevents multiple unpaid invoices for the same company
- **Status Tracking**: Automatic status updates based on payments (unpaid → partial → paid)

### 2. Payment Tracking
- **Record Payments**: Log payments against invoices with method, gateway, and transaction details
- **Multiple Payments**: Support for partial payments across multiple transactions
- **Auto Status Update**: Invoice status automatically updates based on payment totals
- **Payment History**: Complete payment history with timestamps and details

### 3. Credit & Carry-Forward System
- **Automatic Carry-Forward**: Unpaid amounts automatically roll to next invoice
- **Credit Application**: Apply overpayments as credits to future invoices
- **Invoice Chaining**: Maintains chain of related invoices for audit trail

### 4. Financial Reporting
- **Total Billed**: Sum of all invoice amounts + carry-forward amounts
- **Total Paid**: Sum of all successful payments
- **Outstanding**: Total remaining unpaid amounts

## API Endpoints

### GET `/api/saas/companies/[id]/invoices`
Fetch all invoices for a company with optional status filter.

**Query Parameters:**
- `status` - Filter by status (all, unpaid, partial, paid, overdue)

**Response:**
```json
{
  "invoices": [...],
  "stats": {
    "totalBilled": 150000,
    "totalPaid": 100000,
    "totalRemaining": 50000,
    "totalInvoices": 5
  }
}
```

### POST `/api/saas/companies/[id]/invoices`
Create a new invoice OR record a payment.

**For Invoice Creation:**
```json
{
  "amount": 50000,
  "description": "SaaS subscription for Company ABC",
  "dueDate": "2026-05-14",
  "billingPeriod": "2026-04",
  "planId": "plan_id_here"
}
```

**For Payment Recording:**
```json
{
  "action": "recordPayment",
  "invoiceId": "invoice_id_here",
  "amount": 25000,
  "method": "bank_transfer",
  "notes": "Payment received via bank transfer",
  "gateway": "HBL",
  "transactionId": "TXN123456"
}
```

## Pages

### `/saas/companies/[id]/invoices`
**SaaS Invoices List Page**
- Summary cards (Total Billed, Paid, Outstanding)
- Advanced filtering by status
- Search by invoice ID, description, or billing period
- Quick actions: View details, Record payment
- Responsive table with payment status indicators

### `/saas/companies/[id]/invoices/[invoiceId]`
**Invoice Details Page**
- Invoice breakdown (base amount, carry-forward, credits)
- Payment history with full details
- Status banner with visual indicators
- Record payment action
- Previous invoice link (if carry-forward exists)

## Components

### SaaSInvoicesTable
- Invoice listing with advanced filters
- Status badges with color coding
- Quick payment button
- Search functionality

### RecordPaymentModal
- Payment amount input with validation
- Payment method selector (bank_transfer, credit_card, etc.)
- Gateway and transaction ID fields
- Notes textarea for additional details
- Invoice summary display

### SaaSInvoiceDetails
- Full invoice breakdown
- Payment history display
- Status indicators
- Invoice chaining visualization

## Service Layer

### `lib/saas/invoiceService.ts`

**Key Functions:**

1. **getSaaSInvoicesByCompany(companyId, status?)**
   - Fetches invoices with payment totals
   - Calculates remaining amounts
   - Returns effective payment status

2. **getSaaSInvoiceById(invoiceId)**
   - Fetches single invoice with full details
   - Includes payments, plan, and company info
   - Calculates totals and remaining amount

3. **getSaaSInvoiceStats(companyId)**
   - Returns financial statistics
   - Total billed, paid, and outstanding

4. **createSaaSInvoice(input)**
   - Creates new invoice with carry-forward logic
   - Prevents duplicate unpaid invoices
   - Links to previous invoice if carrying forward

5. **recordSaaSPayment(input)**
   - Records payment against invoice
   - Updates invoice status automatically
   - Validates invoice existence

6. **updateSaaSInvoiceStatus(invoiceId, status)**
   - Manually update invoice status

7. **deleteSaaSInvoice(invoiceId)**
   - Deletes invoice and associated payments

## Isolation from Client Billing

The SaaS billing system is **completely isolated** from client billing:

| Feature | Client Billing | SaaS Billing |
|---------|---------------|--------------|
| **Invoice Model** | `Invoice` | `SaaSInvoice` |
| **Payment Model** | `Payment` | `SaaSPayment` |
| **Database Tables** | `invoices`, `payments` | `saas_invoices`, `saas_payments` |
| **API Routes** | `/api/invoices/*` | `/api/saas/companies/[id]/invoices` |
| **Pages** | `/dashboard/clients/[id]/invoices` | `/saas/companies/[id]/invoices` |
| **Purpose** | ISP client subscriptions | SaaS company subscriptions |

**No data is shared between the two systems.**

## Usage Flow

### Creating a SaaS Invoice
1. Navigate to `/saas/companies/[id]`
2. Click "Generate Invoice" button
3. Enter amount, description, and due date
4. System checks for existing unpaid invoices
5. If none exists, creates invoice with carry-forward if applicable
6. View all invoices at `/saas/companies/[id]/invoices`

### Recording a Payment
1. Navigate to invoice list or details page
2. Click "Record Payment" or "Pay" button
3. Enter payment amount and method
4. Optionally add gateway, transaction ID, and notes
5. Payment is recorded and invoice status updates automatically

### Viewing Invoice Details
1. Click "View" on any invoice
2. See complete breakdown of amounts
3. View payment history
4. See carry-forward information from previous invoices
5. Record additional payments if needed

## Status Logic

Invoice status is **automatically calculated** based on payments:

- **unpaid**: No payments recorded (totalPaid = 0)
- **partial**: Some payments recorded but balance remains (totalPaid > 0 && remainingAmount > 0)
- **paid**: Full amount paid (remainingAmount <= 0)
- **overdue**: Past due date and not fully paid (manual status)
- **cancelled**: Invoice cancelled by admin (manual status)

**Formula:**
```
totalAmount = amount + carryForwardAmount
remainingAmount = max(0, totalAmount - totalPaid - creditUsed)

if totalPaid == 0 → unpaid
else if remainingAmount > 0 → partial
else → paid
```

## Future Enhancements

Potential improvements for the SaaS billing system:

1. **Automated Invoice Generation**: Monthly recurring invoices based on subscription plans
2. **Payment Gateway Integration**: Stripe, JazzCash, EasyPaisa API integration
3. **Email Notifications**: Send invoices and payment receipts via email
4. **PDF Invoice Generation**: Download printable invoice PDFs
5. **Late Payment Reminders**: Automated reminders for overdue invoices
6. **Revenue Analytics**: Charts and graphs for revenue trends
7. **Multi-Currency Support**: Support for international companies
8. **Tax Calculation**: Automatic tax calculation based on company location
9. **Discount System**: Apply discounts or promotional codes
10. **Refund Processing**: Handle refunds and credit notes

## Migration History

- **2026-04-14**: Initial SaaS billing system created
  - Added `SaaSInvoice` and `SaaSPayment` models
  - Created service layer with full CRUD operations
  - Built invoice list and details pages
  - Implemented payment tracking and carry-forward logic
  - Ensured complete isolation from client billing

## Support

For issues or questions related to SaaS billing:
- Check API route: `/api/saas/companies/[id]/invoices/route.ts`
- Check service: `/lib/saas/invoiceService.ts`
- Check schema: `/prisma/schema.prisma` (search for `SaaSInvoice`)
