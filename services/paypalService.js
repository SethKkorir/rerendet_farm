import axios from 'axios';

const PAYPAL_CONFIG = {
  clientId: process.env.PAYPAL_CLIENT_ID || 'Acr_zD-fG_S_Y1Y_test_sandbox_client_id_placeholder',
  clientSecret: process.env.PAYPAL_CLIENT_SECRET || 'EHz_sandbox_secret_placeholder',
  environment: process.env.PAYPAL_ENVIRONMENT || 'sandbox' // sandbox or production
};

const getPayPalBaseUrl = () => {
  return PAYPAL_CONFIG.environment === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
};

let cachedToken = null;
let tokenExpiry = 0;

/**
 * Retrieves a cached or fresh PayPal OAuth2 access token.
 */
export const getPayPalAccessToken = async () => {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  const baseUrl = getPayPalBaseUrl();
  const auth = Buffer.from(`${PAYPAL_CONFIG.clientId}:${PAYPAL_CONFIG.clientSecret}`).toString('base64');

  try {
    const response = await axios.post(
      `${baseUrl}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 5000
      }
    );

    cachedToken = response.data.access_token;
    // Expire 1 minute before actual expiry to be safe
    tokenExpiry = now + (response.data.expires_in - 60) * 1000;
    console.log('🎫 Fresh PayPal Access Token generated successfully.');
    return cachedToken;
  } catch (error) {
    console.error('❌ PayPal OAuth Token Error:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with PayPal Gateway');
  }
};

/**
 * Creates a PayPal Order (V2)
 * @param {number} amountInUSD - Total amount in USD
 * @param {string} orderNumber - Rerendet Order Reference
 * @param {string} returnUrl - Success redirection url
 * @param {string} cancelUrl - Cancellation redirection url
 */
export const createPayPalOrderService = async (amountInUSD, orderNumber, returnUrl, cancelUrl) => {
  const baseUrl = getPayPalBaseUrl();
  const token = await getPayPalAccessToken();

  const orderData = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: orderNumber,
        amount: {
          currency_code: 'USD',
          value: amountInUSD.toFixed(2)
        },
        description: `Rerendet Coffee Order #${orderNumber}`
      }
    ],
    application_context: {
      brand_name: 'Rerendet Coffee',
      landing_page: 'LOGIN',
      user_action: 'PAY_NOW',
      return_url: returnUrl || 'https://rerendet-farm.vercel.app/checkout/success',
      cancel_url: cancelUrl || 'https://rerendet-farm.vercel.app/checkout/cancel'
    }
  };

  try {
    const response = await axios.post(
      `${baseUrl}/v2/checkout/orders`,
      orderData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ PayPal Create Order Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to initialize PayPal Checkout Session');
  }
};

/**
 * Captures payment for a PayPal Order (V2)
 * @param {string} paypalOrderId - The order ID returned from PayPal during creation
 */
export const capturePayPalOrderService = async (paypalOrderId) => {
  const baseUrl = getPayPalBaseUrl();
  const token = await getPayPalAccessToken();

  try {
    const response = await axios.post(
      `${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ PayPal Capture Order Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to capture PayPal payment');
  }
};

/**
 * Queries payment status/details for a PayPal Order (V2)
 * @param {string} paypalOrderId - PayPal Order ID
 */
export const getPayPalOrderService = async (paypalOrderId) => {
  const baseUrl = getPayPalBaseUrl();
  const token = await getPayPalAccessToken();

  try {
    const response = await axios.get(
      `${baseUrl}/v2/checkout/orders/${paypalOrderId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ PayPal Get Order Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to check PayPal order details');
  }
};
