import sendEmail from './sendEmail.js';
import { getOrderConfirmationEmail } from './emailTemplates.js';
import Settings from '../models/Settings.js';

/**
 * Sends the Order Confirmation Email to the customer.
 * @param {object} order - The populated Order document
 */
export const sendOrderConfirmationEmailHelper = async (order) => {
    const frontendUrl = (!process.env.FRONTEND_URL || process.env.FRONTEND_URL.includes('localhost') || process.env.FRONTEND_URL.includes('127.0.0.1')) && (process.env.NODE_ENV === 'production' || process.env.VERCEL)
      ? 'https://rerendet-farm.vercel.app'
      : (process.env.FRONTEND_URL || 'http://localhost:3000');
    const dashboardUrl = `${frontendUrl}/account/orders/${order._id}`;

    // Fetch store logo
    let logoUrl;
    try {
      const settings = await Settings.getSettings();
      logoUrl = settings?.store?.logo;
    } catch (e) {
      console.error('Error loading settings logo for order confirmation email:', e);
    }

    const emailHtml = getOrderConfirmationEmail(
      order.shippingAddress.firstName,
      order.orderNumber,
      order.items,
      order.total,
      order.trackingNumber,
      logoUrl,
      order._id.toString()
    );

    await sendEmail({
      to: order.shippingAddress.email,
      subject: `Order Selection Confirmed - #${order.orderNumber}`,
      html: emailHtml
    });

    console.log(`📧 Order confirmation email sent to ${order.shippingAddress.email} for order #${order.orderNumber}`);
  } catch (error) {
    console.error(`❌ Failed to send order confirmation email for order #${order?.orderNumber || 'unknown'}:`, error);
  }
};
