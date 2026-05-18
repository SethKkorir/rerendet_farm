// middleware/mpesaWebhookAuth.js
import dotenv from 'dotenv';

dotenv.config();

// Safaricom published production IP ranges for Daraja callbacks
const SAFARICOM_IPS = [
  '196.201.214.200', '196.201.214.206', '196.201.214.207', '196.201.214.208',
  '196.201.213.114', '196.201.213.44',
  '196.201.212.127', '196.201.212.138', '196.201.212.129', '196.201.212.136', '196.201.212.74', '196.201.212.69'
];

const isSafaricomIP = (ip) => {
  if (!ip) return false;
  
  // Normalize IPv6 mapped IPv4 addresses (e.g. ::ffff:196.201.214.200)
  let cleanIP = ip.trim();
  if (cleanIP.startsWith('::ffff:')) {
    cleanIP = cleanIP.substring(7);
  }

  // Exact match
  if (SAFARICOM_IPS.includes(cleanIP)) return true;

  // Subnet/Range check for Safaricom blocks: 196.201.212.0/24, 196.201.213.0/24, 196.201.214.0/24
  if (cleanIP.startsWith('196.201.212.') || 
      cleanIP.startsWith('196.201.213.') || 
      cleanIP.startsWith('196.201.214.')) {
    return true;
  }

  // Localhost sandbox check
  if (cleanIP === '127.0.0.1' || cleanIP === '::1') return true;

  return false;
};

export const mpesaWebhookAuth = (req, res, next) => {
  // Extract client IP resolving standard proxies
  let ip = req.headers['x-forwarded-for'] 
    ? req.headers['x-forwarded-for'].split(',')[0].trim() 
    : (req.ip || req.socket.remoteAddress || '');

  const isDev = process.env.NODE_ENV === 'development' || process.env.BYPASS_IP_CHECK === 'true';

  console.log(`📡 [M-Pesa Webhook Auth] incoming request from IP: ${ip} (Dev Mode: ${isDev})`);

  if (!isSafaricomIP(ip)) {
    if (isDev) {
      console.warn(`⚠️ [M-Pesa Webhook Auth] BYPASSED IP verification in development for: ${ip}`);
      return next();
    }
    console.error(`🚫 [M-Pesa Webhook Auth] BLOCKED unauthorized callback attempt from IP: ${ip}`);
    return res.status(403).json({ 
      success: false, 
      message: 'Access Forbidden: Client IP not authorized' 
    });
  }

  next();
};

export default mpesaWebhookAuth;
