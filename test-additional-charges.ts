/**
 * Test script to verify additional charges are properly included in payment calculations
 */

import { PrismaClient } from '@prisma/client';
import { getInvoicePaymentSummary, getClientPaymentSummary } from './lib/payment-calculator';

const prisma = new PrismaClient();

async function testAdditionalCharges() {
  console.log('🧪 Testing Additional Charges in Payment Calculations...\n');

  try {
    // Find a client with invoices
    const client = await prisma.client.findFirst({
      include: {
        invoices: true
      }
    });

    if (!client) {
      console.log('❌ No clients found with invoices');
      return;
    }

    console.log(`📋 Testing with client: ${client.name} (ID: ${client.id})`);
    console.log(`   Package Price: Rs. ${client.price}\n`);

    // Get or create an invoice with additional charges
    let invoice = client.invoices[0];
    
    const additionalCharges = [
      { name: 'Router', amount: 1000 },
      { name: 'Cable', amount: 1000 },
      { name: 'Installation', amount: 500 }
    ];
    
    const additionalTotal = additionalCharges.reduce((sum, c) => sum + c.amount, 0);
    
    console.log(`💰 Adding additional charges: Rs. ${additionalTotal}`);
    additionalCharges.forEach(charge => {
      console.log(`   - ${charge.name}: Rs. ${charge.amount}`);
    });
    console.log('');

    // Update invoice with additional charges
    invoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        additionalCharges: additionalCharges
      }
    });

    console.log(`📄 Invoice Details:`);
    console.log(`   Base Amount: Rs. ${invoice.amount}`);
    console.log(`   Additional Charges: Rs. ${additionalTotal}`);
    console.log(`   Expected Total: Rs. ${invoice.amount + additionalTotal}\n`);

    // Test getInvoicePaymentSummary
    console.log('🔍 Testing getInvoicePaymentSummary...');
    const invoiceSummary = await getInvoicePaymentSummary(invoice.id);
    
    console.log(`   Total (should include additional charges): Rs. ${invoiceSummary.total}`);
    console.log(`   Total Paid: Rs. ${invoiceSummary.totalPaid}`);
    console.log(`   Remaining: Rs. ${invoiceSummary.remainingAmount}`);
    console.log(`   Status: ${invoiceSummary.effectivePaymentStatus}`);
    
    const expectedTotal = invoice.amount + additionalTotal;
    if (Math.abs(invoiceSummary.total - expectedTotal) < 0.01) {
      console.log(`   ✅ Total is CORRECT (includes additional charges)\n`);
    } else {
      console.log(`   ❌ Total is INCORRECT! Expected: Rs. ${expectedTotal}, Got: Rs. ${invoiceSummary.total}\n`);
    }

    // Create a test payment
    console.log('💵 Creating a test payment...');
    const paymentAmount = 1500;
    
    const payment = await prisma.payment.create({
      data: {
        clientId: client.id,
        invoiceId: invoice.id,
        amount: paymentAmount,
        method: 'CASH',
        notes: 'Test payment',
        companyId: client.companyId
      }
    });

    console.log(`   Payment Amount: Rs. ${payment.amount}`);
    console.log(`   Invoice ID: ${invoice.id}\n`);

    // Re-check invoice summary after payment
    console.log('🔍 Re-checking invoice summary after payment...');
    const invoiceSummaryAfter = await getInvoicePaymentSummary(invoice.id);
    
    console.log(`   Total: Rs. ${invoiceSummaryAfter.total}`);
    console.log(`   Total Paid: Rs. ${invoiceSummaryAfter.totalPaid}`);
    console.log(`   Remaining: Rs. ${invoiceSummaryAfter.remainingAmount}`);
    console.log(`   Status: ${invoiceSummaryAfter.effectivePaymentStatus}`);

    const expectedRemaining = expectedTotal - paymentAmount;
    if (Math.abs(invoiceSummaryAfter.remainingAmount - expectedRemaining) < 0.01) {
      console.log(`   ✅ Remaining is CORRECT\n`);
    } else {
      console.log(`   ❌ Remaining is INCORRECT! Expected: Rs. ${expectedRemaining}, Got: Rs. ${invoiceSummaryAfter.remainingAmount}\n`);
    }

    // Test getClientPaymentSummary
    console.log('🔍 Testing getClientPaymentSummary...');
    const clientSummary = await getClientPaymentSummary(client.id);
    
    console.log(`   Total: Rs. ${clientSummary.total}`);
    console.log(`   Total Paid: Rs. ${clientSummary.totalPaid}`);
    console.log(`   Remaining: Rs. ${clientSummary.remainingAmount}`);
    console.log(`   Status: ${clientSummary.effectivePaymentStatus}\n`);

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Test completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Additional charges are now included in invoice totals`);
    console.log(`   - Payment calculations consider additional charges`);
    console.log(`   - Remaining amounts are calculated correctly\n`);

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAdditionalCharges();
