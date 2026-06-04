import { sendEmail } from './emailService.js';

/**
 * Notify admin when stock is low for a product
 */
export const sendLowStockAlert = async (product) => {
    const adminEmail = process.env.SUPER_ADMIN_EMAIL || process.env.EMAIL_USER;

    if (!adminEmail) {
        console.warn('⚠️ No admin email configured for low stock alerts');
        return;
    }

        const frontendUrl = (!process.env.FRONTEND_URL || process.env.FRONTEND_URL.includes('localhost') || process.env.FRONTEND_URL.includes('127.0.0.1')) && (process.env.NODE_ENV === 'production' || process.env.VERCEL)
            ? 'https://rerendet-farm.vercel.app'
            : (process.env.FRONTEND_URL || 'http://localhost:3000');
        const emailOptions = {
            email: adminEmail,
            subject: `⚠️ Low Stock Alert: ${product.name}`,
            template: 'lowStockAlert',
            context: {
                productName: product.name,
                currentStock: product.inventory.stock,
                threshold: product.inventory.lowStockAlert,
                productUrl: `${frontendUrl}/admin/products/${product._id}`
            }
        };

    try {
        await sendEmail(emailOptions);
        console.log(`📧 Low stock alert sent for ${product.name} to ${adminEmail}`);
    } catch (error) {
        console.error('❌ Failed to send low stock alert:', error.message);
    }
};

/**
 * Notify admins when a new order is received
 */
export const sendNewOrderAdminAlert = async (order) => {
    const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'zsethkipchumba179@gmail.com';

    if (!adminEmail) {
        console.warn('⚠️ No admin email configured for order alerts');
        return;
    }

    try {
        const { default: User } = await import('../models/User.js');
        const admins = await User.find({ role: { $in: ['admin', 'super-admin'] } }).select('email firstName');
        const recipients = new Set([adminEmail, ...admins.map(a => a.email)]);

        console.log(`🛡️ [New Order Alert] Dispatching notification to ${recipients.size} admin recipients...`);

        const itemsHtml = order.items.map(item => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>${item.name}</strong> (${item.size})</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">KES ${item.itemTotal?.toLocaleString()}</td>
            </tr>
        `).join('');

        const frontendUrl = (!process.env.FRONTEND_URL || process.env.FRONTEND_URL.includes('localhost') || process.env.FRONTEND_URL.includes('127.0.0.1')) && (process.env.NODE_ENV === 'production' || process.env.VERCEL)
            ? 'https://rerendet-farm.vercel.app'
            : (process.env.FRONTEND_URL || 'http://localhost:3000');

        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 25px;">
                    <h1 style="color: #6b4226; margin: 0; font-size: 24px;">🎉 New Order Received!</h1>
                    <p style="color: #666; font-size: 14px; margin-top: 5px;">Rerendet Coffee Storefront</p>
                </div>
                <div style="padding: 15px; background-color: #fcf8f2; border-left: 4px solid #d4af37; border-radius: 4px; margin-bottom: 25px;">
                    <p style="margin: 0; font-size: 15px; color: #5c3e21; font-weight: bold;">Order Number: ${order.orderNumber}</p>
                    <p style="margin: 5px 0 0 0; font-size: 13px; color: #7c5e41;">Placed on: ${new Date(order.createdAt).toLocaleString()}</p>
                </div>

                <h3 style="color: #6b4226; border-bottom: 1px solid #eee; padding-bottom: 8px;">Shipping Details</h3>
                <p style="font-size: 14px; color: #333; line-height: 1.5; margin: 0 0 20px;">
                    <strong>Customer Name:</strong> ${order.shippingAddress.firstName} ${order.shippingAddress.lastName}<br>
                    <strong>Email:</strong> ${order.shippingAddress.email}<br>
                    <strong>Phone:</strong> ${order.shippingAddress.phone}<br>
                    <strong>Address:</strong> ${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.county}
                </p>

                <h3 style="color: #6b4226; border-bottom: 1px solid #eee; padding-bottom: 8px;">Order Items</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 14px;">
                    <thead>
                        <tr style="background-color: #fcf8f2;">
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #eee;">Item</th>
                            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #eee;">Qty</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #eee;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="2" style="padding: 10px; font-weight: bold; text-align: right;">Total Amount:</td>
                            <td style="padding: 10px; font-weight: bold; text-align: right; color: #d4af37; font-size: 16px;">KES ${order.total?.toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>

                <div style="text-align: center; margin: 30px 0 10px;">
                    <a href="${frontendUrl}/admin/orders/${order._id}" style="background-color: #6b4226; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">View in Admin Panel</a>
                </div>
            </div>
        `;

        const { default: sendEmail } = await import('./sendEmail.js');

        await Promise.allSettled(Array.from(recipients).map(email => 
            sendEmail({
                to: email,
                subject: `🎉 New Order Placement Alert: #${order.orderNumber}`,
                html: emailHtml
            })
        ));

    } catch (error) {
        console.error('❌ Failed to send new order admin alert:', error.message);
    }
};
