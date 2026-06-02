// workers/dlqWorker.js
/**
 * Dead Letter Queue Worker — Reprocesses failed M-Pesa webhook callbacks.
 *
 * When the main webhook handler throws an unrecoverable exception, the raw
 * Safaricom payload is routed to `callbackDLQ` instead of returning a 500.
 * This worker picks up those jobs and retries the full processing logic
 * using the extracted `processWebhookPayload` pure function.
 *
 * Retry schedule (via BullMQ exponential backoff configured on the queue):
 *   Attempt 1 → immediate
 *   Attempt 2 → ~1 minute delay
 *   Attempt 3 → ~5 minute delay
 *
 * On exhaustion (all 3 attempts fail):
 *   - Writes a DLQ_EXHAUSTED event to PaymentAuditLog
 *   - Emails ALL active, non-suspended admin accounts
 *   - Suspended admins (isActive: false) are NEVER emailed — they are a data leak vector
 */

import { Worker } from 'bullmq';
import redisClient from '../config/redis.js';
import { processWebhookPayload } from '../controllers/webhookController.js';
import { logPaymentEvent } from '../services/paymentAuditService.js';
import { emailQueue } from '../queues/index.js';
import User from '../models/User.js';

const connection = redisClient;

export const startDlqWorker = () => {
  const worker = new Worker(
    'callbackDLQ',
    async (job) => {
      const { body, sourceIp, error: originalError, failedAt } = job.data;
      const checkoutRequestId = body?.Body?.stkCallback?.CheckoutRequestID || 'unknown';

      console.log(
        `📥 [DLQ Worker] Reprocessing failed callback | Job ID: ${job.id} | Attempt: ${job.attemptsMade + 1}/3 | CheckoutID: ${checkoutRequestId}`
      );
      console.log(
        `   Original failure: "${originalError}" at ${failedAt}`
      );

      // Re-run the full webhook processing logic
      // This is the same pure function the HTTP handler calls — no code duplication
      await processWebhookPayload(body, sourceIp || 'dlq-reprocess');

      console.log(
        `✅ [DLQ Worker] Successfully reprocessed callback for CheckoutID: ${checkoutRequestId} on attempt ${job.attemptsMade + 1}`
      );

      logPaymentEvent({
        event: 'DLQ_REPROCESSED',
        checkoutRequestId,
        provider: 'MPESA',
        metadata: {
          jobId: job.id,
          attemptsMade: job.attemptsMade + 1,
          originalError
        }
      });
    },
    {
      connection,
      concurrency: 2 // DLQ jobs are DB-intensive — limit concurrency
    }
  );

  // ── On job completion ──────────────────────────────────────────────────────
  worker.on('completed', (job) => {
    const checkoutRequestId = job.data?.body?.Body?.stkCallback?.CheckoutRequestID || 'unknown';
    console.log(
      `🎯 [DLQ Worker] Job ${job.id} completed successfully for CheckoutID: ${checkoutRequestId}`
    );
  });

  // ── On job failure ─────────────────────────────────────────────────────────
  worker.on('failed', async (job, err) => {
    const checkoutRequestId = job?.data?.body?.Body?.stkCallback?.CheckoutRequestID || 'unknown';
    const attemptsMade = job?.attemptsMade || 0;
    const maxAttempts = job?.opts?.attempts || 3;

    console.error(
      `💥 [DLQ Worker] Job ${job?.id} attempt ${attemptsMade}/${maxAttempts} failed: ${err.message}`
    );

    // Check if this was the final attempt
    if (attemptsMade >= maxAttempts) {
      console.error(
        `🚨 [DLQ Worker] EXHAUSTED — All ${maxAttempts} DLQ attempts failed for CheckoutID: ${checkoutRequestId}. Alerting admins.`
      );

      // Write exhaustion audit record
      logPaymentEvent({
        event: 'DLQ_EXHAUSTED',
        checkoutRequestId,
        provider: 'MPESA',
        error: err.message,
        metadata: {
          jobId: job?.id,
          attemptsMade,
          originalError: job?.data?.originalError,
          failedAt: job?.data?.failedAt,
          rawBody: job?.data?.body
        }
      });

      // ── Admin alert (suspension-aware query) ──────────────────────────────
      // SECURITY RULE: only query accounts where role is admin/super-admin
      // AND isActive is true. Suspended admins (isActive: false) must never
      // receive operational alerts — a deactivated account is a data leak vector.
      try {
        const activeAdmins = await User.find({
          role: { $in: ['admin', 'super-admin'] },
          isActive: true
        })
          .select('email firstName')
          .lean();

        if (!activeAdmins || activeAdmins.length === 0) {
          console.error(
            '🚨 [DLQ Worker] No active admin accounts found to alert — manual intervention required!'
          );
          return;
        }

        console.log(
          `📧 [DLQ Worker] Sending DLQ exhaustion alerts to ${activeAdmins.length} active admin(s)`
        );

        // Enqueue one alert email per active admin via the decoupled emailQueue
        // This ensures admin alerts also benefit from Pillar 6's retry guarantees
        for (const admin of activeAdmins) {
          await emailQueue.add('adminAlert', {
            to: admin.email,
            subject: '🚨 URGENT: M-Pesa Payment Callback Failed — Manual Review Required',
            html: buildDlqAlertHtml({
              adminName: admin.firstName || 'Admin',
              checkoutRequestId,
              originalError: job?.data?.error,
              failedAt: job?.data?.failedAt,
              attemptsMade,
              jobId: job?.id
            })
          });
        }

        logPaymentEvent({
          event: 'ADMIN_ALERTED',
          checkoutRequestId,
          provider: 'MPESA',
          metadata: {
            adminCount: activeAdmins.length,
            adminEmails: activeAdmins.map((a) => a.email)
          }
        });
      } catch (alertErr) {
        console.error(
          '❌ [DLQ Worker] Failed to send admin DLQ exhaustion alerts:',
          alertErr.message
        );
      }
    }
  });

  console.log('📡 [DLQ Worker] Worker thread listening on callbackDLQ');
  return worker;
};

// ─────────────────────────────────────────────────────────────────────────────
// HTML email template for DLQ exhaustion admin alert
// ─────────────────────────────────────────────────────────────────────────────
const buildDlqAlertHtml = ({
  adminName,
  checkoutRequestId,
  originalError,
  failedAt,
  attemptsMade,
  jobId
}) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Payment Callback Alert</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#141414;border-radius:12px;border:1px solid #2a2a2a;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#7f1d1d,#991b1b);padding:32px 40px;">
            <p style="margin:0;color:#fca5a5;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Rerendet Farm · System Alert</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:800;">🚨 Payment Callback Exhausted</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="color:#d1d5db;font-size:15px;margin:0 0 24px;">Hi ${adminName},</p>
            <p style="color:#d1d5db;font-size:15px;margin:0 0 24px;">
              A critical payment callback has failed all <strong style="color:#f87171;">3 retry attempts</strong> in the Dead Letter Queue and requires immediate manual review.
            </p>
            <!-- Details table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e1e1e;border-radius:8px;border:1px solid #2a2a2a;margin-bottom:24px;">
              <tr><td style="padding:20px 24px;">
                <table width="100%" cellpadding="6" cellspacing="0">
                  <tr>
                    <td style="color:#6b7280;font-size:12px;font-weight:700;text-transform:uppercase;width:40%;">Checkout Request ID</td>
                    <td style="color:#f3f4f6;font-size:13px;font-family:monospace;">${checkoutRequestId}</td>
                  </tr>
                  <tr>
                    <td style="color:#6b7280;font-size:12px;font-weight:700;text-transform:uppercase;">Original Error</td>
                    <td style="color:#f87171;font-size:13px;font-family:monospace;">${originalError || 'Unknown'}</td>
                  </tr>
                  <tr>
                    <td style="color:#6b7280;font-size:12px;font-weight:700;text-transform:uppercase;">First Failed At</td>
                    <td style="color:#f3f4f6;font-size:13px;">${failedAt || 'Unknown'}</td>
                  </tr>
                  <tr>
                    <td style="color:#6b7280;font-size:12px;font-weight:700;text-transform:uppercase;">Attempts Made</td>
                    <td style="color:#f3f4f6;font-size:13px;">${attemptsMade} / 3</td>
                  </tr>
                  <tr>
                    <td style="color:#6b7280;font-size:12px;font-weight:700;text-transform:uppercase;">DLQ Job ID</td>
                    <td style="color:#f3f4f6;font-size:13px;font-family:monospace;">${jobId || 'n/a'}</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <p style="color:#9ca3af;font-size:13px;margin:0 0 8px;">
              <strong style="color:#f3f4f6;">Action required:</strong> Check the PaymentAuditLog collection in Atlas for event type <code style="background:#2a2a2a;padding:2px 6px;border-radius:4px;color:#f87171;">DLQ_EXHAUSTED</code> and the corresponding CheckoutRequestID. You may need to manually reconcile this payment with Safaricom's Daraja API.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #2a2a2a;">
            <p style="color:#4b5563;font-size:11px;margin:0;">This is an automated operational alert from Rerendet Farm. It was sent exclusively to active admin accounts. Suspended accounts do not receive this message.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`;

export default startDlqWorker;
