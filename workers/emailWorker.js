// workers/emailWorker.js
import { Worker } from 'bullmq';
import redisClient from '../config/redis.js';
import realSendEmail from '../utils/realSendEmail.js';
import ActivityLog from '../models/ActivityLog.js';

// Setup connection options for BullMQ
const connection = redisClient;

export const startEmailWorker = () => {
  const worker = new Worker('emailQueue', async (job) => {
    console.log(`📥 [Email Worker] Processing Job ID ${job.id} for: ${job.data.to || job.data.email}`);
    
    try {
      // Invoke real direct SMTP transmission
      await realSendEmail(job.data);
      console.log(`✅ [Email Worker] Job ID ${job.id} successfully completed.`);
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
    console.log(`🎯 [Email Worker] Job ${job.id} has completed successfully.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`💥 [Email Worker] Job ${job?.id} failed with error: ${err.message}`);
  });

  console.log('📡 [Email Worker] Worker thread listening for incoming jobs on emailQueue');
  return worker;
};

export default startEmailWorker;
