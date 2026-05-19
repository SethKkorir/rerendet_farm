// utils/invoiceGenerator.js — Premium PDF Invoice
import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Colour palette ──────────────────────────────────────────────
const C = {
    coffeeDark: '#2C1810',
    coffeeMid: '#6F4E37',
    coffeeLight: '#A07828',
    gold: '#D4AF37',
    goldLight: '#F5E6B3',
    bg: '#FDFAF6',
    bgDark: '#F0EAE0',
    white: '#FFFFFF',
    textDark: '#1A0F08',
    textMid: '#433029',
    textLight: '#8C7B6E',
    border: '#E8DDD4',
    green: '#059669',
};

// ── Helper: draw horizontal rule ────────────────────────────────
const hr = (doc, y, { color = C.border, thick = 0.5 } = {}) => {
    doc.moveTo(50, y).lineTo(545, y).strokeColor(color).lineWidth(thick).stroke();
};

// ── Helper: right-aligned text in a column ───────────────────────
const textRight = (doc, text, y, rightEdge = 545) => {
    doc.text(text, rightEdge - 140, y, { width: 140, align: 'right' });
};

/**
 * generateInvoice(order, res?)
 * - streams PDF to res if provided
 * - resolves Buffer otherwise (for email attachments)
 */
export const generateInvoice = (order, res = null) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
            const buffers = [];

            if (res) {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="Rerendet-Invoice-${order.orderNumber}.pdf"`);
                doc.pipe(res);
            } else {
                doc.on('data', chunk => buffers.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(buffers)));
            }

            const W = 595.28; // A4 width pts
            const H = 841.89; // A4 height pts
            const M = 50;     // margin

            // ════════════════════════════════════════════════════════════
            // 1. HEADER BAND — dark coffee background
            // ════════════════════════════════════════════════════════════
            doc.rect(0, 0, W, 130).fill(C.coffeeDark);

            // Gold accent stripe under header
            doc.rect(0, 130, W, 4).fill(C.gold);

            // Logo (left)
            const logoPath = path.join(__dirname, '../client/public/rerendet-logo.png');
            try {
                doc.image(logoPath, M, 22, { height: 75 });
            } catch {
                doc.fontSize(22).font('Helvetica-Bold').fillColor(C.gold).text('RC', M, 42);
            }

            // Company name & tagline (right side of header)
            doc
                .font('Helvetica-Bold').fontSize(20).fillColor(C.gold)
                .text('RERENDET COFFEE', M, 28, { align: 'right', width: W - M * 2 });
            doc
                .font('Helvetica').fontSize(9).fillColor('rgba(255,255,255,0.6)')
                .text('Premium Fresh Coffee · Nairobi, Kenya', M, 54, { align: 'right', width: W - M * 2 })
                .text('orders@rerendetcoffee.com  ·  +254 700 123 456', M, 68, { align: 'right', width: W - M * 2 });

            // "INVOICE" watermark text in header
            doc
                .font('Helvetica-Bold').fontSize(11).fillColor('rgba(255,255,255,0.25)')
                .text('DIGITAL INVOICE', M, 103, { align: 'right', width: W - M * 2, characterSpacing: 4 });

            // ════════════════════════════════════════════════════════════
            // 2. INVOICE META BAND — light parchment
            // ════════════════════════════════════════════════════════════
            doc.rect(0, 134, W, 78).fill(C.bgDark);

            const metaY = 150;
            // Invoice # column
            doc.font('Helvetica-Bold').fontSize(7).fillColor(C.textLight)
                .text('INVOICE NUMBER', M, metaY, { characterSpacing: 1.2 });
            doc.font('Helvetica-Bold').fontSize(13).fillColor(C.coffeeDark)
                .text(`#${order.orderNumber}`, M, metaY + 13);

            // Date column
            doc.font('Helvetica-Bold').fontSize(7).fillColor(C.textLight)
                .text('DATE ISSUED', 220, metaY, { characterSpacing: 1.2 });
            doc.font('Helvetica').fontSize(11).fillColor(C.coffeeDark)
                .text(new Date(order.createdAt).toLocaleDateString('en-KE', {
                    year: 'numeric', month: 'long', day: 'numeric'
                }), 220, metaY + 13);

            // Payment method column
            doc.font('Helvetica-Bold').fontSize(7).fillColor(C.textLight)
                .text('PAYMENT METHOD', 370, metaY, { characterSpacing: 1.2 });
            const pmLabel = { mpesa: 'M-Pesa', card: 'Card', cod: 'Cash on Delivery' };
            doc.font('Helvetica').fontSize(11).fillColor(C.coffeeDark)
                .text(pmLabel[order.paymentMethod?.toLowerCase()] || order.paymentMethod?.toUpperCase() || '—', 370, metaY + 13);

            // Status badge (paid / pending)
            const statusPaid = order.paymentStatus === 'paid';
            const badgeColor = statusPaid ? C.green : '#B45309';
            const badgeLabel = statusPaid ? '✓ PAID' : '⏳ PENDING';
            doc.roundedRect(M, metaY + 37, 60, 16, 4).fill(statusPaid ? '#ECFDF5' : '#FEF3C7');
            doc.font('Helvetica-Bold').fontSize(7).fillColor(badgeColor)
                .text(badgeLabel, M + 4, metaY + 42, { characterSpacing: 0.8 });

            // ════════════════════════════════════════════════════════════
            // 3. ADDRESSES
            // ════════════════════════════════════════════════════════════
            const addrY = 230;

            // Left: Bill To
            doc.font('Helvetica-Bold').fontSize(8).fillColor(C.gold)
                .text('BILLED TO', M, addrY, { characterSpacing: 1.5 });
            hr(doc, addrY + 12, { color: C.gold, thick: 1 });

            const addr = order.shippingAddress || {};
            doc.font('Helvetica-Bold').fontSize(11).fillColor(C.textDark)
                .text(`${addr.firstName || ''} ${addr.lastName || ''}`.trim(), M, addrY + 20);
            doc.font('Helvetica').fontSize(9.5).fillColor(C.textMid)
                .text(addr.email || '', M, addrY + 35)
                .text(addr.phone || '', M, addrY + 49);

            // Right: Ship To
            const addrRX = 310;
            doc.font('Helvetica-Bold').fontSize(8).fillColor(C.gold)
                .text('SHIPPED TO', addrRX, addrY, { characterSpacing: 1.5 });
            doc.moveTo(addrRX, addrY + 12).lineTo(545, addrY + 12)
                .strokeColor(C.gold).lineWidth(1).stroke();

            doc.font('Helvetica-Bold').fontSize(11).fillColor(C.textDark)
                .text(`${addr.firstName || ''} ${addr.lastName || ''}`.trim(), addrRX, addrY + 20);
            doc.font('Helvetica').fontSize(9.5).fillColor(C.textMid)
                .text(addr.address || '', addrRX, addrY + 35)
                .text(`${addr.city || ''}, ${addr.county || ''}`, addrRX, addrY + 49)
                .text(addr.country || 'Kenya', addrRX, addrY + 63);

            // ════════════════════════════════════════════════════════════
            // 4. ITEMS TABLE
            // ════════════════════════════════════════════════════════════
            const tableTop = addrY + 90;

            // Table header row
            doc.rect(M, tableTop, W - M * 2, 26).fill(C.coffeeMid);
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.white)
                .text('ITEM', M + 10, tableTop + 8)
                .text('SIZE', 290, tableTop + 8)
                .text('QTY', 355, tableTop + 8)
                .text('UNIT PRICE', 400, tableTop + 8)
                .text('TOTAL', 490, tableTop + 8);

            // Table rows
            let rowY = tableTop + 30;
            doc.font('Helvetica').fontSize(9.5);

            (order.items || []).forEach((item, i) => {
                const isEven = i % 2 === 0;
                const rowH = 32;
                const lineTotal = (item.price || 0) * (item.quantity || 1);

                // Alternating row tint
                if (isEven) {
                    doc.rect(M, rowY - 4, W - M * 2, rowH).fill('#FAF6F1').stroke(C.border);
                }

                doc.fillColor(C.textDark)
                    .text(item.name || '—', M + 10, rowY)
                    .text(item.size || '—', 290, rowY)
                    .text((item.quantity || 0).toString(), 355, rowY)
                    .text(`KSh ${(item.price || 0).toLocaleString()}`, 400, rowY)
                    .font('Helvetica-Bold')
                    .text(`KSh ${lineTotal.toLocaleString()}`, 490, rowY)
                    .font('Helvetica');

                rowY += rowH;
            });

            // Table bottom border
            hr(doc, rowY + 4, { color: C.coffeeMid, thick: 1.5 });

            // ════════════════════════════════════════════════════════════
            // 5. TOTALS BLOCK
            // ════════════════════════════════════════════════════════════
            let totY = rowY + 20;
            const totLX = 350; // label column x
            const totVX = 460; // value column x

            const totRow = (label, value, { bold = false, large = false, highlight = false } = {}) => {
                if (highlight) {
                    doc.rect(M, totY - 5, W - M * 2, 30).fill(C.goldLight);
                }
                doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
                    .fontSize(large ? 12 : 9.5)
                    .fillColor(highlight ? C.coffeeDark : (bold ? C.textDark : C.textLight))
                    .text(label, totLX, totY)
                    .font('Helvetica-Bold')
                    .fontSize(large ? 13 : 9.5)
                    .fillColor(highlight ? C.coffeeMid : (bold ? C.textDark : C.textLight))
                    .text(value, totVX, totY - (large ? 1 : 0), { width: 90, align: 'right' });
                totY += large ? 34 : 22;
            };

            totRow('Subtotal', `KSh ${(order.subtotal || 0).toLocaleString()}`);
            totRow('Shipping & Handling', `KSh ${(order.shippingCost || 0).toLocaleString()}`);
            if ((order.discountAmount || 0) > 0) {
                totRow('Discount', `−KSh ${(order.discountAmount || 0).toLocaleString()}`);
            }
            totRow('Grand Total', `KSh ${(order.total || 0).toLocaleString()}`,
                { bold: true, large: true, highlight: true });

            // ════════════════════════════════════════════════════════════
            // 5.5 OWNER SIGNATURE & STAMP
            // ════════════════════════════════════════════════════════════
            const sigY = H - 122;
            // Draw signature
            doc.font('Times-Italic').fontSize(16).fillColor(C.coffeeMid).text('Rerendet Coffee CEO', M, sigY);
            // Draw signature line
            doc.moveTo(M, sigY + 18).lineTo(M + 140, sigY + 18).strokeColor(C.textDark).lineWidth(0.8).stroke();
            doc.font('Helvetica-Bold').fontSize(8).fillColor(C.textDark).text('Rerendet Coffee CEO', M, sigY + 23);
            doc.font('Helvetica').fontSize(7).fillColor(C.textLight).text('Corporate Signatory Authority', M, sigY + 32);

            // Corporate Stamp circle outline (pure vector draw)
            const stampX = M + 190;
            const stampY = sigY + 14;
            doc.circle(stampX, stampY, 24).strokeColor('rgba(212, 175, 55, 0.4)').lineWidth(1).stroke();
            doc.font('Helvetica-Bold').fontSize(5.5).fillColor('rgba(212, 175, 55, 0.6)')
               .text('REVENUE DEPT', stampX - 22, stampY - 8, { width: 44, align: 'center' })
               .text('APPROVED', stampX - 22, stampY + 2, { width: 44, align: 'center' });

            // ════════════════════════════════════════════════════════════
            // 6. FOOTER
            // ════════════════════════════════════════════════════════════
            // Gold bottom stripe
            doc.rect(0, H - 56, W, 3).fill(C.gold);

            // Footer band
            doc.rect(0, H - 53, W, 53).fill(C.coffeeDark);

            doc.font('Helvetica-Bold').fontSize(9.5).fillColor(C.gold)
                .text('Thank you for choosing Rerendet Coffee', 0, H - 42, { align: 'center', width: W });
            doc.font('Helvetica').fontSize(7.5).fillColor('rgba(255,255,255,0.5)')
                .text('This document is verified and signed by Rerendet Coffee Board.', 0, H - 28, { align: 'center', width: W })
                .text('For queries contact orders@rerendetcoffee.com', 0, H - 17, { align: 'center', width: W });

            // ════════════════════════════════════════════════════════════
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
