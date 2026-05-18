// workers/retryWorker.js
import { Worker } from 'bullmq';
import redisClient from '../config/redis.js';
import { initiateMpesaStkPushService } from '../services/mpesaService.js';

// Setup connection options for BullMQ
const connection = redisClient;

// Precise delays for retry attempts:
// Attempt 1 -> 2 minutes (done upon initial enqueuing)
// Attempt 2 -> 8 minutes (delay from attempt 1 failure)
// Attempt 3 -> 20 minutes (delay from attempt 2 failure)
const RETRY_DELAYS = {
  2: 8 * 60 * 1000,   // 8 minutes in ms
  3: 20 * 60 * 1000,  // 20 minutes in ms
};

export const startRetryWorker = () => {
  const worker = new Worker('retryQueue', async (job) => {
    const { phoneNumber, amount, orderNumber, attempt = 1 } = job.data;
    console.log(`📥 [STK Retry Worker] Running M-Pesa Push Retry Attempt ${attempt}/3 for Order #${orderNumber}`);

    try {
      // Trigger M-Pesa STK Push
      const result = await initiateMpesaStkPushService(phoneNumber, amount, orderNumber);
      console.log(`✅ [STK Retry Worker] M-Pesa STK Push successful on attempt ${attempt} for Order #${orderNumber}. CheckoutRequestID: ${result.CheckoutRequestID}`);
    } catch (error) {
      console.error(`❌ [STK Retry Worker] Attempt ${attempt}/3 failed for Order #${orderNumber}:`, error.message);

      // Re-enqueue next attempt if we haven't hit the limit of 3
      if (attempt < 3) {
        const nextAttempt = attempt + 1;
        const nextDelay = RETRY_DELAYS[nextAttempt];

        console.log(`🔄 [STK Retry Worker] Enqueueing Attempt ${nextAttempt}/3 with delay of ${nextDelay / 60000} minutes.`);
        
        // Push a fresh job back to the queue with the scheduled delay
        await job.queue.add('stkRetry', {
          phoneNumber,
          amount,
          orderNumber,
          attempt: nextAttempt
        }, {
          delay: nextDelay
        });
      } else {
        console.error(`🚨 [STK Retry Worker] Attempt ${attempt}/3 failed. Max retry attempts reached for Order #${orderNumber}.`);
      }

      // Throw to register job state in Redis correctly
      throw error;
    }
  }, { 
    connection,
    concurrency: 5 // Run up to 5 retries concurrently
  });

  worker.on('completed', (job) => {
    console.log(`🎯 [STK Retry Worker] Job ${job.id} retry completed successfully.`);
  });

  worker.on('failed', (job, err) => {
    console.warn(`⚠️ [STK Retry Worker] Job ${job?.id} attempt registered failure: ${err.message}`);
  });

  console.log('📡 [STK Retry Worker] Worker thread listening on retryQueue');
  return worker;
};

export default startRetryWorker;
