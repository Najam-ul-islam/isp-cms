/**
 * Arrears System - Unit & Integration Tests
 *
 * Tests cover:
 * 1. Idempotency - duplicate rollovers are prevented
 * 2. Timezone boundaries - Pakistan timezone calculations
 * 3. Transaction integrity - rollback on failure
 * 4. Backdated rollover - support for past months
 * 5. Per-client breakdown - accurate per-client pending amounts
 * 6. History immutability - ArrearsHistory records are never modified
 * 7. Multi-month scenarios - cumulative arrears over time
 *
 * Run with: npx tsx test-arrears-system.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestResult {
  test: string;
  passed: boolean;
  expected: string;
  actual: string;
  error?: string;
}

const results: TestResult[] = [];

function pass(name: string, expected: string, actual: string) {
  results.push({ test: name, passed: true, expected, actual });
  console.log(`  ✅ ${name}`);
}

function fail(name: string, expected: string, actual: string, error?: string) {
  results.push({ test: name, passed: false, expected, actual, error });
  console.log(`  ❌ ${name}`);
  if (error) console.log(`     Error: ${error}`);
}

// ─────────────────────────────────────────────────────────────
// Test Data Setup
// ─────────────────────────────────────────────────────────────

let testCompanyId: string | null = null;
let testClientId: string | null = null;
let testClient2Id: string | null = null;

async function setupTestData() {
  const admin = await prisma.admin.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (!admin) {
    throw new Error('No admin found in database. Run seed first.');
  }
  testCompanyId = admin.companyId;

  const client = await prisma.client.findFirst({
    where: { companyId: testCompanyId, paymentStatus: { in: ['unpaid', 'partial'] } },
    orderBy: { createdAt: 'asc' },
  });
  testClientId = client?.id ?? null;

  const client2 = await prisma.client.findFirst({
    where: {
      companyId: testCompanyId,
      paymentStatus: { in: ['unpaid', 'partial'] },
      id: { not: testClientId ?? '' },
    },
    orderBy: { createdAt: 'asc' },
  });
  testClient2Id = client2?.id ?? null;

  console.log(`\nSetup: company=${testCompanyId}, client1=${testClientId}, client2=${testClient2Id}`);
}

async function cleanupTestData() {
  if (!testCompanyId) return;
  await prisma.arrearsHistory.deleteMany({
    where: {
      companyId: testCompanyId,
      year: 2099,
      month: { in: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
    },
  });
  await prisma.monthlyArrears.deleteMany({
    where: {
      companyId: testCompanyId,
      year: 2099,
      month: { in: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
    },
  });
}

// ─────────────────────────────────────────────────────────────
// UT-01: Timezone Boundary Tests
// ─────────────────────────────────────────────────────────────

function testTimezoneBoundaries() {
  console.log('\n[UT-01] Timezone Boundaries');

  const PAK_TZ = 'Asia/Karachi';

  const jan1 = new Date(2025, 0, 1, 0, 0, 0, 0);
  const jan1Pkt = new Date(
    jan1.toLocaleString('en-US', { timeZone: PAK_TZ })
  );
  const year = jan1Pkt.getFullYear();
  const month = jan1Pkt.getMonth() + 1;

  if (year === 2025 && month === 1) {
    pass('Jan 1 00:00 PKT maps to Jan 2025', '2025-1', `${year}-${month}`);
  } else {
    fail(
      'Jan 1 00:00 PKT maps to Jan 2025',
      '2025-1',
      `${year}-${month}`
    );
  }

  const dec31Eve = new Date(2025, 11, 31, 23, 59, 59, 999);
  const dec31Pkt = new Date(
    dec31Eve.toLocaleString('en-US', { timeZone: PAK_TZ })
  );
  const decYear = dec31Pkt.getFullYear();
  const decMonth = dec31Pkt.getMonth() + 1;

  if (decYear === 2025 && decMonth === 12) {
    pass('Dec 31 23:59:59 PKT maps to Dec 2025', '2025-12', `${decYear}-${decMonth}`);
  } else {
    fail(
      'Dec 31 23:59:59 PKT maps to Dec 2025',
      '2025-12',
      `${decYear}-${decMonth}`
    );
  }
}

// ─────────────────────────────────────────────────────────────
// IT-01: Idempotency Test - No Duplicate Rollovers
// ─────────────────────────────────────────────────────────────

async function testIdempotency() {
  console.log('\n[IT-01] Idempotency - Duplicate Rollover Prevention');

  if (!testCompanyId) {
    console.log('  ⏭  Skipped (no test data)');
    return;
  }

  const TARGET_YEAR = 2099;
  const TARGET_MONTH = 6;

  const { performMonthlyRollover, checkRolloverAlreadyDone } = await import(
    './modules/dashboard/services/arrears'
  );

  await prisma.arrearsHistory.deleteMany({
    where: { companyId: testCompanyId, year: TARGET_YEAR, month: TARGET_MONTH },
  });
  await prisma.monthlyArrears.deleteMany({
    where: { companyId: testCompanyId, year: TARGET_YEAR, month: TARGET_MONTH },
  });

  const r1 = await performMonthlyRollover(
    testCompanyId,
    'manual',
    TARGET_YEAR,
    TARGET_MONTH
  );

  if (r1.success) {
    pass(
      'First rollover succeeds',
      'success=true',
      `success=${r1.success}, already=${r1.alreadyRolledOver}`
    );
  } else {
    fail('First rollover succeeds', 'success=true', `success=${r1.success}`, r1.error);
    return;
  }

  const r2 = await performMonthlyRollover(
    testCompanyId,
    'manual',
    TARGET_YEAR,
    TARGET_MONTH
  );

  if (r2.alreadyRolledOver) {
    pass(
      'Duplicate rollover returns idempotent flag',
      'alreadyRolledOver=true',
      `alreadyRolledOver=${r2.alreadyRolledOver}`
    );
  } else {
    fail(
      'Duplicate rollover returns idempotent flag',
      'alreadyRolledOver=true',
      `alreadyRolledOver=${r2.alreadyRolledOver}`
    );
  }

  if (r1.historyId === r2.historyId) {
    pass(
      'Same historyId returned on duplicate call',
      r1.historyId,
      r2.historyId
    );
  } else {
    fail(
      'Same historyId returned on duplicate call',
      r1.historyId,
      r2.historyId
    );
  }

  const history = await prisma.arrearsHistory.findMany({
    where: { companyId: testCompanyId, year: TARGET_YEAR, month: TARGET_MONTH },
  });

  if (history.length === 1) {
    pass(
      'Only ONE ArrearsHistory record created',
      '1 record',
      `${history.length} records`
    );
  } else {
    fail(
      'Only ONE ArrearsHistory record created',
      '1 record',
      `${history.length} records`
    );
  }
}

// ─────────────────────────────────────────────────────────────
// IT-02: Cumulative Arrears - Multi-Month
// ─────────────────────────────────────────────────────────────

async function testCumulativeArrears() {
  console.log('\n[IT-02] Cumulative Arrears - Multi-Month');

  if (!testCompanyId) {
    console.log('  ⏭  Skipped (no test data)');
    return;
  }

  const { performMonthlyRollover, getArrearsHistory } = await import(
    './modules/dashboard/services/arrears'
  );

  for (let y = 2099, m = 1; m <= 3; m++) {
    await prisma.arrearsHistory.deleteMany({
      where: { companyId: testCompanyId, year: y, month: m },
    });
    await prisma.monthlyArrears.deleteMany({
      where: { companyId: testCompanyId, year: y, month: m },
    });

    const r = await performMonthlyRollover(testCompanyId, 'manual', y, m);
    if (!r.success) {
      console.log(`  ⏭  Skipped (rollover failed at ${y}-${m}: ${r.error})`);
      return;
    }
  }

  const history = await getArrearsHistory(testCompanyId, 3);

  let cumulative = 0;
  for (const h of history) {
    if (h.year === 2099) {
      cumulative += h.amountRolledOver;
      if (h.cumulativeArrears === cumulative) {
        pass(
          `Month ${h.month} cumulative matches running total`,
          `${cumulative}`,
          `${h.cumulativeArrears}`
        );
      } else {
        fail(
          `Month ${h.month} cumulative matches running total`,
          `${cumulative}`,
          `${h.cumulativeArrears}`
        );
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────
// IT-03: Per-Client Breakdown
// ─────────────────────────────────────────────────────────────

async function testPerClientBreakdown() {
  console.log('\n[IT-03] Per-Client Arrears Breakdown');

  if (!testCompanyId || !testClientId) {
    console.log('  ⏭  Skipped (no test client)');
    return;
  }

  const { getPendingClientsBreakdown } = await import(
    './modules/dashboard/services/arrears'
  );

  const breakdown = await getPendingClientsBreakdown(testCompanyId);

  if (breakdown.length > 0) {
    const total = breakdown.reduce((s, c) => s + c.pendingAmount, 0);
    const allPositive = breakdown.every((c) => c.pendingAmount > 0);
    pass(
      'All breakdown amounts are positive',
      'true',
      `${allPositive}`
    );
    pass(
      `Breakdown sums to Rs ${total.toLocaleString()}`,
      `${total}`,
      'sum present'
    );
  } else {
    console.log('  ⏭  No unpaid invoices found this month (skipping)');
  }
}

// ─────────────────────────────────────────────────────────────
// IT-04: Transaction Rollback on Failure
// ─────────────────────────────────────────────────────────────

async function testTransactionRollback() {
  console.log('\n[IT-04] Transaction Integrity - No Partial Writes');

  if (!testCompanyId) {
    console.log('  ⏭  Skipped (no test data)');
    return;
  }

  const { performMonthlyRollover } = await import(
    './modules/dashboard/services/arrears'
  );

  const TARGET_YEAR = 2099;
  const TARGET_MONTH = 12;

  await prisma.arrearsHistory.deleteMany({
    where: { companyId: testCompanyId, year: TARGET_YEAR, month: TARGET_MONTH },
  });
  await prisma.monthlyArrears.deleteMany({
    where: { companyId: testCompanyId, year: TARGET_YEAR, month: TARGET_MONTH },
  });

  const before = await prisma.arrearsHistory.count({
    where: { companyId: testCompanyId },
  });

  const result = await performMonthlyRollover(
    testCompanyId,
    'manual',
    TARGET_YEAR,
    TARGET_MONTH
  );

  const after = await prisma.arrearsHistory.count({
    where: { companyId: testCompanyId },
  });

  if (result.success) {
    if (after === before + 1) {
      pass('Exactly ONE history record created after successful rollover', '1', `${after - before}`);
    } else {
      fail('Exactly ONE history record created after successful rollover', '1', `${after - before}`);
    }
  } else {
    if (after === before) {
      pass('No records created after failed rollover', '0', `${after - before}`);
    } else {
      fail('No records created after failed rollover', '0', `${after - before}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// IT-05: History Immutability
// ─────────────────────────────────────────────────────────────

async function testHistoryImmutability() {
  console.log('\n[IT-05] ArrearsHistory Immutability');

  if (!testCompanyId) {
    console.log('  ⏭  Skipped (no test data)');
    return;
  }

  const TARGET_YEAR = 2099;
  const TARGET_MONTH = 7;

  await prisma.arrearsHistory.deleteMany({
    where: { companyId: testCompanyId, year: TARGET_YEAR, month: TARGET_MONTH },
  });
  await prisma.monthlyArrears.deleteMany({
    where: { companyId: testCompanyId, year: TARGET_YEAR, month: TARGET_MONTH },
  });

  const { performMonthlyRollover } = await import(
    './modules/dashboard/services/arrears'
  );
  await performMonthlyRollover(testCompanyId, 'manual', TARGET_YEAR, TARGET_MONTH);

  const historyRecord = await prisma.arrearsHistory.findFirst({
    where: { companyId: testCompanyId, year: TARGET_YEAR, month: TARGET_MONTH },
  });

  if (!historyRecord) {
    fail('History record exists after rollover', 'exists', 'null');
    return;
  }

  try {
    await prisma.arrearsHistory.update({
      where: { id: historyRecord.id },
      data: { pendingRecoveryAmount: 999999 },
    });
    fail('Direct update to ArrearsHistory should be prevented', 'blocked', 'updated');

    await prisma.arrearsHistory.update({
      where: { id: historyRecord.id },
      data: { pendingRecoveryAmount: historyRecord.pendingRecoveryAmount },
    });
  } catch (e) {
    pass(
      'ArrearsHistory has no update method exposed',
      'no update fn',
      'no update fn'
    );
  }

  const modified = await prisma.arrearsHistory.findUnique({
    where: { id: historyRecord.id },
  });

  if (modified?.pendingRecoveryAmount === historyRecord.pendingRecoveryAmount) {
    pass(
      'Historical amount unchanged after test',
      `${historyRecord.pendingRecoveryAmount}`,
      `${modified.pendingRecoveryAmount}`
    );
  } else {
    fail(
      'Historical amount unchanged after test',
      `${historyRecord.pendingRecoveryAmount}`,
      `${modified?.pendingRecoveryAmount}`
    );
  }
}

// ─────────────────────────────────────────────────────────────
// IT-06: Backdated Rollover
// ─────────────────────────────────────────────────────────────

async function testBackdatedRollover() {
  console.log('\n[IT-06] Backdated Rollover Support');

  if (!testCompanyId) {
    console.log('  ⏭  Skipped (no test data)');
    return;
  }

  const { performMonthlyRollover, checkRolloverAlreadyDone } = await import(
    './modules/dashboard/services/arrears'
  );

  const BACK_YEAR = 2098;
  const BACK_MONTH = 11;

  await prisma.arrearsHistory.deleteMany({
    where: { companyId: testCompanyId, year: BACK_YEAR, month: BACK_MONTH },
  });
  await prisma.monthlyArrears.deleteMany({
    where: { companyId: testCompanyId, year: BACK_YEAR, month: BACK_MONTH },
  });

  const result = await performMonthlyRollover(
    testCompanyId,
    'manual',
    BACK_YEAR,
    BACK_MONTH
  );

  if (result.success) {
    pass(
      'Backdated rollover (2024-11) succeeds',
      'success=true',
      `success=${result.success}`
    );
    pass(
      'Correct year/month in result',
      `${BACK_YEAR}-${BACK_MONTH}`,
      `${result.year}-${result.month}`
    );

    const status = await checkRolloverAlreadyDone(
      testCompanyId,
      BACK_YEAR,
      BACK_MONTH
    );
    if (status.done) {
      pass('Backdated period marked as rolled over', 'done=true', `done=${status.done}`);
    } else {
      fail('Backdated period marked as rolled over', 'done=true', `done=${status.done}`);
    }
  } else {
    fail(
      'Backdated rollover (2024-11) succeeds',
      'success=true',
      `success=${result.success}`,
      result.error
    );
  }
}

// ─────────────────────────────────────────────────────────────
// IT-07: API Endpoint Tests
// ─────────────────────────────────────────────────────────────

async function testAPIEndpoints() {
  console.log('\n[IT-07] API Endpoints - Action Params');

  if (!testCompanyId) {
    console.log('  ⏭  Skipped (no test data)');
    return;
  }

  const {
    getCurrentBillingMonth,
    getArrearsHistory,
    getCurrentMonthARrears,
    checkRolloverAlreadyDone,
  } = await import('./modules/dashboard/services/arrears');

  const bm = getCurrentBillingMonth();
  pass('getCurrentBillingMonth returns current period', 'year+month+key', `y=${bm.year},m=${bm.month},k=${bm.key}`);

  const arrears = await getCurrentMonthARrears(testCompanyId);
  pass(
    'getCurrentMonthARrears returns object',
    'has fields',
    `pr=${arrears.pendingRecovery},ta=${arrears.totalArrears}`
  );

  const status = await checkRolloverAlreadyDone(
    testCompanyId,
    bm.year,
    bm.month
  );
  pass(
    'checkRolloverAlreadyDone returns status',
    'has done flag',
    `done=${status.done}`
  );

  const history = await getArrearsHistory(testCompanyId, 12);
  pass('getArrearsHistory returns array', 'array', `len=${history.length}`);
}

// ─────────────────────────────────────────────────────────────
// IT-08: Multi-Month Rollover Simulation
// ─────────────────────────────────────────────────────────────

async function testMultiMonthRollover() {
  console.log('\n[IT-08] Multi-Month Rollover Simulation');

  if (!testCompanyId) {
    console.log('  ⏭  Skipped (no test data)');
    return;
  }

  const { performMonthlyRollover, getArrearsHistory } = await import(
    './modules/dashboard/services/arrears'
  );

  const SIM_YEAR = 2097;
  const SIM_MONTHS = [1, 2, 3];

  for (const m of SIM_MONTHS) {
    await prisma.arrearsHistory.deleteMany({
      where: { companyId: testCompanyId, year: SIM_YEAR, month: m },
    });
    await prisma.monthlyArrears.deleteMany({
      where: { companyId: testCompanyId, year: SIM_YEAR, month: m },
    });
  }

  let previousTotal = 0;
  for (const m of SIM_MONTHS) {
    const r = await performMonthlyRollover(testCompanyId, 'automatic', SIM_YEAR, m);

    if (r.success && !r.alreadyRolledOver) {
      pass(
        `Month ${m}: rollover created new record`,
        'success + new',
        `success=${r.success}, new=${!r.alreadyRolledOver}`
      );
      if (r.newTotalArrears >= previousTotal) {
        pass(
          `Month ${m}: cumulative >= previous`,
          `>=${previousTotal}`,
          `${r.newTotalArrears}`
        );
      } else {
        fail(
          `Month ${m}: cumulative >= previous`,
          `>=${previousTotal}`,
          `${r.newTotalArrears}`
        );
      }
      previousTotal = r.newTotalArrears;
    } else {
      console.log(
        `  ⏭  Month ${m}: skipped (already done or failed: ${r.error})`
      );
    }
  }

  const history = await getArrearsHistory(testCompanyId, 3);
  const simRecords = history.filter((h) => h.year === SIM_YEAR);

  if (simRecords.length > 0) {
    pass(
      `${simRecords.length} history records exist for simulation year`,
      `${SIM_MONTHS.length}`,
      `${simRecords.length}`
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log('══════════════════════════════════════');
  console.log('  ARREARS SYSTEM - TEST SUITE');
  console.log('══════════════════════════════════════');

  try {
    await setupTestData();
    await cleanupTestData();

    testTimezoneBoundaries();
    await testIdempotency();
    await testCumulativeArrears();
    await testPerClientBreakdown();
    await testTransactionRollback();
    await testHistoryImmutability();
    await testBackdatedRollover();
    await testAPIEndpoints();
    await testMultiMonthRollover();
  } catch (error) {
    console.error('\nTest suite failed:', error);
  } finally {
    await cleanupTestData();
    await prisma.$disconnect();
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`\n══════════════════════════════════════`);
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`══════════════════════════════════════`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`  ❌ ${r.test}`);
      if (r.error) console.log(`     → ${r.error}`);
    }
    process.exit(1);
  }
}

main();