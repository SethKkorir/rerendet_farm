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
  {
    "name": "Kenya",
    "code": "KE",
    "code3": "KEN",
    "dialCode": "+254",
    "flag": "🇰🇪",
    "currency": "KES",
    "region": "Africa",
    "priority": 1
  },
  {
    "name": "Uganda",
    "code": "UG",
    "code3": "UGA",
    "dialCode": "+256",
    "flag": "🇺🇬",
    "currency": "UGX",
    "region": "Africa",
    "priority": 2
  },
  {
    "name": "Tanzania",
    "code": "TZ",
    "code3": "TZA",
    "dialCode": "+255",
    "flag": "🇹🇿",
    "currency": "TZS",
    "region": "Africa",
    "priority": 3
  },
  {
    "name": "Rwanda",
    "code": "RW",
    "code3": "RWA",
    "dialCode": "+250",
    "flag": "🇷🇼",
    "currency": "RWF",
    "region": "Africa",
    "priority": 4
  },
  {
    "name": "Burundi",
    "code": "BI",
    "code3": "BDI",
    "dialCode": "+257",
    "flag": "🇧🇮",
    "currency": "BIF",
    "region": "Africa",
    "priority": 5
  },
  {
    "name": "Ethiopia",
    "code": "ET",
    "code3": "ETH",
    "dialCode": "+251",
    "flag": "🇪🇹",
    "currency": "ETB",
    "region": "Africa",
    "priority": 6
  },
  {
    "name": "South Sudan",
    "code": "SS",
    "code3": "SSD",
    "dialCode": "+211",
    "flag": "🇸🇸",
    "currency": "SSP",
    "region": "Africa",
    "priority": 7
  },
  {
    "name": "Somalia",
    "code": "SO",
    "code3": "SOM",
    "dialCode": "+252",
    "flag": "🇸🇴",
    "currency": "SOS",
    "region": "Africa",
    "priority": 8
  },
  {
    "name": "United Arab Emirates",
    "code": "AE",
    "code3": "ARE",
    "dialCode": "+971",
    "flag": "🇦🇪",
    "currency": "AED",
    "region": "Asia",
    "priority": 9
  },
  {
    "name": "United Kingdom",
    "code": "GB",
    "code3": "GBR",
    "dialCode": "+44",
    "flag": "🇬🇧",
    "currency": "GBP",
    "region": "Europe",
    "priority": 10
  },
  {
    "name": "United States",
    "code": "US",
    "code3": "USA",
    "dialCode": "+1",
    "flag": "🇺🇸",
    "currency": "USD",
    "region": "Americas",
    "priority": 11
  },
  {
    "name": "Canada",
    "code": "CA",
    "code3": "CAN",
    "dialCode": "+1",
    "flag": "🇨🇦",
    "currency": "CAD",
    "region": "Americas",
    "priority": 12
  },
  {
    "name": "Australia",
    "code": "AU",
    "code3": "AUS",
    "dialCode": "+61",
    "flag": "🇦🇺",
    "currency": "AUD",
    "region": "Oceania",
    "priority": 13
  },
  {
    "name": "Germany",
    "code": "DE",
    "code3": "DEU",
    "dialCode": "+49",
    "flag": "🇩🇪",
    "currency": "EUR",
    "region": "Europe",
    "priority": 14
  },
  {
    "name": "France",
    "code": "FR",
    "code3": "FRA",
    "dialCode": "+33",
    "flag": "🇫🇷",
    "currency": "EUR",
    "region": "Europe",
    "priority": 15
  },
  {
    "name": "Netherlands",
    "code": "NL",
    "code3": "NLD",
    "dialCode": "+31",
    "flag": "🇳🇱",
    "currency": "EUR",
    "region": "Europe",
    "priority": 16
  },
  {
    "name": "South Africa",
    "code": "ZA",
    "code3": "ZAF",
    "dialCode": "+27",
    "flag": "🇿🇦",
    "currency": "ZAR",
    "region": "Africa",
    "priority": 17
  },
  {
    "name": "Nigeria",
    "code": "NG",
    "code3": "NGA",
    "dialCode": "+234",
    "flag": "🇳🇬",
    "currency": "NGN",
    "region": "Africa",
    "priority": 18
  },
  {
    "name": "Ghana",
    "code": "GH",
    "code3": "GHA",
    "dialCode": "+233",
    "flag": "🇬🇭",
    "currency": "GHS",
    "region": "Africa",
    "priority": 19
  },
  {
    "name": "Egypt",
    "code": "EG",
    "code3": "EGY",
    "dialCode": "+20",
    "flag": "🇪🇬",
    "currency": "EGP",
    "region": "Africa",
    "priority": 20
  },
  {
    "name": "Saudi Arabia",
    "code": "SA",
    "code3": "SAU",
    "dialCode": "+966",
    "flag": "🇸🇦",
    "currency": "SAR",
    "region": "Asia",
    "priority": 21
  },
  {
    "name": "Qatar",
    "code": "QA",
    "code3": "QAT",
    "dialCode": "+974",
    "flag": "🇶🇦",
    "currency": "QAR",
    "region": "Asia",
    "priority": 22
  },
  {
    "name": "Oman",
    "code": "OM",
    "code3": "OMN",
    "dialCode": "+968",
    "flag": "🇴🇲",
    "currency": "OMR",
    "region": "Asia",
    "priority": 23
  },
  {
    "name": "Bahrain",
    "code": "BH",
    "code3": "BHR",
    "dialCode": "+973",
    "flag": "🇧🇭",
    "currency": "BHD",
    "region": "Asia",
    "priority": 24
  },
  {
    "name": "Kuwait",
    "code": "KW",
    "code3": "KWT",
    "dialCode": "+965",
    "flag": "🇰🇼",
    "currency": "KWD",
    "region": "Asia",
    "priority": 25
  },
  {
    "name": "India",
    "code": "IN",
    "code3": "IND",
    "dialCode": "+91",
    "flag": "🇮🇳",
    "currency": "INR",
    "region": "Asia",
    "priority": 26
  },
  {
    "name": "China",
    "code": "CN",
    "code3": "CHN",
    "dialCode": "+86",
    "flag": "🇨🇳",
    "currency": "CNY",
    "region": "Asia",
    "priority": 27
  },
  {
    "name": "Japan",
    "code": "JP",
    "code3": "JPN",
    "dialCode": "+81",
    "flag": "🇯🇵",
    "currency": "JPY",
    "region": "Asia",
    "priority": 28
  },
  {
    "name": "Singapore",
    "code": "SG",
    "code3": "SGP",
    "dialCode": "+65",
    "flag": "🇸🇬",
    "currency": "SGD",
    "region": "Asia",
    "priority": 29
  },
  {
    "name": "Switzerland",
    "code": "CH",
    "code3": "CHE",
    "dialCode": "+41",
    "flag": "🇨🇭",
    "currency": "CHF",
    "region": "Europe",
    "priority": 30
  },
  {
    "name": "Sweden",
    "code": "SE",
    "code3": "SWE",
    "dialCode": "+46",
    "flag": "🇸🇪",
    "currency": "SEK",
    "region": "Europe",
    "priority": 31
  },
  {
    "name": "Norway",
    "code": "NO",
    "code3": "NOR",
    "dialCode": "+47",
    "flag": "🇳🇴",
    "currency": "NOK",
    "region": "Europe",
    "priority": 32
  },
  {
    "name": "Denmark",
    "code": "DK",
    "code3": "DNK",
    "dialCode": "+45",
    "flag": "🇩🇰",
    "currency": "DKK",
    "region": "Europe",
    "priority": 33
  },
  {
    "name": "Belgium",
    "code": "BE",
    "code3": "BEL",
    "dialCode": "+32",
    "flag": "🇧🇪",
    "currency": "EUR",
    "region": "Europe",
    "priority": 34
  },
  {
    "name": "Ireland",
    "code": "IE",
    "code3": "IRL",
    "dialCode": "+353",
    "flag": "🇮🇪",
    "currency": "EUR",
    "region": "Europe",
    "priority": 35
  },
  {
    "name": "Italy",
    "code": "IT",
    "code3": "ITA",
    "dialCode": "+39",
    "flag": "🇮🇹",
    "currency": "EUR",
    "region": "Europe",
    "priority": 36
  },
  {
    "name": "Spain",
    "code": "ES",
    "code3": "ESP",
    "dialCode": "+34",
    "flag": "🇪🇸",
    "currency": "EUR",
    "region": "Europe",
    "priority": 37
  },
  {
    "name": "Portugal",
    "code": "PT",
    "code3": "PRT",
    "dialCode": "+351",
    "flag": "🇵🇹",
    "currency": "EUR",
    "region": "Europe",
    "priority": 38
  },
  {
    "name": "Austria",
    "code": "AT",
    "code3": "AUT",
    "dialCode": "+43",
    "flag": "🇦🇹",
    "currency": "EUR",
    "region": "Europe",
    "priority": 39
  },
  {
    "name": "Poland",
    "code": "PL",
    "code3": "POL",
    "dialCode": "+48",
    "flag": "🇵🇱",
    "currency": "PLN",
    "region": "Europe",
    "priority": 40
  },
  {
    "name": "Finland",
    "code": "FI",
    "code3": "FIN",
    "dialCode": "+358",
    "flag": "🇫🇮",
    "currency": "EUR",
    "region": "Europe",
    "priority": 41
  },
  {
    "name": "New Zealand",
    "code": "NZ",
    "code3": "NZL",
    "dialCode": "+64",
    "flag": "🇳🇿",
    "currency": "NZD",
    "region": "Oceania",
    "priority": 42
  },
  {
    "name": "Brazil",
    "code": "BR",
    "code3": "BRA",
    "dialCode": "+55",
    "flag": "🇧🇷",
    "currency": "BRL",
    "region": "Americas",
    "priority": 43
  },
  {
    "name": "Mexico",
    "code": "MX",
    "code3": "MEX",
    "dialCode": "+52",
    "flag": "🇲🇽",
    "currency": "MXN",
    "region": "Americas",
    "priority": 44
  },
  {
    "name": "Turkey",
    "code": "TR",
    "code3": "TUR",
    "dialCode": "+90",
    "flag": "🇹🇷",
    "currency": "TRY",
    "region": "Asia",
    "priority": 45
  },
  {
    "name": "Afghanistan",
    "code": "AF",
    "code3": "AFG",
    "dialCode": "+93",
    "flag": "🇦🇫",
    "currency": "AFN",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Åland Islands",
    "code": "AX",
    "code3": "ALA",
    "dialCode": "+358",
    "flag": "🇦🇽",
    "currency": "EUR",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Albania",
    "code": "AL",
    "code3": "ALB",
    "dialCode": "+355",
    "flag": "🇦🇱",
    "currency": "ALL",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Algeria",
    "code": "DZ",
    "code3": "DZA",
    "dialCode": "+213",
    "flag": "🇩🇿",
    "currency": "DZD",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "American Samoa",
    "code": "AS",
    "code3": "ASM",
    "dialCode": "+1",
    "flag": "🇦🇸",
    "currency": "USD",
    "region": "Oceania",
    "priority": 99
  },
  {
    "name": "Andorra",
    "code": "AD",
    "code3": "AND",
    "dialCode": "+376",
    "flag": "🇦🇩",
    "currency": "EUR",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Angola",
    "code": "AO",
    "code3": "AGO",
    "dialCode": "+244",
    "flag": "🇦🇴",
    "currency": "AOA",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Anguilla",
    "code": "AI",
    "code3": "AIA",
    "dialCode": "+1",
    "flag": "🇦🇮",
    "currency": "XCD",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Antarctica",
    "code": "AQ",
    "code3": "ATA",
    "dialCode": "+672",
    "flag": "🇦🇶",
    "currency": "USD",
    "region": "Antarctic",
    "priority": 99
  },
  {
    "name": "Antigua and Barbuda",
    "code": "AG",
    "code3": "ATG",
    "dialCode": "+1",
    "flag": "🇦🇬",
    "currency": "XCD",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Argentina",
    "code": "AR",
    "code3": "ARG",
    "dialCode": "+54",
    "flag": "🇦🇷",
    "currency": "ARS",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Armenia",
    "code": "AM",
    "code3": "ARM",
    "dialCode": "+374",
    "flag": "🇦🇲",
    "currency": "AMD",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Aruba",
    "code": "AW",
    "code3": "ABW",
    "dialCode": "+297",
    "flag": "🇦🇼",
    "currency": "AWG",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Azerbaijan",
    "code": "AZ",
    "code3": "AZE",
    "dialCode": "+994",
    "flag": "🇦🇿",
    "currency": "AZN",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Bahamas",
    "code": "BS",
    "code3": "BHS",
    "dialCode": "+1",
    "flag": "🇧🇸",
    "currency": "BSD",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Bangladesh",
    "code": "BD",
    "code3": "BGD",
    "dialCode": "+880",
    "flag": "🇧🇩",
    "currency": "BDT",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Barbados",
    "code": "BB",
    "code3": "BRB",
    "dialCode": "+1",
    "flag": "🇧🇧",
    "currency": "BBD",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Belarus",
    "code": "BY",
    "code3": "BLR",
    "dialCode": "+375",
    "flag": "🇧🇾",
    "currency": "BYN",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Belize",
    "code": "BZ",
    "code3": "BLZ",
    "dialCode": "+501",
    "flag": "🇧🇿",
    "currency": "BZD",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Benin",
    "code": "BJ",
    "code3": "BEN",
    "dialCode": "+229",
    "flag": "🇧🇯",
    "currency": "XOF",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Bermuda",
    "code": "BM",
    "code3": "BMU",
    "dialCode": "+1",
    "flag": "🇧🇲",
    "currency": "BMD",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Bhutan",
    "code": "BT",
    "code3": "BTN",
    "dialCode": "+975",
    "flag": "🇧🇹",
    "currency": "BTN",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Bolivia",
    "code": "BO",
    "code3": "BOL",
    "dialCode": "+591",
    "flag": "🇧🇴",
    "currency": "BOB",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Bosnia and Herzegovina",
    "code": "BA",
    "code3": "BIH",
    "dialCode": "+387",
    "flag": "🇧🇦",
    "currency": "BAM",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Botswana",
    "code": "BW",
    "code3": "BWA",
    "dialCode": "+267",
    "flag": "🇧🇼",
    "currency": "BWP",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Bouvet Island",
    "code": "BV",
    "code3": "BVT",
    "dialCode": "+47",
    "flag": "🇧🇻",
    "currency": "USD",
    "region": "Antarctic",
    "priority": 99
  },
  {
    "name": "British Indian Ocean Territory",
    "code": "IO",
    "code3": "IOT",
    "dialCode": "+246",
    "flag": "🇮🇴",
    "currency": "USD",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "British Virgin Islands",
    "code": "VG",
    "code3": "VGB",
    "dialCode": "+1",
    "flag": "🇻🇬",
    "currency": "USD",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Brunei",
    "code": "BN",
    "code3": "BRN",
    "dialCode": "+673",
    "flag": "🇧🇳",
    "currency": "BND",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Bulgaria",
    "code": "BG",
    "code3": "BGR",
    "dialCode": "+359",
    "flag": "🇧🇬",
    "currency": "EUR",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Burkina Faso",
    "code": "BF",
    "code3": "BFA",
    "dialCode": "+226",
    "flag": "🇧🇫",
    "currency": "XOF",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Cabo Verde",
    "code": "CV",
    "code3": "CPV",
    "dialCode": "+238",
    "flag": "🇨🇻",
    "currency": "CVE",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Cambodia",
    "code": "KH",
    "code3": "KHM",
    "dialCode": "+855",
    "flag": "🇰🇭",
    "currency": "KHR",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Cameroon",
    "code": "CM",
    "code3": "CMR",
    "dialCode": "+237",
    "flag": "🇨🇲",
    "currency": "XAF",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Caribbean Netherlands",
    "code": "BQ",
    "code3": "BES",
    "dialCode": "+599",
    "flag": "🇧🇶",
    "currency": "USD",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Cayman Islands",
    "code": "KY",
    "code3": "CYM",
    "dialCode": "+1",
    "flag": "🇰🇾",
    "currency": "KYD",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Central African Republic",
    "code": "CF",
    "code3": "CAF",
    "dialCode": "+236",
    "flag": "🇨🇫",
    "currency": "XAF",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Chad",
    "code": "TD",
    "code3": "TCD",
    "dialCode": "+235",
    "flag": "🇹🇩",
    "currency": "XAF",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Chile",
    "code": "CL",
    "code3": "CHL",
    "dialCode": "+56",
    "flag": "🇨🇱",
    "currency": "CLP",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Christmas Island",
    "code": "CX",
    "code3": "CXR",
    "dialCode": "+61",
    "flag": "🇨🇽",
    "currency": "AUD",
    "region": "Oceania",
    "priority": 99
  },
  {
    "name": "Cocos (Keeling) Islands",
    "code": "CC",
    "code3": "CCK",
    "dialCode": "+61",
    "flag": "🇨🇨",
    "currency": "AUD",
    "region": "Oceania",
    "priority": 99
  },
  {
    "name": "Colombia",
    "code": "CO",
    "code3": "COL",
    "dialCode": "+57",
    "flag": "🇨🇴",
    "currency": "COP",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Comoros",
    "code": "KM",
    "code3": "COM",
    "dialCode": "+269",
    "flag": "🇰🇲",
    "currency": "KMF",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Congo",
    "code": "CG",
    "code3": "COG",
    "dialCode": "+242",
    "flag": "🇨🇬",
    "currency": "XAF",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Cook Islands",
    "code": "CK",
    "code3": "COK",
    "dialCode": "+682",
    "flag": "🇨🇰",
    "currency": "CKD",
    "region": "Oceania",
    "priority": 99
  },
  {
    "name": "Costa Rica",
    "code": "CR",
    "code3": "CRI",
    "dialCode": "+506",
    "flag": "🇨🇷",
    "currency": "CRC",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Croatia",
    "code": "HR",
    "code3": "HRV",
    "dialCode": "+385",
    "flag": "🇭🇷",
    "currency": "EUR",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Cuba",
    "code": "CU",
    "code3": "CUB",
    "dialCode": "+53",
    "flag": "🇨🇺",
    "currency": "CUP",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Curaçao",
    "code": "CW",
    "code3": "CUW",
    "dialCode": "+599",
    "flag": "🇨🇼",
    "currency": "XCG",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Cyprus",
    "code": "CY",
    "code3": "CYP",
    "dialCode": "+357",
    "flag": "🇨🇾",
    "currency": "EUR",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Czechia",
    "code": "CZ",
    "code3": "CZE",
    "dialCode": "+420",
    "flag": "🇨🇿",
    "currency": "CZK",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Djibouti",
    "code": "DJ",
    "code3": "DJI",
    "dialCode": "+253",
    "flag": "🇩🇯",
    "currency": "DJF",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Dominica",
    "code": "DM",
    "code3": "DMA",
    "dialCode": "+1",
    "flag": "🇩🇲",
    "currency": "XCD",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Dominican Republic",
    "code": "DO",
    "code3": "DOM",
    "dialCode": "+1",
    "flag": "🇩🇴",
    "currency": "DOP",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "DRC",
    "code": "CD",
    "code3": "COD",
    "dialCode": "+243",
    "flag": "🇨🇩",
    "currency": "CDF",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Ecuador",
    "code": "EC",
    "code3": "ECU",
    "dialCode": "+593",
    "flag": "🇪🇨",
    "currency": "USD",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "El Salvador",
    "code": "SV",
    "code3": "SLV",
    "dialCode": "+503",
    "flag": "🇸🇻",
    "currency": "USD",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Equatorial Guinea",
    "code": "GQ",
    "code3": "GNQ",
    "dialCode": "+240",
    "flag": "🇬🇶",
    "currency": "XAF",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Eritrea",
    "code": "ER",
    "code3": "ERI",
    "dialCode": "+291",
    "flag": "🇪🇷",
    "currency": "ERN",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Estonia",
    "code": "EE",
    "code3": "EST",
    "dialCode": "+372",
    "flag": "🇪🇪",
    "currency": "EUR",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Eswatini",
    "code": "SZ",
    "code3": "SWZ",
    "dialCode": "+268",
    "flag": "🇸🇿",
    "currency": "SZL",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Falkland Islands",
    "code": "FK",
    "code3": "FLK",
    "dialCode": "+500",
    "flag": "🇫🇰",
    "currency": "FKP",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Faroe Islands",
    "code": "FO",
    "code3": "FRO",
    "dialCode": "+298",
    "flag": "🇫🇴",
    "currency": "DKK",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Fiji",
    "code": "FJ",
    "code3": "FJI",
    "dialCode": "+679",
    "flag": "🇫🇯",
    "currency": "FJD",
    "region": "Oceania",
    "priority": 99
  },
  {
    "name": "French Guiana",
    "code": "GF",
    "code3": "GUF",
    "dialCode": "+594",
    "flag": "🇬🇫",
    "currency": "EUR",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "French Polynesia",
    "code": "PF",
    "code3": "PYF",
    "dialCode": "+689",
    "flag": "🇵🇫",
    "currency": "XPF",
    "region": "Oceania",
    "priority": 99
  },
  {
    "name": "French Southern and Antarctic Lands",
    "code": "TF",
    "code3": "ATF",
    "dialCode": "+262",
    "flag": "🇹🇫",
    "currency": "EUR",
    "region": "Antarctic",
    "priority": 99
  },
  {
    "name": "Gabon",
    "code": "GA",
    "code3": "GAB",
    "dialCode": "+241",
    "flag": "🇬🇦",
    "currency": "XAF",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Gambia",
    "code": "GM",
    "code3": "GMB",
    "dialCode": "+220",
    "flag": "🇬🇲",
    "currency": "GMD",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Georgia",
    "code": "GE",
    "code3": "GEO",
    "dialCode": "+995",
    "flag": "🇬🇪",
    "currency": "GEL",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Gibraltar",
    "code": "GI",
    "code3": "GIB",
    "dialCode": "+350",
    "flag": "🇬🇮",
    "currency": "GIP",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Greece",
    "code": "GR",
    "code3": "GRC",
    "dialCode": "+30",
    "flag": "🇬🇷",
    "currency": "EUR",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Greenland",
    "code": "GL",
    "code3": "GRL",
    "dialCode": "+299",
    "flag": "🇬🇱",
    "currency": "DKK",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Grenada",
    "code": "GD",
    "code3": "GRD",
    "dialCode": "+1",
    "flag": "🇬🇩",
    "currency": "XCD",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Guadeloupe",
    "code": "GP",
    "code3": "GLP",
    "dialCode": "+590",
    "flag": "🇬🇵",
    "currency": "EUR",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Guam",
    "code": "GU",
    "code3": "GUM",
    "dialCode": "+1",
    "flag": "🇬🇺",
    "currency": "USD",
    "region": "Oceania",
    "priority": 99
  },
  {
    "name": "Guatemala",
    "code": "GT",
    "code3": "GTM",
    "dialCode": "+502",
    "flag": "🇬🇹",
    "currency": "GTQ",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Guernsey",
    "code": "GG",
    "code3": "GGY",
    "dialCode": "+44",
    "flag": "🇬🇬",
    "currency": "GBP",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Guinea",
    "code": "GN",
    "code3": "GIN",
    "dialCode": "+224",
    "flag": "🇬🇳",
    "currency": "GNF",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Guinea-Bissau",
    "code": "GW",
    "code3": "GNB",
    "dialCode": "+245",
    "flag": "🇬🇼",
    "currency": "XOF",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Guyana",
    "code": "GY",
    "code3": "GUY",
    "dialCode": "+592",
    "flag": "🇬🇾",
    "currency": "GYD",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Haiti",
    "code": "HT",
    "code3": "HTI",
    "dialCode": "+509",
    "flag": "🇭🇹",
    "currency": "HTG",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Heard Island and McDonald Islands",
    "code": "HM",
    "code3": "HMD",
    "dialCode": "+672",
    "flag": "🇭🇲",
    "currency": "USD",
    "region": "Antarctic",
    "priority": 99
  },
  {
    "name": "Honduras",
    "code": "HN",
    "code3": "HND",
    "dialCode": "+504",
    "flag": "🇭🇳",
    "currency": "HNL",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Hong Kong",
    "code": "HK",
    "code3": "HKG",
    "dialCode": "+852",
    "flag": "🇭🇰",
    "currency": "HKD",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Hungary",
    "code": "HU",
    "code3": "HUN",
    "dialCode": "+36",
    "flag": "🇭🇺",
    "currency": "HUF",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Iceland",
    "code": "IS",
    "code3": "ISL",
    "dialCode": "+354",
    "flag": "🇮🇸",
    "currency": "ISK",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Indonesia",
    "code": "ID",
    "code3": "IDN",
    "dialCode": "+62",
    "flag": "🇮🇩",
    "currency": "IDR",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Iran",
    "code": "IR",
    "code3": "IRN",
    "dialCode": "+98",
    "flag": "🇮🇷",
    "currency": "IRR",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Iraq",
    "code": "IQ",
    "code3": "IRQ",
    "dialCode": "+964",
    "flag": "🇮🇶",
    "currency": "IQD",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Isle of Man",
    "code": "IM",
    "code3": "IMN",
    "dialCode": "+44",
    "flag": "🇮🇲",
    "currency": "GBP",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Israel",
    "code": "IL",
    "code3": "ISR",
    "dialCode": "+972",
    "flag": "🇮🇱",
    "currency": "ILS",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Ivory Coast",
    "code": "CI",
    "code3": "CIV",
    "dialCode": "+225",
    "flag": "🇨🇮",
    "currency": "XOF",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Jamaica",
    "code": "JM",
    "code3": "JAM",
    "dialCode": "+1",
    "flag": "🇯🇲",
    "currency": "JMD",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Jersey",
    "code": "JE",
    "code3": "JEY",
    "dialCode": "+44",
    "flag": "🇯🇪",
    "currency": "GBP",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Jordan",
    "code": "JO",
    "code3": "JOR",
    "dialCode": "+962",
    "flag": "🇯🇴",
    "currency": "JOD",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Kazakhstan",
    "code": "KZ",
    "code3": "KAZ",
    "dialCode": "+7",
    "flag": "🇰🇿",
    "currency": "KZT",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Kiribati",
    "code": "KI",
    "code3": "KIR",
    "dialCode": "+686",
    "flag": "🇰🇮",
    "currency": "AUD",
    "region": "Oceania",
    "priority": 99
  },
  {
    "name": "Kosovo",
    "code": "XK",
    "code3": "UNK",
    "dialCode": "+383",
    "flag": "🇽🇰",
    "currency": "EUR",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Kyrgyzstan",
    "code": "KG",
    "code3": "KGZ",
    "dialCode": "+996",
    "flag": "🇰🇬",
    "currency": "KGS",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Laos",
    "code": "LA",
    "code3": "LAO",
    "dialCode": "+856",
    "flag": "🇱🇦",
    "currency": "LAK",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Latvia",
    "code": "LV",
    "code3": "LVA",
    "dialCode": "+371",
    "flag": "🇱🇻",
    "currency": "EUR",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Lebanon",
    "code": "LB",
    "code3": "LBN",
    "dialCode": "+961",
    "flag": "🇱🇧",
    "currency": "LBP",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Lesotho",
    "code": "LS",
    "code3": "LSO",
    "dialCode": "+266",
    "flag": "🇱🇸",
    "currency": "LSL",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Liberia",
    "code": "LR",
    "code3": "LBR",
    "dialCode": "+231",
    "flag": "🇱🇷",
    "currency": "LRD",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Libya",
    "code": "LY",
    "code3": "LBY",
    "dialCode": "+218",
    "flag": "🇱🇾",
    "currency": "LYD",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Liechtenstein",
    "code": "LI",
    "code3": "LIE",
    "dialCode": "+423",
    "flag": "🇱🇮",
    "currency": "CHF",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Lithuania",
    "code": "LT",
    "code3": "LTU",
    "dialCode": "+370",
    "flag": "🇱🇹",
    "currency": "EUR",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Luxembourg",
    "code": "LU",
    "code3": "LUX",
    "dialCode": "+352",
    "flag": "🇱🇺",
    "currency": "EUR",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Macau",
    "code": "MO",
    "code3": "MAC",
    "dialCode": "+853",
    "flag": "🇲🇴",
    "currency": "MOP",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Madagascar",
    "code": "MG",
    "code3": "MDG",
    "dialCode": "+261",
    "flag": "🇲🇬",
    "currency": "MGA",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Malawi",
    "code": "MW",
    "code3": "MWI",
    "dialCode": "+265",
    "flag": "🇲🇼",
    "currency": "MWK",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Malaysia",
    "code": "MY",
    "code3": "MYS",
    "dialCode": "+60",
    "flag": "🇲🇾",
    "currency": "MYR",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Maldives",
    "code": "MV",
    "code3": "MDV",
    "dialCode": "+960",
    "flag": "🇲🇻",
    "currency": "MVR",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Mali",
    "code": "ML",
    "code3": "MLI",
    "dialCode": "+223",
    "flag": "🇲🇱",
    "currency": "XOF",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Malta",
    "code": "MT",
    "code3": "MLT",
    "dialCode": "+356",
    "flag": "🇲🇹",
    "currency": "EUR",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Marshall Islands",
    "code": "MH",
    "code3": "MHL",
    "dialCode": "+692",
    "flag": "🇲🇭",
    "currency": "USD",
    "region": "Oceania",
    "priority": 99
  },
  {
    "name": "Martinique",
    "code": "MQ",
    "code3": "MTQ",
    "dialCode": "+596",
    "flag": "🇲🇶",
    "currency": "EUR",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Mauritania",
    "code": "MR",
    "code3": "MRT",
    "dialCode": "+222",
    "flag": "🇲🇷",
    "currency": "MRU",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Mauritius",
    "code": "MU",
    "code3": "MUS",
    "dialCode": "+230",
    "flag": "🇲🇺",
    "currency": "MUR",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Mayotte",
    "code": "YT",
    "code3": "MYT",
    "dialCode": "+262",
    "flag": "🇾🇹",
    "currency": "EUR",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Micronesia",
    "code": "FM",
    "code3": "FSM",
    "dialCode": "+691",
    "flag": "🇫🇲",
    "currency": "USD",
    "region": "Oceania",
    "priority": 99
  },
  {
    "name": "Moldova",
    "code": "MD",
    "code3": "MDA",
    "dialCode": "+373",
    "flag": "🇲🇩",
    "currency": "MDL",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Monaco",
    "code": "MC",
    "code3": "MCO",
    "dialCode": "+377",
    "flag": "🇲🇨",
    "currency": "EUR",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Mongolia",
    "code": "MN",
    "code3": "MNG",
    "dialCode": "+976",
    "flag": "🇲🇳",
    "currency": "MNT",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Montenegro",
    "code": "ME",
    "code3": "MNE",
    "dialCode": "+382",
    "flag": "🇲🇪",
    "currency": "EUR",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Montserrat",
    "code": "MS",
    "code3": "MSR",
    "dialCode": "+1",
    "flag": "🇲🇸",
    "currency": "XCD",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Morocco",
    "code": "MA",
    "code3": "MAR",
    "dialCode": "+212",
    "flag": "🇲🇦",
    "currency": "MAD",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Mozambique",
    "code": "MZ",
    "code3": "MOZ",
    "dialCode": "+258",
    "flag": "🇲🇿",
    "currency": "MZN",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Myanmar",
    "code": "MM",
    "code3": "MMR",
    "dialCode": "+95",
    "flag": "🇲🇲",
    "currency": "MMK",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Namibia",
    "code": "NA",
    "code3": "NAM",
    "dialCode": "+264",
    "flag": "🇳🇦",
    "currency": "NAD",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Naoero",
    "code": "NR",
    "code3": "NRU",
    "dialCode": "+674",
    "flag": "🇳🇷",
    "currency": "AUD",
    "region": "Oceania",
    "priority": 99
  },
  {
    "name": "Nepal",
    "code": "NP",
    "code3": "NPL",
    "dialCode": "+977",
    "flag": "🇳🇵",
    "currency": "NPR",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "New Caledonia",
    "code": "NC",
    "code3": "NCL",
    "dialCode": "+687",
    "flag": "🇳🇨",
    "currency": "XPF",
    "region": "Oceania",
    "priority": 99
  },
  {
    "name": "Nicaragua",
    "code": "NI",
    "code3": "NIC",
    "dialCode": "+505",
    "flag": "🇳🇮",
    "currency": "NIO",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Niger",
    "code": "NE",
    "code3": "NER",
    "dialCode": "+227",
    "flag": "🇳🇪",
    "currency": "XOF",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Niue",
    "code": "NU",
    "code3": "NIU",
    "dialCode": "+683",
    "flag": "🇳🇺",
    "currency": "NZD",
    "region": "Oceania",
    "priority": 99
  },
  {
    "name": "Norfolk Island",
    "code": "NF",
    "code3": "NFK",
    "dialCode": "+672",
    "flag": "🇳🇫",
    "currency": "AUD",
    "region": "Oceania",
    "priority": 99
  },
  {
    "name": "North Korea",
    "code": "KP",
    "code3": "PRK",
    "dialCode": "+850",
    "flag": "🇰🇵",
    "currency": "KPW",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "North Macedonia",
    "code": "MK",
    "code3": "MKD",
    "dialCode": "+389",
    "flag": "🇲🇰",
    "currency": "MKD",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Northern Mariana Islands",
    "code": "MP",
    "code3": "MNP",
    "dialCode": "+1",
    "flag": "🇲🇵",
    "currency": "USD",
    "region": "Oceania",
    "priority": 99
  },
  {
    "name": "Pakistan",
    "code": "PK",
    "code3": "PAK",
    "dialCode": "+92",
    "flag": "🇵🇰",
    "currency": "PKR",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Palau",
    "code": "PW",
    "code3": "PLW",
    "dialCode": "+680",
    "flag": "🇵🇼",
    "currency": "USD",
    "region": "Oceania",
    "priority": 99
  },
  {
    "name": "Palestine",
    "code": "PS",
    "code3": "PSE",
    "dialCode": "+970",
    "flag": "🇵🇸",
    "currency": "EGP",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Panama",
    "code": "PA",
    "code3": "PAN",
    "dialCode": "+507",
    "flag": "🇵🇦",
    "currency": "PAB",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Papua New Guinea",
    "code": "PG",
    "code3": "PNG",
    "dialCode": "+675",
    "flag": "🇵🇬",
    "currency": "PGK",
    "region": "Oceania",
    "priority": 99
  },
  {
    "name": "Paraguay",
    "code": "PY",
    "code3": "PRY",
    "dialCode": "+595",
    "flag": "🇵🇾",
    "currency": "PYG",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Peru",
    "code": "PE",
    "code3": "PER",
    "dialCode": "+51",
    "flag": "🇵🇪",
    "currency": "PEN",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Philippines",
    "code": "PH",
    "code3": "PHL",
    "dialCode": "+63",
    "flag": "🇵🇭",
    "currency": "PHP",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Pitcairn Islands",
    "code": "PN",
    "code3": "PCN",
    "dialCode": "+64",
    "flag": "🇵🇳",
    "currency": "NZD",
    "region": "Oceania",
    "priority": 99
  },
  {
    "name": "Puerto Rico",
    "code": "PR",
    "code3": "PRI",
    "dialCode": "+1",
    "flag": "🇵🇷",
    "currency": "USD",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Réunion",
    "code": "RE",
    "code3": "REU",
    "dialCode": "+262",
    "flag": "🇷🇪",
    "currency": "EUR",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Romania",
    "code": "RO",
    "code3": "ROU",
    "dialCode": "+40",
    "flag": "🇷🇴",
    "currency": "RON",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Russia",
    "code": "RU",
    "code3": "RUS",
    "dialCode": "+7",
    "flag": "🇷🇺",
    "currency": "RUB",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Saint Barthélemy",
    "code": "BL",
    "code3": "BLM",
    "dialCode": "+590",
    "flag": "🇧🇱",
    "currency": "EUR",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Saint Helena, Ascension and Tristan da Cunha",
    "code": "SH",
    "code3": "SHN",
    "dialCode": "+290",
    "flag": "🇸🇭",
    "currency": "GBP",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Saint Kitts and Nevis",
    "code": "KN",
    "code3": "KNA",
    "dialCode": "+1",
    "flag": "🇰🇳",
    "currency": "XCD",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Saint Lucia",
    "code": "LC",
    "code3": "LCA",
    "dialCode": "+1",
    "flag": "🇱🇨",
    "currency": "XCD",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Saint Martin",
    "code": "MF",
    "code3": "MAF",
    "dialCode": "+590",
    "flag": "🇲🇫",
    "currency": "EUR",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Saint Pierre and Miquelon",
    "code": "PM",
    "code3": "SPM",
    "dialCode": "+508",
    "flag": "🇵🇲",
    "currency": "EUR",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Saint Vincent and the Grenadines",
    "code": "VC",
    "code3": "VCT",
    "dialCode": "+1",
    "flag": "🇻🇨",
    "currency": "XCD",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Samoa",
    "code": "WS",
    "code3": "WSM",
    "dialCode": "+685",
    "flag": "🇼🇸",
    "currency": "WST",
    "region": "Oceania",
    "priority": 99
  },
  {
    "name": "San Marino",
    "code": "SM",
    "code3": "SMR",
    "dialCode": "+378",
    "flag": "🇸🇲",
    "currency": "EUR",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "São Tomé and Príncipe",
    "code": "ST",
    "code3": "STP",
    "dialCode": "+239",
    "flag": "🇸🇹",
    "currency": "STN",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Senegal",
    "code": "SN",
    "code3": "SEN",
    "dialCode": "+221",
    "flag": "🇸🇳",
    "currency": "XOF",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Serbia",
    "code": "RS",
    "code3": "SRB",
    "dialCode": "+381",
    "flag": "🇷🇸",
    "currency": "RSD",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Seychelles",
    "code": "SC",
    "code3": "SYC",
    "dialCode": "+248",
    "flag": "🇸🇨",
    "currency": "SCR",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Sierra Leone",
    "code": "SL",
    "code3": "SLE",
    "dialCode": "+232",
    "flag": "🇸🇱",
    "currency": "SLE",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Sint Maarten",
    "code": "SX",
    "code3": "SXM",
    "dialCode": "+1",
    "flag": "🇸🇽",
    "currency": "XCG",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Slovakia",
    "code": "SK",
    "code3": "SVK",
    "dialCode": "+421",
    "flag": "🇸🇰",
    "currency": "EUR",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Slovenia",
    "code": "SI",
    "code3": "SVN",
    "dialCode": "+386",
    "flag": "🇸🇮",
    "currency": "EUR",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Solomon Islands",
    "code": "SB",
    "code3": "SLB",
    "dialCode": "+677",
    "flag": "🇸🇧",
    "currency": "SBD",
    "region": "Oceania",
    "priority": 99
  },
  {
    "name": "South Georgia",
    "code": "GS",
    "code3": "SGS",
    "dialCode": "+500",
    "flag": "🇬🇸",
    "currency": "GBP",
    "region": "Antarctic",
    "priority": 99
  },
  {
    "name": "South Korea",
    "code": "KR",
    "code3": "KOR",
    "dialCode": "+82",
    "flag": "🇰🇷",
    "currency": "KRW",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Sri Lanka",
    "code": "LK",
    "code3": "LKA",
    "dialCode": "+94",
    "flag": "🇱🇰",
    "currency": "LKR",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Sudan",
    "code": "SD",
    "code3": "SDN",
    "dialCode": "+249",
    "flag": "🇸🇩",
    "currency": "SDG",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Suriname",
    "code": "SR",
    "code3": "SUR",
    "dialCode": "+597",
    "flag": "🇸🇷",
    "currency": "SRD",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Svalbard and Jan Mayen",
    "code": "SJ",
    "code3": "SJM",
    "dialCode": "+47",
    "flag": "🇸🇯",
    "currency": "NOK",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Syria",
    "code": "SY",
    "code3": "SYR",
    "dialCode": "+963",
    "flag": "🇸🇾",
    "currency": "SYP",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Taiwan",
    "code": "TW",
    "code3": "TWN",
    "dialCode": "+886",
    "flag": "🇹🇼",
    "currency": "TWD",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Tajikistan",
    "code": "TJ",
    "code3": "TJK",
    "dialCode": "+992",
    "flag": "🇹🇯",
    "currency": "TJS",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Thailand",
    "code": "TH",
    "code3": "THA",
    "dialCode": "+66",
    "flag": "🇹🇭",
    "currency": "THB",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Timor-Leste",
    "code": "TL",
    "code3": "TLS",
    "dialCode": "+670",
    "flag": "🇹🇱",
    "currency": "USD",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Togo",
    "code": "TG",
    "code3": "TGO",
    "dialCode": "+228",
    "flag": "🇹🇬",
    "currency": "XOF",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Tokelau",
    "code": "TK",
    "code3": "TKL",
    "dialCode": "+690",
    "flag": "🇹🇰",
    "currency": "NZD",
    "region": "Oceania",
    "priority": 99
  },
  {
    "name": "Tonga",
    "code": "TO",
    "code3": "TON",
    "dialCode": "+676",
    "flag": "🇹🇴",
    "currency": "TOP",
    "region": "Oceania",
    "priority": 99
  },
  {
    "name": "Trinidad and Tobago",
    "code": "TT",
    "code3": "TTO",
    "dialCode": "+1",
    "flag": "🇹🇹",
    "currency": "TTD",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Tunisia",
    "code": "TN",
    "code3": "TUN",
    "dialCode": "+216",
    "flag": "🇹🇳",
    "currency": "TND",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Turkmenistan",
    "code": "TM",
    "code3": "TKM",
    "dialCode": "+993",
    "flag": "🇹🇲",
    "currency": "TMT",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Turks and Caicos Islands",
    "code": "TC",
    "code3": "TCA",
    "dialCode": "+1",
    "flag": "🇹🇨",
    "currency": "USD",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Tuvalu",
    "code": "TV",
    "code3": "TUV",
    "dialCode": "+688",
    "flag": "🇹🇻",
    "currency": "AUD",
    "region": "Oceania",
    "priority": 99
  },
  {
    "name": "Ukraine",
    "code": "UA",
    "code3": "UKR",
    "dialCode": "+380",
    "flag": "🇺🇦",
    "currency": "UAH",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "United States Minor Outlying Islands",
    "code": "UM",
    "code3": "UMI",
    "dialCode": "+1",
    "flag": "🇺🇲",
    "currency": "USD",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "United States Virgin Islands",
    "code": "VI",
    "code3": "VIR",
    "dialCode": "+1",
    "flag": "🇻🇮",
    "currency": "USD",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Uruguay",
    "code": "UY",
    "code3": "URY",
    "dialCode": "+598",
    "flag": "🇺🇾",
    "currency": "UYU",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Uzbekistan",
    "code": "UZ",
    "code3": "UZB",
    "dialCode": "+998",
    "flag": "🇺🇿",
    "currency": "UZS",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Vanuatu",
    "code": "VU",
    "code3": "VUT",
    "dialCode": "+678",
    "flag": "🇻🇺",
    "currency": "VUV",
    "region": "Oceania",
    "priority": 99
  },
  {
    "name": "Vatican City",
    "code": "VA",
    "code3": "VAT",
    "dialCode": "+379",
    "flag": "🇻🇦",
    "currency": "EUR",
    "region": "Europe",
    "priority": 99
  },
  {
    "name": "Venezuela",
    "code": "VE",
    "code3": "VEN",
    "dialCode": "+58",
    "flag": "🇻🇪",
    "currency": "VES",
    "region": "Americas",
    "priority": 99
  },
  {
    "name": "Vietnam",
    "code": "VN",
    "code3": "VNM",
    "dialCode": "+84",
    "flag": "🇻🇳",
    "currency": "VND",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Wallis and Futuna",
    "code": "WF",
    "code3": "WLF",
    "dialCode": "+681",
    "flag": "🇼🇫",
    "currency": "XPF",
    "region": "Oceania",
    "priority": 99
  },
  {
    "name": "Western Sahara",
    "code": "EH",
    "code3": "ESH",
    "dialCode": "+212",
    "flag": "🇪🇭",
    "currency": "DZD",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Yemen",
    "code": "YE",
    "code3": "YEM",
    "dialCode": "+967",
    "flag": "🇾🇪",
    "currency": "YER",
    "region": "Asia",
    "priority": 99
  },
  {
    "name": "Zambia",
    "code": "ZM",
    "code3": "ZMB",
    "dialCode": "+260",
    "flag": "🇿🇲",
    "currency": "ZMW",
    "region": "Africa",
    "priority": 99
  },
  {
    "name": "Zimbabwe",
    "code": "ZW",
    "code3": "ZWE",
    "dialCode": "+263",
    "flag": "🇿🇼",
    "currency": "USD",
    "region": "Africa",
    "priority": 99
  }
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

