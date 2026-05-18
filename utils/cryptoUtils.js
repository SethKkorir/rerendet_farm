import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const RAW_KEY = process.env.ENCRYPTION_KEY || 'rerendet_secret_key_32chars_!!'; // 32-char fallback
const IV_LENGTH = 16; // For AES, this is always 16

// Validate key length — AES-256-CBC requires exactly 32 bytes
if (!process.env.ENCRYPTION_KEY) {
  console.warn('⚠️ ENCRYPTION_KEY not set in .env. Using insecure fallback. Set a proper 32-char key.');
}
const ENCRYPTION_KEY = Buffer.byteLength(RAW_KEY) === 32
  ? RAW_KEY
  : RAW_KEY.slice(0, 32).padEnd(32, '0'); // Safely truncate/pad to 32 bytes

const encrypt = (text) => {
    if (!text) return text;
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch (error) {
        console.error('Encryption failed:', error);
        return text;
    }
};

const decrypt = (text) => {
    if (!text || !text.includes(':')) return text;
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        console.error('Decryption failed:', error);
        return text;
    }
};

export { encrypt, decrypt };
