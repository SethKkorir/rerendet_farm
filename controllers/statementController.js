import Order from '../models/Order.js';
import User from '../models/User.js';
import PDFTableDocument from 'pdfkit-table';
import moment from 'moment';

/**
 * Calculates financial metrics and detailed transactions list.
 */
const aggregateLedgerData = async (startDate, endDate, userId = null) => {
  const start = moment(startDate).startOf('day').toDate();
  const end = moment(endDate).endOf('day').toDate();

  // 1. Calculate Starting Balance (Cumulative of all orders paid before startDate)
  const prevQuery = {
    paymentStatus: { $in: ['paid', 'refunded'] },
    createdAt: { $lt: start }
  };
  if (userId) {
    prevQuery.user = userId;
  }
  const prevOrders = await Order.find(prevQuery);
  let startingBalance = prevOrders.reduce((sum, order) => {
    if (order.paymentStatus === 'paid') {
      return sum + order.total;
    } else if (order.paymentStatus === 'refunded') {
      return sum + (order.total - (order.discountAmount || 0)); // refund net impact
    }
    return sum;
  }, 0);

  // 2. Query transactions within the date range (chronological order)
  const query = {
    paymentStatus: { $in: ['paid', 'refunded'] },
    createdAt: { $gte: start, $lte: end }
  };
  if (userId) {
    query.user = userId;
  }

  const orders = await Order.find(query)
    .populate('user')
    .populate('items.product')
    .sort({ createdAt: 1 });

  let totalMoneyIn = 0;
  let totalMoneyOut = 0;
  let runningBal = startingBalance;

  const ledger = orders.map((order) => {
    const isPaid = order.paymentStatus === 'paid';
    const isRefund = order.paymentStatus === 'refunded';

    // Build rich description listing products and categories dynamically
    const itemStrings = order.items.map((item) => {
      const category = item.product?.category || 'General';
      return `${item.name} (${category}) x${item.quantity}`;
    });
    
    let description = '';
    if (userId) {
      // From Customer's POV
      description = isRefund 
        ? `Refund received for: ${itemStrings.join(', ')}`
        : `Purchase: ${itemStrings.join(', ')}`;
    } else {
      // From Store POV
      const customerName = order.shippingAddress 
        ? `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`
        : (order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Walk-in Customer');
      
      description = isRefund
        ? `Refund paid to ${customerName} for: ${itemStrings.join(', ')}`
        : `Payment received from ${customerName} for: ${itemStrings.join(', ')}`;
    }

    // Money flows
    // In Store POV, money comes in when orders are paid, goes out when refunded.
    // In Customer POV, money goes out when they buy, comes in when refunded.
    let moneyIn = 0;
    let moneyOut = 0;

    if (userId) {
      // Customer POV statement:
      if (isPaid) {
        moneyOut = order.total;
        totalMoneyOut += moneyOut;
        runningBal -= moneyOut;
      } else {
        moneyIn = order.total;
        totalMoneyIn += moneyIn;
        runningBal += moneyIn;
      }
    } else {
      // Store-Wide POV:
      if (isPaid) {
        moneyIn = order.total;
        totalMoneyIn += moneyIn;
        runningBal += moneyIn;
      } else {
        moneyOut = order.total;
        totalMoneyOut += moneyOut;
        runningBal -= moneyOut;
      }
    }

    return {
      id: order._id,
      date: order.createdAt,
      transactionId: order.transactionId || order.manualTransactionId || `REF-${order.orderNumber.split('-')[1]}`,
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod,
      description,
      status: order.paymentStatus.toUpperCase(),
      moneyIn,
      moneyOut,
      runningBalance: runningBal
    };
  });

  return {
    startingBalance,
    totalMoneyIn,
    totalMoneyOut,
    endingBalance: runningBal,
    ledger
  };
};

/**
 * Controller to fetch JSON report or stream a beautiful M-Pesa replica PDF.
 */
export const getStatementReport = async (req, res) => {
  try {
    const { startDate, endDate, userId, format = 'json' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Please provide both startDate and endDate' });
    }

    // 1. Fetch Dynamic Store Settings
    let ownerName = 'Rerendet Coffee Master Account';
    let ownerEmail = 'info@rerendetcoffee.com';
    let ownerPhone = '+254 700 000 000';
    let ownerType = 'store';

    try {
      const { default: Settings } = await import('../models/Settings.js');
      const settings = await Settings.getSettings();
      if (settings?.store) {
        ownerName = `${settings.store.name || 'Rerendet Coffee'} Master Account`;
        ownerEmail = settings.store.email || 'info@rerendetcoffee.com';
        ownerPhone = settings.store.phone || '+254700000000';
      }
    } catch (e) {
      console.error('Error loading settings in statement:', e);
    }

    if (userId) {
      const client = await User.findById(userId);
      if (!client) {
        return res.status(404).json({ success: false, message: 'Customer account not found' });
      }
      ownerName = `${client.firstName} ${client.lastName}`;
      ownerEmail = client.email;
      ownerPhone = client.phone || 'N/A';
      ownerType = 'customer';
    }

    // 2. Aggregate Data
    const reportData = await aggregateLedgerData(startDate, endDate, userId);

    // 3. Return JSON if requested
    if (format === 'json') {
      return res.json({
        success: true,
        summary: {
          ...reportData,
          ledger: undefined, // remove from summary block
          startDate: moment(startDate).format('YYYY-MM-DD'),
          endDate: moment(endDate).format('YYYY-MM-DD'),
          ownerName,
          ownerEmail,
          ownerPhone,
          ownerType
        },
        ledger: reportData.ledger
      });
    }

    // 4. Return PDF via pdfkit-table
    const doc = new PDFTableDocument({ size: 'A4', margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Rerendet-Statement-${moment(startDate).format('YYYYMMDD')}.pdf"`);

    doc.pipe(res);

    // A4 dimensions: 595.28 x 841.89
    const W = 595.28;
    const H = 841.89;

    // --- Premium Brand Rerendet Coffee Theme Colors ---
    const COFFEE_DARK = '#2C1810';   // Deep Roast Coffee Dark
    const GOLD_BRAND = '#D4AF37';    // Rerendet Premium Gold
    const GOLD_LIGHT = '#FDFAF6';    // Light cream parchment background
    const TEXT_DARK = '#1C1816';
    const TEXT_MID = '#6F4E37';      // Warm coffee brown
    const BORDER_COLOR = '#E8DDD4';
    const GOLD_TINT = '#F5E6B3';     // Light gold border/background tint

    // 1. Header background
    doc.rect(0, 0, W, 120).fill(COFFEE_DARK);
    doc.rect(0, 120, W, 3).fill(GOLD_BRAND);

    // Header Content
    doc.font('Helvetica-Bold').fontSize(18).fillColor(GOLD_BRAND)
       .text('RERENDET COFFEE', 30, 25);
    doc.font('Helvetica').fontSize(9).fillColor('rgba(255,255,255,0.75)')
       .text('Premium Fresh Coffee · Nairobi, Kenya', 30, 48)
       .text('P.O. Box 4820-00100, Nairobi, Kenya | info@rerendetcoffee.com', 30, 60)
       .text('Generated: ' + moment().format('DD MMM YYYY, hh:mm A'), 30, 72);

    // "STATEMENT" watermark text in header
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#FFFFFF')
       .text(ownerType === 'store' ? 'STORE REVENUE STATEMENT' : 'CUSTOMER ACCOUNT STATEMENT', 30, 93, { characterSpacing: 1.2 });

    // 2. Owner Profile Section
    const profileY = 135;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT_MID).text('ACCOUNT DETAILS', 30, profileY);
    doc.moveTo(30, profileY + 12).lineTo(W - 30, profileY + 12).strokeColor(GOLD_BRAND).lineWidth(1).stroke();

    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(TEXT_DARK)
       .text('Name / Owner:', 30, profileY + 20)
       .font('Helvetica').fillColor(TEXT_MID)
       .text(ownerName, 120, profileY + 20);

    doc.font('Helvetica-Bold').fillColor(TEXT_DARK)
       .text('Email Address:', 30, profileY + 34)
       .font('Helvetica').fillColor(TEXT_MID)
       .text(ownerEmail, 120, profileY + 34);

    doc.font('Helvetica-Bold').fillColor(TEXT_DARK)
       .text('Phone Number:', 30, profileY + 48)
       .font('Helvetica').fillColor(TEXT_MID)
       .text(ownerPhone, 120, profileY + 48);

    // Period Details (Right Aligned)
    const rightColX = 350;
    doc.font('Helvetica-Bold').fillColor(TEXT_DARK)
       .text('Statement Period:', rightColX, profileY + 20)
       .font('Helvetica').fillColor(TEXT_MID)
       .text(`${moment(startDate).format('DD MMM YYYY')} - ${moment(endDate).format('DD MMM YYYY')}`, rightColX + 90, profileY + 20);

    doc.font('Helvetica-Bold').fillColor(TEXT_DARK)
       .text('Statement ID:', rightColX, profileY + 34)
       .font('Helvetica').fillColor(TEXT_MID)
       .text(`STMT-${moment(startDate).format('YYMM')}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`, rightColX + 90, profileY + 34);

    // 3. Financial Summary cards box (The Rerendet style block)
    const summaryY = 210;
    doc.rect(30, summaryY, W - 60, 52).fill(GOLD_TINT);
    doc.rect(30, summaryY, W - 60, 52).strokeColor(GOLD_BRAND).lineWidth(0.8).stroke();

    // Summary Labels & values
    const itemWidth = (W - 60) / 4;
    
    // Column 1: Start Balance
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(TEXT_MID).text('STARTING BALANCE', 35, summaryY + 10, { width: itemWidth, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(11).fillColor(TEXT_DARK).text(`KES ${reportData.startingBalance.toLocaleString()}`, 35, summaryY + 26, { width: itemWidth, align: 'center' });

    // Column 2: Total Money In
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COFFEE_DARK).text('TOTAL MONEY IN (+)', 35 + itemWidth, summaryY + 10, { width: itemWidth, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COFFEE_DARK).text(`KES ${reportData.totalMoneyIn.toLocaleString()}`, 35 + itemWidth, summaryY + 26, { width: itemWidth, align: 'center' });

    // Column 3: Total Money Out
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#B03A2E').text('TOTAL MONEY OUT (-)', 35 + itemWidth * 2, summaryY + 10, { width: itemWidth, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#B03A2E').text(`KES ${reportData.totalMoneyOut.toLocaleString()}`, 35 + itemWidth * 2, summaryY + 26, { width: itemWidth, align: 'center' });

    // Column 4: Ending Balance
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(TEXT_DARK).text('ENDING BALANCE', 35 + itemWidth * 3, summaryY + 10, { width: itemWidth, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(11).fillColor(TEXT_DARK).text(`KES ${reportData.endingBalance.toLocaleString()}`, 35 + itemWidth * 3, summaryY + 26, { width: itemWidth, align: 'center' });

    // 4. Ledger transactions Table using pdfkit-table
    const tableY = 280;

    const rows = reportData.ledger.map((tx) => [
      moment(tx.date).format('DD/MM/YY HH:mm'),
      tx.transactionId,
      tx.description,
      tx.paymentMethod?.toUpperCase() || '—',
      tx.moneyIn > 0 ? `+${tx.moneyIn.toLocaleString()}` : '0',
      tx.moneyOut > 0 ? `-${tx.moneyOut.toLocaleString()}` : '0',
      tx.runningBalance.toLocaleString()
    ]);

    const table = {
      title: "TRANSACTION LEDGER BREAKDOWN",
      subtitle: "List of all verified sales payments, refunds, and outlays",
      headers: ["Date & Time", "Tx Ref", "Description", "Method", "Money In", "Money Out", "Balance"],
      rows: rows
    };

    // Render Table
    await doc.table(table, {
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF'),
      prepareRow: (row, i) => doc.font('Helvetica').fontSize(8).fillColor(TEXT_DARK),
      width: W - 60,
      x: 30,
      y: tableY,
      columnsSize: [75, 60, 175, 45, 55, 55, 70],
      headerColor: TEXT_MID,
      rowBgColor: '#FFFFFF',
      altRowBgColor: '#FAF6F1', // Premium light warm gold/brown stripe
      border: { size: 0.2, color: BORDER_COLOR }
    });

    // 5. Signature and Footer
    const footerOffset = doc.y > H - 100 ? doc.addPage().y + 50 : doc.y + 40;
    
    // Draw signature
    doc.font('Times-Italic').fontSize(16).fillColor('#6F4E37').text('Rerendet Coffee CEO', 45, footerOffset - 25);
    
    // Draw signature line
    doc.moveTo(30, footerOffset).lineTo(180, footerOffset).strokeColor(TEXT_DARK).lineWidth(0.8).stroke();
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(TEXT_DARK).text('Rerendet Coffee CEO', 30, footerOffset + 6);
    doc.font('Helvetica').fontSize(7.5).fillColor(TEXT_MID).text('Corporate Signatory Authority', 30, footerOffset + 17);

    // Corporate Stamp circle outline (pure vector draw)
    const stampX = W - 100;
    const stampY = footerOffset + 10;
    doc.circle(stampX, stampY, 28).strokeColor('rgba(212, 175, 55, 0.4)').lineWidth(1).stroke();
    doc.font('Helvetica-Bold').fontSize(6).fillColor('rgba(212, 175, 55, 0.6)')
       .text('REVENUE DEPT', stampX - 25, stampY - 10, { width: 50, align: 'center' })
       .text('APPROVED', stampX - 25, stampY + 2, { width: 50, align: 'center' });

    // Page number count footer (dynamic)
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.rect(0, H - 40, W, 40).fill(COFFEE_DARK);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GOLD_BRAND)
         .text('Thank you for choosing Rerendet Coffee', 30, H - 28);
      doc.font('Helvetica').fontSize(8).fillColor('rgba(255,255,255,0.7)')
         .text(`Page ${i + 1} of ${pages.count}`, W - 100, H - 28, { width: 70, align: 'right' });
    }

    doc.end();

  } catch (error) {
    console.error('❌ Statement generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate financial statement' });
    }
  }
};
