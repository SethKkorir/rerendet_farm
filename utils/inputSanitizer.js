// utils/inputSanitizer.js
/**
 * Sanitize user input to prevent XSS and injection attacks
 */

/**
 * Remove HTML tags and sanitize string input
 */
export const sanitizeString = (input) => {
    if (typeof input !== 'string') return input;

    // Remove HTML tags
    let sanitized = input.replace(/<[^>]*>/g, '');

    // Remove script tags and their content
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    return sanitized;
};

/**
 * Sanitize an entire object recursively
 */
export const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];

            if (typeof value === 'string') {
                sanitized[key] = sanitizeString(value);
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
    }

    return sanitized;
};

/**
 * Validate and sanitize email
 */
export const sanitizeEmail = (email) => {
    if (typeof email !== 'string') return '';

    const sanitized = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailRegex.test(sanitized) ? sanitized : '';
};

/**
 * Validate and sanitize phone number (Kenyan and International formats)
 */
export const sanitizePhone = (phone) => {
    if (typeof phone !== 'string') return '';

    const trimmed = phone.trim();
    // Extract only digits
    const digitsOnly = trimmed.replace(/\D/g, '');

    // Kenyan local conversions
    if (digitsOnly.startsWith('0') && digitsOnly.length === 10) {
        return '254' + digitsOnly.substring(1);
    } else if ((digitsOnly.startsWith('7') || digitsOnly.startsWith('1')) && digitsOnly.length === 9) {
        return '254' + digitsOnly;
    } else if (digitsOnly.startsWith('2540') && digitsOnly.length === 13) {
        return '254' + digitsOnly.substring(4);
    } else if (digitsOnly.startsWith('254') && digitsOnly.length === 12) {
        return digitsOnly;
    }

    // General international or standard format: allow any valid phone between 7 and 16 digits
    if (digitsOnly.length >= 7 && digitsOnly.length <= 16) {
        return trimmed.startsWith('+') ? `+${digitsOnly}` : digitsOnly;
    }

    return digitsOnly.length >= 7 ? digitsOnly : '';
};

/**
 * Sanitize monetary amount
 */
export const sanitizeAmount = (amount) => {
    const parsed = parseFloat(amount);

    if (isNaN(parsed) || parsed < 0) {
        return 0;
    }

    // Round to 2 decimal places
    return Math.round(parsed * 100) / 100;
};

export default {
    sanitizeString,
    sanitizeObject,
    sanitizeEmail,
    sanitizePhone,
    sanitizeAmount
};
