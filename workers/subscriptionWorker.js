// workers/subscriptionWorker.js
import { Worker } from 'bullmq';
import redisClient from '../config/redis.js';
import Subscription from '../models/Subscription.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { v4 as uuidv4 } from 'uuid';

// Setup connection options for BullMQ
const connection = redisClient;

export const startSubscriptionWorker = () => {
  const worker = new Worker('subscriptionQueue', async (job) => {
    const { subscriptionId } = job.data;
    console.log(`📥 [Subscription Worker] Processing renewal for Subscription ID: ${subscriptionId}`);

    const sub = await Subscription.findById(subscriptionId);
    if (!sub) {
      console.warn(`⚠️ [Subscription Worker] Subscription record not found: ${subscriptionId}. Skipping.`);
      return;
    }

    if (sub.status !== 'active') {
      console.warn(`⚠️ [Subscription Worker] Subscription ${subscriptionId} is not active (Status: ${sub.status}). Skipping.`);
      return;
    }

    // 1. Fetch current product and check availability/stock
    const product = await Product.findById(sub.product);
    if (!product || !product.isActive) {
      throw new Error(`Product ${sub.product} is currently unavailable or inactive.`);
    }

    if (product.inventory.stock < sub.quantity) {
      throw new Error(`Product ${product.name} is out of stock (Available: ${product.inventory.stock}, Requested: ${sub.quantity}).`);
    }

    // 2. JIT Pricing and Subscription discount calculation
    const price = product.sizes.find(s => s.size === sub.size)?.price || product.price;
    const subtotal = price * sub.quantity;
    const discount = (subtotal * (product.subscriptionDiscount || 10)) / 100;
    const total = subtotal - discount;

    const orderNumber = `SUB-${Date.now()}-${uuidv4().split('-')[0].toUpperCase()}`;

    // 3. Create renewal Order
    const newOrder = await Order.create({
      orderNumber,
      user: sub.user,
      items: [{
        product: sub.product,
        name: `${product.name} (Subscription)`,
        price: price,
        quantity: sub.quantity,
        size: sub.size,
        image: product.images?.[0]?.url,
        itemTotal: subtotal
      }],
      shippingAddress: sub.shippingAddress,
      subtotal,
      total,
      paymentMethod: sub.paymentMethod,
      paymentStatus: 'pending',
      orderStatus: 'open',
      notes: `Recurring subscription renewal for ${sub.frequency} delivery.`
    });

    console.log(`✅ [Subscription Worker] Successfully generated Order #${newOrder.orderNumber} for Subscription ${sub._id}`);

    // 4. Update billing dates on Subscription
    const today = new Date();
    sub.lastBillingDate = today;
    sub.nextBillingDate = Subscription.calculateNextDate(sub.frequency);
    await sub.save();

    console.log(`📝 [Subscription Worker] Subscription ${sub._id} updated. Next Billing Date: ${sub.nextBillingDate}`);

  }, { 
    connection,
    concurrency: 2 // Max 2 concurrent renewals
  });

  worker.on('completed', (job) => {
    console.log(`🎯 [Subscription Worker] Job ${job.id} renewal complete.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`💥 [Subscription Worker] Job ${job?.id} failed with error: ${err.message}`);
  });

  console.log('📡 [Subscription Worker] Worker thread listening on subscriptionQueue');
  return worker;
};

export default startSubscriptionWorker;
