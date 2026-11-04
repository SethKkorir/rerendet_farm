// client/src/utils/countryList.js — Global Countries & Dialing Codes Directory
// Backed by /api/locations/countries (REST Countries API v5) with zero-latency offline fallback

export const COUNTRY_OBJECTS = [
  { name: 'Kenya', code: 'KE', dialCode: '+254', flag: '🇰🇪', priority: 1, region: 'Africa' },
  { name: 'Uganda', code: 'UG', dialCode: '+256', flag: '🇺🇬', priority: 2, region: 'Africa' },
  { name: 'Tanzania', code: 'TZ', dialCode: '+255', flag: '🇹🇿', priority: 3, region: 'Africa' },
  { name: 'Rwanda', code: 'RW', dialCode: '+250', flag: '🇷🇼', priority: 4, region: 'Africa' },
  { name: 'Burundi', code: 'BI', dialCode: '+257', flag: '🇧🇮', priority: 5, region: 'Africa' },
  { name: 'Ethiopia', code: 'ET', dialCode: '+251', flag: '🇪🇹', priority: 6, region: 'Africa' },
  { name: 'South Sudan', code: 'SS', dialCode: '+211', flag: '🇸🇸', priority: 7, region: 'Africa' },
  { name: 'Somalia', code: 'SO', dialCode: '+252', flag: '🇸🇴', priority: 8, region: 'Africa' },
  { name: 'United Arab Emirates', code: 'AE', dialCode: '+971', flag: '🇦🇪', priority: 9, region: 'Asia' },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44', flag: '🇬🇧', priority: 10, region: 'Europe' },
  { name: 'United States', code: 'US', dialCode: '+1', flag: '🇺🇸', priority: 11, region: 'Americas' },
  { name: 'Canada', code: 'CA', dialCode: '+1', flag: '🇨🇦', priority: 12, region: 'Americas' },
  { name: 'Australia', code: 'AU', dialCode: '+61', flag: '🇦🇺', priority: 13, region: 'Oceania' },
  { name: 'Germany', code: 'DE', dialCode: '+49', flag: '🇩🇪', priority: 14, region: 'Europe' },
  { name: 'France', code: 'FR', dialCode: '+33', flag: '🇫🇷', priority: 15, region: 'Europe' },
  { name: 'Netherlands', code: 'NL', dialCode: '+31', flag: '🇳🇱', priority: 16, region: 'Europe' },
  { name: 'South Africa', code: 'ZA', dialCode: '+27', flag: '🇿🇦', priority: 17, region: 'Africa' },
  { name: 'Nigeria', code: 'NG', dialCode: '+234', flag: '🇳🇬', priority: 18, region: 'Africa' },
  { name: 'Ghana', code: 'GH', dialCode: '+233', flag: '🇬🇭', priority: 19, region: 'Africa' },
  { name: 'Egypt', code: 'EG', dialCode: '+20', flag: '🇪🇬', priority: 20, region: 'Africa' },
  { name: 'Saudi Arabia', code: 'SA', dialCode: '+966', flag: '🇸🇦', priority: 21, region: 'Asia' },
  { name: 'Qatar', code: 'QA', dialCode: '+974', flag: '🇶🇦', priority: 22, region: 'Asia' },
  { name: 'Oman', code: 'OM', dialCode: '+968', flag: '🇴🇲', priority: 23, region: 'Asia' },
  { name: 'Bahrain', code: 'BH', dialCode: '+973', flag: '🇧🇭', priority: 24, region: 'Asia' },
  { name: 'Kuwait', code: 'KW', dialCode: '+965', flag: '🇰🇼', priority: 25, region: 'Asia' },
  { name: 'India', code: 'IN', dialCode: '+91', flag: '🇮🇳', priority: 26, region: 'Asia' },
  { name: 'China', code: 'CN', dialCode: '+86', flag: '🇨🇳', priority: 27, region: 'Asia' },
  { name: 'Japan', code: 'JP', dialCode: '+81', flag: '🇯🇵', priority: 28, region: 'Asia' },
  { name: 'Singapore', code: 'SG', dialCode: '+65', flag: '🇸🇬', priority: 29, region: 'Asia' },
  { name: 'Switzerland', code: 'CH', dialCode: '+41', flag: '🇨🇭', priority: 30, region: 'Europe' },
  { name: 'Sweden', code: 'SE', dialCode: '+46', flag: '🇸🇪', priority: 31, region: 'Europe' },
  { name: 'Norway', code: 'NO', dialCode: '+47', flag: '🇳🇴', priority: 32, region: 'Europe' },
  { name: 'Denmark', code: 'DK', dialCode: '+45', flag: '🇩🇰', priority: 33, region: 'Europe' },
  { name: 'Belgium', code: 'BE', dialCode: '+32', flag: '🇧🇪', priority: 34, region: 'Europe' },
  { name: 'Ireland', code: 'IE', dialCode: '+353', flag: '🇮🇪', priority: 35, region: 'Europe' },
  { name: 'Italy', code: 'IT', dialCode: '+39', flag: '🇮🇹', priority: 36, region: 'Europe' },
  { name: 'Spain', code: 'ES', dialCode: '+34', flag: '🇪🇸', priority: 37, region: 'Europe' },
  { name: 'Portugal', code: 'PT', dialCode: '+351', flag: '🇵🇹', priority: 38, region: 'Europe' },
  { name: 'Austria', code: 'AT', dialCode: '+43', flag: '🇦🇹', priority: 39, region: 'Europe' },
  { name: 'Poland', code: 'PL', dialCode: '+48', flag: '🇵🇱', priority: 40, region: 'Europe' },
  { name: 'Finland', code: 'FI', dialCode: '+358', flag: '🇫🇮', priority: 41, region: 'Europe' },
  { name: 'New Zealand', code: 'NZ', dialCode: '+64', flag: '🇳🇿', priority: 42, region: 'Oceania' },
  { name: 'Brazil', code: 'BR', dialCode: '+55', flag: '🇧🇷', priority: 43, region: 'Americas' },
  { name: 'Mexico', code: 'MX', dialCode: '+52', flag: '🇲🇽', priority: 44, region: 'Americas' },
  { name: 'Turkey', code: 'TR', dialCode: '+90', flag: '🇹🇷', priority: 45, region: 'Asia' },
  { name: 'Afghanistan', code: 'AF', dialCode: '+93', flag: '🇦🇫', region: 'Asia' },
  { name: 'Albania', code: 'AL', dialCode: '+355', flag: '🇦🇱', region: 'Europe' },
  { name: 'Algeria', code: 'DZ', dialCode: '+213', flag: '🇩🇿', region: 'Africa' },
  { name: 'Andorra', code: 'AD', dialCode: '+376', flag: '🇦🇩', region: 'Europe' },
  { name: 'Angola', code: 'AO', dialCode: '+244', flag: '🇦🇴', region: 'Africa' },
  { name: 'Argentina', code: 'AR', dialCode: '+54', flag: '🇦🇷', region: 'Americas' },
  { name: 'Armenia', code: 'AM', dialCode: '+374', flag: '🇦🇲', region: 'Asia' },
  { name: 'Azerbaijan', code: 'AZ', dialCode: '+994', flag: '🇦🇿', region: 'Asia' },
  { name: 'Bahamas', code: 'BS', dialCode: '+1242', flag: '🇧🇸', region: 'Americas' },
  { name: 'Bangladesh', code: 'BD', dialCode: '+880', flag: '🇧🇩', region: 'Asia' },
  { name: 'Barbados', code: 'BB', dialCode: '+1246', flag: '🇧🇧', region: 'Americas' },
  { name: 'Belarus', code: 'BY', dialCode: '+375', flag: '🇧🇾', region: 'Europe' },
  { name: 'Belgium', code: 'BE', dialCode: '+32', flag: '🇧🇪', region: 'Europe' },
  { name: 'Belize', code: 'BZ', dialCode: '+501', flag: '🇧🇿', region: 'Americas' },
  { name: 'Benin', code: 'BJ', dialCode: '+229', flag: '🇧🇯', region: 'Africa' },
  { name: 'Bhutan', code: 'BT', dialCode: '+975', flag: '🇧🇹', region: 'Asia' },
  { name: 'Bolivia', code: 'BO', dialCode: '+591', flag: '🇧🇴', region: 'Americas' },
  { name: 'Bosnia and Herzegovina', code: 'BA', dialCode: '+387', flag: '🇧🇦', region: 'Europe' },
  { name: 'Botswana', code: 'BW', dialCode: '+267', flag: '🇧🇼', region: 'Africa' },
  { name: 'Brunei', code: 'BN', dialCode: '+673', flag: '🇧🇳', region: 'Asia' },
  { name: 'Bulgaria', code: 'BG', dialCode: '+359', flag: '🇧🇬', region: 'Europe' },
  { name: 'Burkina Faso', code: 'BF', dialCode: '+226', flag: '🇧🇫', region: 'Africa' },
  { name: 'Cambodia', code: 'KH', dialCode: '+855', flag: '🇰🇭', region: 'Asia' },
  { name: 'Cameroon', code: 'CM', dialCode: '+237', flag: '🇨🇲', region: 'Africa' },
  { name: 'Chile', code: 'CL', dialCode: '+56', flag: '🇨🇱', region: 'Americas' },
  { name: 'Colombia', code: 'CO', dialCode: '+57', flag: '🇨🇴', region: 'Americas' },
  { name: 'Comoros', code: 'KM', dialCode: '+269', flag: '🇰🇲', region: 'Africa' },
  { name: 'Congo', code: 'CG', dialCode: '+242', flag: '🇨🇬', region: 'Africa' },
  { name: 'Democratic Republic of the Congo', code: 'CD', dialCode: '+243', flag: '🇨🇩', region: 'Africa' },
  { name: 'Costa Rica', code: 'CR', dialCode: '+506', flag: '🇨🇷', region: 'Americas' },
  { name: 'Croatia', code: 'HR', dialCode: '+385', flag: '🇭🇷', region: 'Europe' },
  { name: 'Cuba', code: 'CU', dialCode: '+53', flag: '🇨🇺', region: 'Americas' },
  { name: 'Cyprus', code: 'CY', dialCode: '+357', flag: '🇨🇾', region: 'Europe' },
  { name: 'Czech Republic', code: 'CZ', dialCode: '+420', flag: '🇨🇿', region: 'Europe' },
  { name: 'Djibouti', code: 'DJ', dialCode: '+253', flag: '🇩🇯', region: 'Africa' },
  { name: 'Dominican Republic', code: 'DO', dialCode: '+1809', flag: '🇩🇴', region: 'Americas' },
  { name: 'Ecuador', code: 'EC', dialCode: '+593', flag: '🇪🇨', region: 'Americas' },
  { name: 'El Salvador', code: 'SV', dialCode: '+503', flag: '🇸🇻', region: 'Americas' },
  { name: 'Estonia', code: 'EE', dialCode: '+372', flag: '🇪🇪', region: 'Europe' },
  { name: 'Fiji', code: 'FJ', dialCode: '+679', flag: '🇫🇯', region: 'Oceania' },
  { name: 'Gabon', code: 'GA', dialCode: '+241', flag: '🇬🇦', region: 'Africa' },
  { name: 'Gambia', code: 'GM', dialCode: '+220', flag: '🇬🇲', region: 'Africa' },
  { name: 'Georgia', code: 'GE', dialCode: '+995', flag: '🇬🇪', region: 'Asia' },
  { name: 'Greece', code: 'GR', dialCode: '+30', flag: '🇬🇷', region: 'Europe' },
  { name: 'Guatemala', code: 'GT', dialCode: '+502', flag: '🇬🇹', region: 'Americas' },
  { name: 'Guinea', code: 'GN', dialCode: '+224', flag: '🇬🇳', region: 'Africa' },
  { name: 'Guyana', code: 'GY', dialCode: '+592', flag: '🇬🇾', region: 'Americas' },
  { name: 'Haiti', code: 'HT', dialCode: '+509', flag: '🇭🇹', region: 'Americas' },
  { name: 'Honduras', code: 'HN', dialCode: '+504', flag: '🇭🇳', region: 'Americas' },
  { name: 'Hong Kong', code: 'HK', dialCode: '+852', flag: '🇭🇰', region: 'Asia' },
  { name: 'Hungary', code: 'HU', dialCode: '+36', flag: '🇭🇺', region: 'Europe' },
  { name: 'Iceland', code: 'IS', dialCode: '+354', flag: '🇮🇸', region: 'Europe' },
  { name: 'Indonesia', code: 'ID', dialCode: '+62', flag: '🇮🇩', region: 'Asia' },
  { name: 'Iran', code: 'IR', dialCode: '+98', flag: '🇮🇷', region: 'Asia' },
  { name: 'Iraq', code: 'IQ', dialCode: '+964', flag: '🇮🇶', region: 'Asia' },
  { name: 'Israel', code: 'IL', dialCode: '+972', flag: '🇮🇱', region: 'Asia' },
  { name: 'Jamaica', code: 'JM', dialCode: '+1876', flag: '🇯🇲', region: 'Americas' },
  { name: 'Jordan', code: 'JO', dialCode: '+962', flag: '🇯🇴', region: 'Asia' },
  { name: 'Kazakhstan', code: 'KZ', dialCode: '+7', flag: '🇰🇿', region: 'Asia' },
  { name: 'South Korea', code: 'KR', dialCode: '+82', flag: '🇰🇷', region: 'Asia' },
  { name: 'Lebanon', code: 'LB', dialCode: '+961', flag: '🇱🇧', region: 'Asia' },
  { name: 'Lesotho', code: 'LS', dialCode: '+266', flag: '🇱🇸', region: 'Africa' },
  { name: 'Liberia', code: 'LR', dialCode: '+231', flag: '🇱🇷', region: 'Africa' },
  { name: 'Libya', code: 'LY', dialCode: '+218', flag: '🇱🇾', region: 'Africa' },
  { name: 'Madagascar', code: 'MG', dialCode: '+261', flag: '🇲🇬', region: 'Africa' },
  { name: 'Malawi', code: 'MW', dialCode: '+265', flag: '🇲🇼', region: 'Africa' },
  { name: 'Malaysia', code: 'MY', dialCode: '+60', flag: '🇲🇾', region: 'Asia' },
  { name: 'Maldives', code: 'MV', dialCode: '+960', flag: '🇲🇻', region: 'Asia' },
  { name: 'Mali', code: 'ML', dialCode: '+223', flag: '🇲🇱', region: 'Africa' },
  { name: 'Malta', code: 'MT', dialCode: '+356', flag: '🇲🇹', region: 'Europe' },
  { name: 'Mauritania', code: 'MR', dialCode: '+222', flag: '🇲🇷', region: 'Africa' },
  { name: 'Mauritius', code: 'MU', dialCode: '+230', flag: '🇲🇺', region: 'Africa' },
  { name: 'Morocco', code: 'MA', dialCode: '+212', flag: '🇲🇦', region: 'Africa' },
  { name: 'Mozambique', code: 'MZ', dialCode: '+258', flag: '🇲🇿', region: 'Africa' },
  { name: 'Namibia', code: 'NA', dialCode: '+264', flag: '🇳🇦', region: 'Africa' },
  { name: 'Nepal', code: 'NP', dialCode: '+977', flag: '🇳🇵', region: 'Asia' },
  { name: 'Pakistan', code: 'PK', dialCode: '+92', flag: '🇵🇰', region: 'Asia' },
  { name: 'Panama', code: 'PA', dialCode: '+507', flag: '🇵🇦', region: 'Americas' },
  { name: 'Philippines', code: 'PH', dialCode: '+63', flag: '🇵🇭', region: 'Asia' },
  { name: 'Romania', code: 'RO', dialCode: '+40', flag: '🇷🇴', region: 'Europe' },
  { name: 'Senegal', code: 'SN', dialCode: '+221', flag: '🇸🇳', region: 'Africa' },
  { name: 'Seychelles', code: 'SC', dialCode: '+248', flag: '🇸🇨', region: 'Africa' },
  { name: 'Sierra Leone', code: 'SL', dialCode: '+232', flag: '🇸🇱', region: 'Africa' },
  { name: 'Sri Lanka', code: 'LK', dialCode: '+94', flag: '🇱🇰', region: 'Asia' },
  { name: 'Sudan', code: 'SD', dialCode: '+249', flag: '🇸🇩', region: 'Africa' },
  { name: 'Swaziland (Eswatini)', code: 'SZ', dialCode: '+268', flag: '🇸🇿', region: 'Africa' },
  { name: 'Thailand', code: 'TH', dialCode: '+66', flag: '🇹🇭', region: 'Asia' },
  { name: 'Tunisia', code: 'TN', dialCode: '+216', flag: '🇹🇳', region: 'Africa' },
  { name: 'Ukraine', code: 'UA', dialCode: '+380', flag: '🇺🇦', region: 'Europe' },
  { name: 'Vietnam', code: 'VN', dialCode: '+84', flag: '🇻🇳', region: 'Asia' },
  { name: 'Zambia', code: 'ZM', dialCode: '+260', flag: '🇿🇲', region: 'Africa' },
  { name: 'Zimbabwe', code: 'ZW', dialCode: '+263', flag: '🇿🇼', region: 'Africa' }
];

// Flat array of country names for backward compatibility
export const COUNTRY_LIST = COUNTRY_OBJECTS.map(c => c.name);

// Find country object by Name or ISO Code
export const getCountryDetails = (identifier) => {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();
  return COUNTRY_OBJECTS.find(
    c => c.name.toLowerCase() === clean || c.code.toLowerCase() === clean
  ) || null;
};

// Get dial code for a country (e.g. Kenya -> '+254')
export const getDialCode = (identifier) => {
  const c = getCountryDetails(identifier);
  return c?.dialCode || '+254';
};

// Get flag emoji for a country (e.g. Kenya -> '🇰🇪')
export const getFlag = (identifier) => {
  const c = getCountryDetails(identifier);
  return c?.flag || '🌐';
};

// Asynchronously fetch fresh country dataset from our unified location API
export const fetchGlobalCountries = async () => {
  try {
    const res = await fetch('/api/locations/countries');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        return data.data;
      }
    }
  } catch (err) {
    console.warn('[Location] Failed to load remote countries, using offline dataset:', err.message);
  }
  return COUNTRY_OBJECTS;
};

export default COUNTRY_LIST;
