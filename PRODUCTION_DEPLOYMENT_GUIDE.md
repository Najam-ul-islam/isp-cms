# Production Deployment Guide - Invoice History System

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] Database migration applied
- [ ] Backfill script run on existing data
- [ ] Environment variables configured
- [ ] Cron job scheduled
- [ ] Staging testing completed

---

## 1. Database Migration

### Apply Schema Changes

```bash
# Navigate to project directory
cd /path/to/isp-cms

# Apply migration (this will add invoice history fields)
npx prisma migrate dev --name add_invoice_history_fields

# OR in production (without dev data reset)
npx prisma migrate deploy
```

### Verify Migration

```bash
# Check if new columns exist
npx prisma db pull
```

Expected new fields in `Invoice` model:
- `billingMonth` (String?)
- `carryForwardAmount` (Float)
- `creditUsed` (Float)
- `previousInvoiceId` (String?)

---

## 2. Backfill Existing Invoices

### Step 1: Dry Run (Recommended First)

```bash
# Preview what will be updated (no changes made)
npx tsx lib/migrations/backfill-invoice-billing-month.ts --dry-run
```

### Step 2: Run Backfill

```bash
# Apply the backfill
npx tsx lib/migrations/backfill-invoice-billing-month.ts
```

**What it does:**
1. Finds all invoices where `billingMonth` is null
2. Extracts year/month from `issuedDate`
3. Updates `billingMonth` to "YYYY-MM" format
4. Builds invoice chains (links each invoice to previous one)

**Expected Output:**
```
=== Backfill Invoice Billing Month Started ===
Found 150 invoices without billingMonth

  Progress: 100/150
  Progress: 150/150

✅ BillingMonth Backfill Complete:
   Updated: 150
   Errors: 0

=== Building Invoice Chains ===
  Invoice chains built: 120 links

=== Migration Complete ===
✅ All invoices now have billingMonth and are properly chained
```

---

## 3. Production Cron Job Setup

### Option A: Linux/Mac (Crontab)

#### Step 1: Edit Crontab

```bash
crontab -e
```

#### Step 2: Add Monthly Invoice Generation

```bash
# Run on 1st of every month at midnight
0 0 1 * * cd /path/to/isp-cms && /usr/local/bin/npx tsx lib/cron/generate-monthly-invoices.ts >> /var/log/isp-invoice-cron.log 2>&1

# Alternative: Run at 9 AM on 1st (business hours)
0 9 1 * * cd /path/to/isp-cms && /usr/local/bin/npx tsx lib/cron/generate-monthly-invoices.ts >> /var/log/isp-invoice-cron.log 2>&1
```

#### Step 3: Verify Cron

```bash
crontab -l
```

#### Step 4: Create Log Rotation (Optional but Recommended)

Create `/etc/logrotate.d/isp-invoice-cron`:

```
/var/log/isp-invoice-cron.log {
    monthly
    rotate 12
    compress
    missingok
    notifempty
}
```

---

### Option B: Windows Task Scheduler

#### Step 1: Open Task Scheduler

- Press `Win + R`
- Type `taskschd.msc`
- Press Enter

#### Step 2: Create Basic Task

1. **Action** → **Create Basic Task**
2. **Name:** `ISP Monthly Invoice Generation`
3. **Description:** `Automatically generates monthly invoices for all active clients`
4. Click **Next**

#### Step 3: Set Trigger

1. Select **Monthly**
2. Click **Next**
3. **Start:** Set to first day of current month
4. **Months:** Select all months (or specific ones)
5. **Days:** Check "1"
6. Click **Next**

#### Step 4: Set Action

1. Select **Start a program**
2. Click **Next**
3. **Program/script:** `npx`
4. **Add arguments:** `tsx lib/cron/generate-monthly-invoices.ts`
5. **Start in:** `D:\ISP-Client_management-System\isp-cms`
6. Click **Next**
7. Click **Finish**

#### Step 5: Configure Advanced Settings

1. Right-click the task → **Properties**
2. **General tab:**
   - ✅ Run whether user is logged on or not
   - ✅ Run with highest privileges
3. **Conditions tab:**
   - ✅ Start only if on AC power (for laptops)
4. **Settings tab:**
   - ✅ Allow task to be run on demand
   - ✅ If task fails, restart every: 1 minute
   - Attempt to restart up to: 3 times
5. Click **OK**

#### Step 6: Test the Task

1. Right-click the task → **Run**
2. Check **History** tab for execution logs

---

### Option C: Docker/Kubernetes

#### Docker Compose

Add to `docker-compose.yml`:

```yaml
services:
  invoice-cron:
    build: .
    command: ["npx", "tsx", "lib/cron/generate-monthly-invoices.ts"]
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NODE_ENV=production
    volumes:
      - ./logs:/app/logs
    restart: "no"
    # Use docker-cron or external scheduler
```

#### Kubernetes CronJob

Create `invoice-cronjob.yaml`:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: monthly-invoice-generation
  namespace: isp-cms
spec:
  schedule: "0 0 1 * *"  # At 00:00 on day-of-month 1
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: invoice-generator
            image: your-registry/isp-cms:latest
            command: ["npx", "tsx", "lib/cron/generate-monthly-invoices.ts"]
            env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: database-url
            - name: NODE_ENV
              value: "production"
          restartPolicy: OnFailure
      backoffLimit: 3
```

Apply:

```bash
kubectl apply -f invoice-cronjob.yaml
```

---

### Option D: Vercel/Serverless (API Endpoint Trigger)

If deploying on Vercel or similar, use the API endpoint instead:

#### Create Vercel Cron

In `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/generate-monthly-invoices",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

Create API route `app/api/cron/generate-monthly-invoices/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { generateMonthlyInvoices } from '@/lib/cron/generate-monthly-invoices';

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await generateMonthlyInvoices();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Cron job failed:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

Add to `.env`:

```env
CRON_SECRET=your-secure-random-string-here
```

---

## 4. Environment Variables

Ensure these are set in production:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/dbname

# Application
NODE_ENV=production

# Optional: For Vercel cron
CRON_SECRET=your-secure-random-string
```

---

## 5. Monitoring & Logging

### Log File Location

- **Linux/Mac:** `/var/log/isp-invoice-cron.log`
- **Windows:** Check Task Scheduler History tab
- **Docker:** `docker logs <container-name>`

### Sample Log Output

```
=== Monthly Invoice Generation Started ===
Timestamp: 2026-04-01T00:00:00.000Z
Billing Month: 2026-04
Found 3 active companies

--- Processing Company: ABC ISP (abc123) ---
Results for ABC ISP:
  ✅ Success: 45
  ⏭️  Skipped: 5
  ❌ Failed: 0

=== Monthly Invoice Generation Completed ===
```

### Monitoring Alerts (Optional)

Set up alerts for failures using:
- **UptimeRobot** - Monitor API health endpoint
- **Sentry** - Track errors
- **Datadog** - Custom metrics

---

## 6. Staging Environment Testing

### Test Script

```bash
# Run the staging test script
npx tsx lib/testing/staging-test.ts
```

This will:
1. Create test client (if doesn't exist)
2. Generate invoice for current month
3. Verify carry-forward logic
4. Test credit application
5. Verify invoice chain
6. Clean up test data

### Manual Testing Steps

1. **Create Test Invoice:**
   ```bash
   curl -X POST http://localhost:3000/api/clients/CLIENT_ID/invoices/generate \
     -H "Content-Type: application/json" \
     -d '{"billingMonth": "2026-04", "applyCredits": true, "carryForward": true}'
   ```

2. **View Invoice History:**
   ```
   http://localhost:3000/dashboard/clients/CLIENT_ID/invoices
   ```

3. **Verify Database:**
   ```sql
   SELECT 
     id, 
     billing_month, 
     amount, 
     carry_forward_amount, 
     credit_used, 
     previous_invoice_id
   FROM invoices
   WHERE client_id = 'CLIENT_ID'
   ORDER BY issued_date DESC
   LIMIT 10;
   ```

---

## 7. Rollback Plan

If issues arise after deployment:

### Step 1: Disable Cron Job

```bash
# Linux/Mac
crontab -e  # Comment out the line with #

# Windows
# Disable in Task Scheduler
```

### Step 2: Revert Code

```bash
git revert <commit-hash>
npm run build
pm2 restart all  # or your process manager command
```

### Step 3: Database Rollback (If Needed)

```bash
# Revert last migration
npx prisma migrate resolve --rolled-back add_invoice_history_fields

# OR rollback completely
npx prisma migrate reset
```

⚠️ **Warning:** `migrate reset` will delete all data. Use only in emergencies.

---

## 8. Performance Considerations

### For Large Datasets (10,000+ clients)

1. **Batch Processing:**
   - Modify cron script to process in batches of 100
   - Add delays between batches to prevent DB overload

2. **Database Indexes:**
   ```sql
   CREATE INDEX idx_invoices_billing_month ON invoices(billing_month);
   CREATE INDEX idx_invoices_previous_id ON invoices(previous_invoice_id);
   ```

3. **Connection Pooling:**
   - Use PgBouncer or similar
   - Configure Prisma connection pool size

4. **Background Jobs:**
   - Consider using Bull/Redis for job queuing
   - Better than direct cron for distributed systems

---

## 9. Security Checklist

- [ ] Cron endpoint protected with secret (if using API trigger)
- [ ] Database credentials secured in environment variables
- [ ] Log files have restricted permissions (`chmod 600`)
- [ ] Rate limiting enabled on invoice generation endpoints
- [ ] Audit logging enabled for invoice creation
- [ ] Access control verified (only ADMIN can generate)

---

## 10. Post-Deployment Verification

### Verify Everything Works

```bash
# 1. Check invoices exist
curl http://localhost:3000/api/clients/CLIENT_ID/invoices

# 2. Verify billing month format
# Should return "2026-04" not null

# 3. Check invoice chain
# Look for previousInvoiceId in response

# 4. Test carry-forward
# Create partial payment, then generate next month invoice

# 5. Test credits
# Overpay invoice, verify creditUsed in next invoice
```

### Health Check Endpoint (Optional)

Create `app/api/health/invoices/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const totalInvoices = await prisma.invoice.count();
    const invoicesWithBillingMonth = await prisma.invoice.count({
      where: { billingMonth: { not: null } }
    });
    const chainedInvoices = await prisma.invoice.count({
      where: { previousInvoiceId: { not: null } }
    });

    return NextResponse.json({
      status: 'healthy',
      invoices: {
        total: totalInvoices,
        withBillingMonth: invoicesWithBillingMonth,
        chained: chainedInvoices,
        health: invoicesWithBillingMonth === totalInvoices ? '✅' : '⚠️'
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'unhealthy', error: error.message },
      { status: 500 }
    );
  }
}
```

Test:
```bash
curl http://localhost:3000/api/health/invoices
```

---

## 📞 Support

If you encounter issues during deployment:

1. Check logs: `tail -f /var/log/isp-invoice-cron.log`
2. Verify database connection
3. Test API endpoints manually
4. Review `INVOICE_HISTORY_SYSTEM.md` for architecture details
5. Check Prisma logs for database errors

---

**Last Updated:** April 13, 2026  
**Version:** 1.0.0
