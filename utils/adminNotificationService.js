import { sendEmail } from './emailService.js';

/**
 * Get active, verified, deliverable admin recipient emails
 */
export const getActiveAdminRecipients = async () => {
    const recipients = new Set();
    const primaryAdmin = (process.env.SUPER_ADMIN_EMAIL || 'rerendet@gmail.com').trim().toLowerCase();

    const isDeliverable = (email) => {
        if (!email || typeof email !== 'string') return false;
        const trimmed = email.trim().toLowerCase();
        if (!trimmed.includes('@') || trimmed.length < 6) return false;
        // Never send admin alerts to customer email
        if (trimmed === 'zsethkipchumba179@gmail.com') return false;
        // Block unroutable or test domains that cause Mail Delivery Subsystem bounces
        if (trimmed.endsWith('@example.com') || trimmed.endsWith('@test.com') || trimmed.endsWith('@rerendetcoffee.com')) {
            return false;
        }
        return true;
    };

    // Primary admin notification target (rerendet@gmail.com)
    if (isDeliverable(primaryAdmin)) {
        recipients.add(primaryAdmin);
    }
    recipients.add('rerendet@gmail.com');

    try {
        const { default: mongoose } = await import('mongoose');
        if (mongoose.connection && mongoose.connection.readyState === 1) {
            const { default: User } = await import('../models/User.js');
            const admins = await User.find({
                role: { $in: ['admin', 'super-admin'] },
                isVerified: true,
                isLocked: { $ne: true }
            }).select('email');

            for (const admin of admins) {
                if (isDeliverable(admin.email)) {
                    recipients.add(admin.email.trim().toLowerCase());
                }
            }
        }
    } catch (err) {
        console.error('Failed to load admin recipients:', err.message);
    }

    // Ensure customer email is never included in admin alerts
    recipients.delete('zsethkipchumba179@gmail.com');

    return Array.from(recipients);
};

const getFrontendUrl = () => {
    return (!process.env.FRONTEND_URL || process.env.FRONTEND_URL.includes('localhost') || process.env.FRONTEND_URL.includes('127.0.0.1')) && (process.env.NODE_ENV === 'production' || process.env.VERCEL)
        ? 'https://rerendet-farm.vercel.app'
        : (process.env.FRONTEND_URL || 'http://localhost:3000');
};

/**
 * Notify admin when stock is low for a product
 */
export const sendLowStockAlert = async (product) => {
    const recipients = await getActiveAdminRecipients();
    if (recipients.length === 0) return;

    const frontendUrl = getFrontendUrl();
    const emailOptions = {
        subject: `⚠️ Low Stock Alert: ${product.name}`,
        templateName: 'lowStockAlert',
        data: {
            productName: product.name,
            currentStock: product.inventory?.stock ?? product.inventory?.physicalStock ?? 0,
            threshold: product.inventory?.lowStockAlert ?? 5,
            adminUrl: `${frontendUrl}/admin/products/${product._id}`
        }
    };

    try {
        await Promise.allSettled(recipients.map(to => sendEmail({ ...emailOptions, to })));
        console.log(`📧 Low stock alert sent for ${product.name} to ${recipients.join(', ')}`);
    } catch (error) {
        console.error('❌ Failed to send low stock alert:', error.message);
    }
};

/**
 * Notify admins when a new paid order is received
 */
export const sendNewOrderAdminAlert = async (order) => {
    const recipients = await getActiveAdminRecipients();
    if (recipients.length === 0) return;

    try {
        const itemsHtml = (order.items || []).map(item => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>${item.name}</strong> (${item.size || 'Standard'})</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">KES ${(item.itemTotal || item.price * item.quantity)?.toLocaleString()}</td>
            </tr>
        `).join('');

        const frontendUrl = getFrontendUrl();

        const emailHtml = `
            <div style="font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; max-width: 580px; margin: 30px auto; padding: 40px 36px 36px; border: 1px solid #E5E7EB; border-top: 4px solid #1E3D2F; border-radius: 4px; background-color: #FFFFFF; text-align: left;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://res.cloudinary.com/dln2pifwf/image/upload/v1779294419/rerendet-coffee/products/pb7indr2rhu7fnhh3jjh.png" alt="Rerendet Coffee" width="130" style="display: block; margin: 0 auto;" />
                </div>

                <h1 style="color: #111827; margin: 0 0 8px; font-size: 24px; font-weight: 700; text-align: center;">New Order Placed</h1>
                <p style="color: #6B7280; font-size: 14px; margin: 0 0 20px; text-align: center;">Order #${order.orderNumber} &bull; ${new Date(order.createdAt || Date.now()).toLocaleString()}</p>

                <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 18px 20px; margin-bottom: 20px;">
                    <span style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.8px; display: block; margin-bottom: 6px;">Customer & Delivery</span>
                    <strong style="color: #111827; font-size: 14.5px; display: block;">${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}</strong>
                    <span style="font-size: 13px; color: #4B5563; display: block; margin-top: 2px;">${order.shippingAddress?.email || ''} &bull; ${order.shippingAddress?.phone || ''}</span>
                    <span style="font-size: 13px; color: #4B5563; display: block; margin-top: 2px;">${order.shippingAddress?.address || ''}, ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.county || ''}</span>
                </div>

                <div style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px;">
                    <span style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.8px; display: block; margin-bottom: 12px;">Items Ordered</span>
                    <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="2" style="padding: 12px 10px 4px 0; font-weight: 700; text-align: right; color: #111827;">Total Amount:</td>
                                <td style="padding: 12px 0 4px 10px; font-weight: 700; text-align: right; color: #1E3D2F; font-size: 18px;">KES ${order.total?.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div style="text-align: center; margin-top: 26px;">
                    <a href="${frontendUrl}/admin/orders/${order._id}" style="background-color: #1E3D2F; color: #FFFFFF !important; padding: 12px 34px; text-decoration: none; border-radius: 9999px; font-weight: 600; font-size: 14px; display: inline-block;">Open in Admin Portal</a>
                </div>
            </div>
        `;

        await Promise.allSettled(recipients.map(email => 
            sendEmail({
                to: email,
                subject: `New Order Placed: #${order.orderNumber}`,
                html: emailHtml
            })
        ));
    } catch (error) {
        console.error('❌ Failed to send new order admin alert:', error.message);
    }
};

/**
 * Notify admins when a new Paybill order is awaiting manual payment confirmation
 */
export const sendNewOrderAwaitingPaymentAdminAlert = async (order) => {
    const recipients = await getActiveAdminRecipients();
    if (recipients.length === 0) return;

    try {
        const frontendUrl = getFrontendUrl();

        const emailHtml = `
            <div style="font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; max-width: 580px; margin: 30px auto; padding: 40px 36px 36px; border: 1px solid #E5E7EB; border-top: 4px solid #1E3D2F; border-radius: 4px; background-color: #FFFFFF; text-align: left;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://res.cloudinary.com/dln2pifwf/image/upload/v1779294419/rerendet-coffee/products/pb7indr2rhu7fnhh3jjh.png" alt="Rerendet Coffee" width="130" style="display: block; margin: 0 auto;" />
                </div>

                <h1 style="color: #111827; margin: 0 0 8px; font-size: 24px; font-weight: 700; text-align: center;">New Order Awaiting Payment</h1>
                <p style="color: #6B7280; font-size: 14px; margin: 0 0 20px; text-align: center;">Order #${order.orderNumber} placed via Paybill (KES ${order.total?.toLocaleString()})</p>

                <div style="color: #374151; font-size: 13.5px; background: #FFFBEB; border: 1px solid #FCD34D; padding: 16px 18px; border-radius: 8px; line-height: 1.6;">
                    Customer: <strong>${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}</strong> (${order.shippingAddress?.phone || ''})<br/>
                    Email: <strong>${order.shippingAddress?.email || '—'}</strong><br/>
                    Payment Method: <strong>M-Pesa Paybill</strong><br/>
                    Status: <strong>Awaiting Bank/SMS Verification</strong>
                </div>

                <div style="text-align: center; margin-top: 26px;">
                    <a href="${frontendUrl}/admin/orders/${order._id}" style="background-color: #1E3D2F; color: #FFFFFF !important; padding: 12px 34px; text-decoration: none; border-radius: 9999px; font-weight: 600; font-size: 14px; display: inline-block;">Open Order to Verify Payment</a>
                </div>
            </div>
        `;

        await Promise.allSettled(recipients.map(email => 
            sendEmail({
                to: email,
                subject: `New Order Awaiting Payment: #${order.orderNumber}`,
                html: emailHtml
            })
        ));
    } catch (error) {
        console.error('❌ Failed to send awaiting payment admin alert:', error.message);
    }
};

/**
 * Notify admins when a Paybill payment is confirmed
 */
export const sendPaymentConfirmedAdminAlert = async (order) => {
    const recipients = await getActiveAdminRecipients();
    if (recipients.length === 0) return;

    try {
        const frontendUrl = getFrontendUrl();

        const emailHtml = `
            <div style="font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; max-width: 580px; margin: 30px auto; padding: 40px 36px 36px; border: 1px solid #E5E7EB; border-top: 4px solid #1E3D2F; border-radius: 4px; background-color: #FFFFFF; text-align: left;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://res.cloudinary.com/dln2pifwf/image/upload/v1779294419/rerendet-coffee/products/pb7indr2rhu7fnhh3jjh.png" alt="Rerendet Coffee" width="130" style="display: block; margin: 0 auto;" />
                </div>

                <h1 style="color: #166534; margin: 0 0 8px; font-size: 24px; font-weight: 700; text-align: center;">Payment Confirmed</h1>
                <p style="color: #6B7280; font-size: 14px; margin: 0 0 20px; text-align: center;">Order #${order.orderNumber} is now fully paid (KES ${order.total?.toLocaleString()})</p>

                <div style="color: #166534; font-size: 13.5px; background: #F0FDF4; border: 1px solid #BBF7D0; padding: 16px 18px; border-radius: 8px; line-height: 1.6;">
                    M-Pesa Reference: <strong style="font-family: monospace;">${order.paymentConfirmation?.mpesaCode || 'Verified'}</strong><br/>
                    Amount Verified: <strong>KES ${order.paymentConfirmation?.amountReceived?.toLocaleString()}</strong><br/>
                    Ready for: <strong>Roasting & Packaging</strong>
                </div>

                <div style="text-align: center; margin-top: 26px;">
                    <a href="${frontendUrl}/admin/orders/${order._id}" style="background-color: #1E3D2F; color: #FFFFFF !important; padding: 12px 34px; text-decoration: none; border-radius: 9999px; font-weight: 600; font-size: 14px; display: inline-block;">Fulfill Order</a>
                </div>
            </div>
        `;

        await Promise.allSettled(recipients.map(email => 
            sendEmail({
                to: email,
                subject: `Payment Confirmed: #${order.orderNumber}`,
                html: emailHtml
            })
        ));
    } catch (error) {
        console.error('❌ Failed to send payment confirmed admin alert:', error.message);
    }
};

/**
 * Notify admins when a customer reports payment
 */
export const sendPaymentReportedAdminAlert = async (order, mpesaCode) => {
    const recipients = await getActiveAdminRecipients();
    if (recipients.length === 0) return;

    try {
        const frontendUrl = getFrontendUrl();

        const emailHtml = `
            <div style="font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; max-width: 580px; margin: 30px auto; padding: 40px 36px 36px; border: 1px solid #E5E7EB; border-top: 4px solid #1E3D2F; border-radius: 4px; background-color: #FFFFFF; text-align: left;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://res.cloudinary.com/dln2pifwf/image/upload/v1779294419/rerendet-coffee/products/pb7indr2rhu7fnhh3jjh.png" alt="Rerendet Coffee" width="130" style="display: block; margin: 0 auto;" />
                </div>

                <h1 style="color: #92400E; margin: 0 0 8px; font-size: 24px; font-weight: 700; text-align: center;">Payment Reported</h1>
                <p style="color: #6B7280; font-size: 14px; margin: 0 0 20px; text-align: center;">Customer reported payment for Order #${order.orderNumber}</p>

                <div style="color: #374151; font-size: 13.5px; background: #FEF3C7; border: 1px solid #FCD34D; padding: 16px 18px; border-radius: 8px; line-height: 1.6;">
                    Customer: <strong>${order.shippingAddress?.firstName || 'Customer'} ${order.shippingAddress?.lastName || ''}</strong><br/>
                    Submitted M-Pesa Code: <strong style="font-family: monospace; color: #111827;">${mpesaCode || 'None Provided'}</strong><br/>
                    Order Expected Total: <strong>KES ${order.total?.toLocaleString()}</strong><br/>
                    Phone: <strong>${order.shippingAddress?.phone || '—'}</strong>
                </div>

                <div style="text-align: center; margin-top: 26px;">
                    <a href="${frontendUrl}/admin/orders?search=${order.orderNumber}" style="background-color: #1E3D2F; color: #FFFFFF !important; padding: 12px 34px; text-decoration: none; border-radius: 9999px; font-weight: 600; font-size: 14px; display: inline-block;">Open Verification Queue</a>
                </div>
            </div>
        `;

        await Promise.allSettled(recipients.map(email => 
            sendEmail({
                to: email,
                subject: `Payment Reported: Order #${order.orderNumber} (${mpesaCode || 'Needs Check'})`,
                html: emailHtml
            })
        ));
    } catch (error) {
        console.error('❌ Failed to send payment reported admin alert:', error.message);
    }
};

/**
 * Notify admins when a partial payment is verified
 */
export const sendPartialPaymentAdminAlert = async (order, mpesaCode, amountReceived, outstandingBalance) => {
    const recipients = await getActiveAdminRecipients();
    if (recipients.length === 0) return;

    try {
        const frontendUrl = getFrontendUrl();

        const emailHtml = `
            <div style="font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; max-width: 580px; margin: 30px auto; padding: 40px 36px 36px; border: 1px solid #E5E7EB; border-top: 4px solid #1E3D2F; border-radius: 4px; background-color: #FFFFFF; text-align: left;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://res.cloudinary.com/dln2pifwf/image/upload/v1779294419/rerendet-coffee/products/pb7indr2rhu7fnhh3jjh.png" alt="Rerendet Coffee" width="130" style="display: block; margin: 0 auto;" />
                </div>

                <h1 style="color: #92400E; margin: 0 0 8px; font-size: 24px; font-weight: 700; text-align: center;">Partial Payment Recorded</h1>
                <p style="color: #6B7280; font-size: 14px; margin: 0 0 20px; text-align: center;">Order #${order.orderNumber} has an outstanding balance</p>

                <div style="color: #374151; font-size: 13.5px; background: #FEF3C7; border: 1px solid #FCD34D; padding: 16px 18px; border-radius: 8px; line-height: 1.6;">
                    Verified Code: <strong style="font-family: monospace;">${mpesaCode}</strong><br/>
                    Amount Received: <strong style="color: #16A34A;">KES ${amountReceived?.toLocaleString()}</strong><br/>
                    Remaining Balance: <strong style="color: #DC2626;">KES ${outstandingBalance?.toLocaleString()}</strong><br/>
                    Order Prep: <strong>Blocked until fully settled</strong>
                </div>
            </div>
        `;

        await Promise.allSettled(recipients.map(email => 
            sendEmail({
                to: email,
                subject: `Partial Payment: Order #${order.orderNumber} (KES ${outstandingBalance} remaining)`,
                html: emailHtml
            })
        ));
    } catch (error) {
        console.error('❌ Failed to send partial payment admin alert:', error.message);
    }
};
