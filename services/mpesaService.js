import axios from 'axios';

const MPESA_CONFIG = {
  consumerKey: process.env.MPESA_CONSUMER_KEY || 'NAGbV3G9jR7m1b7S7ZAtN8A4ZlG9n60B', // Sandbox keys
  consumerSecret: process.env.MPESA_CONSUMER_SECRET || 'ZAgzR7m1b7S7ZAta', // Sandbox keys
  shortCode: process.env.MPESA_SHORTCODE || '174379', // Lipa Na M-Pesa Online sandbox shortcode
  passkey: process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919', // Sandbox passkey
  environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
  callbackUrl: process.env.MPESA_CALLBACK_URL || 'https://rerendet-coffee.com/api/webhooks/mpesa'
};

const getMpesaBaseUrl = () => {
  return MPESA_CONFIG.environment === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
};

/**
 * Generates Safaricom Daraja API Access Token.
 */
export const getMpesaAccessToken = async () => {
  const baseUrl = getMpesaBaseUrl();
  const auth = Buffer.from(`${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`).toString('base64');

  try {
    const response = await axios.get(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${auth}`
        },
        timeout: 5000
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('❌ M-Pesa Access Token Error:', error.response?.data || error.message);
    throw new Error('Failed to generate M-Pesa access token from Daraja Gateway');
  }
};

/**
 * Formats a given phone number to the required Safaricom format (2547XXXXXXXX).
 */
export const formatMpesaPhoneNumber = (phone) => {
  let cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    cleaned = '254' + cleaned;
  } else if (cleaned.startsWith('254') === false) {
    cleaned = '254' + cleaned;
  }

  // Ensure it's 12 digits (254 + 9 digits)
  return cleaned;
};

/**
 * Initiates an M-Pesa STK Push (Lipa Na M-Pesa Online).
 * @param {string} phone - User's phone number
 * @param {number} amount - Amount in KES (must be integer/rounded)
 * @param {string} orderNumber - Unique reference number
 * @param {string} customCallbackUrl - Optional custom webhook callback URL
 */
export const initiateMpesaStkPushService = async (phone, amount, orderNumber, customCallbackUrl) => {
  const baseUrl = getMpesaBaseUrl();
  const token = await getMpesaAccessToken();
  
  // Format current timestamp (YYYYMMDDHHmmss)
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
  
  // Password = Base64(ShortCode + PassKey + Timestamp)
  const password = Buffer.from(`${MPESA_CONFIG.shortCode}${MPESA_CONFIG.passkey}${timestamp}`).toString('base64');
  
  const formattedPhone = formatMpesaPhoneNumber(phone);
  const callbackUrl = customCallbackUrl || MPESA_CONFIG.callbackUrl;

  const requestBody = {
    BusinessShortCode: MPESA_CONFIG.shortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(amount),
    PartyA: formattedPhone,
    PartyB: MPESA_CONFIG.shortCode,
    PhoneNumber: formattedPhone,
    CallBackURL: callbackUrl,
    AccountReference: orderNumber,
    TransactionDesc: `Payment for Order #${orderNumber}`
  };

  try {
    const response = await axios.post(
      `${baseUrl}/mpesa/stkpush/v1/processrequest`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data; // Includes CheckoutRequestID, MerchantRequestID, CustomerMessage
  } catch (error) {
    console.error('❌ M-Pesa STK Push Service Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errorMessage || 'M-Pesa STK Push initiation failed');
  }
};

/**
 * Queries the M-Pesa STK Push status.
 * @param {string} checkoutRequestId - CheckoutRequestID from STK push initiation
 */
export const queryMpesaStkStatusService = async (checkoutRequestId) => {
  const baseUrl = getMpesaBaseUrl();
  const token = await getMpesaAccessToken();

  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
  const password = Buffer.from(`${MPESA_CONFIG.shortCode}${MPESA_CONFIG.passkey}${timestamp}`).toString('base64');

  const requestBody = {
    BusinessShortCode: MPESA_CONFIG.shortCode,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId
  };

  try {
    const response = await axios.post(
      `${baseUrl}/mpesa/stkpushquery/v1/query`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data; // ResultCode, ResultDesc, etc.
  } catch (error) {
    console.error(`❌ M-Pesa Query Error for ID ${checkoutRequestId}:`, error.response?.data || error.message);
    throw new Error(error.response?.data?.errorMessage || 'M-Pesa transaction query failed');
  }
};
