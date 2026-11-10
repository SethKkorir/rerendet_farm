// services/orderExpiryService.js
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import sendEmail from '../utils/sendEmail.js';
import { getOrderExpiredEmail } from '../utils/emailTemplates.js';
import Settings from '../models/Settings.js';

/**
 * Release reserved stock for an order's items safely and idempotently.
 */
export const releaseOrderStock = async (orderItems) => {
  if (!Array.isArray(orderItems)) return;

  for (const item of orderItems) {
    if (!item.product) continue;
    const baseProduct = await Product.findById(item.product);
    if (!baseProduct) continue;

    const qtyToRelease = Math.max(1, parseInt(item.quantity) || 1);

    if (baseProduct.isBundle && Array.isArray(baseProduct.bundleDetails)) {
      for (const detail of baseProduct.bundleDetails) {
        const totalToDecrement = (detail.quantity || 1) * qtyToRelease;
        await Product.findOneAndUpdate(
          { _id: detail.product },
          { $inc: { "inventory.reservedStock": -totalToDecrement } }
        );
      }
    } else {
      await Product.findOneAndUpdate(
        { _id: item.product },
        { $inc: { "inventory.reservedStock": -qtyToRelease } }
      );
    }
  }
};

/**
 * Process expired Paybill orders
 * Finds orders where:
 * - paymentMethod = 'paybill'
 * - paymentStatus in ['pending', 'payment_reported']
 * - paymentExpiresAt <= now
 * - stockReleased != true
 *
 * Honors PAYMENT_REVIEW_GRACE_HOURS for customer-reported payments.
 * Idempotency guaranteed via atomic findOneAndUpdate with stockReleased: { $ne: true }
 */
export const expireUnpaidPaybillOrders = async () => {
  const now = new Date();
  const graceHours = parseInt(process.env.PAYMENT_REVIEW_GRACE_HOURS || process.env.PAYBILL_EXPIRY_GRACE_HOURS, 10) || 24;
  console.log(`[ExpiryJob] Checking for expired Paybill orders (before ${now.toISOString()}, grace: ${graceHours}h)...`);

  const candidateOrders = await Order.find({
    paymentMethod: 'paybill',
    paymentStatus: { $in: ['pending', 'payment_reported'] },
    paymentExpiresAt: { $lte: now },
    stockReleased: { $ne: true }
  }).populate('user', 'firstName lastName email');

  console.log(`[ExpiryJob] Found ${candidateOrders.length} candidate expired Paybill orders.`);

  let processedCount = 0;

  let logoUrl;
  try {
    const settings = await Settings.getSettings();
    logoUrl = settings?.store?.logo;
  } catch (_) {}

  for (const candidate of candidateOrders) {
    try {
      // Check for customer payment report & grace period
      if (candidate.paymentReporting?.reported) {
        const graceExpiry = candidate.paymentGraceExpiresAt
          || (candidate.paymentExpiresAt ? new Date(candidate.paymentExpiresAt.getTime() + graceHours * 60 * 60 * 1000) : null);

        if (graceExpiry && now < graceExpiry) {
          console.log(`[ExpiryJob] Order #${candidate.orderNumber} is in review grace period until ${graceExpiry.toISOString()}. Skipping.`);
          continue;
        }
      }

      // Atomic claim to ensure idempotency: only one worker/run can process
      const order = await Order.findOneAndUpdate(
        {
          _id: candidate._id,
          paymentStatus: { $in: ['pending', 'payment_reported'] },
          stockReleased: { $ne: true }
        },
        {
          $set: {
            paymentStatus: 'expired',
            orderStatus: 'cancelled',
            cancellationReason: 'Paybill payment reservation expired (unpaid)',
            stockReleased: true
          },
          $push: {
            orderEvents: {
              status: 'ORDER_EXPIRED',
              note: 'Paybill payment window and grace period expired. Order cancelled and reserved stock released.',
              timestamp: new Date()
            }
          }
        },
        { new: true }
      );

      // If null, order was already claimed/processed concurrently
      if (!order) {
        console.log(`[ExpiryJob] Order #${candidate.orderNumber} already processed.`);
        continue;
      }

      // Release reserved stock safely
      await releaseOrderStock(order.items);
      processedCount++;
      console.log(`[ExpiryJob] Released stock and marked order #${order.orderNumber} as expired.`);

      // Send customer notification email
      const customerEmail = order.shippingAddress?.email || order.user?.email;
      const customerName = order.shippingAddress?.firstName || order.user?.firstName || 'Valued Customer';

      if (customerEmail) {
        try {
          const emailHtml = getOrderExpiredEmail(customerName, order.orderNumber, logoUrl);
          await sendEmail({
            to: customerEmail,
            subject: `Order Expired - #${order.orderNumber}`,
            html: emailHtml
          });
          console.log(`[ExpiryJob] Sent expiration email to ${customerEmail} for order #${order.orderNumber}`);
        } catch (emailErr) {
          console.error(`[ExpiryJob] Failed to send expiration email to ${customerEmail}:`, emailErr.message);
        }
      }
    } catch (orderErr) {
      console.error(`[ExpiryJob] Error expiring order #${candidate.orderNumber}:`, orderErr);
    }
  }

  console.log(`[ExpiryJob] Completed run. Successfully expired and released stock for ${processedCount} orders.`);
  return { processedCount, totalFound: candidateOrders.length };
};

