// queues/index.js
import { Queue } from 'bullmq';
import { redisClient, isRedisConnected } from '../config/redis.js';

// Setup connection options for BullMQ queues by reusing the shared client or connection properties
const connection = redisClient;

// Mock Queue class for fallback in development when Redis is disabled/offline
class MockQueue {
  constructor(name) {
    this.name = name;
  }
  async add(name, data, opts) {
    console.log(`[MockQueue] Redis offline. Simulated enqueueing job on ${this.name}:`, name);
    return { id: `mock-job-${Date.now()}` };
  }
  async getJobCounts() {
    return { active: 0, waiting: 0, completed: 0, failed: 0 };
  }
}

const useRealQueues = redisClient && (isRedisConnected || process.env.NODE_ENV === 'production');

export let emailQueue;
export let subscriptionQueue;
export let retryQueue;

if (useRealQueues) {
  console.log('🚀 [BullMQ] Initializing real Redis queues...');
  emailQueue = new Queue('emailQueue', { 
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  });

  subscriptionQueue = new Queue('subscriptionQueue', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 10000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  });

  retryQueue = new Queue('retryQueue', {
    connection,
    defaultJobOptions: {
      attempts: 1, // Handled manually with custom backoff/delays (2, 8, 20 mins)
      removeOnComplete: true,
      removeOnFail: false,
    }
  });
  console.log('🚀 [BullMQ] Real queues initialized successfully (Email • Subscription • STK Retry)');
} else {
  console.warn('⚠️  [BullMQ] Redis is offline. Initializing MockQueues for development fallback.');
  emailQueue = new MockQueue('emailQueue');
  subscriptionQueue = new MockQueue('subscriptionQueue');
  retryQueue = new MockQueue('retryQueue');
}
