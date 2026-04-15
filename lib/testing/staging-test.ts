import { prisma } from '@/lib/prisma';
import { 
  generateMonthlyInvoice, 
  getInvoiceHistory
} from '@/modules/invoices/services';
import { getInvoicePaymentSummary } from '@/lib/payment-calculator';

/**
 * Staging Environment Test Script
 * 
 * Tests the complete invoice history system functionality
 * 
 * Usage:
 *   npx tsx lib/testing/staging-test.ts
 * 
 * What it tests:
 * 1. Invoice creation with carry-forward
 * 2. Credit application from overpayments
 * 3. Invoice chaining
 * 4. Invoice history retrieval
 * 5. Payment tracking
 * 6. Edge cases (no invoices, full payment, etc.)
 */

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const testResults: TestResult[] = [];

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warn: '⚠️'
  };
  console.log(`${icons[type]} ${message}`);
}

function assert(condition: boolean, testName: string, message: string) {
  testResults.push({
    name: testName,
    passed: condition,
    message
  });
  
  if (condition) {
    log(`${testName}: ${message}`, 'success');
  } else {
    log(`${testName}: ${message}`, 'error');
  }
}

async function runTests() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     Invoice History System - Staging Environment Test    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  let testClient: any = null;
  let testCompany: any = null;
  const createdInvoiceIds: string[] = [];

  try {
    // ============================================
    // SETUP: Create test company and client
    // ============================================
    console.log('\n📦 SETUP: Creating test data...\n');

    // Find or create test company
    testCompany = await prisma.company.findFirst({
      where: { name: { contains: 'Test Company' } }
    });

    if (!testCompany) {
      testCompany = await prisma.company.create({
        data: {
          name: 'Test Company (Staging)',
          isActive: true,
          modulesEnabled: { billing: true, inventory: false, employees: true }
        }
      });
      log(`Created test company: ${testCompany.id}`, 'info');
    }

    // Find or create test client
    testClient = await prisma.client.findFirst({
      where: { 
        companyId: testCompany.id,
        name: 'Test Client (Staging)'
      }
    });

    if (!testClient) {
      // Find or create a package first
      let testPackage = await prisma.package.findFirst({
        where: { name: 'Test Package (Staging)' }
      });

      if (!testPackage) {
        // Find an admin to be the creator
        const admin = await prisma.admin.findFirst({
          where: { companyId: testCompany.id }
        });

        if (!admin) {
          log('No admin found for test company. Creating one...', 'warn');
          // Create a test admin
          const hashedPassword = await require('bcrypt').hash('testpassword123', 10);
          const newAdmin = await prisma.admin.create({
            data: {
              name: 'Test Admin',
              email: `test-admin-${Date.now()}@test.com`,
              password: hashedPassword,
              role: 'ADMIN',
              companyId: testCompany.id
            }
          });

          testPackage = await prisma.package.create({
            data: {
              name: 'Test Package (Staging)',
              speed: 100,
              price: 1000,
              durationDays: 30,
              description: 'Test package for staging environment',
              isActive: true,
              createdBy: newAdmin.id,
              companyId: testCompany.id
            }
          });
        } else {
          testPackage = await prisma.package.create({
            data: {
              name: 'Test Package (Staging)',
              speed: 100,
              price: 1000,
              durationDays: 30,
              description: 'Test package for staging environment',
              isActive: true,
              createdBy: admin.id,
              companyId: testCompany.id
            }
          });
        }
      }

      // Find creator admin
      const creator = await prisma.admin.findFirst({
        where: { companyId: testCompany.id }
      });

      testClient = await prisma.client.create({
        data: {
          name: 'Test Client (Staging)',
          username: `test-client-${Date.now()}`,
          phone: `+92${Date.now().toString().slice(-10)}`,
          cnic: `12345-${Date.now().toString().slice(-7)}-1`,
          city: 'Test City',
          country: 'Pakistan',
          companyId: testCompany.id,
          packageId: testPackage.id,
          price: 1000,
          createdBy: creator!.id,
          startDate: new Date(),
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          paymentStatus: 'unpaid',
          status: 'active',
          areaName: 'Test Area'
        }
      });
      log(`Created test client: ${testClient.id}`, 'info');
    }

    // ============================================
    // TEST 1: First Invoice (No Carry-Forward)
    // ============================================
    console.log('\n🧪 TEST 1: Creating first invoice (no carry-forward)...\n');

    const currentMonth = new Date();
    const billingMonth1 = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;

    const invoice1 = await generateMonthlyInvoice(
      testClient.id,
      testCompany.id,
      billingMonth1,
      { allowDuplicate: true }
    );

    assert(
      invoice1 !== null,
      'Test 1.1',
      'First invoice created successfully'
    );

    if (invoice1) {
      createdInvoiceIds.push(invoice1.id);

      assert(
        invoice1.amount === 1000,
        'Test 1.2',
        `Invoice amount is correct: Rs. ${invoice1.amount}`
      );

      assert(
        invoice1.carryForwardAmount === 0,
        'Test 1.3',
        'First invoice has no carry-forward'
      );

      assert(
        invoice1.previousInvoiceId === null,
        'Test 1.4',
        'First invoice has no previous invoice link'
      );

      assert(
        invoice1.billingMonth === billingMonth1,
        'Test 1.5',
        `Billing month format correct: ${invoice1.billingMonth}`
      );
    }

    // ============================================
    // TEST 2: Simulate Partial Payment
    // ============================================
    console.log('\n💰 TEST 2: Simulating partial payment...\n');

    if (invoice1) {
      const partialPayment = await prisma.payment.create({
        data: {
          clientId: testClient.id,
          invoiceId: invoice1.id,
          amount: 500,
          method: 'CASH',
          status: 'success',
          companyId: testCompany.id,
          notes: 'Test partial payment'
        }
      });

      assert(
        partialPayment.amount === 500,
        'Test 2.1',
        'Partial payment created: Rs. 500'
      );

      // Verify remaining amount
      const summary1 = await getInvoicePaymentSummary(invoice1.id);
      
      assert(
        summary1.remainingAmount === 500,
        'Test 2.2',
        `Remaining amount after partial payment: Rs. ${summary1.remainingAmount}`
      );

      assert(
        summary1.effectivePaymentStatus === 'partial',
        'Test 2.3',
        'Invoice status updated to partial'
      );
    }

    // ============================================
    // TEST 3: Second Invoice with Carry-Forward
    // ============================================
    console.log('\n🔄 TEST 3: Creating second invoice (with carry-forward)...\n');

    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const billingMonth2 = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

    const invoice2 = await generateMonthlyInvoice(
      testClient.id,
      testCompany.id,
      billingMonth2,
      { allowDuplicate: true }
    );

    assert(
      invoice2 !== null,
      'Test 3.1',
      'Second invoice created successfully'
    );

    if (invoice2) {
      createdInvoiceIds.push(invoice2.id);

      assert(
        invoice2.carryForwardAmount === 500,
        'Test 3.2',
        `Carry-forward amount correct: Rs. ${invoice2.carryForwardAmount}`
      );

      assert(
        invoice2.previousInvoiceId === invoice1?.id,
        'Test 3.3',
        'Previous invoice link established'
      );

      const totalDue = invoice2.amount + invoice2.carryForwardAmount;
      assert(
        totalDue === 1500,
        'Test 3.4',
        `Total due with carry-forward: Rs. ${totalDue}`
      );
    }

    // ============================================
    // TEST 4: Simulate Overpayment (Create Credits)
    // ============================================
    console.log('\n💳 TEST 4: Simulating overpayment (creating credits)...\n');

    if (invoice2) {
      // Pay more than remaining
      const overPayment = await prisma.payment.create({
        data: {
          clientId: testClient.id,
          invoiceId: invoice2.id,
          amount: 2000, // More than Rs. 1500 due
          method: 'BANK_TRANSFER',
          status: 'success',
          companyId: testCompany.id,
          notes: 'Test overpayment'
        }
      });

      assert(
        overPayment.amount === 2000,
        'Test 4.1',
        'Overpayment created: Rs. 2000'
      );

      const summary2 = await getInvoicePaymentSummary(invoice2.id);
      
      assert(
        summary2.remainingAmount === 0,
        'Test 4.2',
        'Remaining amount is 0 after overpayment'
      );

      assert(
        summary2.overpaidAmount === 500,
        'Test 4.3',
        `Overpaid amount (credits): Rs. ${summary2.overpaidAmount}`
      );

      assert(
        summary2.effectivePaymentStatus === 'paid',
        'Test 4.4',
        'Invoice status updated to paid'
      );
    }

    // ============================================
    // TEST 5: Third Invoice with Credit Application
    // ============================================
    console.log('\n🎯 TEST 5: Creating third invoice (with credit application)...\n');

    const thirdMonth = new Date(nextMonth);
    thirdMonth.setMonth(thirdMonth.getMonth() + 1);
    const billingMonth3 = `${thirdMonth.getFullYear()}-${String(thirdMonth.getMonth() + 1).padStart(2, '0')}`;

    const invoice3 = await generateMonthlyInvoice(
      testClient.id,
      testCompany.id,
      billingMonth3,
      { allowDuplicate: true, applyCredits: true }
    );

    assert(
      invoice3 !== null,
      'Test 5.1',
      'Third invoice created successfully'
    );

    if (invoice3) {
      createdInvoiceIds.push(invoice3.id);

      assert(
        invoice3.creditUsed === 500,
        'Test 5.2',
        `Credit applied: Rs. ${invoice3.creditUsed}`
      );

      assert(
        invoice3.carryForwardAmount === 0,
        'Test 5.3',
        'No carry-forward (previous was fully paid)'
      );

      const netPayable = invoice3.amount - invoice3.creditUsed;
      assert(
        netPayable === 500,
        'Test 5.4',
        `Net payable after credits: Rs. ${netPayable}`
      );
    }

    // ============================================
    // TEST 6: Invoice History Retrieval
    // ============================================
    console.log('\n📊 TEST 6: Testing invoice history retrieval...\n');

    const history = await getInvoiceHistory(testClient.id, testCompany.id);

    assert(
      history.invoices.length >= 3,
      'Test 6.1',
      `Invoice history contains ${history.invoices.length} invoices`
    );

    assert(
      history.summary.totalBilled > 0,
      'Test 6.2',
      `Summary total billed: Rs. ${history.summary.totalBilled}`
    );

    assert(
      history.summary.totalPaid > 0,
      'Test 6.3',
      `Summary total paid: Rs. ${history.summary.totalPaid}`
    );

    // Verify invoice chain
    const hasChain = history.invoices.some(inv => inv.previousInvoiceId !== null);
    assert(
      hasChain,
      'Test 6.4',
      'Invoice chain established in history'
    );

    // ============================================
    // TEST 7: Edge Cases
    // ============================================
    console.log('\n🔍 TEST 7: Testing edge cases...\n');

    // Test duplicate prevention
    const duplicateAttempt = await generateMonthlyInvoice(
      testClient.id,
      testCompany.id,
      billingMonth3,
      { allowDuplicate: false }
    );

    assert(
      duplicateAttempt === null,
      'Test 7.1',
      'Duplicate invoice prevention works'
    );

    // Test invoice history for non-existent client
    const emptyHistory = await getInvoiceHistory(
      'non-existent-client-id',
      testCompany.id
    );

    assert(
      emptyHistory.invoices.length === 0,
      'Test 7.2',
      'Empty history returned for non-existent client'
    );

    // Test payment status updates
    if (invoice3) {
      await prisma.payment.create({
        data: {
          clientId: testClient.id,
          invoiceId: invoice3.id,
          amount: 500,
          method: 'CASH',
          status: 'success',
          companyId: testCompany.id,
          notes: 'Final payment test'
        }
      });

      const finalSummary = await getInvoicePaymentSummary(invoice3.id);
      
      assert(
        finalSummary.effectivePaymentStatus === 'paid',
        'Test 7.3',
        'Payment status correctly updates to paid'
      );
    }

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                    TEST SUMMARY                          ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    const passed = testResults.filter(t => t.passed).length;
    const failed = testResults.filter(t => !t.passed).length;

    console.log(`Total Tests: ${testResults.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}\n`);

    if (failed > 0) {
      console.log('Failed Tests:');
      testResults.filter(t => !t.passed).forEach(test => {
        console.log(`  ❌ ${test.name}: ${test.message}`);
      });
      console.log('');
    }

    if (failed === 0) {
      log('🎉 All tests passed! Invoice history system is working correctly.', 'success');
    } else {
      log(`⚠️  ${failed} test(s) failed. Review the errors above.`, 'warn');
    }

  } catch (error: any) {
    log(`Fatal error during testing: ${error.message}`, 'error');
    console.error(error);
  } finally {
    // ============================================
    // CLEANUP (Optional - comment out to keep test data)
    // ============================================
    console.log('\n🧹 CLEANUP: Removing test data...\n');

    try {
      // Delete created invoices
      if (createdInvoiceIds.length > 0) {
        // First delete payments
        await prisma.payment.deleteMany({
          where: {
            invoiceId: { in: createdInvoiceIds }
          }
        });

        // Then delete invoices
        await prisma.invoice.deleteMany({
          where: {
            id: { in: createdInvoiceIds }
          }
        });

        log(`Cleaned up ${createdInvoiceIds.length} test invoices`, 'info');
      }

      // Delete test client
      if (testClient) {
        await prisma.client.delete({
          where: { id: testClient.id }
        });
        log(`Cleaned up test client: ${testClient.id}`, 'info');
      }

      // Keep test company for future runs (it's reused)
      // If you want to delete it, uncomment below:
      // if (testCompany) {
      //   await prisma.company.delete({ where: { id: testCompany.id } });
      //   log(`Cleaned up test company: ${testCompany.id}`, 'info');
      // }

      log('✅ Cleanup complete', 'success');
    } catch (error: any) {
      log(`Cleanup error: ${error.message}`, 'warn');
    }

    await prisma.$disconnect();
    
    console.log('\n');
    process.exit(testResults.filter(t => !t.passed).length > 0 ? 1 : 0);
  }
}

// Run tests if executed directly
const isMainModule = (() => {
  try {
    return require.main === module;
  } catch {
    return false;
  }
})();

if (isMainModule) {
  runTests();
}

export { runTests };
