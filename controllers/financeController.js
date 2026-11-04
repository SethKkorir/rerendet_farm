// controllers/financeController.js — Financial Ledger & Invoicing Engine
import asyncHandler from 'express-async-handler';
import Invoice from '../models/Invoice.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import Order from '../models/Order.js';
import { logActivity } from '../utils/activityLogger.js';

// ==================== INVOICES CONTROLLER ====================

// @desc    Get all invoices with filtering, pagination and KPIs
// @route   GET /api/admin/invoices
export const getInvoices = asyncHandler(async (req, res) => {
  const { search, status, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const query = {};
  if (status && status !== 'all') {
    query.status = status;
  }
  if (search) {
    query.$or = [
      { invoiceNumber: { $regex: search, $options: 'i' } },
      { 'client.name': { $regex: search, $options: 'i' } },
      { 'client.company': { $regex: search, $options: 'i' } },
      { 'client.email': { $regex: search, $options: 'i' } }
    ];
  }

  // Query manual invoices
  const [invoices, totalManualCount] = await Promise.all([
    Invoice.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)).lean(),
    Invoice.countDocuments(query)
  ]);

  // If manual invoices are fewer than 10, pull recent Orders as virtual invoices so the ledger is rich
  let combinedInvoices = [...invoices];
  let totalCount = totalManualCount;

  if (totalManualCount === 0 || (!status && !search)) {
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(25)
      .lean();

    const orderInvoices = recentOrders.map((ord) => ({
      _id: ord._id,
      invoiceNumber: `INV-${ord.orderNumber || ord._id.toString().slice(-6).toUpperCase()}`,
      orderId: ord._id,
      client: {
        name: `${ord.shippingAddress?.firstName || 'Valued'} ${ord.shippingAddress?.lastName || 'Customer'}`,
        email: ord.shippingAddress?.email || '',
        phone: ord.shippingAddress?.phone || '',
        company: '',
        address: ord.shippingAddress?.address || '',
        city: ord.shippingAddress?.town || ord.shippingAddress?.city || 'Nairobi',
        country: ord.shippingAddress?.country || 'Kenya'
      },
      items: (ord.items || []).map((it) => ({
        name: it.name,
        description: `Size: ${it.size}`,
        quantity: it.quantity,
        unitPrice: it.price,
        total: it.itemTotal || it.price * it.quantity
      })),
      subtotal: ord.subtotal || ord.total,
      taxRate: 16,
      taxAmount: ord.tax || 0,
      shippingCost: ord.deliveryFee || ord.shippingCost || 0,
      discount: 0,
      total: ord.total,
      currency: 'KES',
      issueDate: ord.createdAt,
      dueDate: ord.createdAt,
      paymentTerms: 'due_on_receipt',
      status: ord.paymentStatus === 'paid' ? 'paid' : ord.orderStatus === 'cancelled' ? 'cancelled' : 'pending',
      paymentMethod: ord.paymentMethod || 'MPESA',
      paymentReference: ord.transactionId || ord.manualTransactionId || '',
      isVirtualFromOrder: true,
      createdAt: ord.createdAt
    }));

    // Avoid duplicate invoice numbers if already in manual
    const existingNums = new Set(invoices.map((inv) => inv.invoiceNumber));
    const uniqueOrderInvoices = orderInvoices.filter((oi) => !existingNums.has(oi.invoiceNumber));

    combinedInvoices = [...invoices, ...uniqueOrderInvoices].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    totalCount += uniqueOrderInvoices.length;
  }

  // Compute KPI metrics across invoices
  const totalInvoiced = combinedInvoices.reduce((acc, inv) => acc + (inv.total || 0), 0);
  const totalPaid = combinedInvoices
    .filter((inv) => inv.status === 'paid')
    .reduce((acc, inv) => acc + (inv.total || 0), 0);
  const totalPending = combinedInvoices
    .filter((inv) => inv.status === 'pending')
    .reduce((acc, inv) => acc + (inv.total || 0), 0);
  const overdueCount = combinedInvoices.filter((inv) => inv.status === 'overdue').length;

  res.json({
    success: true,
    data: {
      invoices: combinedInvoices,
      pagination: {
        total: totalCount,
        page: parseInt(page, 10),
        pages: Math.ceil(totalCount / parseInt(limit, 10))
      },
      metrics: {
        totalInvoiced,
        totalPaid,
        totalPending,
        overdueCount
      }
    }
  });
});

// @desc    Get single invoice by ID (or Order ID)
// @route   GET /api/admin/invoices/:id
export const getInvoiceById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let invoice = await Invoice.findById(id).lean();

  if (!invoice) {
    // Check if ID matches an Order
    const order = await Order.findById(id).lean();
    if (order) {
      let defaultSig = '';
      let defaultSigner = 'Authorized Farm Signatory';
      try {
        const Settings = (await import('../models/Settings.js')).default;
        const appSettings = await Settings.getSettings();
        if (appSettings?.store?.signature) defaultSig = appSettings.store.signature;
        if (appSettings?.store?.signatoryName) defaultSigner = appSettings.store.signatoryName;
      } catch (e) {}

      invoice = {
        _id: order._id,
        invoiceNumber: `INV-${order.orderNumber || order._id.toString().slice(-6).toUpperCase()}`,
        order: order._id,
        client: {
          name: `${order.shippingAddress?.firstName || 'Customer'} ${order.shippingAddress?.lastName || ''}`,
          email: order.shippingAddress?.email || '',
          phone: order.shippingAddress?.phone || '',
          company: '',
          kraPin: '',
          address: order.shippingAddress?.address || '',
          city: order.shippingAddress?.town || order.shippingAddress?.city || 'Nairobi',
          country: order.shippingAddress?.country || 'Kenya'
        },
        items: (order.items || []).map((it) => ({
          name: it.name,
          description: `Roast & Size: ${it.size}`,
          quantity: it.quantity,
          unitPrice: it.price,
          total: it.itemTotal || it.price * it.quantity
        })),
        subtotal: order.subtotal || order.total,
        taxRate: 16,
        taxAmount: order.tax || 0,
        shippingCost: order.deliveryFee || order.shippingCost || 0,
        discount: 0,
        total: order.total,
        currency: 'KES',
        issueDate: order.createdAt,
        dueDate: order.createdAt,
        paymentTerms: 'due_on_receipt',
        status: order.paymentStatus === 'paid' ? 'paid' : order.orderStatus === 'cancelled' ? 'cancelled' : 'pending',
        paymentMethod: order.paymentMethod || 'MPESA',
        paymentReference: order.transactionId || order.manualTransactionId || '',
        notes: order.notes || 'Thank you for choosing Rerendet Specialty Coffee.',
        paymentInstructions: 'M-Pesa Till: 5412345 | Bank: Equity Bank Kenya, Acc: Rerendet Coffee Farm',
        signatureImage: defaultSig,
        signatoryName: defaultSigner,
        isVirtualFromOrder: true,
        createdAt: order.createdAt
      };
    }
  }

  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  res.json({ success: true, data: invoice });
});

// @desc    Create manual B2B / wholesale invoice
// @route   POST /api/admin/invoices
export const createInvoice = asyncHandler(async (req, res) => {
  const {
    invoiceNumber,
    client,
    items,
    taxRate = 16,
    shippingCost = 0,
    discount = 0,
    issueDate,
    dueDate,
    paymentTerms = 'due_on_receipt',
    paymentMethod = 'MPESA',
    notes,
    paymentInstructions,
    signatureImage,
    signatoryName
  } = req.body;

  if (!client?.name) {
    res.status(400);
    throw new Error('Client name is required');
  }

  if (!items || items.length === 0) {
    res.status(400);
    throw new Error('At least one invoice line item is required');
  }

  // Calculate financials accurately
  const subtotal = items.reduce((acc, it) => acc + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0), 0);
  const taxAmount = taxRate > 0 ? Math.round((subtotal * taxRate) / 100) : 0;
  const total = Math.max(0, subtotal + taxAmount + Number(shippingCost || 0) - Number(discount || 0));

  // Auto-generate invoice number if not provided
  const generatedNumber =
    invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  let finalSignature = signatureImage || '';
  let finalSignatoryName = signatoryName || 'Authorized Farm Signatory';

  if (!finalSignature) {
    try {
      const Settings = (await import('../models/Settings.js')).default;
      const appSettings = await Settings.getSettings();
      if (appSettings?.store?.signature) finalSignature = appSettings.store.signature;
      if (appSettings?.store?.signatoryName) finalSignatoryName = appSettings.store.signatoryName;
    } catch (e) {}
  }

  const invoice = new Invoice({
    invoiceNumber: generatedNumber,
    client,
    items: items.map((it) => ({
      name: it.name,
      description: it.description || '',
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unitPrice) || 0,
      total: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0)
    })),
    subtotal,
    taxRate: Number(taxRate) || 0,
    taxAmount,
    shippingCost: Number(shippingCost) || 0,
    discount: Number(discount) || 0,
    total,
    currency: 'KES',
    issueDate: issueDate || new Date(),
    dueDate: dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Default 14 days
    paymentTerms,
    status: 'pending',
    paymentMethod,
    signatureImage: finalSignature,
    signatoryName: finalSignatoryName,
    notes: notes || 'Thank you for choosing Rerendet Single-Origin Harvest Coffee & Farm Produce.',
    paymentInstructions: paymentInstructions || 'M-Pesa Till: 5412345 | Bank: Equity Bank Kenya, Acc: Rerendet Coffee Farm',
    createdBy: req.user._id
  });

  const created = await invoice.save();

  await logActivity(
    req,
    'INVOICE_CREATE',
    `Created invoice ${created.invoiceNumber} for ${client.name} (KES ${total.toLocaleString()})`,
    created._id.toString(),
    { actionCategory: 'business_event' }
  );

  res.status(201).json({ success: true, data: created });
});

// @desc    Update invoice status (e.g., mark as paid or cancelled)
// @route   PATCH /api/admin/invoices/:id/status
export const updateInvoiceStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, paymentReference } = req.body;

  const invoice = await Invoice.findById(id);

  if (!invoice) {
    // If it's an Order ID, update Order payment status
    const order = await Order.findById(id);
    if (order) {
      order.paymentStatus = status === 'paid' ? 'paid' : order.paymentStatus;
      if (paymentReference) order.transactionId = paymentReference;
      await order.save();
      return res.json({ success: true, message: `Order payment marked as ${status}` });
    }

    res.status(404);
    throw new Error('Invoice not found');
  }

  invoice.status = status;
  if (status === 'paid') {
    invoice.paidAt = new Date();
  }
  if (paymentReference) {
    invoice.paymentReference = paymentReference;
  }

  await invoice.save();

  await logActivity(
    req,
    'INVOICE_STATUS_UPDATE',
    `Invoice ${invoice.invoiceNumber} status set to ${status}`,
    invoice._id.toString()
  );

  res.json({ success: true, data: invoice });
});

// @desc    Delete draft invoice
// @route   DELETE /api/admin/invoices/:id
export const deleteInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  await invoice.deleteOne();
  res.json({ success: true, message: 'Invoice deleted successfully' });
});

// ==================== TRANSACTIONS CONTROLLER ====================

// @desc    Get financial transactions ledger
// @route   GET /api/admin/transactions
export const getTransactions = asyncHandler(async (req, res) => {
  const { search, provider, status, page = 1, limit = 25 } = req.query;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const query = {};
  if (provider && provider !== 'all') {
    query.provider = provider.toUpperCase();
  }
  if (status && status !== 'all') {
    query.status = status.toUpperCase();
  }
  if (search) {
    query.$or = [
      { transactionId: { $regex: search, $options: 'i' } },
      { idempotencyKey: { $regex: search, $options: 'i' } }
    ];
  }

  const [transactions, totalCount] = await Promise.all([
    PaymentTransaction.find(query)
      .populate('order', 'orderNumber total shippingAddress paymentMethod')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean(),
    PaymentTransaction.countDocuments(query)
  ]);

  // Aggregate metrics
  const totalVolume = await PaymentTransaction.aggregate([
    { $match: { status: 'SUCCESS' } },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
  ]);

  const mpesaVolume = await PaymentTransaction.aggregate([
    { $match: { provider: 'MPESA', status: 'SUCCESS' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  const stripeVolume = await PaymentTransaction.aggregate([
    { $match: { provider: 'STRIPE', status: 'SUCCESS' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  res.json({
    success: true,
    data: {
      transactions,
      pagination: {
        total: totalCount,
        page: parseInt(page, 10),
        pages: Math.ceil(totalCount / parseInt(limit, 10))
      },
      metrics: {
        totalProcessed: totalVolume[0]?.total || 0,
        successfulCount: totalVolume[0]?.count || 0,
        mpesaVolume: mpesaVolume[0]?.total || 0,
        stripeVolume: stripeVolume[0]?.total || 0
      }
    }
  });
});

// @desc    Get single transaction by ID
// @route   GET /api/admin/transactions/:id
export const getTransactionById = asyncHandler(async (req, res) => {
  const transaction = await PaymentTransaction.findById(req.params.id)
    .populate('order', 'orderNumber total items shippingAddress createdAt paymentStatus fulfillmentStatus')
    .lean();

  if (!transaction) {
    res.status(404);
    throw new Error('Transaction record not found');
  }

  res.json({ success: true, data: transaction });
});

// @desc    Manually settle a payment issue or reconcile an order
// @route   POST /api/admin/transactions/settle
export const settlePaymentIssue = asyncHandler(async (req, res) => {
  const { orderIdentifier, transactionId, receiptCode, amount, provider = 'MPESA', note } = req.body;

  if (!orderIdentifier && !transactionId) {
    res.status(400);
    throw new Error('Please provide an Order Number / ID or a Transaction ID to settle');
  }

  let order = null;
  let tx = null;

  // 1. If transactionId is passed (e.g. from existing transaction row)
  if (transactionId) {
    tx = await PaymentTransaction.findById(transactionId);
    if (!tx) {
      tx = await PaymentTransaction.findOne({ transactionId });
    }
    if (tx && tx.order) {
      order = await Order.findById(tx.order);
    }
  }

  // 2. If orderIdentifier is passed (e.g., "1042" or "RND-1042" or ObjectId)
  if (!order && orderIdentifier) {
    const cleanId = orderIdentifier.trim();
    if (cleanId.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(cleanId);
    }
    if (!order) {
      order = await Order.findOne({
        $or: [
          { orderNumber: cleanId },
          { orderNumber: cleanId.replace(/^RND-|^RF-/i, '') },
          { orderNumber: `RND-${cleanId}` }
        ]
      });
    }
  }

  if (!order && !tx) {
    res.status(404);
    throw new Error('No matching order or transaction found with provided details');
  }

  const finalReceipt = (receiptCode || tx?.transactionId || `MANUAL-${Date.now().toString().slice(-6)}`).toUpperCase().trim();
  const settleAmount = Number(amount) || (order ? order.total : tx ? tx.amount : 0);

  // Update or create PaymentTransaction
  if (!tx && order) {
    tx = await PaymentTransaction.findOne({ transactionId: finalReceipt, provider });
    if (!tx) {
      tx = new PaymentTransaction({
        order: order._id,
        provider: provider.toUpperCase(),
        transactionId: finalReceipt,
        amount: settleAmount,
        currency: 'KES',
        status: 'SUCCESS',
        metadata: {
          settledManually: true,
          settledBy: req.user?.name || 'Admin',
          settledAt: new Date(),
          auditNote: note || 'Payment manually settled by admin'
        },
        processedAt: new Date()
      });
    }
  }

  if (tx) {
    tx.status = 'SUCCESS';
    tx.amount = settleAmount;
    tx.transactionId = finalReceipt;
    tx.processedAt = new Date();
    tx.metadata = {
      ...(tx.metadata || {}),
      settledManually: true,
      settledBy: req.user?.name || 'Admin',
      settledAt: new Date(),
      auditNote: note || 'Payment manually settled by admin'
    };
    if (order && !tx.order) {
      tx.order = order._id;
    }
    await tx.save();
  }

  // Update Order if associated
  if (order) {
    order.paymentStatus = 'paid';
    order.transactionId = finalReceipt;
    order.paidAt = new Date();
    if (order.orderStatus === 'pending' || order.orderStatus === 'cancelled') {
      order.orderStatus = 'processing';
    }
    if (note) {
      order.notes = order.notes ? `${order.notes} | Manual Settle: ${note}` : `Manual Settle: ${note}`;
    }
    await order.save();
  }

  await logActivity(
    req,
    'PAYMENT_MANUAL_SETTLE',
    `Manually settled payment for ${order ? `Order #${order.orderNumber}` : `Transaction ${finalReceipt}`} (KES ${settleAmount.toLocaleString()})`,
    order?._id?.toString() || tx?._id?.toString(),
    { actionCategory: 'financial' }
  );

  res.json({
    success: true,
    message: `Payment successfully settled for ${order ? `Order #${order.orderNumber}` : finalReceipt}`,
    data: {
      order,
      transaction: tx
    }
  });
});

// @desc    Live query Safaricom / Provider gateway for a transaction
// @route   POST /api/admin/transactions/:id/query-gateway
export const queryTransactionGateway = asyncHandler(async (req, res) => {
  const tx = await PaymentTransaction.findById(req.params.id);
  if (!tx) {
    res.status(404);
    throw new Error('Transaction record not found');
  }

  if (tx.provider !== 'MPESA') {
    return res.status(400).json({
      success: false,
      message: 'Gateway live query is currently only supported for Safaricom M-Pesa'
    });
  }

  const checkoutRequestId = tx.idempotencyKey || tx.transactionId;
  if (!checkoutRequestId || !checkoutRequestId.startsWith('ws_CO_')) {
    return res.status(400).json({
      success: false,
      message: 'No valid Safaricom CheckoutRequestID found for this transaction'
    });
  }

  try {
    const { queryMpesaStkStatusService } = await import('../services/mpesaService.js');
    const response = await queryMpesaStkStatusService(checkoutRequestId);

    tx.rawResponse = { ...(tx.rawResponse || {}), queryResult: response };
    tx.lastQueriedAt = new Date();

    if (response.ResultCode === 0 || response.ResultCode === '0') {
      tx.status = 'SUCCESS';
      tx.processedAt = new Date();
      if (tx.order) {
        await Order.findByIdAndUpdate(tx.order, {
          paymentStatus: 'paid',
          paidAt: new Date()
        });
      }
    } else if (response.ResultCode !== 1032 && response.ResultCode !== '1032') {
      tx.status = 'FAILED';
    }

    await tx.save();

    res.json({
      success: true,
      message: `Gateway queried: ${response.ResultDesc || 'Status updated'}`,
      data: tx
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `Failed to query Safaricom gateway: ${err.message}`
    });
  }
});

// @desc    Get unsettled payments & pending checkout drop-offs
// @route   GET /api/admin/transactions/unsettled
export const getUnsettledPayments = asyncHandler(async (req, res) => {
  const [pendingOrders, pendingTransactions, failedTransactions] = await Promise.all([
    Order.find({ paymentStatus: { $in: ['pending', 'failed'] } })
      .sort({ createdAt: -1 })
      .limit(15)
      .select('orderNumber total paymentMethod createdAt customer shippingAddress paymentStatus')
      .lean(),
    PaymentTransaction.find({ status: 'PENDING' })
      .sort({ createdAt: -1 })
      .limit(15)
      .populate('order', 'orderNumber total shippingAddress')
      .lean(),
    PaymentTransaction.find({ status: 'FAILED' })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('order', 'orderNumber total shippingAddress')
      .lean()
  ]);

  res.json({
    success: true,
    data: {
      pendingOrders,
      pendingTransactions,
      failedTransactions,
      totalUnsettledCount: pendingOrders.length + pendingTransactions.length
    }
  });
});
