// utils/globalLocationsData.js — Comprehensive Global Countries & Subdivisions Data
// Backed by REST Countries API v5 with zero-latency in-memory cache and offline fallback

import { KENYA_LOCATIONS } from './kenyaLocations.js';

// Top international & regional subdivisions (States / Provinces / Counties / Regions)
export const SUBDIVISIONS = {
  'KE': {
    type: 'County',
    divisions: Object.keys(KENYA_LOCATIONS).sort(),
    townsByDivision: KENYA_LOCATIONS
  },
  'UG': {
    type: 'District / Region',
    divisions: [
      'Kampala', 'Wakiso', 'Mukono', 'Jinja', 'Entebbe', 'Mbarara', 'Gulu', 
      'Masaka', 'Mbale', 'Arua', 'Kasese', 'Fort Portal', 'Kabale', 'Soroti', 'Tororo', 'Lira'
    ].sort()
  },
  'TZ': {
    type: 'Region',
    divisions: [
      'Dar es Salaam', 'Arusha', 'Dodoma', 'Mwanza', 'Kilimanjaro (Moshi)', 'Zanzibar Urban/West',
      'Tanga', 'Morogoro', 'Mbeya', 'Pwani', 'Iringa', 'Kagera', 'Kigoma', 'Mara', 'Tabora'
    ].sort()
  },
  'RW': {
    type: 'Province / City',
    divisions: [
      'Kigali City', 'Northern Province (Musanze)', 'Southern Province (Huye)', 
      'Eastern Province (Rwamagana)', 'Western Province (Rubavu)'
    ].sort()
  },
  'US': {
    type: 'State',
    divisions: [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
      'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
      'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
      'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
      'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
      'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
      'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
      'Wisconsin', 'Wyoming', 'District of Columbia'
    ].sort()
  },
  'GB': {
    type: 'County / Region',
    divisions: [
      'Greater London', 'Greater Manchester', 'West Midlands (Birmingham)', 'West Yorkshire (Leeds)',
      'Merseyside (Liverpool)', 'South Yorkshire (Sheffield)', 'Tyne and Wear (Newcastle)',
      'Surrey', 'Kent', 'Essex', 'Hampshire', 'Berkshire', 'Oxfordshire', 'Cambridgeshire',
      'Bristol', 'Edinburgh (Scotland)', 'Glasgow (Scotland)', 'Cardiff (Wales)', 'Belfast (Northern Ireland)'
    ].sort()
  },
  'CA': {
    type: 'Province / Territory',
    divisions: [
      'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
      'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island',
      'Quebec', 'Saskatchewan', 'Yukon'
    ].sort()
  },
  'AE': {
    type: 'Emirate',
    divisions: [
      'Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'
    ].sort()
  },
  'ZA': {
    type: 'Province',
    divisions: [
      'Gauteng (Johannesburg/Pretoria)', 'Western Cape (Cape Town)', 'KwaZulu-Natal (Durban)',
      'Eastern Cape', 'Free State', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape'
    ].sort()
  },
  'NG': {
    type: 'State',
    divisions: [
      'Lagos', 'Federal Capital Territory (Abuja)', 'Rivers (Port Harcourt)', 'Kano', 'Oyo (Ibadan)',
      'Kaduna', 'Ogun', 'Delta', 'Enugu', 'Anambra', 'Edo', 'Akwa Ibom'
    ].sort()
  },
  'AU': {
    type: 'State / Territory',
    divisions: [
      'New South Wales (Sydney)', 'Victoria (Melbourne)', 'Queensland (Brisbane)',
      'Western Australia (Perth)', 'South Australia (Adelaide)', 'Tasmania (Hobart)',
      'Australian Capital Territory (Canberra)', 'Northern Territory (Darwin)'
    ].sort()
  },
  'DE': {
    type: 'State (Bundesland)',
    divisions: [
      'Baden-Württemberg', 'Bavaria (Bayern)', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg',
      'Hesse (Hessen)', 'Lower Saxony (Niedersachsen)', 'Mecklenburg-Vorpommern',
      'North Rhine-Westphalia (Nordrhein-Westfalen)', 'Rhineland-Palatinate', 'Saarland',
      'Saxony (Sachsen)', 'Saxony-Anhalt', 'Schleswig-Holstein', 'Thuringia'
    ].sort()
  }
};

// Comprehensive list of countries with dialing codes, flags, currencies, and ISO codes
export const BASE_COUNTRIES = [
  { name: 'Kenya', code: 'KE', code3: 'KEN', dialCode: '+254', flag: '🇰🇪', currency: 'KES', priority: 1, region: 'Africa' },
  { name: 'Uganda', code: 'UG', code3: 'UGA', dialCode: '+256', flag: '🇺🇬', currency: 'UGX', priority: 2, region: 'Africa' },
  { name: 'Tanzania', code: 'TZ', code3: 'TZA', dialCode: '+255', flag: '🇹🇿', currency: 'TZS', priority: 3, region: 'Africa' },
  { name: 'Rwanda', code: 'RW', code3: 'RWA', dialCode: '+250', flag: '🇷🇼', currency: 'RWF', priority: 4, region: 'Africa' },
  { name: 'Burundi', code: 'BI', code3: 'BDI', dialCode: '+257', flag: '🇧🇮', currency: 'BIF', priority: 5, region: 'Africa' },
  { name: 'Ethiopia', code: 'ET', code3: 'ETH', dialCode: '+251', flag: '🇪🇹', currency: 'ETB', priority: 6, region: 'Africa' },
  { name: 'South Sudan', code: 'SS', code3: 'SSD', dialCode: '+211', flag: '🇸🇸', currency: 'SSP', priority: 7, region: 'Africa' },
  { name: 'Somalia', code: 'SO', code3: 'SOM', dialCode: '+252', flag: '🇸🇴', currency: 'SOS', priority: 8, region: 'Africa' },
  { name: 'United Arab Emirates', code: 'AE', code3: 'ARE', dialCode: '+971', flag: '🇦🇪', currency: 'AED', priority: 9, region: 'Asia' },
  { name: 'United Kingdom', code: 'GB', code3: 'GBR', dialCode: '+44', flag: '🇬🇧', currency: 'GBP', priority: 10, region: 'Europe' },
  { name: 'United States', code: 'US', code3: 'USA', dialCode: '+1', flag: '🇺🇸', currency: 'USD', priority: 11, region: 'Americas' },
  { name: 'Canada', code: 'CA', code3: 'CAN', dialCode: '+1', flag: '🇨🇦', currency: 'CAD', priority: 12, region: 'Americas' },
  { name: 'Australia', code: 'AU', code3: 'AUS', dialCode: '+61', flag: '🇦🇺', currency: 'AUD', priority: 13, region: 'Oceania' },
  { name: 'Germany', code: 'DE', code3: 'DEU', dialCode: '+49', flag: '🇩🇪', currency: 'EUR', priority: 14, region: 'Europe' },
  { name: 'France', code: 'FR', code3: 'FRA', dialCode: '+33', flag: '🇫🇷', currency: 'EUR', priority: 15, region: 'Europe' },
  { name: 'Netherlands', code: 'NL', code3: 'NLD', dialCode: '+31', flag: '🇳🇱', currency: 'EUR', priority: 16, region: 'Europe' },
  { name: 'South Africa', code: 'ZA', code3: 'ZAF', dialCode: '+27', flag: '🇿🇦', currency: 'ZAR', priority: 17, region: 'Africa' },
  { name: 'Nigeria', code: 'NG', code3: 'NGA', dialCode: '+234', flag: '🇳🇬', currency: 'NGN', priority: 18, region: 'Africa' },
  { name: 'Ghana', code: 'GH', code3: 'GHA', dialCode: '+233', flag: '🇬🇭', currency: 'GHS', priority: 19, region: 'Africa' },
  { name: 'Egypt', code: 'EG', code3: 'EGY', dialCode: '+20', flag: '🇪🇬', currency: 'EGP', priority: 20, region: 'Africa' },
  { name: 'Saudi Arabia', code: 'SA', code3: 'SAU', dialCode: '+966', flag: '🇸🇦', currency: 'SAR', priority: 21, region: 'Asia' },
  { name: 'Qatar', code: 'QA', code3: 'QAT', dialCode: '+974', flag: '🇶🇦', currency: 'QAR', priority: 22, region: 'Asia' },
  { name: 'Oman', code: 'OM', code3: 'OMN', dialCode: '+968', flag: '🇴🇲', currency: 'OMR', priority: 23, region: 'Asia' },
  { name: 'Bahrain', code: 'BH', code3: 'BHR', dialCode: '+973', flag: '🇧🇭', currency: 'BHD', priority: 24, region: 'Asia' },
  { name: 'Kuwait', code: 'KW', code3: 'KWT', dialCode: '+965', flag: '🇰🇼', currency: 'KWD', priority: 25, region: 'Asia' },
  { name: 'India', code: 'IN', code3: 'IND', dialCode: '+91', flag: '🇮🇳', currency: 'INR', priority: 26, region: 'Asia' },
  { name: 'China', code: 'CN', code3: 'CHN', dialCode: '+86', flag: '🇨🇳', currency: 'CNY', priority: 27, region: 'Asia' },
  { name: 'Japan', code: 'JP', code3: 'JPN', dialCode: '+81', flag: '🇯🇵', currency: 'JPY', priority: 28, region: 'Asia' },
  { name: 'Singapore', code: 'SG', code3: 'SGP', dialCode: '+65', flag: '🇸🇬', currency: 'SGD', priority: 29, region: 'Asia' },
  { name: 'Switzerland', code: 'CH', code3: 'CHE', dialCode: '+41', flag: '🇨🇭', currency: 'CHF', priority: 30, region: 'Europe' },
  { name: 'Sweden', code: 'SE', code3: 'SWE', dialCode: '+46', flag: '🇸🇪', currency: 'SEK', priority: 31, region: 'Europe' },
  { name: 'Norway', code: 'NO', code3: 'NOR', dialCode: '+47', flag: '🇳🇴', currency: 'NOK', priority: 32, region: 'Europe' },
  { name: 'Denmark', code: 'DK', code3: 'DNK', dialCode: '+45', flag: '🇩🇰', currency: 'DKK', priority: 33, region: 'Europe' },
  { name: 'Belgium', code: 'BE', code3: 'BEL', dialCode: '+32', flag: '🇧🇪', currency: 'EUR', priority: 34, region: 'Europe' },
  { name: 'Ireland', code: 'IE', code3: 'IRL', dialCode: '+353', flag: '🇮🇪', currency: 'EUR', priority: 35, region: 'Europe' },
  { name: 'Italy', code: 'IT', code3: 'ITA', dialCode: '+39', flag: '🇮🇹', currency: 'EUR', priority: 36, region: 'Europe' },
  { name: 'Spain', code: 'ES', code3: 'ESP', dialCode: '+34', flag: '🇪🇸', currency: 'EUR', priority: 37, region: 'Europe' },
  { name: 'Portugal', code: 'PT', code3: 'PRT', dialCode: '+351', flag: '🇵🇹', currency: 'EUR', priority: 38, region: 'Europe' },
  { name: 'Austria', code: 'AT', code3: 'AUT', dialCode: '+43', flag: '🇦🇹', currency: 'EUR', priority: 39, region: 'Europe' },
  { name: 'Poland', code: 'PL', code3: 'POL', dialCode: '+48', flag: '🇵🇱', currency: 'PLN', priority: 40, region: 'Europe' },
  { name: 'Finland', code: 'FI', code3: 'FIN', dialCode: '+358', flag: '🇫🇮', currency: 'EUR', priority: 41, region: 'Europe' },
  { name: 'New Zealand', code: 'NZ', code3: 'NZL', dialCode: '+64', flag: '🇳🇿', currency: 'NZD', priority: 42, region: 'Oceania' },
  { name: 'Brazil', code: 'BR', code3: 'BRA', dialCode: '+55', flag: '🇧🇷', currency: 'BRL', priority: 43, region: 'Americas' },
  { name: 'Mexico', code: 'MX', code3: 'MEX', dialCode: '+52', flag: '🇲🇽', currency: 'MXN', priority: 44, region: 'Americas' },
  { name: 'Turkey', code: 'TR', code3: 'TUR', dialCode: '+90', flag: '🇹🇷', currency: 'TRY', priority: 45, region: 'Asia' },
  { name: 'Afghanistan', code: 'AF', code3: 'AFG', dialCode: '+93', flag: '🇦🇫', region: 'Asia' },
  { name: 'Albania', code: 'AL', code3: 'ALB', dialCode: '+355', flag: '🇦🇱', region: 'Europe' },
  { name: 'Algeria', code: 'DZ', code3: 'DZA', dialCode: '+213', flag: '🇩🇿', region: 'Africa' },
  { name: 'Andorra', code: 'AD', code3: 'AND', dialCode: '+376', flag: '🇦🇩', region: 'Europe' },
  { name: 'Angola', code: 'AO', code3: 'AGO', dialCode: '+244', flag: '🇦🇴', region: 'Africa' },
  { name: 'Argentina', code: 'AR', code3: 'ARG', dialCode: '+54', flag: '🇦🇷', region: 'Americas' },
  { name: 'Armenia', code: 'AM', code3: 'ARM', dialCode: '+374', flag: '🇦🇲', region: 'Asia' },
  { name: 'Azerbaijan', code: 'AZ', code3: 'AZE', dialCode: '+994', flag: '🇦🇿', region: 'Asia' },
  { name: 'Bahamas', code: 'BS', code3: 'BHS', dialCode: '+1242', flag: '🇧🇸', region: 'Americas' },
  { name: 'Bangladesh', code: 'BD', code3: 'BGD', dialCode: '+880', flag: '🇧🇩', region: 'Asia' },
  { name: 'Barbados', code: 'BB', code3: 'BRB', dialCode: '+1246', flag: '🇧🇧', region: 'Americas' },
  { name: 'Belarus', code: 'BY', code3: 'BLR', dialCode: '+375', flag: '🇧🇾', region: 'Europe' },
  { name: 'Belize', code: 'BZ', code3: 'BLZ', dialCode: '+501', flag: '🇧🇿', region: 'Americas' },
  { name: 'Benin', code: 'BJ', code3: 'BEN', dialCode: '+229', flag: '🇧🇯', region: 'Africa' },
  { name: 'Bhutan', code: 'BT', code3: 'BTN', dialCode: '+975', flag: '🇧🇹', region: 'Asia' },
  { name: 'Bolivia', code: 'BO', code3: 'BOL', dialCode: '+591', flag: '🇧🇴', region: 'Americas' },
  { name: 'Bosnia and Herzegovina', code: 'BA', code3: 'BIH', dialCode: '+387', flag: '🇧🇦', region: 'Europe' },
  { name: 'Botswana', code: 'BW', code3: 'BWA', dialCode: '+267', flag: '🇧🇼', region: 'Africa' },
  { name: 'Brunei', code: 'BN', code3: 'BRN', dialCode: '+673', flag: '🇧🇳', region: 'Asia' },
  { name: 'Bulgaria', code: 'BG', code3: 'BGR', dialCode: '+359', flag: '🇧🇬', region: 'Europe' },
  { name: 'Burkina Faso', code: 'BF', code3: 'BFA', dialCode: '+226', flag: '🇧🇫', region: 'Africa' },
  { name: 'Cambodia', code: 'KH', code3: 'KHM', dialCode: '+855', flag: '🇰🇭', region: 'Asia' },
  { name: 'Cameroon', code: 'CM', code3: 'CMR', dialCode: '+237', flag: '🇨🇲', region: 'Africa' },
  { name: 'Chile', code: 'CL', code3: 'CHL', dialCode: '+56', flag: '🇨🇱', region: 'Americas' },
  { name: 'Colombia', code: 'CO', code3: 'COL', dialCode: '+57', flag: '🇨🇴', region: 'Americas' },
  { name: 'Comoros', code: 'KM', code3: 'COM', dialCode: '+269', flag: '🇰🇲', region: 'Africa' },
  { name: 'Congo', code: 'CG', code3: 'COG', dialCode: '+242', flag: '🇨🇬', region: 'Africa' },
  { name: 'Democratic Republic of the Congo', code: 'CD', code3: 'COD', dialCode: '+243', flag: '🇨🇩', region: 'Africa' },
  { name: 'Costa Rica', code: 'CR', code3: 'CRI', dialCode: '+506', flag: '🇨🇷', region: 'Americas' },
  { name: 'Croatia', code: 'HR', code3: 'HRV', dialCode: '+385', flag: '🇭🇷', region: 'Europe' },
  { name: 'Cuba', code: 'CU', code3: 'CUB', dialCode: '+53', flag: '🇨🇺', region: 'Americas' },
  { name: 'Cyprus', code: 'CY', code3: 'CYP', dialCode: '+357', flag: '🇨🇾', region: 'Europe' },
  { name: 'Czech Republic', code: 'CZ', code3: 'CZE', dialCode: '+420', flag: '🇨🇿', region: 'Europe' },
  { name: 'Djibouti', code: 'DJ', code3: 'DJI', dialCode: '+253', flag: '🇩🇯', region: 'Africa' },
  { name: 'Dominican Republic', code: 'DO', code3: 'DOM', dialCode: '+1809', flag: '🇩🇴', region: 'Americas' },
  { name: 'Ecuador', code: 'EC', code3: 'ECU', dialCode: '+593', flag: '🇪🇨', region: 'Americas' },
  { name: 'El Salvador', code: 'SV', code3: 'SLV', dialCode: '+503', flag: '🇸🇻', region: 'Americas' },
  { name: 'Estonia', code: 'EE', code3: 'EST', dialCode: '+372', flag: '🇪🇪', region: 'Europe' },
  { name: 'Fiji', code: 'FJ', code3: 'FJI', dialCode: '+679', flag: '🇫🇯', region: 'Oceania' },
  { name: 'Gabon', code: 'GA', code3: 'GAB', dialCode: '+241', flag: '🇬🇦', region: 'Africa' },
  { name: 'Gambia', code: 'GM', code3: 'GMB', dialCode: '+220', flag: '🇬🇲', region: 'Africa' },
  { name: 'Georgia', code: 'GE', code3: 'GEO', dialCode: '+995', flag: '🇬🇪', region: 'Asia' },
  { name: 'Greece', code: 'GR', code3: 'GRC', dialCode: '+30', flag: '🇬🇷', region: 'Europe' },
  { name: 'Guatemala', code: 'GT', code3: 'GTM', dialCode: '+502', flag: '🇬🇹', region: 'Americas' },
  { name: 'Guinea', code: 'GN', code3: 'GIN', dialCode: '+224', flag: '🇬🇳', region: 'Africa' },
  { name: 'Guyana', code: 'GY', code3: 'GUY', dialCode: '+592', flag: '🇬🇾', region: 'Americas' },
  { name: 'Haiti', code: 'HT', code3: 'HTI', dialCode: '+509', flag: '🇭🇹', region: 'Americas' },
  { name: 'Honduras', code: 'HN', code3: 'HND', dialCode: '+504', flag: '🇭🇳', region: 'Americas' },
  { name: 'Hong Kong', code: 'HK', code3: 'HKG', dialCode: '+852', flag: '🇭🇰', region: 'Asia' },
  { name: 'Hungary', code: 'HU', code3: 'HUN', dialCode: '+36', flag: '🇭🇺', region: 'Europe' },
  { name: 'Iceland', code: 'IS', code3: 'ISL', dialCode: '+354', flag: '🇮🇸', region: 'Europe' },
  { name: 'Indonesia', code: 'ID', code3: 'IDN', dialCode: '+62', flag: '🇮🇩', region: 'Asia' },
  { name: 'Iran', code: 'IR', code3: 'IRN', dialCode: '+98', flag: '🇮🇷', region: 'Asia' },
  { name: 'Iraq', code: 'IQ', code3: 'IRQ', dialCode: '+964', flag: '🇮🇶', region: 'Asia' },
  { name: 'Israel', code: 'IL', code3: 'ISR', dialCode: '+972', flag: '🇮🇱', region: 'Asia' },
  { name: 'Jamaica', code: 'JM', code3: 'JAM', dialCode: '+1876', flag: '🇯🇲', region: 'Americas' },
  { name: 'Jordan', code: 'JO', code3: 'JOR', dialCode: '+962', flag: '🇯🇴', region: 'Asia' },
  { name: 'Kazakhstan', code: 'KZ', code3: 'KAZ', dialCode: '+7', flag: '🇰🇿', region: 'Asia' },
  { name: 'South Korea', code: 'KR', code3: 'KOR', dialCode: '+82', flag: '🇰🇷', region: 'Asia' },
  { name: 'Lebanon', code: 'LB', code3: 'LBN', dialCode: '+961', flag: '🇱🇧', region: 'Asia' },
  { name: 'Lesotho', code: 'LS', code3: 'LSO', dialCode: '+266', flag: '🇱🇸', region: 'Africa' },
  { name: 'Liberia', code: 'LR', code3: 'LBR', dialCode: '+231', flag: '🇱🇷', region: 'Africa' },
  { name: 'Libya', code: 'LY', code3: 'LBY', dialCode: '+218', flag: '🇱🇾', region: 'Africa' },
  { name: 'Madagascar', code: 'MG', code3: 'MDG', dialCode: '+261', flag: '🇲🇬', region: 'Africa' },
  { name: 'Malawi', code: 'MW', code3: 'MWI', dialCode: '+265', flag: '🇲🇼', region: 'Africa' },
  { name: 'Malaysia', code: 'MY', code3: 'MYS', dialCode: '+60', flag: '🇲🇾', region: 'Asia' },
  { name: 'Maldives', code: 'MV', code3: 'MDV', dialCode: '+960', flag: '🇲🇻', region: 'Asia' },
  { name: 'Mali', code: 'ML', code3: 'MLI', dialCode: '+223', flag: '🇲🇱', region: 'Africa' },
  { name: 'Malta', code: 'MT', code3: 'MLT', dialCode: '+356', flag: '🇲🇹', region: 'Europe' },
  { name: 'Mauritania', code: 'MR', code3: 'MRT', dialCode: '+222', flag: '🇲🇷', region: 'Africa' },
  { name: 'Mauritius', code: 'MU', code3: 'MUS', dialCode: '+230', flag: '🇲🇺', region: 'Africa' },
  { name: 'Morocco', code: 'MA', code3: 'MAR', dialCode: '+212', flag: '🇲🇦', region: 'Africa' },
  { name: 'Mozambique', code: 'MZ', code3: 'MOZ', dialCode: '+258', flag: '🇲🇿', region: 'Africa' },
  { name: 'Namibia', code: 'NA', code3: 'NAM', dialCode: '+264', flag: '🇳🇦', region: 'Africa' },
  { name: 'Nepal', code: 'NP', code3: 'NPL', dialCode: '+977', flag: '🇳🇵', region: 'Asia' },
  { name: 'Pakistan', code: 'PK', code3: 'PAK', dialCode: '+92', flag: '🇵🇰', region: 'Asia' },
  { name: 'Panama', code: 'PA', code3: 'PAN', dialCode: '+507', flag: '🇵🇦', region: 'Americas' },
  { name: 'Philippines', code: 'PH', code3: 'PHL', dialCode: '+63', flag: '🇵🇭', region: 'Asia' },
  { name: 'Romania', code: 'RO', code3: 'ROU', dialCode: '+40', flag: '🇷🇴', region: 'Europe' },
  { name: 'Senegal', code: 'SN', code3: 'SEN', dialCode: '+221', flag: '🇸🇳', region: 'Africa' },
  { name: 'Seychelles', code: 'SC', code3: 'SYC', dialCode: '+248', flag: '🇸🇨', region: 'Africa' },
  { name: 'Sierra Leone', code: 'SL', code3: 'SLE', dialCode: '+232', flag: '🇸🇱', region: 'Africa' },
  { name: 'Sri Lanka', code: 'LK', code3: 'LKA', dialCode: '+94', flag: '🇱🇰', region: 'Asia' },
  { name: 'Sudan', code: 'SD', code3: 'SDN', dialCode: '+249', flag: '🇸🇩', region: 'Africa' },
  { name: 'Swaziland (Eswatini)', code: 'SZ', code3: 'SWZ', dialCode: '+268', flag: '🇸🇿', region: 'Africa' },
  { name: 'Thailand', code: 'TH', code3: 'THA', dialCode: '+66', flag: '🇹🇭', region: 'Asia' },
  { name: 'Tunisia', code: 'TN', code3: 'TUN', dialCode: '+216', flag: '🇹🇳', region: 'Africa' },
  { name: 'Ukraine', code: 'UA', code3: 'UKR', dialCode: '+380', flag: '🇺🇦', region: 'Europe' },
  { name: 'Vietnam', code: 'VN', code3: 'VNM', dialCode: '+84', flag: '🇻🇳', region: 'Asia' },
  { name: 'Zambia', code: 'ZM', code3: 'ZMB', dialCode: '+260', flag: '🇿🇲', region: 'Africa' },
  { name: 'Zimbabwe', code: 'ZW', code3: 'ZWE', dialCode: '+263', flag: '🇿🇼', region: 'Africa' }
];

// Helper to convert 2-letter country code to flag emoji
export function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
