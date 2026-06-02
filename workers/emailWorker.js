// workers/emailWorker.js
import { Worker } from 'bullmq';
import redisClient from '../config/redis.js';
import realSendEmail from '../utils/realSendEmail.js';
import ActivityLog from '../models/ActivityLog.js';
import Order from '../models/Order.js';
import { sendOrderConfirmationEmailHelper } from '../utils/orderEmailSender.js';

// Setup connection options for BullMQ
const connection = redisClient;

export const startEmailWorker = () => {
  const worker = new Worker('emailQueue', async (job) => {
    console.log(`📥 [Email Worker] Processing Job ID ${job.id} | Type: "${job.name}" | To: ${job.data.to || job.data.email || job.data.orderNumber || 'n/a'}`);

    // ── PILLAR 6: orderConfirmation job handler ──────────────────────────────
    // The webhook and reconciler enqueue this job type instead of calling
    // sendOrderConfirmationEmailHelper inline. This decouples SMTP latency
    // from the callback response path and gives the email 3 retry attempts.
    if (job.name === 'orderConfirmation') {
      const { orderId, orderNumber } = job.data;

      if (!orderId) {
        console.error(`❌ [Email Worker] orderConfirmation job ${job.id} missing orderId — cannot send`);
        throw new Error(`orderConfirmation job missing orderId (orderNumber: ${orderNumber})`);
      }

      // Fetch the full populated order from the database
      const order = await Order.findById(orderId)
        .populate('user', 'firstName lastName email')
        .populate('items.product', 'name price');

      if (!order) {
        // Order may have been deleted — log but don't retry (it won't appear)
        console.warn(`⚠️ [Email Worker] Order ${orderId} not found — skipping confirmation email`);
        return;
      }

      console.log(`📧 [Email Worker] Sending order confirmation for #${order.orderNumber} to ${order.shippingAddress?.email || order.user?.email || 'unknown'}`);
      await sendOrderConfirmationEmailHelper(order);
      console.log(`✅ [Email Worker] Order confirmation sent for #${order.orderNumber}`);
      return;
    }

    // ── Generic email job handler (existing path — preserved) ─────────────
    try {
      await realSendEmail(job.data);
      console.log(`✅ [Email Worker] Generic email Job ID ${job.id} successfully completed.`);
    } catch (error) {
      console.error(`❌ [Email Worker] SMTP failed for Job ID ${job.id}:`, error.message);

      // If it has reached maximum attempts, log a permanent failure in the Activity Log
      if (job.attemptsMade >= (job.opts.attempts || 3)) {
        console.error(`🚨 [Email Worker] Job ID ${job.id} failed after MAX attempts. Logging permanent error to database.`);
        try {
          const log = new ActivityLog({
            action: 'EMAIL_FAILED',
            entityName: job.data.to || job.data.email || 'Unknown recipient',
            details: {
              subject: job.data.subject,
              error: error.message,
              jobId: job.id,
              attemptsMade: job.attemptsMade
            }
          });
          await log.save();
          console.log(`📝 [Email Worker] Created EMAIL_FAILED audit entry in ActivityLog.`);
        } catch (logError) {
          console.error('❌ [Email Worker] Failed to write log to ActivityLog:', logError.message);
        }
      }

      // Rethrow to signal BullMQ to retry or mark job as failed
      throw error;
    }
  }, {
    connection,
    concurrency: 5 // Run up to 5 email deliveries in parallel
  });

  worker.on('completed', (job) => {
    console.log(`🎯 [Email Worker] Job ${job.id} (${job.name}) has completed successfully.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`💥 [Email Worker] Job ${job?.id} (${job?.name}) failed with error: ${err.message}`);
  });

  console.log('📡 [Email Worker] Worker thread listening for incoming jobs on emailQueue');
  return worker;
};

export default startEmailWorker;

