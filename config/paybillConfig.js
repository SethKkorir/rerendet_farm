// config/paybillConfig.js
export const PAYBILL_EXPIRY_HOURS = parseInt(process.env.PAYMENT_EXPIRY_HOURS || process.env.PAYBILL_EXPIRY_HOURS, 10) || 24;
export const PAYMENT_REVIEW_GRACE_HOURS = parseInt(process.env.PAYMENT_REVIEW_GRACE_HOURS || process.env.PAYBILL_EXPIRY_GRACE_HOURS, 10) || 24;
export const DEFAULT_PAYBILL_NUMBER = process.env.PAYBILL_NUMBER || '516600';
export const DEFAULT_PAYBILL_ACCOUNT = process.env.PAYBILL_ACCOUNT || '934558';
export const DEFAULT_WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || '254705684984';

