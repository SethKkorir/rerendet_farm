// scripts/subscriptionCron.js
import cron from 'node-cron';
import Subscription from '../models/Subscription.js';
import { subscriptionQueue } from '../queues/index.js';

/**
 * DAILY CRON JOB: Runs at midnight
 * Identifies due subscriptions and delegates renewal to BullMQ
 */
const startSubscriptionCron = () => {
    // schedule for 00:00 every day
    cron.schedule('0 0 * * *', async () => {
        console.log('⏰ Running daily subscription processing (BullMQ Delegation)...');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        try {
            // Find all active subscriptions due today
            const dueSubscriptions = await Subscription.find({
                status: 'active',
                nextBillingDate: { $lte: today }
            });

            console.log(`Found ${dueSubscriptions.length} subscriptions due for renewal. Enqueueing to BullMQ...`);

            for (const sub of dueSubscriptions) {
                try {
                    // Enqueue renewal task to BullMQ
                    await subscriptionQueue.add('renewSubscription', { 
                        subscriptionId: sub._id 
                    }, {
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 10000
                        }
                    });
                    console.log(`📬 [Subscription Cron] Enqueued Subscription ${sub._id} for background renewal.`);
                } catch (subError) {
                    console.error(`❌ [Subscription Cron] Failed to enqueue subscription ${sub._id}:`, subError.message);
                }
            }
        } catch (globalError) {
            console.error('❌ [Subscription Cron] Global error in subscription cron:', globalError);
        }
    });
};

export default startSubscriptionCron;
