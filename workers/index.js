import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../lib/mongodb.js';
import { startEmailWorker } from './emailWorker.js';
import { startRetryWorker } from './retryWorker.js';
import { startDlqWorker } from './dlqWorker.js';
import { startSubscriptionWorker } from './subscriptionWorker.js';
import { redisClient, isRedisConnected } from '../config/redis.js';
import { emailQueue } from '../queues/index.js';
import SystemHealthLog from '../models/SystemHealthLog.js';
import { createAlert } from '../models/AdminAlert.js';
import Ad from '../models/Ad.js';
import Product from '../models/Product.js';
import cloudinary from '../config/cloudinary.js';
import cron from 'node-cron';
import Contact from '../models/Contact.js';
import AbandonedCheckout from '../models/AbandonedCheckout.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import Order from '../models/Order.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import sendEmail from '../utils/sendEmail.js';
import { getFraudAlert } from '../utils/emailTemplates.js';
import { runPaymentReconciliation } from '../scripts/reconcilePayments.js';

dotenv.config();

// ─── 2-minute system health monitoring loop ───────────────────────────────────
const HEALTH_CHECK_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
let healthCheckTimer = null;

const runHealthCheck = async () => {
  try {
    const services = {
      mongodb: { status: 'healthy', latencyMs: 0, error: null },
      redis: { status: 'healthy', latencyMs: 0, error: null },
      queues: { status: 'healthy', latencyMs: 0, error: null },
      cloudinary: { status: 'skipped', latencyMs: 0, error: null }
    };

    let overallStatus = 'healthy';

    // ── MongoDB check ──
    try {
      const start = Date.now();
      if (mongoose.connection.readyState !== 1) {
        throw new Error(`readyState is ${mongoose.connection.readyState}`);
      }
      await mongoose.connection.db.admin().ping();
      services.mongodb.latencyMs = Date.now() - start;
    } catch (err) {
      services.mongodb.status = 'unhealthy';
      services.mongodb.error = err.message;
      overallStatus = 'unhealthy';
    }

    // ── Redis check ──
    try {
      const start = Date.now();
      if (!redisClient || !isRedisConnected) {
        throw new Error('Redis client not connected');
      }
      await redisClient.ping();
      services.redis.latencyMs = Date.now() - start;
    } catch (err) {
      services.redis.status = 'unhealthy';
      services.redis.error = err.message;
      overallStatus = 'unhealthy';
    }

    // ── BullMQ / Queues check ──
    try {
      const start = Date.now();
      if (!emailQueue) {
        throw new Error('emailQueue is not initialized');
      }
      await emailQueue.getJobCounts();
      services.queues.latencyMs = Date.now() - start;
    } catch (err) {
      services.queues.status = 'unhealthy';
      services.queues.error = err.message;
      overallStatus = 'unhealthy';
    }

    // ── Cloudinary check (Issue 7) ──
    try {
      const start = Date.now();
      await Promise.race([
        cloudinary.api.ping(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      ]);
      services.cloudinary.status = 'up';
      services.cloudinary.latencyMs = Date.now() - start;
    } catch (err) {
      services.cloudinary.status = 'down';
      services.cloudinary.error = err.message;
      overallStatus = 'unhealthy';
    }

    // ── Persist health log ──
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1000000) || 0;

    await SystemHealthLog.create({
      status: overallStatus,
      services,
      cpuUsage: Math.round(cpuPercent * 100) / 100,
      memoryUsage: Math.round(memUsage.rss / (1024 * 1024))
    });

    // ── Fire admin alerts for unhealthy services ──
    for (const [serviceName, serviceData] of Object.entries(services)) {
      if (serviceData.status === 'unhealthy' || serviceData.status === 'down') {
        try {
          await createAlert(
            'critical',
            'dlq_item',
            `System Health Alert: ${serviceName} is unhealthy - ${serviceData.error || 'Connection failed'}`
          );
        } catch (alertErr) {
          console.error(`[HealthCheck] Failed to create alert for ${serviceName}:`, alertErr.message);
        }
      }
    }

    console.log(`[HealthCheck] Completed — status: ${overallStatus} | mongo: ${services.mongodb.latencyMs}ms | redis: ${services.redis.latencyMs}ms | queues: ${services.queues.latencyMs}ms | cloudinary: ${services.cloudinary.status}`);
  } catch (err) {
    console.error('[HealthCheck] Unexpected error during health check:', err.message);
  }
};

const startHealthCheckLoop = () => {
  console.log(`[HealthCheck] Starting health monitoring loop (every ${HEALTH_CHECK_INTERVAL_MS / 1000}s)...`);
  runHealthCheck();
  healthCheckTimer = setInterval(runHealthCheck, HEALTH_CHECK_INTERVAL_MS);
};
// ──────────────────────────────────────────────────────────────────────────────

// ─── Ad scheduling loop (every 60 seconds) ────────────────────────────────────
const AD_SCHEDULE_INTERVAL_MS = 60 * 1000;
let adScheduleTimer = null;

const runAdScheduler = async () => {
  try {
    const now = new Date();

    const adsToActivate = await Ad.find({
      status: 'Draft',
      startDate: { $lte: now }
    });

    for (const ad of adsToActivate) {
      ad.status = 'Active';

      if (ad.type === 'flash_deal' && ad.linkedProductId && ad.discountPercent > 0) {
        try {
          const product = await Product.findById(ad.linkedProductId);
          if (product && product.sizes && product.sizes.length > 0) {
            const lowestPrice = Math.min(...product.sizes.map(s => s.price));
            ad.originalPrice = lowestPrice;

            const multiplier = 1 - (ad.discountPercent / 100);
            for (const size of product.sizes) {
              size.price = Math.round(size.price * multiplier);
            }
            await product.save();
            console.log(`[AdScheduler] Flash deal "${ad.title}" activated — ${ad.discountPercent}% off on product ${product.name}`);
          }
        } catch (err) {
          console.error(`[AdScheduler] Flash deal price override failed for ad ${ad._id}:`, err.message);
        }
      }

      await ad.save();
      console.log(`[AdScheduler] Ad "${ad.title}" activated (was Draft, startDate reached)`);
    }

    const adsToComplete = await Ad.find({
      status: 'Active',
      endDate: { $lte: now }
    });

    for (const ad of adsToComplete) {
      ad.status = 'Completed';

      if (ad.type === 'flash_deal' && ad.linkedProductId && ad.originalPrice) {
        try {
          const product = await Product.findById(ad.linkedProductId);
          if (product && product.sizes && product.sizes.length > 0) {
            const multiplier = 1 - (ad.discountPercent / 100);
            for (const size of product.sizes) {
              size.price = Math.round(size.price / multiplier);
            }
            await product.save();
            console.log(`[AdScheduler] Flash deal "${ad.title}" completed — prices restored for product ${product.name}`);
          }
        } catch (err) {
          console.error(`[AdScheduler] Flash deal price restore failed for ad ${ad._id}:`, err.message);
        }
      }

      await ad.save();
      console.log(`[AdScheduler] Ad "${ad.title}" completed (was Active, endDate passed)`);
    }

    if (adsToActivate.length > 0 || adsToComplete.length > 0) {
      console.log(`[AdScheduler] Cycle done — activated: ${adsToActivate.length}, completed: ${adsToComplete.length}`);
    }
  } catch (err) {
    console.error('[AdScheduler] Unexpected error during ad scheduling:', err.message);
  }
};

const startAdScheduleLoop = () => {
  console.log(`[AdScheduler] Starting ad scheduling loop (every ${AD_SCHEDULE_INTERVAL_MS / 1000}s)...`);
  runAdScheduler();
  adScheduleTimer = setInterval(runAdScheduler, AD_SCHEDULE_INTERVAL_MS);
};
// ──────────────────────────────────────────────────────────────────────────────

// ── Node-cron Jobs (Consolidated here) ────────────────────────────────────────
const DELETE_AGE_DAYS = 7;
const FRAUD_WINDOW_HOURS = 72;
const FRAUD_THRESHOLD = 3;

const cleanupRepliedContacts = async () => {
    try {
        console.log('[Cron] Running automatic cleanup for replied contacts...');
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - DELETE_AGE_DAYS);
        const result = await Contact.deleteMany({
            status: 'replied',
            updatedAt: { $lt: cutoffDate }
        });
        if (result.deletedCount > 0) {
            console.log(`[Cron] Automatically deleted ${result.deletedCount} old replied contacts.`);
        } else {
            console.log('[Cron] No old replied contacts found to delete.');
        }
    } catch (error) {
        console.error('[Cron] Error during contact cleanup:', error);
    }
};

const checkCardFraud = async () => {
    try {
        console.log('[FraudCron] Scanning for repeated payment failures...');
        const since = new Date(Date.now() - FRAUD_WINDOW_HOURS * 60 * 60 * 1000);
        const suspects = await AbandonedCheckout.aggregate([
            {
                $match: {
                    status: 'abandoned',
                    createdAt: { $gte: since }
                }
            },
            {
                $group: {
                    _id: '$user',
                    failureCount: { $sum: 1 },
                    totalAttempted: { $sum: '$totalAmount' },
                    paymentMethods: { $addToSet: '$paymentMethod' },
                    lastAttempt: { $max: '$createdAt' }
                }
            },
            {
                $match: {
                    failureCount: { $gte: FRAUD_THRESHOLD }
                }
            },
            {
                $sort: { failureCount: -1 }
            }
        ]);

        if (!suspects.length) {
            console.log('[FraudCron] No suspicious payment patterns detected.');
            return;
        }

        console.warn(`[WARN] [FraudCron] ${suspects.length} user(s) flagged for suspicious payment failures!`);

        const superAdmins = await User.find({ role: 'super-admin' }).select('email firstName');
        const fallbackEmail = process.env.SUPER_ADMIN_EMAIL;

        if (!superAdmins.length && !fallbackEmail) {
            console.error('❌ [FraudCron] No super admin email found to send fraud alerts!');
            return;
        }

        const alertRecipients = superAdmins.length
            ? superAdmins.map(a => a.email)
            : [fallbackEmail];

        let logoUrl;
        try {
            const settings = await Settings.getSettings();
            logoUrl = settings?.store?.logo;
        } catch (_) { }

        for (const suspect of suspects) {
            try {
                const user = await User.findById(suspect._id).select('firstName lastName email');
                if (!user) continue;

                for (const adminEmail of alertRecipients) {
                    await sendEmail({
                        to: adminEmail,
                        subject: `🕵️ Fraud Risk: ${user.firstName} ${user.lastName} — ${suspect.failureCount} payment failures`,
                        html: getFraudAlert({
                            userName: `${user.firstName} ${user.lastName}`,
                            userEmail: user.email,
                            userId: user._id.toString(),
                            failureCount: suspect.failureCount,
                            totalAttempted: suspect.totalAttempted,
                            paymentMethods: suspect.paymentMethods.filter(Boolean),
                            timeWindow: `${FRAUD_WINDOW_HOURS} hours`,
                            logoUrl
                        })
                    });
                    console.log(`📧 [FraudCron] Fraud alert sent for ${user.email} to ${adminEmail}`);
                }
            } catch (userErr) {
                console.error(`❌ [FraudCron] Error processing suspect ${suspect._id}:`, userErr.message);
            }
        }
    } catch (error) {
        console.error('❌ [FraudCron] Error during fraud check:', error);
    }
};

const reconcilePendingOrders = async () => {
    try {
        await runPaymentReconciliation();
    } catch (error) {
        console.error('❌ [ReconciliationWorker] Unhandled error in reconciliation run:', error.message);
    }
};

const startCronJobs = () => {
    console.log(`[Cron] System initialized. System cleanups and reconciliation scheduled.`);

    cron.schedule('0 0 * * *', cleanupRepliedContacts);
    setTimeout(cleanupRepliedContacts, 5000);

    cron.schedule('0 */12 * * *', checkCardFraud);
    setTimeout(checkCardFraud, 35000);

    cron.schedule('*/5 * * * *', reconcilePendingOrders);
    setTimeout(reconcilePendingOrders, 65000);

    cron.schedule('*/15 * * * *', async () => {
        try {
            console.log('[Cron] Scanning for SLA breaches (orders stuck > 2 hours in confirmed)...');
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
            const SLAOrders = await Order.find({
                fulfillmentStatus: 'unfulfilled',
                createdAt: { $lt: twoHoursAgo }
            });

            for (const order of SLAOrders) {
                const AdminAlert = (await import('../models/AdminAlert.js')).default;
                const existingAlert = await AdminAlert.findOne({
                    category: 'sla_breach',
                    orderId: order._id,
                    isResolved: false
                });

                if (!existingAlert) {
                    await createAlert(
                        'warning',
                        'sla_breach',
                        `SLA Breach: Order #${order.orderNumber} placed at ${order.createdAt} is still unfulfilled.`,
                        { orderId: order._id }
                    );
                    console.log(`[Cron] SLA Breach alert created for Order #${order.orderNumber}`);
                }
            }
        } catch (err) {
            console.error('[Cron] SLA Breach scanner error:', err.message);
        }
    });

    cron.schedule('*/30 * * * *', async () => {
        try {
            console.log('[Cron] Running Low Stock scanner...');
            const ProductModel = (await import('../models/Product.js')).default;
            const lowStockProducts = await ProductModel.find({
                isActive: true,
                $expr: {
                  $lte: [
                    { $subtract: ["$inventory.physicalStock", "$inventory.reservedStock"] },
                    "$inventory.lowStockThreshold"
                  ]
                }
            });

            for (const prod of lowStockProducts) {
                const AdminAlert = (await import('../models/AdminAlert.js')).default;
                const existingAlert = await AdminAlert.findOne({
                    category: 'low_stock',
                    productId: prod._id,
                    isResolved: false
                });

                if (!existingAlert) {
                    await createAlert(
                        'warning',
                        'low_stock',
                        `Low Stock Alert: Product ${prod.name} has dropped below threshold. Available: ${prod.inventory.physicalStock - prod.inventory.reservedStock}`,
                        { productId: prod._id }
                    );
                    console.log(`[Cron] Low Stock alert created for Product ${prod.name}`);
                }
            }
        } catch (err) {
            console.error('[Cron] Low stock scanner error:', err.message);
        }
    });

    cron.schedule('0 * * * *', async () => {
        try {
            console.log('[Cron] Running audit log anomaly detection scans...');
            const ActivityLog = (await import('../models/ActivityLog.js')).default;
            const UserModel = (await import('../models/User.js')).default;

            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            const overrideStats = await ActivityLog.aggregate([
                {
                    $match: {
                        action: 'MANUAL_PAYMENT_OVERRIDE',
                        createdAt: { $gte: twentyFourHoursAgo }
                    }
                },
                {
                    $group: {
                        _id: '$admin',
                        count: { $sum: 1 }
                    }
                },
                {
                    $match: {
                        count: { $gt: 10 }
                    }
                }
            ]);

            for (const stat of overrideStats) {
                if (stat._id) {
                    const adminUser = await UserModel.findById(stat._id);
                    if (adminUser) {
                        await createAlert(
                            'critical',
                            'failed_payment',
                            `Anomaly: Admin ${adminUser.firstName} ${adminUser.lastName} (${adminUser.email}) has performed ${stat.count} payment overrides in the last 24 hours.`
                        );
                    }
                }
            }

            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const overrideNoReceiptStats = await ActivityLog.aggregate([
                {
                    $match: {
                        action: 'MANUAL_PAYMENT_OVERRIDE',
                        createdAt: { $gte: oneHourAgo },
                        'details.receiptProvided': false
                    }
                },
                {
                    $group: {
                        _id: '$admin',
                        count: { $sum: 1 }
                    }
                },
                {
                    $match: {
                        count: { $gte: 3 }
                    }
                }
            ]);

            for (const stat of overrideNoReceiptStats) {
                if (stat._id) {
                    const adminUser = await UserModel.findById(stat._id);
                    if (adminUser) {
                        await createAlert(
                            'critical',
                            'failed_payment',
                            `Anomaly: Admin ${adminUser.firstName} ${adminUser.lastName} (${adminUser.email}) marked ${stat.count} orders paid without M-Pesa receipt in 60 minutes.`
                        );
                    }
                }
            }
        } catch (err) {
            console.error('[Cron] Audit log anomaly detection scanner error:', err.message);
        }
    });

    cron.schedule('0 1 * * *', async () => {
        try {
            console.log('[Cron] Running loyalty points expiry scanner...');
            const LoyaltyTransaction = (await import('../models/LoyaltyTransaction.js')).default;
            const UserModel = (await import('../models/User.js')).default;
            
            const now = new Date();
            const expiredTxns = await LoyaltyTransaction.find({
                expiresAt: { $lte: now },
                isExpired: false,
                points: { $gt: 0 }
            });

            for (const txn of expiredTxns) {
                const user = await UserModel.findById(txn.user);
                if (user && user.loyaltyPoints > 0) {
                    const deductPoints = Math.min(user.loyaltyPoints, txn.points);
                    user.loyaltyPoints -= deductPoints;
                    await user.save();

                    txn.isExpired = true;
                    await txn.save();

                    await LoyaltyTransaction.create({
                        user: user._id,
                        points: -deductPoints,
                        type: 'expiry',
                        balanceAfter: user.loyaltyPoints,
                        description: `Points from transaction ${txn._id} expired.`
                    });

                    console.log(`[Cron] Expired ${deductPoints} loyalty points for user ${user._id}`);
                } else {
                    txn.isExpired = true;
                    await txn.save();
                }
            }
        } catch (err) {
            console.error('[Cron] Points expiry job error:', err.message);
        }
    });

    cron.schedule('0 2 * * *', async () => {
        try {
            console.log('[Cron] Running reorder streak alerts & reset scanner...');
            const UserModel = (await import('../models/User.js')).default;
            const users = await UserModel.find({ reorderStreak: { $gt: 0 }, lastReorderDate: { $ne: null } });

            const now = new Date();
            for (const user of users) {
                const threshold = user.reorderAverageDays || 30;
                const daysSinceLast = (now - new Date(user.lastReorderDate)) / (1000 * 60 * 60 * 24);

                if (daysSinceLast > threshold) {
                    console.log(`[Cron] Resetting streak of ${user.reorderStreak} to 0 for user ${user.email} (last reorder ${daysSinceLast.toFixed(1)} days ago)`);
                    user.reorderStreak = 0;
                    await user.save();
                } else if (daysSinceLast >= threshold - 2) {
                    try {
                        await sendEmail({
                            to: user.email,
                            subject: `☕ Keep your reorder streak alive!`,
                            html: `
                                <div>
                                    <h3>Hello ${user.firstName},</h3>
                                    <p>Your current coffee reorder streak is <strong>${user.reorderStreak}</strong>!</p>
                                    <p>To keep your streak alive and earn bonus rewards, place your next order in the next 48 hours.</p>
                                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/coffee-shop" style="background:#5c3e35;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;margin-top:10px;">Order Coffee Now</a>
                                </div>
                            `
                        });
                        console.log(`[Cron] Reorder streak alert email sent to ${user.email}`);
                    } catch (emailErr) {
                        console.error(`[Cron] Error sending streak email to ${user.email}:`, emailErr.message);
                    }
                }
            }
        } catch (err) {
            console.error('[Cron] Reorder streak alert job error:', err.message);
        }
    });

    cron.schedule('*/15 * * * *', async () => {
        try {
            console.log('[Cron] Running support ticket SLA breach check...');
            const ContactModel = (await import('../models/Contact.js')).default;

            const now = new Date();
            const breachedTickets = await ContactModel.find({
                status: { $nin: ['resolved', 'closed', 'replied'] },
                slaDeadline: { $lte: now },
                slaBreached: false
            });

            for (const ticket of breachedTickets) {
                ticket.slaBreached = true;
                ticket.slaBreachLoggedAt = now;
                await ticket.save();

                await createAlert(
                    'critical',
                    'sla_breach',
                    `SLA Breach: Support Ticket from ${ticket.name} (${ticket.email}) has breached response SLA deadline.`,
                    { orderId: ticket.linkedOrderId || ticket.order || null }
                );
                console.log(`[Cron] Created SLA breach alert for Ticket #${ticket._id}`);
            }
        } catch (err) {
            console.error('[Cron] Ticket SLA breach check error:', err.message);
        }
    });

    // Scheduled Payment Reconciliation Job (Every 4 Hours)
    cron.schedule('0 */4 * * *', async () => {
        try {
            console.log('[Cron] Running scheduled payment reconciliation scanner...');
            await runPaymentReconciliation();
        } catch (err) {
            console.error('[Cron] Payment reconciliation job error:', err.message);
        }
    });

    console.log('✅ [Cron] All node-cron jobs scheduled inline in workers/index.js');
};
// ──────────────────────────────────────────────────────────────────────────────

const startWorkersAndCrons = async () => {
  try {
    console.log('[Workers Entry] Starting always-on background workers...');

    await connectDB();
    console.log('[Workers Entry] Database connection established.');

    const emailWorker = startEmailWorker();
    const retryWorker = startRetryWorker();
    const dlqWorker = startDlqWorker();
    const subscriptionWorker = startSubscriptionWorker();

    console.log('[Workers Entry] All BullMQ workers successfully initialized.');

    // Start cron jobs directly inside workers context
    startCronJobs();
    console.log('[Workers Entry] All node-cron jobs successfully scheduled.');

    startHealthCheckLoop();
    console.log('[Workers Entry] Health monitoring loop started (every 2 minutes).');

    startAdScheduleLoop();
    console.log('[Workers Entry] Ad scheduling loop started (every 60 seconds).');

    const shutdown = async (signal) => {
      console.log(`\n[Workers Entry] Received ${signal}. Shutting down gracefully...`);
      try {
        if (healthCheckTimer) {
          clearInterval(healthCheckTimer);
          console.log('[Workers Entry] Health check interval cleared.');
        }
        if (adScheduleTimer) {
          clearInterval(adScheduleTimer);
          console.log('[Workers Entry] Ad schedule interval cleared.');
        }
        await Promise.all([
          emailWorker.close(),
          retryWorker.close(),
          dlqWorker.close(),
          subscriptionWorker.close(),
        ]);
        console.log('[Workers Entry] All workers closed.');
      } catch (err) {
        console.error('[Workers Entry] Error during shutdown:', err);
      }
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('[Workers Entry] CRITICAL ERROR starting workers and cron jobs:', error);
    process.exit(1);
  }
};

startWorkersAndCrons();
