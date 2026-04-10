/**
 * Test script for Other Income calculation logic
 * 
 * Tests:
 * 1. 2200 → 4000 → qty 1 → result = 1800
 * 2. 1000 → 900 → qty 1 → result = -100
 * 3. 500 → 1500 → qty 3 → result = 3000
 * 4. No records → result = 0
 * 5. sellingPrice = actualPrice → income = 0
 */

import { calculateUnitProfit, calculateTotalOtherIncome } from '@/modules/product-sales/services';

console.log('=== Other Income Calculation Tests ===\n');

let passed = 0;
let failed = 0;

const test = (name: string, fn: () => boolean) => {
  try {
    const result = fn();
    if (result) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${name}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ERROR: ${name} - ${error}`);
    failed++;
  }
};

// Test 1: Normal profit case
test('2200 → 4000 → qty 1 → result = 1800', () => {
  const result = calculateTotalOtherIncome(2200, 4000, 1);
  return result === 1800;
});

// Test 2: Loss case (selling price < actual price)
test('1000 → 900 → qty 1 → result = -100', () => {
  const result = calculateTotalOtherIncome(1000, 900, 1);
  return result === -100;
});

// Test 3: Multiple quantities
test('500 → 1500 → qty 3 → result = 3000', () => {
  const result = calculateTotalOtherIncome(500, 1500, 3);
  return result === 3000;
});

// Test 4: Zero profit (selling price = actual price)
test('2000 → 2000 → qty 1 → result = 0', () => {
  const result = calculateTotalOtherIncome(2000, 2000, 1);
  return result === 0;
});

// Test 5: Unit profit calculation
test('Unit profit: 3000 - 2500 = 500', () => {
  const result = calculateUnitProfit(2500, 3000);
  return result === 500;
});

// Test 6: Large quantity
test('100 → 200 → qty 50 → result = 5000', () => {
  const result = calculateTotalOtherIncome(100, 200, 50);
  return result === 5000;
});

// Test 7: Negative profit with large quantity
test('500 → 400 → qty 10 → result = -1000', () => {
  const result = calculateTotalOtherIncome(500, 400, 10);
  return result === -1000;
});

// Test 8: Zero actual price (free item)
test('0 → 1000 → qty 1 → result = 1000', () => {
  const result = calculateTotalOtherIncome(0, 1000, 1);
  return result === 1000;
});

// Test 9: Float values
test('2200.50 → 4000.75 → qty 2 → result = 3600.50', () => {
  const result = calculateTotalOtherIncome(2200.50, 4000.75, 2);
  return Math.abs(result - 3600.50) < 0.01;
});

// Test 10: Edge case - very small profit
test('1000 → 1000.01 → qty 1 → result = 0.01', () => {
  const result = calculateTotalOtherIncome(1000, 1000.01, 1);
  return Math.abs(result - 0.01) < 0.001;
});

console.log(`\n=== Test Results ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}
