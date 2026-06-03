/**
 * Smoke Test — Regression Safety Net
 *
 * Read-only checks against a running server.
 * Uses Node's built-in fetch (no external packages).
 *
 * Usage:
 *   BASE_URL=https://your-app.com node scripts/smokeTest.js
 *   node scripts/smokeTest.js               # defaults to http://localhost:5000
 *
 * Exit code 0 = all pass, 1 = at least one failure.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

const tests = [
  {
    name: 'Health endpoint returns healthy',
    run: async () => {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const body = await res.json();
      if (body.status !== 'healthy') throw new Error(`Expected status "healthy", got "${body.status}"`);
    }
  },
  {
    name: 'Products endpoint returns array with category data',
    run: async () => {
      const res = await fetch(`${BASE_URL}/api/products`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const body = await res.json();
      const products = body.data?.products ?? body.data;
      if (!Array.isArray(products)) throw new Error('Expected products array in response');
      // If there are products, verify category population
      if (products.length > 0) {
        const first = products[0];
        if (first.categoryId && typeof first.categoryId === 'object' && first.categoryId.name) {
          // Category is populated — good
        } else if (first.categoryId && typeof first.categoryId === 'string') {
          throw new Error('categoryId is not populated (still a raw ObjectId string)');
        }
        // If categoryId is missing entirely, that's okay for this smoke test
      }
    }
  },
  {
    name: 'Public heartbeat returns healthy',
    run: async () => {
      const res = await fetch(`${BASE_URL}/api/public/heartbeat`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const body = await res.json();
      if (body.status !== 'healthy') throw new Error(`Expected status "healthy", got "${body.status}"`);
    }
  },
  {
    name: 'Ad placement endpoint returns 200',
    run: async () => {
      const res = await fetch(`${BASE_URL}/api/promotions/placement/homepage`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const body = await res.json();
      if (body.success !== true) throw new Error(`Expected success: true, got ${body.success}`);
    }
  },
  {
    name: 'Delivery rates endpoint returns 200',
    run: async () => {
      const res = await fetch(`${BASE_URL}/api/delivery-rates`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    }
  }
];

const runTests = async () => {
  console.log(`\n🧪 Smoke Test Suite — ${BASE_URL}\n`);
  console.log('─'.repeat(60));

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test.run();
      console.log(`  ✅ PASS  ${test.name}`);
      passed++;
    } catch (err) {
      console.log(`  ❌ FAIL  ${test.name}`);
      console.log(`           → ${err.message}`);
      failed++;
    }
  }

  const total = tests.length;
  console.log('─'.repeat(60));
  console.log(`\n  ${passed} passed, ${failed} failed out of ${total} total\n`);

  if (failed > 0) {
    console.log('💥 Some smoke tests FAILED. Investigate before deploying.\n');
    process.exit(1);
  } else {
    console.log('🎉 All smoke tests PASSED!\n');
    process.exit(0);
  }
};

runTests();
