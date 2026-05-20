// utils/invoiceGenerator.js — Premium minimalist PDF Invoice
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Settings from '../models/Settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Formats a Date object to "Day Month Year" (e.g., "16 June 2025")
 */
const formatDate = (dateInput) => {
    try {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return '—';
        const day = d.getDate();
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        return `${day} ${month} ${year}`;
    } catch {
        return '—';
    }
};

/**
 * generateInvoice(order, res?)
 * - streams PDF to res if provided
 * - resolves Buffer otherwise (for email attachments)
 */
export const generateInvoice = (order, res = null) => {
    return new Promise(async (resolve, reject) => {
        try {
            // A4 page dimensions
            const W = 595.28;
            const H = 841.89;
            const M = 50; // margin

            // Fetch dynamic store settings
            let storeAddress = 'Bomet, Kenya';
            let storeEmail = 'orders@rerendetcoffee.com';
            try {
                const settings = await Settings.getSettings();
                if (settings && settings.store) {
                    if (settings.store.address) {
                        storeAddress = settings.store.address;
                        // Defensively ensure Nairobi is mapped to Bomet if still returned
                        if (storeAddress === 'Nairobi, Kenya') {
                            storeAddress = 'Bomet, Kenya';
                        }
                    }
                    if (settings.store.email) {
                        storeEmail = settings.store.email;
                    }
                }
            } catch (err) {
                console.error("Error fetching settings in invoiceGenerator:", err);
            }

            // Resolve logo path
            let resolvedLogoPath = null;
            try {
                const possiblePaths = [
                    path.join(__dirname, '..', 'client', 'public', 'rerendet-logo.png'),
                    path.join(process.cwd(), 'client', 'public', 'rerendet-logo.png')
                ];
                for (const p of possiblePaths) {
                    if (fs.existsSync(p)) {
                        resolvedLogoPath = p;
                        break;
                    }
                }
            } catch (err) {
                console.error("Error resolving logo path in invoiceGenerator:", err);
            }

            const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
            const buffers = [];

            if (res) {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="Rerendet-Invoice-${order.orderNumber}.pdf"`);
                doc.pipe(res);
            } else {
                doc.on('data', chunk => buffers.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(buffers)));
            }

            // ── Draw background on all pages ────────────────────────
            const drawPageBackground = () => {
                doc.rect(0, 0, W, H).fill('#F5F4EE');
            };

            // Draw on first page
            drawPageBackground();

            // Set up listener for subsequent pages (if table overflows)
            doc.on('pageAdded', () => {
                drawPageBackground();
            });

            // ── Top Logo & Title ────────────────────────────────────
            if (resolvedLogoPath) {
                doc.image(resolvedLogoPath, M, 40, { width: 70 });
            } else {
                doc.font('Times-Roman').fontSize(36).fillColor('#A88A44').text('RC', M, 40);
            }

            // Bold serif "INVOICE" title on the top right
            doc.font('Times-Roman').fontSize(36).fillColor('#1C1C1C')
               .text('INVOICE', M, 50, { align: 'right', width: W - M * 2 });

            // ── Billed To & Invoice Metadata ────────────────────────
            const metaY = 135;

            // Billed To Column (Left)
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1C1C1C')
               .text('BILLED TO:', M, metaY, { characterSpacing: 0.8 });

            const addr = order.shippingAddress || {};
            const clientName = `${addr.firstName || ''} ${addr.lastName || ''}`.trim() || (order.user?.firstName ? `${order.user.firstName} ${order.user.lastName}`.trim() : 'Valued Customer');
            const clientPhone = addr.phone || order.user?.phone || '—';
            
            // Build full address lines dynamically
            const addressLine1 = addr.address || 'Direct Order / Store Collection';
            const cityCountyStr = [addr.town || addr.city, addr.county].filter(Boolean).join(', ');
            const addressLine2 = [cityCountyStr, addr.postalCode].filter(Boolean).join(' ');
            const addressLine3 = addr.country || 'Kenya';

            doc.font('Helvetica').fontSize(10).fillColor('#1C1C1C')
               .text(clientName, M, metaY + 16, { lineGap: 3 })
               .fillColor('#555555')
               .text(clientPhone)
               .text(addressLine1)
               .text(addressLine2)
               .text(addressLine3);

            // Invoice Details Column (Right)
            doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#1C1C1C')
               .text(`Invoice No. ${order.orderNumber?.replace('ORD-', '') || '—'}`, M, metaY, { align: 'right', width: W - M * 2 });
            doc.font('Helvetica').fontSize(9.5).fillColor('#555555')
               .text(formatDate(order.createdAt || new Date()), M, metaY + 16, { align: 'right', width: W - M * 2 });

            // ── Table Content ───────────────────────────────────────
            const tableTopY = 225;

            // Table Header Line
            doc.moveTo(M, tableTopY).lineTo(W - M, tableTopY).strokeColor('#D1CFC9').lineWidth(0.8).stroke();

            // Header labels
            doc.font('Helvetica-Bold').fontSize(9).fillColor('#1C1C1C');
            doc.text('Item', M, tableTopY + 10);
            doc.text('Quantity', 320, tableTopY + 10, { width: 50, align: 'right' });
            doc.text('Unit Price', 380, tableTopY + 10, { width: 80, align: 'right' });
            doc.text('Total', 470, tableTopY + 10, { width: 75, align: 'right' });

            // Table Header Bottom Line
            doc.moveTo(M, tableTopY + 25).lineTo(W - M, tableTopY + 25).strokeColor('#D1CFC9').lineWidth(0.5).stroke();

            // Table rows
            let rowY = tableTopY + 35;
            doc.font('Helvetica').fontSize(9.5);

            const items = order.items || [];
            items.forEach((item) => {
                // Check if page needs to break (safety margin)
                if (rowY > H - 180) {
                    doc.addPage();
                    rowY = M + 20;
                    
                    // Re-draw minimal header on new page for professional look
                    doc.moveTo(M, rowY).lineTo(W - M, rowY).strokeColor('#D1CFC9').lineWidth(0.8).stroke();
                    doc.font('Helvetica-Bold').fontSize(9).fillColor('#1C1C1C');
                    doc.text('Item', M, rowY + 10);
                    doc.text('Quantity', 320, rowY + 10, { width: 50, align: 'right' });
                    doc.text('Unit Price', 380, rowY + 10, { width: 80, align: 'right' });
                    doc.text('Total', 470, rowY + 10, { width: 75, align: 'right' });
                    doc.moveTo(M, rowY + 25).lineTo(W - M, rowY + 25).strokeColor('#D1CFC9').lineWidth(0.5).stroke();
                    rowY += 35;
                }

                const qty = item.quantity || 1;
                const price = item.price || 0;
                const lineTotal = price * qty;

                doc.font('Helvetica').fillColor('#1C1C1C');
                // Support multi-line wrapping for long names cleanly
                doc.text(item.name || 'Premium Product', M, rowY, { width: 260 });
                doc.text(qty.toString(), 320, rowY, { width: 50, align: 'right' });
                doc.text(`KSh ${price.toLocaleString()}`, 380, rowY, { width: 80, align: 'right' });
                doc.text(`KSh ${lineTotal.toLocaleString()}`, 470, rowY, { width: 75, align: 'right' });

                rowY += 35;

                // Thin divider between rows
                doc.moveTo(M, rowY - 10).lineTo(W - M, rowY - 10).strokeColor('#D1CFC9').lineWidth(0.3).stroke();
            });

            // Clean spacing adjustment after final row
            let currentY = rowY;

            // ── Totals block ────────────────────────────────────────
            // Subtotal
            doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#1C1C1C').text('Subtotal', 350, currentY, { width: 110, align: 'right' });
            doc.font('Helvetica').fontSize(9.5).fillColor('#1C1C1C').text(`KSh ${(order.subtotal || 0).toLocaleString()}`, 470, currentY, { width: 75, align: 'right' });
            currentY += 20;

            // Shipping
            if ((order.shippingCost || 0) > 0) {
                doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#1C1C1C').text('Shipping', 350, currentY, { width: 110, align: 'right' });
                doc.font('Helvetica').fontSize(9.5).fillColor('#1C1C1C').text(`KSh ${(order.shippingCost || 0).toLocaleString()}`, 470, currentY, { width: 75, align: 'right' });
                currentY += 20;
            }

            // Discount
            if ((order.discountAmount || 0) > 0) {
                doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#1C1C1C').text('Discount', 350, currentY, { width: 110, align: 'right' });
                doc.font('Helvetica').fontSize(9.5).fillColor('#1C1C1C').text(`-KSh ${(order.discountAmount || 0).toLocaleString()}`, 470, currentY, { width: 75, align: 'right' });
                currentY += 20;
            }

            // Tax
            const taxRate = order.tax > 0 ? '16%' : '0%';
            doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#1C1C1C').text(`Tax (${taxRate})`, 350, currentY, { width: 110, align: 'right' });
            doc.font('Helvetica').fontSize(9.5).fillColor('#1C1C1C').text(`KSh ${(order.tax || 0).toLocaleString()}`, 470, currentY, { width: 75, align: 'right' });
            currentY += 15;

            // Line above total
            doc.moveTo(350, currentY).lineTo(W - M, currentY).strokeColor('#D1CFC9').lineWidth(0.5).stroke();
            currentY += 10;

            // Grand Total
            doc.font('Helvetica-Bold').fontSize(14).fillColor('#1C1C1C').text('Total', 350, currentY, { width: 110, align: 'right' });
            doc.font('Helvetica-Bold').fontSize(14).fillColor('#1C1C1C').text(`KSh ${(order.total || 0).toLocaleString()}`, 470, currentY - 2, { width: 75, align: 'right' });
            currentY += 22;

            // Line below total
            doc.moveTo(350, currentY).lineTo(W - M, currentY).strokeColor('#D1CFC9').lineWidth(0.5).stroke();

            // ── Thank You Message ───────────────────────────────────
            const thankYouY = currentY + 30;
            doc.font('Helvetica').fontSize(16).fillColor('#1C1C1C').text('Thank you!', M, thankYouY);

            // ── Footer Section (Payment Information & Signature) ────
            // Defensively position to avoid overlaps on long orders
            const footerY = Math.max(H - 160, currentY + 70);

            // Left side: Payment Info
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1C1C1C')
               .text('PAYMENT INFORMATION', M, footerY, { characterSpacing: 0.8 });

            doc.font('Helvetica').fontSize(9.5).fillColor('#555555');
            const pmLabel = { mpesa: 'M-Pesa Express', card: 'Credit/Debit Card', cod: 'Cash on Delivery' };
            const paymentMethodText = pmLabel[order.paymentMethod?.toLowerCase()] || order.paymentMethod?.toUpperCase() || 'Direct Payment';
            
            const paymentY = footerY + 16;
            doc.text(paymentMethodText, M, paymentY);

            if (order.paymentMethod?.toLowerCase() === 'mpesa') {
                doc.text('Business Paybill: 174379', M, paymentY + 14);
                doc.text(`Account No: ${order.orderNumber?.replace('ORD-', '') || '—'}`, M, paymentY + 28);
            } else {
                doc.text('Recipient: Rerendet Coffee Ltd', M, paymentY + 14);
                if (order.transactionId) {
                    doc.text(`Txn Ref: ${order.transactionId}`, M, paymentY + 28);
                } else if (order.manualTransactionId) {
                    doc.text(`M-Pesa Ref: ${order.manualTransactionId}`, M, paymentY + 28);
                } else {
                    doc.text(`Ref: #${order.orderNumber || '—'}`, M, paymentY + 28);
                }
            }
            
            // Payment Status & Pay By
            const isPaid = order.paymentStatus === 'paid';
            if (isPaid) {
                doc.fillColor('#059669').font('Helvetica-Bold').text('Payment Status: Paid', M, paymentY + 42);
            } else {
                const payByDate = new Date(order.createdAt || Date.now());
                payByDate.setDate(payByDate.getDate() + 14); // 14-day payment window
                doc.fillColor('#B45309').text(`Pay by: ${formatDate(payByDate)}`, M, paymentY + 42);
            }

            // Right side: Corporate Signature & Address
            doc.font('Times-Bold').fontSize(14).fillColor('#1C1C1C')
               .text('Rerendet Coffee Ltd.', 300, footerY + 14, { width: 245, align: 'right' });

            doc.font('Helvetica').fontSize(9).fillColor('#555555')
               .text(storeAddress, 300, footerY + 32, { width: 245, align: 'right' })
               .text(storeEmail, 300, footerY + 44, { width: 245, align: 'right' });

            // ── Finish PDF ──────────────────────────────────────────
            doc.end();
            if (!res) doc.on('error', reject);

        } catch (err) {
            console.error('❌ Invoice generation error:', err);
            if (res && !res.headersSent) res.status(500).send('Error generating invoice');
            else reject(err);
        }
    });
};

export default generateInvoice;
