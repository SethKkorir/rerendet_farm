import axios from 'axios';

let cachedRate = 0.0076; // Default fallback (1 KES ~ 0.0076 USD, i.e., 1 USD = 131.5 KES)
let lastFetched = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour caching

/**
 * Fetches the JIT exchange rate from KES to USD.
 * Fallbacks to standard rate if the exchange rate API is unavailable.
 */
export const getKEStoUSDRate = async () => {
  const now = Date.now();
  if (now - lastFetched < CACHE_DURATION_MS) {
    return cachedRate;
  }

  try {
    // Using a reliable, free, and non-auth API for currency exchange rates
    const response = await axios.get('https://open.er-api.com/v6/latest/KES', { timeout: 3000 });
    if (response.data && response.data.rates && response.data.rates.USD) {
      cachedRate = response.data.rates.USD;
      lastFetched = now;
      console.log(`📈 JIT Exchange Rate updated successfully: 1 KES = ${cachedRate} USD`);
    }
  } catch (error) {
    console.warn('⚠️ Currency Exchange API failed or timed out. Using fallback rate:', cachedRate, error.message);
  }

  return cachedRate;
};

/**
 * Converts KES to USD dynamically with JIT exchange rate.
 * @param {number} amountInKES - Amount in Kenyan Shillings
 * @returns {Promise<number>} - Rounded amount in USD
 */
export const convertKEStoUSD = async (amountInKES) => {
  const rate = await getKEStoUSDRate();
  const converted = amountInKES * rate;
  // PayPal requires maximum of 2 decimal places
  return Math.round((converted + Number.EPSILON) * 100) / 100;
};
