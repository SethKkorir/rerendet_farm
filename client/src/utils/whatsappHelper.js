// client/src/utils/whatsappHelper.js

/**
 * Extracts and cleans the active WhatsApp phone number configured in Admin Settings.
 * Checks in order of priority:
 * 1. publicSettings.whatsappSupport.phoneNumber
 * 2. publicSettings.seo.social.whatsapp
 * 3. publicSettings.store.phone
 * 
 * @param {Object} publicSettings - AppContext publicSettings
 * @returns {string} Clean numeric phone format (e.g. 254711245765)
 */
export const getAdminWhatsAppNumber = (publicSettings) => {
  const raw = publicSettings?.whatsappSupport?.phoneNumber
    || publicSettings?.seo?.social?.whatsapp
    || publicSettings?.store?.phone
    || '';

  if (!raw) return '254711245765';

  // If the admin saved a full wa.me link (e.g. https://wa.me/254711245765)
  if (raw.includes('wa.me/')) {
    const after = raw.split('wa.me/')[1]?.split('?')[0];
    const cleaned = after?.replace(/\D/g, '');
    if (cleaned && cleaned.length >= 9) return cleaned;
  }

  // Extract all digit characters
  let digits = raw.replace(/\D/g, '');
  if (!digits) return '254711245765';

  // Convert leading local Kenyan 0 (e.g. 0711245765 -> 254711245765)
  if (digits.startsWith('0') && digits.length === 10) {
    digits = '254' + digits.slice(1);
  } else if ((digits.startsWith('7') || digits.startsWith('1')) && digits.length === 9) {
    digits = '254' + digits;
  }

  return digits;
};

/**
 * Returns a formatted WhatsApp chat URL for customer inquiries with pre-filled message.
 * 
 * @param {Object} publicSettings - AppContext publicSettings
 * @param {string} message - Pre-filled message
 * @returns {string} Formatted WhatsApp URL
 */
export const getWhatsAppLink = (publicSettings, message = '') => {
  const phone = getAdminWhatsAppNumber(publicSettings);
  const text = encodeURIComponent(message || 'Hi Rerendet Coffee! I am browsing your online store and have a question.');
  return `https://wa.me/${phone}?text=${text}`;
};
