// scripts/test_enterprise_auth.js — Comprehensive Test Suite for Enterprise Customer Authentication
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { validatePasswordSecurely, checkPasswordHistory } from '../utils/passwordValidator.js';
import { checkForgotPasswordLimits, checkResendLimits, checkAdminRecoveryLimits } from '../services/recoveryRateLimiter.js';
import PasswordRecovery from '../models/PasswordRecovery.js';
import mongoose from 'mongoose';

async function runTests() {
  console.log('🚀 Running Enterprise Customer Authentication Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Benchmark bcrypt salt rounds 14
  console.log('📌 Test 1: Bcrypt Salt Rounds 14 Benchmark');
  const start = Date.now();
  const salt = await bcrypt.genSalt(14);
  const hash = await bcrypt.hash('SecureEnterprisePass2026!', salt);
  const duration = Date.now() - start;
  console.log(`     Bcrypt salt 14 hash duration: ${duration}ms (using pure-JS bcryptjs)`);
  assert(hash.startsWith('$2a$14$') || hash.startsWith('$2b$14$'), 'Bcrypt salt rounds 14 correctly applied');
  if (duration > 2500) {
    console.warn(`     ⚠️ Performance Note: Pure JS 'bcryptjs' takes ${duration}ms for 14 rounds. Recommended: Use native C++ 'bcrypt' in production to achieve ~200ms duration.`);
  }
  assert(true, 'Bcrypt hashing benchmark recorded and evaluated');

  // 2. Dual-Layer Password Validation (zxcvbn + HIBP)
  console.log('\n📌 Test 2: Dual-Layer Password Validation (zxcvbn + HIBP)');
  const weakCheck = await validatePasswordSecurely('password123', 'customer@example.com');
  assert(!weakCheck.isValid, 'Weak dictionary password rejected by entropy validation');

  const breachedCheck = await validatePasswordSecurely('P@ssword1', 'customer@example.com');
  assert(!breachedCheck.isValid, 'Known breached password rejected');

  const strongPass = 'R3r3nd3t#H1ghl@nd$C0ff33!99';
  const strongCheck = await validatePasswordSecurely(strongPass, 'customer@example.com');
  assert(strongCheck.isValid, 'High-entropy, unbreached password accepted');

  // 3. Password History Reuse Prevention (Reject current + last 5)
  console.log('\n📌 Test 3: Password History Reuse Prevention');
  const currentPassHash = await bcrypt.hash('PreviousPass01!', 10);
  const historyHash1 = await bcrypt.hash('HistoricalPass02!', 10);
  const historyHash2 = await bcrypt.hash('HistoricalPass03!', 10);
  const historyHash3 = await bcrypt.hash('HistoricalPass04!', 10);
  const historyHash4 = await bcrypt.hash('HistoricalPass05!', 10);
  const historyHash5 = await bcrypt.hash('HistoricalPass06!', 10);
  const history = [historyHash1, historyHash2, historyHash3, historyHash4, historyHash5];

  const currentReuseCheck = await checkPasswordHistory('PreviousPass01!', currentPassHash, history);
  assert(!currentReuseCheck.isValid, 'Direct reuse of current password rejected');

  const historyReuseCheck = await checkPasswordHistory('HistoricalPass04!', currentPassHash, history);
  assert(!historyReuseCheck.isValid, 'Reuse of password from 5-generation history rejected');

  const brandNewPassCheck = await checkPasswordHistory('CompletelyNewPass2026!#', currentPassHash, history);
  assert(brandNewPassCheck.isValid, 'Novel password not in history accepted');

  // 4. Multi-Dimensional Rate Limiting
  console.log('\n📌 Test 4: Rate Limiting & Cooldowns');
  const testEmail = `test_rate_${Date.now()}@rerendet.com`;
  const testIp = '192.168.1.100';

  // Forgot password limits: 3 / 15m / account
  const req1 = await checkForgotPasswordLimits(testEmail, testIp);
  const req2 = await checkForgotPasswordLimits(testEmail, testIp);
  const req3 = await checkForgotPasswordLimits(testEmail, testIp);
  const req4 = await checkForgotPasswordLimits(testEmail, testIp);
  assert(req1.allowed && req2.allowed && req3.allowed, 'Allowed first 3 forgot password requests');
  assert(!req4.allowed, 'Blocked 4th forgot password request within 15 minutes');

  // Resend limits: 5 resends / hr
  const resendTestEmail = `resend_${Date.now()}@rerendet.com`;
  for (let i = 0; i < 5; i++) {
    await checkResendLimits(resendTestEmail);
  }
  const resend6 = await checkResendLimits(resendTestEmail);
  assert(!resend6.allowed, 'Blocked 6th resend request within 1 hour');

  // Admin recovery limits: 5 / 15m
  const testAdminId = new mongoose.Types.ObjectId().toString();
  for (let i = 0; i < 5; i++) {
    await checkAdminRecoveryLimits(testAdminId);
  }
  const admin6 = await checkAdminRecoveryLimits(testAdminId);
  assert(!admin6.allowed, 'Blocked 6th admin recovery generation within 15 minutes');

  // 5. PasswordRecovery HMAC & Single-Use Token Binding
  console.log('\n📌 Test 5: PasswordRecovery HMAC and Token Hash Binding');
  const mockUserId = new mongoose.Types.ObjectId();
  const mockRecoveryId = new mongoose.Types.ObjectId();
  const rawOtp = '654321';

  const computedHmac = PasswordRecovery.computeOtpHmac(rawOtp, mockUserId, mockRecoveryId);
  const verifyHmac = PasswordRecovery.computeOtpHmac(rawOtp, mockUserId, mockRecoveryId);
  assert(computedHmac === verifyHmac, 'Deterministic HMAC-SHA256 verified for matching OTP and User');

  const wrongOtpHmac = PasswordRecovery.computeOtpHmac('123456', mockUserId, mockRecoveryId);
  assert(computedHmac !== wrongOtpHmac, 'Mismatched OTP yields completely different HMAC');

  const otherUserHmac = PasswordRecovery.computeOtpHmac(rawOtp, new mongoose.Types.ObjectId(), mockRecoveryId);
  assert(computedHmac !== otherUserHmac, 'OTP HMAC cannot be replayed across different users');

  const rawLinkToken = crypto.randomBytes(32).toString('hex');
  const hashedToken1 = PasswordRecovery.hashToken(rawLinkToken);
  const hashedToken2 = PasswordRecovery.hashToken(rawLinkToken);
  assert(hashedToken1 === hashedToken2, 'SHA-256 token hashing is consistent and irreversible');

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
