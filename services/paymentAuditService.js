// services/paymentAuditService.js
import PaymentAuditLog from '../models/PaymentAuditLog.js';

/**
 * logPaymentEvent — Fire-and-forget audit writer.
 *
 * All payment lifecycle events call this function. Writes are always
 * non-blocking: we never await this in a hot path. If the write fails
 * (e.g. Atlas network blip), we log to stderr but never throw — audit
 * logging must never interrupt the payment flow.
 *
 * Usage:
 *   logPaymentEvent({ event: 'ORDER_PAID', orderId: order._id, ... });
 *   // Never await — fire and forget
 *
 * @param {Object} payload
 * @param {string}  payload.event               - Required. One of the event enum values.
 * @param {string}  [payload.checkoutRequestId]
 * @param {string}  [payload.mpesaReceiptNumber]
 * @param {string}  [payload.provider]
 * @param {*}       [payload.orderId]
 * @param {string}  [payload.orderNumber]
 * @param {number}  [payload.amount]
 * @param {number}  [payload.resultCode]
 * @param {string}  [payload.resultDesc]
 * @param {string}  [payload.sourceIp]
 * @param {number}  [payload.processingDurationMs]
 * @param {string}  [payload.error]
 * @param {Object}  [payload.metadata]
 */
export const logPaymentEvent = (payload) => {
  PaymentAuditLog.create(payload).catch((err) => {
    // Never throw — log to stderr only
    console.error(`❌ [PaymentAuditLog] Failed to write audit event "${payload?.event}":`, err.message);
  });
};

/**
 * getPaymentAuditLogs — Admin-facing query helper.
 * Returns paginated audit records filtered by optional criteria.
 *
 * @param {Object} options
 * @param {string}  [options.event]             - Filter by event type
 * @param {string}  [options.checkoutRequestId] - Filter by checkout ID
 * @param {*}       [options.orderId]           - Filter by order ObjectId
 * @param {Date}    [options.from]              - Start of date range
 * @param {Date}    [options.to]                - End of date range
 * @param {number}  [options.page=1]
 * @param {number}  [options.limit=50]
 * @returns {Promise<{ logs: Array, total: number, page: number, pages: number }>}
 */
export const getPaymentAuditLogs = async ({
  event,
  checkoutRequestId,
  orderId,
  from,
  to,
  page = 1,
  limit = 50
} = {}) => {
  const filter = {};

  if (event) filter.event = event;
  if (checkoutRequestId) filter.checkoutRequestId = checkoutRequestId;
  if (orderId) filter.orderId = orderId;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to)   filter.createdAt.$lte = new Date(to);
  }

  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    PaymentAuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PaymentAuditLog.countDocuments(filter)
  ]);

  return {
    logs,
    total,
    page,
    pages: Math.ceil(total / limit)
  };
};

export default { logPaymentEvent, getPaymentAuditLogs };
