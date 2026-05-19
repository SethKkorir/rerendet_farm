// utils/passwordValidator.js - HIGH ENTROPY & BREACH VALIDATOR
import zxcvbnLib from 'zxcvbn';
import { checkPasswordBreach } from './hibpService.js';

export const checkPasswordStrength = (password, email = '') => {
  try {
    const userInputs = email ? [email, email.split('@')[0]] : [];
    const result = zxcvbnLib(password, userInputs);
    
    return {
      score: result.score, // 0 to 4
      feedback: result.feedback.suggestions.join(' ') || (result.score >= 3 ? 'Excellent password!' : 'Structurally too weak.'),
      crackTime: result.crack_times_display?.offline_fast_hashing_1e10_per_second || 'Instant'
    };
  } catch (error) {
    // Robust fallback if any library mismatch
    let score = 0;
    let feedback = '';

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);

    const variety = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
    if (variety >= 3) score++;
    if (variety === 4 && password.length >= 10) score++;

    // Common sequence checks
    const commonSequences = ['123456', 'password', 'qwerty', 'rerendet', 'coffee', 'admin'];
    const lowercasePass = password.toLowerCase();
    for (const seq of commonSequences) {
      if (lowercasePass.includes(seq)) {
        score = Math.max(0, score - 2);
        feedback = `Avoid common phrases/words like "${seq}". `;
      }
    }

    if (score < 3) {
      feedback += 'Password is structurally weak. Use a mix of uppercase, lowercase, numbers, and symbols.';
    } else {
      feedback = 'Excellent password entropy!';
    }

    return {
      score,
      feedback,
      crackTime: score >= 3 ? 'Years' : 'Seconds'
    };
  }
};

/**
 * Validates password strength and checks if it has been exposed in a data breach.
 * 
 * @param {string} password - Password to validate
 * @param {string} email - Optional user email for entropy context
 * @returns {Promise<{ isValid: boolean, score: number, feedback: string }>}
 */
export const validatePasswordSecurely = async (password, email = '') => {
  const strength = checkPasswordStrength(password, email);
  
  if (strength.score < 3) {
    return {
      isValid: false,
      score: strength.score,
      feedback: `Password too weak! ${strength.feedback}`
    };
  }

  // Check for breaches via HaveIBeenPwned API
  const breachCount = await checkPasswordBreach(password);
  if (breachCount > 0) {
    return {
      isValid: false,
      score: strength.score,
      feedback: `Security Risk: This password was found in a database of breached credentials (seen ${breachCount} times in public leaks). Please choose a different, unique password.`
    };
  }

  return {
    isValid: true,
    score: strength.score,
    feedback: 'Password meets all enterprise security requirements.'
  };
};
