// utils/receiptGenerator.js — Unified Luxury Editorial Receipt Generator
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Settings from '../models/Settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Format a Date object to "Day Month Year" (e.g. "10 November 2026")
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
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return '—';
  }
};

/**
 * Generate unique receipt number: REC-YYYYMMDD-XXXX
 */
export const generateReceiptNumber = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REC-${yyyy}${mm}${dd}-${rand}`;
};

/**
 * Generate Digital Payment Receipt PDF (Exact 1-Page Balanced Editorial Layout)
 * @param {Object} order - Populated Mongoose order document
 * @param {Object|null} res - Express response object (optional, if streaming download)
 * @returns {Promise<Buffer>} - Resolves to PDF Buffer if res is null
 */
export const generateReceiptPDF = async (order, res = null) => {
  return new Promise(async (resolve, reject) => {
    try {
      const W = 595.28; // A4 Width (points)
      const H = 841.89; // A4 Height (points)
      const M = 46;     // Margin (points)

      // Dynamic store / admin info
      const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'rerendet@gmail.com';
      const adminPhone = process.env.WHATSAPP_NUMBER ? `+${process.env.WHATSAPP_NUMBER}` : '+254 705 684 894';
      let storeAddress = 'Bomet Highlands, Great Rift Valley, Kenya';
      let storeName = 'RERENDET COFFEE ROASTERS';

      // Safe DB check
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        try {
          const settings = await Settings.getSettings();
          if (settings?.store) {
            if (settings.store.name) storeName = settings.store.name.toUpperCase();
            if (settings.store.address) storeAddress = settings.store.address;
          }
        } catch (err) {
          console.warn('Warning: Could not fetch store settings for receipt:', err.message);
        }
      }

      // Resolve logo
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
        console.warn('Warning: Could not resolve logo for receipt:', err.message);
      }

      // Single-page document: margin 0 to prevent accidental automatic page breaks
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        bufferPages: true,
        autoFirstPage: true
      });

      const buffers = [];
      const receiptNumber = order.receipt?.receiptNumber || generateReceiptNumber();
      const isPaid = order.paymentStatus === 'paid' || !!order.receipt?.receiptNumber;
      const invoiceDate = formatDate(order.receipt?.issueDate || order.createdAt || new Date());

      if (res) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Rerendet-Receipt-${receiptNumber}.pdf"`);
        doc.pipe(res);
      } else {
        doc.on('data', chunk => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
      }

      // ── 1. Page Background (Warm Luxury Ivory Paper) ──
      doc.rect(0, 0, W, H).fill('#FBF9F5');

      // ── 2. Subtle Upper Decorative Curve Lines ──
      doc.save();
      doc.path('M 320,0 C 410,75 490,65 595,155')
         .strokeColor('#D4AF37').lineWidth(1).dash(4, { space: 6 }).strokeOpacity(0.35).stroke();
      doc.path('M 380,0 C 460,110 525,85 595,195')
         .strokeColor('#171311').lineWidth(0.8).undash().strokeOpacity(0.18).stroke();
      doc.circle(560, 48, 115).strokeColor('#E2DDD5').lineWidth(0.8).strokeOpacity(0.25).stroke();
      doc.restore();

      // ── 3. Centered Brand Logo & Header ──
      const logoW = 68;
      const logoX = (W - logoW) / 2;
      const logoY = 40;

      if (resolvedLogoPath) {
        try {
          doc.image(resolvedLogoPath, logoX, logoY, { width: logoW });
        } catch {
          doc.font('Helvetica-Bold').fontSize(24).fillColor('#8A6B2D').text('RERENDET', 0, logoY + 12, { align: 'center', width: W });
        }
      } else {
        doc.font('Helvetica-Bold').fontSize(24).fillColor('#8A6B2D').text('RERENDET', 0, logoY + 12, { align: 'center', width: W });
      }

      const headerTitleY = logoY + 70;
      doc.font('Helvetica-Bold').fontSize(12.5).fillColor('#171311')
         .text(storeName, 0, headerTitleY, { align: 'center', width: W, characterSpacing: 2 });

      doc.font('Helvetica').fontSize(8.5).fillColor('#7A6E65')
         .text('Great Rift Valley Highlands · Bomet, Kenya', 0, headerTitleY + 16, { align: 'center', width: W, characterSpacing: 0.6 });

      // Subtle divider below centered header
      const headerDivY = headerTitleY + 34;
      doc.moveTo(M + 40, headerDivY).lineTo(W - M - 40, headerDivY).strokeColor('#E8E3D9').lineWidth(0.8).stroke();

      // ── 4. Main Body Grid ──
      const bodyTopY = headerDivY + 28;

      // ── 4A. Left Column: Vertical Title + Customer Box + Payment Details ──
      const leftColX = M;
      const leftColW = 160;

      // Vertical Title: Receipt. / Invoice.
      const titleText = isPaid ? 'Receipt.' : 'Invoice.';
      doc.save();
      doc.rotate(-90, { origin: [leftColX + 8, bodyTopY + 130] });
      doc.font('Helvetica-Bold').fontSize(44).fillColor('#171311')
         .text(titleText, leftColX + 8, bodyTopY + 130, { characterSpacing: -1.2 });
      doc.restore();

      // Vertical Accent Line with Terminal Dot
      doc.moveTo(leftColX + 68, bodyTopY + 6).lineTo(leftColX + 68, bodyTopY + 140).strokeColor('#171311').lineWidth(1.5).stroke();
      doc.circle(leftColX + 68, bodyTopY + 144, 4).fillColor('#171311').fill();

      // Customer Info Box ("Invoice To :")
      const clientBoxY = bodyTopY + 168;
      const addr = order.shippingAddress || {};
      const clientName = `${addr.firstName || ''} ${addr.lastName || ''}`.trim()
        || (order.user?.name ? order.user.name : (order.user?.firstName ? `${order.user.firstName} ${order.user.lastName || ''}`.trim() : 'Valued Customer'));
      const clientPhone = addr.phone || order.user?.phone || '—';
      const clientEmail = addr.email || order.user?.email || '—';
      const clientLocation = [addr.town || addr.city, addr.county, addr.country || 'Kenya'].filter(Boolean).join(', ');

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#8A7C70')
         .text('INVOICE TO :', leftColX, clientBoxY, { characterSpacing: 1 });

      doc.font('Helvetica-Bold').fontSize(12).fillColor('#171311')
         .text(clientName, leftColX, clientBoxY + 16, { width: leftColW + 10 });

      let cInfoY = clientBoxY + 34;
      if (clientPhone && clientPhone !== '—') {
        doc.font('Helvetica').fontSize(9).fillColor('#55493F').text(clientPhone, leftColX, cInfoY, { width: leftColW });
        cInfoY += 14;
      }
      if (clientEmail && clientEmail !== '—') {
        doc.font('Helvetica').fontSize(8.5).fillColor('#55493F').text(clientEmail, leftColX, cInfoY, { width: leftColW });
        cInfoY += 14;
      }
      doc.font('Helvetica').fontSize(8.5).fillColor('#55493F').text(clientLocation, leftColX, cInfoY, { width: leftColW });
      cInfoY += 22;

      // Left Column: Payment Method & Channel Capsule (Filling vertical space cleanly)
      const payMethodStr = order.paymentMethod === 'cod'
        ? 'Cash on Delivery'
        : (order.paymentMethod === 'card' ? 'Credit / Debit Card' : 'M-Pesa Paybill (DTB Kenya)');

      doc.roundedRect(leftColX, cInfoY, leftColW, 58, 6)
         .fillAndStroke('#F4F1EA', '#E5DFC4');

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#8A7C70')
         .text('PAYMENT METHOD', leftColX + 10, cInfoY + 8, { characterSpacing: 0.8 });
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#171311')
         .text(payMethodStr, leftColX + 10, cInfoY + 20, { width: leftColW - 20 });

      doc.font('Helvetica-Bold').fontSize(8).fillColor(isPaid ? '#059669' : '#D97706')
         .text(isPaid ? '✓ PAID IN FULL (Verified)' : '⏳ Awaiting Payment', leftColX + 10, cInfoY + 38);

      // Three Decorative Dots on Left Column
      const dotsY = cInfoY + 74;
      doc.circle(leftColX + 6, dotsY, 2.5).fillColor('#171311').fill();
      doc.circle(leftColX + 16, dotsY, 2.5).fillColor('#171311').fill();
      doc.circle(leftColX + 26, dotsY, 2.5).fillColor('#171311').fill();

      // ── 4B. Right Column: Metadata Capsule & Editorial Table ──
      const rightColX = 224;
      const rightColW = W - M - rightColX; // ~325pt
      const metaRightEdge = W - M;

      // Metadata items
      let metaY = bodyTopY + 4;

      if (isPaid && receiptNumber) {
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#64748B')
           .text('Receipt No :', rightColX, metaY, { width: rightColW - 130, align: 'right' });
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#059669')
           .text(receiptNumber, metaRightEdge - 120, metaY, { width: 120, align: 'right' });
        metaY += 16;
      }

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#64748B')
         .text(isPaid ? 'Order No :' : 'Invoice No :', rightColX, metaY, { width: rightColW - 130, align: 'right' });
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#171311')
         .text(`#${order.orderNumber}`, metaRightEdge - 120, metaY, { width: 120, align: 'right' });
      metaY += 16;

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#64748B')
         .text(isPaid ? 'Receipt Date :' : 'Invoice Date :', rightColX, metaY, { width: rightColW - 130, align: 'right' });
      doc.font('Helvetica').fontSize(9).fillColor('#334155')
         .text(invoiceDate, metaRightEdge - 120, metaY, { width: 120, align: 'right' });
      metaY += 16;

      const statusLabel = isPaid ? 'PAID IN FULL (Verified)' : (order.paymentStatus === 'payment_reported' ? 'Payment Reported (Reviewing)' : 'Awaiting Payment');
      const statusColor = isPaid ? '#059669' : '#D97706';

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#64748B')
         .text('Status :', rightColX, metaY, { width: rightColW - 160, align: 'right' });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(statusColor)
         .text(statusLabel, metaRightEdge - 155, metaY, { width: 155, align: 'right' });
      metaY += 22;

      // Three Decorative Dots on Right Column
      doc.circle(metaRightEdge - 24, metaY, 2.5).fillColor('#171311').fill();
      doc.circle(metaRightEdge - 14, metaY, 2.5).fillColor('#171311').fill();
      doc.circle(metaRightEdge - 4, metaY, 2.5).fillColor('#171311').fill();
      metaY += 24;

      // ── Editorial Table (More spacious and beautifully proportioned) ──
      const tableTopY = metaY;

      // Table Header
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#171311');
      doc.text('No', rightColX, tableTopY);
      doc.text('Item Description', rightColX + 26, tableTopY);
      doc.text('Amount', rightColX + 200, tableTopY, { width: rightColW - 200, align: 'right' });

      // Table Header Divider
      const tableLineY = tableTopY + 14;
      doc.moveTo(rightColX, tableLineY).lineTo(metaRightEdge, tableLineY).strokeColor('#E2DDD5').lineWidth(1.2).stroke();

      let rowY = tableLineY + 14;
      const items = order.items && order.items.length > 0 ? order.items : [];

      items.forEach((item, idx) => {
        const itemQty = Number(item.quantity) || 1;
        const itemPrice = Number(item.price) || 0;
        const lineTotal = itemQty * itemPrice;
        const itemName = item.name || item.product?.name || 'Highland Arabica Coffee';
        const itemMeta = [item.size || 'Standard 250g', `Qty: ${itemQty}`].filter(Boolean).join(' · ');

        doc.font('Helvetica').fontSize(9.5).fillColor('#64748B')
           .text(`${idx + 1}.`, rightColX, rowY);

        doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#171311')
           .text(itemName, rightColX + 26, rowY, { width: 195, ellipsis: true });

        doc.font('Helvetica').fontSize(8).fillColor('#8A7C70')
           .text(itemMeta, rightColX + 26, rowY + 13, { width: 195, ellipsis: true });

        doc.font('Helvetica-Bold').fontSize(10).fillColor('#171311')
           .text(`KES ${lineTotal.toLocaleString()}`, rightColX + 200, rowY + 2, { width: rightColW - 200, align: 'right' });

        rowY += 34;
        doc.moveTo(rightColX, rowY - 6).lineTo(metaRightEdge, rowY - 6).strokeColor('#EFEBE3').lineWidth(0.6).stroke();
      });

      // Shipping line if applicable
      const shippingCost = Number(order.shippingCost ?? order.deliveryFee) || 0;
      if (shippingCost > 0) {
        doc.font('Helvetica').fontSize(9.5).fillColor('#64748B')
           .text(`${items.length + 1}.`, rightColX, rowY);
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#171311')
           .text('Highland Express Delivery', rightColX + 26, rowY);
        doc.font('Helvetica').fontSize(8).fillColor('#8A7C70')
           .text(`Courier Dispatch to ${addr.town || addr.city || 'Destination'}`, rightColX + 26, rowY + 13);
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#171311')
           .text(`KES ${shippingCost.toLocaleString()}`, rightColX + 200, rowY + 2, { width: rightColW - 200, align: 'right' });
        rowY += 34;
        doc.moveTo(rightColX, rowY - 6).lineTo(metaRightEdge, rowY - 6).strokeColor('#EFEBE3').lineWidth(0.6).stroke();
      }

      // Discount line if applicable
      const discount = Number(order.discountAmount || order.discount) || 0;
      if (discount > 0) {
        doc.font('Helvetica').fontSize(9.5).fillColor('#059669')
           .text('—', rightColX, rowY);
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#059669')
           .text('Special Promotion Applied', rightColX + 26, rowY);
        doc.font('Helvetica').fontSize(8).fillColor('#059669')
           .text('Coupon / Seasonal Perk', rightColX + 26, rowY + 13);
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#059669')
           .text(`− KES ${discount.toLocaleString()}`, rightColX + 200, rowY + 2, { width: rightColW - 200, align: 'right' });
        rowY += 34;
        doc.moveTo(rightColX, rowY - 6).lineTo(metaRightEdge, rowY - 6).strokeColor('#EFEBE3').lineWidth(0.6).stroke();
      }

      // Total Row
      rowY += 10;
      doc.moveTo(rightColX, rowY).lineTo(metaRightEdge, rowY).strokeColor('#171311').lineWidth(1.5).stroke();
      rowY += 12;

      const orderTotal = Number(order.totalAmount ?? order.total ?? order.finalTotal ?? 0);
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#171311')
         .text('Total', rightColX + 26, rowY);

      doc.font('Helvetica-Bold').fontSize(14).fillColor('#171311')
         .text(`KES ${orderTotal.toLocaleString()}`, rightColX + 140, rowY, { width: rightColW - 140, align: 'right' });

      // ── 5. Clean, Professional Footer (Single-Page Anchor) ──
      const footerY = H - 90;
      doc.moveTo(M, footerY).lineTo(W - M, footerY).strokeColor('#DDD7CB').lineWidth(0.8).stroke();

      // Return Policy Line
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#475569')
         .text('Goods once sold are not returnable unless damaged upon delivery.', 0, footerY + 14, { align: 'center', width: W });

      // Admin Email & Contact Line
      doc.font('Helvetica').fontSize(8.5).fillColor('#0F172A')
         .text(`Support Email: ${adminEmail}   •   Contact: ${adminPhone}`, 0, footerY + 28, { align: 'center', width: W });

      // Roastery Estate Location Line
      doc.font('Helvetica').fontSize(7.5).fillColor('#94A3B8')
         .text(`${storeName} · ${storeAddress}`, 0, footerY + 42, { align: 'center', width: W, characterSpacing: 0.5 });

      doc.end();
    } catch (err) {
      console.error('Receipt PDF generation error:', err);
      reject(err);
    }
  });
};
