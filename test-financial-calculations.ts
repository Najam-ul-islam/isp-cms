/**
 * Financial Calculation Validation Test Script
 * 
 * This script tests:
 * 1. Today's Recovery - sums payments where paymentDate is today
 * 2. Today's Expense - sums expenses where date is today
 * 3. Other Income - sums product sales profit (totalOtherIncome)
 * 4. Pending Recovery - sums remaining amounts from unpaid/partial invoices
 * 
 * Run with: npx tsx test-financial-calculations.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

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

const yesterday = (): Date => {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  y.setHours(0, 0, 0, 0);
  return y;
};

const endOfYesterday = (): Date => {
  const y = yesterday();
  y.setHours(23, 59, 59, 999);
  return y;
};

let testCompanyId: string | null = null;

// ─────────────────────────────────────────────────────────────
// Test Report
// ─────────────────────────────────────────────────────────────

interface TestResult {
  test: string;
  passed: boolean;
  expected: any;
  actual: any;
  message: string;
}

const testResults: TestResult[] = [];

const assert = (test: string, expected: any, actual: any, message: string) => {
  const passed = expected === actual;
  testResults.push({ test, passed, expected, actual, message });
  
  if (passed) {
    console.log(`  ✅ ${test}: PASSED`);
  } else {
    console.log(`  ❌ ${test}: FAILED`);
    console.log(`     Expected: ${expected}`);
    console.log(`     Actual:   ${actual}`);
    console.log(`     ${message}`);
  }
};

const assertApprox = (test: string, expected: number, actual: number, tolerance: number = 0.01, message: string = '') => {
  const passed = Math.abs(expected - actual) <= tolerance;
  testResults.push({ test, passed, expected, actual, message });
  
  if (passed) {
    console.log(`  ✅ ${test}: PASSED`);
  } else {
    console.log(`  ❌ ${test}: FAILED`);
    console.log(`     Expected: ${expected}`);
    console.log(`     Actual:   ${actual}`);
    console.log(`     ${message}`);
  }
};

// ─────────────────────────────────────────────────────────────
// Main Test Flow
// ─────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 FINANCIAL CALCULATION VALIDATION TESTS');
  console.log('='.repeat(80) + '\n');

  try {
    // Step 0: Find or create test company
    console.log('📋 Step 0: Setting up test company...');
    const existingCompany = await prisma.company.findFirst({
      where: { name: { contains: 'Test' } }
    });

    if (existingCompany) {
      testCompanyId = existingCompany.id;
      console.log(`   Using existing company: ${existingCompany.name} (${existingCompany.id})`);
    } else {
      const newCompany = await prisma.company.create({
        data: {
          name: 'Test Company - Financial Validation',
          isActive: true,
          modulesEnabled: { billing: true, inventory: true, employees: true }
        }
      });
      testCompanyId = newCompany.id;
      console.log(`   Created new company: ${newCompany.name} (${newCompany.id})`);
    }

    // Step 1: Create Test Package
    console.log('\n📦 Step 1: Creating test package (Rs. 1500)...');
    const testPackage = await prisma.package.create({
      data: {
        name: `Test Package 1500 - ${Date.now()}`,
        speed: 10,
        price: 1500,
        durationDays: 30,
        description: 'Test package for financial validation',
        isActive: true,
        createdBy: (await prisma.admin.findFirst())?.id || '',
        companyId: testCompanyId
      }
    });
    console.log(`   Created package: ${testPackage.name} (Rs. ${testPackage.price})`);

    // Step 2: Create Test Client
    console.log('\n👤 Step 2: Creating test client...');
    const today = new Date();
    const expiryDate = new Date(today);
    expiryDate.setDate(expiryDate.getDate() + 30);

    const testClient = await prisma.client.create({
      data: {
        name: `Test Client - Financial Validation`,
        username: `testclient_${Date.now()}`,
        phone: `92${Date.now().toString().slice(-10)}`,
        cnic: `12345-${Date.now().toString().slice(-7)}-1`,
        city: 'Test City',
        country: 'Pakistan',
        packageId: testPackage.id,
        price: testPackage.price,
        startDate: today,
        expiryDate: expiryDate,
        paymentStatus: 'unpaid',
        status: 'active',
        createdBy: (await prisma.admin.findFirst())?.id || '',
        companyId: testCompanyId,
        email: `testclient_${Date.now()}@test.com`
      }
    });
    console.log(`   Created client: ${testClient.name} (ID: ${testClient.id.slice(-8)})`);

    // Step 3: Create Invoice
    console.log('\n📄 Step 3: Creating invoice...');
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 7);

    const testInvoice = await prisma.invoice.create({
      data: {
        clientId: testClient.id,
        amount: testPackage.price,
        totalAmount: testPackage.price,
        issuedDate: today,
        dueDate: dueDate,
        status: 'unpaid',
        description: 'Monthly subscription',
        companyId: testCompanyId
      }
    });
    console.log(`   Created invoice: ${testInvoice.id.slice(-8)} (Amount: Rs. ${testInvoice.amount})`);

    // ───────────────────────────────────────────────────────
    // Test Case A: Partial Payment (Rs. 500)
    // ───────────────────────────────────────────────────────
    console.log('\n💰 Test Case A: Partial Payment (Rs. 500)...');
    
    const partialPayment = await prisma.payment.create({
      data: {
        clientId: testClient.id,
        invoiceId: testInvoice.id,
        amount: 500,
        paymentDate: today,
        status: 'success',
        companyId: testCompanyId
      }
    });
    console.log(`   Created partial payment: Rs. ${partialPayment.amount}`);

    // Update invoice status to partial
    await prisma.invoice.update({
      where: { id: testInvoice.id },
      data: { status: 'partial' }
    });

    // Update client payment status
    await prisma.client.update({
      where: { id: testClient.id },
      data: { paymentStatus: 'partial' }
    });

    // Validate Today's Recovery after partial payment
    const todaysRecoveryA = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        companyId: testCompanyId,
        status: 'success',
        paymentDate: {
          gte: startOfDay(),
          lte: endOfDay()
        }
      }
    });

    assert(
      'Today\'s Recovery (after partial)',
      500,
      todaysRecoveryA._sum.amount,
      'Should sum payments where paymentDate is today'
    );

    // Calculate pending recovery manually
    const invoicePayments = await prisma.payment.findMany({
      where: { invoiceId: testInvoice.id }
    });
    const totalPaid = invoicePayments.reduce((sum, p) => sum + p.amount, 0);
    const pendingRecoveryA = testInvoice.amount - totalPaid;

    assert(
      'Pending Recovery (after partial)',
      1000,
      pendingRecoveryA,
      'Should be invoice amount - total paid'
    );

    // ───────────────────────────────────────────────────────
    // Test Case B: Full Payment (Rs. 1000)
    // ───────────────────────────────────────────────────────
    console.log('\n💰 Test Case B: Full Payment (Rs. 1000)...');
    
    const fullPayment = await prisma.payment.create({
      data: {
        clientId: testClient.id,
        invoiceId: testInvoice.id,
        amount: 1000,
        paymentDate: today,
        status: 'success',
        companyId: testCompanyId
      }
    });
    console.log(`   Created full payment: Rs. ${fullPayment.amount}`);

    // Update invoice status to paid
    await prisma.invoice.update({
      where: { id: testInvoice.id },
      data: { status: 'paid' }
    });

    // Update client payment status
    await prisma.client.update({
      where: { id: testClient.id },
      data: { paymentStatus: 'paid' }
    });

    // Validate Today's Recovery aggregates both payments
    const todaysRecoveryB = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        companyId: testCompanyId,
        status: 'success',
        paymentDate: {
          gte: startOfDay(),
          lte: endOfDay()
        }
      }
    });

    assertApprox(
      'Today\'s Recovery (after full)',
      1500,
      todaysRecoveryB._sum.amount || 0,
      0.01,
      'Should aggregate multiple payments on same day'
    );

    // Pending recovery should be 0 after full payment
    const allInvoicePayments = await prisma.payment.findMany({
      where: { invoiceId: testInvoice.id }
    });
    const totalPaidFull = allInvoicePayments.reduce((sum, p) => sum + p.amount, 0);
    const pendingRecoveryB = Math.max(testInvoice.amount - totalPaidFull, 0);

    assert(
      'Pending Recovery (after full)',
      0,
      pendingRecoveryB,
      'Should be 0 after invoice is fully paid'
    );

    // ───────────────────────────────────────────────────────
    // Test Case C: Expense Testing
    // ───────────────────────────────────────────────────────
    console.log('\n💸 Test Case C: Adding expense (Rs. 300)...');
    
    const testExpense = await prisma.expense.create({
      data: {
        title: 'Test Expense - Internet Bill',
        amount: 300,
        category: 'Utilities',
        date: today,
        description: 'Monthly internet expense',
        companyId: testCompanyId
      }
    });
    console.log(`   Created expense: Rs. ${testExpense.amount}`);

    // Validate Today's Expense
    const todaysExpense = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        companyId: testCompanyId,
        date: {
          gte: startOfDay(),
          lte: endOfDay()
        }
      }
    });

    assert(
      'Today\'s Expense',
      300,
      todaysExpense._sum.amount,
      'Should sum expenses where date is today'
    );

    // ───────────────────────────────────────────────────────
    // Test Case D: Product Sale Testing
    // ───────────────────────────────────────────────────────
    console.log('\n🛒 Test Case D: Adding product sale (Rs. 2000, profit Rs. 500)...');
    
    const testProductSale = await prisma.productSale.create({
      data: {
        clientId: testClient.id,
        productName: 'Test Router',
        actualPrice: 1500,
        sellingPrice: 2000,
        quantity: 1,
        unitProfit: 500,
        totalOtherIncome: 500,
        saleDate: today,
        status: 'unpaid',
        companyId: testCompanyId
      }
    });
    console.log(`   Created product sale: Profit Rs. ${testProductSale.totalOtherIncome}`);

    // Validate Other Income (should be product sales profit, NOT payments)
    const otherIncome = await prisma.productSale.aggregate({
      _sum: { totalOtherIncome: true },
      where: {
        companyId: testCompanyId,
        saleDate: {
          gte: startOfDay(),
          lte: endOfDay()
        }
      }
    });

    assert(
      'Other Income (product sales)',
      500,
      otherIncome._sum.totalOtherIncome,
      'Should ONLY include product sales profit, not payments'
    );

    // ───────────────────────────────────────────────────────
    // Test Case E: Backdated Payment (should NOT affect today)
    // ───────────────────────────────────────────────────────
    console.log('\n📅 Test Case E: Backdated payment (yesterday)...');
    
    // Create another invoice for backdated payment test
    const invoice2 = await prisma.invoice.create({
      data: {
        clientId: testClient.id,
        amount: 1000,
        totalAmount: 1000,
        issuedDate: today,
        dueDate: dueDate,
        status: 'unpaid',
        companyId: testCompanyId
      }
    });

    const backdatedPayment = await prisma.payment.create({
      data: {
        clientId: testClient.id,
        invoiceId: invoice2.id,
        amount: 750,
        paymentDate: yesterday(),
        status: 'success',
        companyId: testCompanyId
      }
    });
    console.log(`   Created backdated payment: Rs. ${backdatedPayment.amount} (yesterday)`);

    // Validate Today's Recovery is NOT affected
    const todaysRecoveryAfterBackdated = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        companyId: testCompanyId,
        status: 'success',
        paymentDate: {
          gte: startOfDay(),
          lte: endOfDay()
        }
      }
    });

    assertApprox(
      'Today\'s Recovery (after backdated)',
      1500,
      todaysRecoveryAfterBackdated._sum.amount || 0,
      0.01,
      'Backdated payments should NOT affect today\'s recovery'
    );

    // ───────────────────────────────────────────────────────
    // Test Case F: No Data Scenario
    // ───────────────────────────────────────────────────────
    console.log('\n📊 Test Case F: No data scenario (tomorrow)...');
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tomorrowsRecovery = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        companyId: testCompanyId,
        status: 'success',
        paymentDate: {
          gte: startOfDay(tomorrow),
          lte: endOfDay(tomorrow)
        }
      }
    });

    assert(
      'No data returns 0 (not null/NaN)',
      0,
      tomorrowsRecovery._sum.amount || 0,
      'Should return 0 when no data exists'
    );

    // ───────────────────────────────────────────────────────
    // Test Case G: Multiple Payments Same Day
    // ───────────────────────────────────────────────────────
    console.log('\n💰 Test Case G: Multiple payments same day...');
    
    const invoice3 = await prisma.invoice.create({
      data: {
        clientId: testClient.id,
        amount: 2000,
        totalAmount: 2000,
        issuedDate: today,
        dueDate: dueDate,
        status: 'unpaid',
        companyId: testCompanyId
      }
    });

    await prisma.payment.create({
      data: {
        clientId: testClient.id,
        invoiceId: invoice3.id,
        amount: 500,
        paymentDate: today,
        status: 'success',
        companyId: testCompanyId
      }
    });

    await prisma.payment.create({
      data: {
        clientId: testClient.id,
        invoiceId: invoice3.id,
        amount: 700,
        paymentDate: today,
        status: 'success',
        companyId: testCompanyId
      }
    });

    await prisma.payment.create({
      data: {
        clientId: testClient.id,
        invoiceId: invoice3.id,
        amount: 800,
        paymentDate: today,
        status: 'success',
        companyId: testCompanyId
      }
    });

    const multiPaymentRecovery = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        companyId: testCompanyId,
        status: 'success',
        paymentDate: {
          gte: startOfDay(),
          lte: endOfDay()
        }
      }
    });

    assertApprox(
      'Multiple payments same day',
      3500, // 1500 (invoice 1) + 500 + 700 + 800 (invoice 3)
      multiPaymentRecovery._sum.amount || 0,
      0.01,
      'Should correctly sum multiple payments on same day'
    );

    // ───────────────────────────────────────────────────────
    // Summary
    // ───────────────────────────────────────────────────────
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));
    
    const passed = testResults.filter(r => r.passed).length;
    const failed = testResults.filter(r => !r.passed).length;
    
    console.log(`\nTotal Tests: ${testResults.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      testResults.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.test}`);
        console.log(`    Expected: ${r.expected}, Actual: ${r.actual}`);
        console.log(`    ${r.message}\n`);
      });
    } else {
      console.log('\n✅ ALL TESTS PASSED!');
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Test execution error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
runTests();
