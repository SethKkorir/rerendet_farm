// client/src/utils/countryList.js — Global Countries & Dialing Codes Directory
// Backed by /api/locations/countries (REST Countries API v5) with zero-latency offline fallback

export const COUNTRY_OBJECTS = [
  {
    "name": "Kenya",
    "code": "KE",
    "dialCode": "+254",
    "flag": "🇰🇪",
    "priority": 1,
    "region": "Africa"
  },
  {
    "name": "Uganda",
    "code": "UG",
    "dialCode": "+256",
    "flag": "🇺🇬",
    "priority": 2,
    "region": "Africa"
  },
  {
    "name": "Tanzania",
    "code": "TZ",
    "dialCode": "+255",
    "flag": "🇹🇿",
    "priority": 3,
    "region": "Africa"
  },
  {
    "name": "Rwanda",
    "code": "RW",
    "dialCode": "+250",
    "flag": "🇷🇼",
    "priority": 4,
    "region": "Africa"
  },
  {
    "name": "Burundi",
    "code": "BI",
    "dialCode": "+257",
    "flag": "🇧🇮",
    "priority": 5,
    "region": "Africa"
  },
  {
    "name": "Ethiopia",
    "code": "ET",
    "dialCode": "+251",
    "flag": "🇪🇹",
    "priority": 6,
    "region": "Africa"
  },
  {
    "name": "South Sudan",
    "code": "SS",
    "dialCode": "+211",
    "flag": "🇸🇸",
    "priority": 7,
    "region": "Africa"
  },
  {
    "name": "Somalia",
    "code": "SO",
    "dialCode": "+252",
    "flag": "🇸🇴",
    "priority": 8,
    "region": "Africa"
  },
  {
    "name": "United Arab Emirates",
    "code": "AE",
    "dialCode": "+971",
    "flag": "🇦🇪",
    "priority": 9,
    "region": "Asia"
  },
  {
    "name": "United Kingdom",
    "code": "GB",
    "dialCode": "+44",
    "flag": "🇬🇧",
    "priority": 10,
    "region": "Europe"
  },
  {
    "name": "United States",
    "code": "US",
    "dialCode": "+1",
    "flag": "🇺🇸",
    "priority": 11,
    "region": "Americas"
  },
  {
    "name": "Canada",
    "code": "CA",
    "dialCode": "+1",
    "flag": "🇨🇦",
    "priority": 12,
    "region": "Americas"
  },
  {
    "name": "Australia",
    "code": "AU",
    "dialCode": "+61",
    "flag": "🇦🇺",
    "priority": 13,
    "region": "Oceania"
  },
  {
    "name": "Germany",
    "code": "DE",
    "dialCode": "+49",
    "flag": "🇩🇪",
    "priority": 14,
    "region": "Europe"
  },
  {
    "name": "France",
    "code": "FR",
    "dialCode": "+33",
    "flag": "🇫🇷",
    "priority": 15,
    "region": "Europe"
  },
  {
    "name": "Netherlands",
    "code": "NL",
    "dialCode": "+31",
    "flag": "🇳🇱",
    "priority": 16,
    "region": "Europe"
  },
  {
    "name": "South Africa",
    "code": "ZA",
    "dialCode": "+27",
    "flag": "🇿🇦",
    "priority": 17,
    "region": "Africa"
  },
  {
    "name": "Nigeria",
    "code": "NG",
    "dialCode": "+234",
    "flag": "🇳🇬",
    "priority": 18,
    "region": "Africa"
  },
  {
    "name": "Ghana",
    "code": "GH",
    "dialCode": "+233",
    "flag": "🇬🇭",
    "priority": 19,
    "region": "Africa"
  },
  {
    "name": "Egypt",
    "code": "EG",
    "dialCode": "+20",
    "flag": "🇪🇬",
    "priority": 20,
    "region": "Africa"
  },
  {
    "name": "Saudi Arabia",
    "code": "SA",
    "dialCode": "+966",
    "flag": "🇸🇦",
    "priority": 21,
    "region": "Asia"
  },
  {
    "name": "Qatar",
    "code": "QA",
    "dialCode": "+974",
    "flag": "🇶🇦",
    "priority": 22,
    "region": "Asia"
  },
  {
    "name": "Oman",
    "code": "OM",
    "dialCode": "+968",
    "flag": "🇴🇲",
    "priority": 23,
    "region": "Asia"
  },
  {
    "name": "Bahrain",
    "code": "BH",
    "dialCode": "+973",
    "flag": "🇧🇭",
    "priority": 24,
    "region": "Asia"
  },
  {
    "name": "Kuwait",
    "code": "KW",
    "dialCode": "+965",
    "flag": "🇰🇼",
    "priority": 25,
    "region": "Asia"
  },
  {
    "name": "India",
    "code": "IN",
    "dialCode": "+91",
    "flag": "🇮🇳",
    "priority": 26,
    "region": "Asia"
  },
  {
    "name": "China",
    "code": "CN",
    "dialCode": "+86",
    "flag": "🇨🇳",
    "priority": 27,
    "region": "Asia"
  },
  {
    "name": "Japan",
    "code": "JP",
    "dialCode": "+81",
    "flag": "🇯🇵",
    "priority": 28,
    "region": "Asia"
  },
  {
    "name": "Singapore",
    "code": "SG",
    "dialCode": "+65",
    "flag": "🇸🇬",
    "priority": 29,
    "region": "Asia"
  },
  {
    "name": "Switzerland",
    "code": "CH",
    "dialCode": "+41",
    "flag": "🇨🇭",
    "priority": 30,
    "region": "Europe"
  },
  {
    "name": "Sweden",
    "code": "SE",
    "dialCode": "+46",
    "flag": "🇸🇪",
    "priority": 31,
    "region": "Europe"
  },
  {
    "name": "Norway",
    "code": "NO",
    "dialCode": "+47",
    "flag": "🇳🇴",
    "priority": 32,
    "region": "Europe"
  },
  {
    "name": "Denmark",
    "code": "DK",
    "dialCode": "+45",
    "flag": "🇩🇰",
    "priority": 33,
    "region": "Europe"
  },
  {
    "name": "Belgium",
    "code": "BE",
    "dialCode": "+32",
    "flag": "🇧🇪",
    "priority": 34,
    "region": "Europe"
  },
  {
    "name": "Ireland",
    "code": "IE",
    "dialCode": "+353",
    "flag": "🇮🇪",
    "priority": 35,
    "region": "Europe"
  },
  {
    "name": "Italy",
    "code": "IT",
    "dialCode": "+39",
    "flag": "🇮🇹",
    "priority": 36,
    "region": "Europe"
  },
  {
    "name": "Spain",
    "code": "ES",
    "dialCode": "+34",
    "flag": "🇪🇸",
    "priority": 37,
    "region": "Europe"
  },
  {
    "name": "Portugal",
    "code": "PT",
    "dialCode": "+351",
    "flag": "🇵🇹",
    "priority": 38,
    "region": "Europe"
  },
  {
    "name": "Austria",
    "code": "AT",
    "dialCode": "+43",
    "flag": "🇦🇹",
    "priority": 39,
    "region": "Europe"
  },
  {
    "name": "Poland",
    "code": "PL",
    "dialCode": "+48",
    "flag": "🇵🇱",
    "priority": 40,
    "region": "Europe"
  },
  {
    "name": "Finland",
    "code": "FI",
    "dialCode": "+358",
    "flag": "🇫🇮",
    "priority": 41,
    "region": "Europe"
  },
  {
    "name": "New Zealand",
    "code": "NZ",
    "dialCode": "+64",
    "flag": "🇳🇿",
    "priority": 42,
    "region": "Oceania"
  },
  {
    "name": "Brazil",
    "code": "BR",
    "dialCode": "+55",
    "flag": "🇧🇷",
    "priority": 43,
    "region": "Americas"
  },
  {
    "name": "Mexico",
    "code": "MX",
    "dialCode": "+52",
    "flag": "🇲🇽",
    "priority": 44,
    "region": "Americas"
  },
  {
    "name": "Turkey",
    "code": "TR",
    "dialCode": "+90",
    "flag": "🇹🇷",
    "priority": 45,
    "region": "Asia"
  },
  {
    "name": "Afghanistan",
    "code": "AF",
    "dialCode": "+93",
    "flag": "🇦🇫",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Åland Islands",
    "code": "AX",
    "dialCode": "+358",
    "flag": "🇦🇽",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Albania",
    "code": "AL",
    "dialCode": "+355",
    "flag": "🇦🇱",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Algeria",
    "code": "DZ",
    "dialCode": "+213",
    "flag": "🇩🇿",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "American Samoa",
    "code": "AS",
    "dialCode": "+1",
    "flag": "🇦🇸",
    "priority": 99,
    "region": "Oceania"
  },
  {
    "name": "Andorra",
    "code": "AD",
    "dialCode": "+376",
    "flag": "🇦🇩",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Angola",
    "code": "AO",
    "dialCode": "+244",
    "flag": "🇦🇴",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Anguilla",
    "code": "AI",
    "dialCode": "+1",
    "flag": "🇦🇮",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Antarctica",
    "code": "AQ",
    "dialCode": "+672",
    "flag": "🇦🇶",
    "priority": 99,
    "region": "Antarctic"
  },
  {
    "name": "Antigua and Barbuda",
    "code": "AG",
    "dialCode": "+1",
    "flag": "🇦🇬",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Argentina",
    "code": "AR",
    "dialCode": "+54",
    "flag": "🇦🇷",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Armenia",
    "code": "AM",
    "dialCode": "+374",
    "flag": "🇦🇲",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Aruba",
    "code": "AW",
    "dialCode": "+297",
    "flag": "🇦🇼",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Azerbaijan",
    "code": "AZ",
    "dialCode": "+994",
    "flag": "🇦🇿",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Bahamas",
    "code": "BS",
    "dialCode": "+1",
    "flag": "🇧🇸",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Bangladesh",
    "code": "BD",
    "dialCode": "+880",
    "flag": "🇧🇩",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Barbados",
    "code": "BB",
    "dialCode": "+1",
    "flag": "🇧🇧",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Belarus",
    "code": "BY",
    "dialCode": "+375",
    "flag": "🇧🇾",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Belize",
    "code": "BZ",
    "dialCode": "+501",
    "flag": "🇧🇿",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Benin",
    "code": "BJ",
    "dialCode": "+229",
    "flag": "🇧🇯",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Bermuda",
    "code": "BM",
    "dialCode": "+1",
    "flag": "🇧🇲",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Bhutan",
    "code": "BT",
    "dialCode": "+975",
    "flag": "🇧🇹",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Bolivia",
    "code": "BO",
    "dialCode": "+591",
    "flag": "🇧🇴",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Bosnia and Herzegovina",
    "code": "BA",
    "dialCode": "+387",
    "flag": "🇧🇦",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Botswana",
    "code": "BW",
    "dialCode": "+267",
    "flag": "🇧🇼",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Bouvet Island",
    "code": "BV",
    "dialCode": "+47",
    "flag": "🇧🇻",
    "priority": 99,
    "region": "Antarctic"
  },
  {
    "name": "British Indian Ocean Territory",
    "code": "IO",
    "dialCode": "+246",
    "flag": "🇮🇴",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "British Virgin Islands",
    "code": "VG",
    "dialCode": "+1",
    "flag": "🇻🇬",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Brunei",
    "code": "BN",
    "dialCode": "+673",
    "flag": "🇧🇳",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Bulgaria",
    "code": "BG",
    "dialCode": "+359",
    "flag": "🇧🇬",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Burkina Faso",
    "code": "BF",
    "dialCode": "+226",
    "flag": "🇧🇫",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Cabo Verde",
    "code": "CV",
    "dialCode": "+238",
    "flag": "🇨🇻",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Cambodia",
    "code": "KH",
    "dialCode": "+855",
    "flag": "🇰🇭",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Cameroon",
    "code": "CM",
    "dialCode": "+237",
    "flag": "🇨🇲",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Caribbean Netherlands",
    "code": "BQ",
    "dialCode": "+599",
    "flag": "🇧🇶",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Cayman Islands",
    "code": "KY",
    "dialCode": "+1",
    "flag": "🇰🇾",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Central African Republic",
    "code": "CF",
    "dialCode": "+236",
    "flag": "🇨🇫",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Chad",
    "code": "TD",
    "dialCode": "+235",
    "flag": "🇹🇩",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Chile",
    "code": "CL",
    "dialCode": "+56",
    "flag": "🇨🇱",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Christmas Island",
    "code": "CX",
    "dialCode": "+61",
    "flag": "🇨🇽",
    "priority": 99,
    "region": "Oceania"
  },
  {
    "name": "Cocos (Keeling) Islands",
    "code": "CC",
    "dialCode": "+61",
    "flag": "🇨🇨",
    "priority": 99,
    "region": "Oceania"
  },
  {
    "name": "Colombia",
    "code": "CO",
    "dialCode": "+57",
    "flag": "🇨🇴",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Comoros",
    "code": "KM",
    "dialCode": "+269",
    "flag": "🇰🇲",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Congo",
    "code": "CG",
    "dialCode": "+242",
    "flag": "🇨🇬",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Cook Islands",
    "code": "CK",
    "dialCode": "+682",
    "flag": "🇨🇰",
    "priority": 99,
    "region": "Oceania"
  },
  {
    "name": "Costa Rica",
    "code": "CR",
    "dialCode": "+506",
    "flag": "🇨🇷",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Croatia",
    "code": "HR",
    "dialCode": "+385",
    "flag": "🇭🇷",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Cuba",
    "code": "CU",
    "dialCode": "+53",
    "flag": "🇨🇺",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Curaçao",
    "code": "CW",
    "dialCode": "+599",
    "flag": "🇨🇼",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Cyprus",
    "code": "CY",
    "dialCode": "+357",
    "flag": "🇨🇾",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Czechia",
    "code": "CZ",
    "dialCode": "+420",
    "flag": "🇨🇿",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Djibouti",
    "code": "DJ",
    "dialCode": "+253",
    "flag": "🇩🇯",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Dominica",
    "code": "DM",
    "dialCode": "+1",
    "flag": "🇩🇲",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Dominican Republic",
    "code": "DO",
    "dialCode": "+1",
    "flag": "🇩🇴",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "DRC",
    "code": "CD",
    "dialCode": "+243",
    "flag": "🇨🇩",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Ecuador",
    "code": "EC",
    "dialCode": "+593",
    "flag": "🇪🇨",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "El Salvador",
    "code": "SV",
    "dialCode": "+503",
    "flag": "🇸🇻",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Equatorial Guinea",
    "code": "GQ",
    "dialCode": "+240",
    "flag": "🇬🇶",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Eritrea",
    "code": "ER",
    "dialCode": "+291",
    "flag": "🇪🇷",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Estonia",
    "code": "EE",
    "dialCode": "+372",
    "flag": "🇪🇪",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Eswatini",
    "code": "SZ",
    "dialCode": "+268",
    "flag": "🇸🇿",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Falkland Islands",
    "code": "FK",
    "dialCode": "+500",
    "flag": "🇫🇰",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Faroe Islands",
    "code": "FO",
    "dialCode": "+298",
    "flag": "🇫🇴",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Fiji",
    "code": "FJ",
    "dialCode": "+679",
    "flag": "🇫🇯",
    "priority": 99,
    "region": "Oceania"
  },
  {
    "name": "French Guiana",
    "code": "GF",
    "dialCode": "+594",
    "flag": "🇬🇫",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "French Polynesia",
    "code": "PF",
    "dialCode": "+689",
    "flag": "🇵🇫",
    "priority": 99,
    "region": "Oceania"
  },
  {
    "name": "French Southern and Antarctic Lands",
    "code": "TF",
    "dialCode": "+262",
    "flag": "🇹🇫",
    "priority": 99,
    "region": "Antarctic"
  },
  {
    "name": "Gabon",
    "code": "GA",
    "dialCode": "+241",
    "flag": "🇬🇦",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Gambia",
    "code": "GM",
    "dialCode": "+220",
    "flag": "🇬🇲",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Georgia",
    "code": "GE",
    "dialCode": "+995",
    "flag": "🇬🇪",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Gibraltar",
    "code": "GI",
    "dialCode": "+350",
    "flag": "🇬🇮",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Greece",
    "code": "GR",
    "dialCode": "+30",
    "flag": "🇬🇷",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Greenland",
    "code": "GL",
    "dialCode": "+299",
    "flag": "🇬🇱",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Grenada",
    "code": "GD",
    "dialCode": "+1",
    "flag": "🇬🇩",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Guadeloupe",
    "code": "GP",
    "dialCode": "+590",
    "flag": "🇬🇵",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Guam",
    "code": "GU",
    "dialCode": "+1",
    "flag": "🇬🇺",
    "priority": 99,
    "region": "Oceania"
  },
  {
    "name": "Guatemala",
    "code": "GT",
    "dialCode": "+502",
    "flag": "🇬🇹",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Guernsey",
    "code": "GG",
    "dialCode": "+44",
    "flag": "🇬🇬",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Guinea",
    "code": "GN",
    "dialCode": "+224",
    "flag": "🇬🇳",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Guinea-Bissau",
    "code": "GW",
    "dialCode": "+245",
    "flag": "🇬🇼",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Guyana",
    "code": "GY",
    "dialCode": "+592",
    "flag": "🇬🇾",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Haiti",
    "code": "HT",
    "dialCode": "+509",
    "flag": "🇭🇹",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Heard Island and McDonald Islands",
    "code": "HM",
    "dialCode": "+672",
    "flag": "🇭🇲",
    "priority": 99,
    "region": "Antarctic"
  },
  {
    "name": "Honduras",
    "code": "HN",
    "dialCode": "+504",
    "flag": "🇭🇳",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Hong Kong",
    "code": "HK",
    "dialCode": "+852",
    "flag": "🇭🇰",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Hungary",
    "code": "HU",
    "dialCode": "+36",
    "flag": "🇭🇺",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Iceland",
    "code": "IS",
    "dialCode": "+354",
    "flag": "🇮🇸",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Indonesia",
    "code": "ID",
    "dialCode": "+62",
    "flag": "🇮🇩",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Iran",
    "code": "IR",
    "dialCode": "+98",
    "flag": "🇮🇷",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Iraq",
    "code": "IQ",
    "dialCode": "+964",
    "flag": "🇮🇶",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Isle of Man",
    "code": "IM",
    "dialCode": "+44",
    "flag": "🇮🇲",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Israel",
    "code": "IL",
    "dialCode": "+972",
    "flag": "🇮🇱",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Ivory Coast",
    "code": "CI",
    "dialCode": "+225",
    "flag": "🇨🇮",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Jamaica",
    "code": "JM",
    "dialCode": "+1",
    "flag": "🇯🇲",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Jersey",
    "code": "JE",
    "dialCode": "+44",
    "flag": "🇯🇪",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Jordan",
    "code": "JO",
    "dialCode": "+962",
    "flag": "🇯🇴",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Kazakhstan",
    "code": "KZ",
    "dialCode": "+7",
    "flag": "🇰🇿",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Kiribati",
    "code": "KI",
    "dialCode": "+686",
    "flag": "🇰🇮",
    "priority": 99,
    "region": "Oceania"
  },
  {
    "name": "Kosovo",
    "code": "XK",
    "dialCode": "+383",
    "flag": "🇽🇰",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Kyrgyzstan",
    "code": "KG",
    "dialCode": "+996",
    "flag": "🇰🇬",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Laos",
    "code": "LA",
    "dialCode": "+856",
    "flag": "🇱🇦",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Latvia",
    "code": "LV",
    "dialCode": "+371",
    "flag": "🇱🇻",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Lebanon",
    "code": "LB",
    "dialCode": "+961",
    "flag": "🇱🇧",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Lesotho",
    "code": "LS",
    "dialCode": "+266",
    "flag": "🇱🇸",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Liberia",
    "code": "LR",
    "dialCode": "+231",
    "flag": "🇱🇷",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Libya",
    "code": "LY",
    "dialCode": "+218",
    "flag": "🇱🇾",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Liechtenstein",
    "code": "LI",
    "dialCode": "+423",
    "flag": "🇱🇮",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Lithuania",
    "code": "LT",
    "dialCode": "+370",
    "flag": "🇱🇹",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Luxembourg",
    "code": "LU",
    "dialCode": "+352",
    "flag": "🇱🇺",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Macau",
    "code": "MO",
    "dialCode": "+853",
    "flag": "🇲🇴",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Madagascar",
    "code": "MG",
    "dialCode": "+261",
    "flag": "🇲🇬",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Malawi",
    "code": "MW",
    "dialCode": "+265",
    "flag": "🇲🇼",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Malaysia",
    "code": "MY",
    "dialCode": "+60",
    "flag": "🇲🇾",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Maldives",
    "code": "MV",
    "dialCode": "+960",
    "flag": "🇲🇻",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Mali",
    "code": "ML",
    "dialCode": "+223",
    "flag": "🇲🇱",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Malta",
    "code": "MT",
    "dialCode": "+356",
    "flag": "🇲🇹",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Marshall Islands",
    "code": "MH",
    "dialCode": "+692",
    "flag": "🇲🇭",
    "priority": 99,
    "region": "Oceania"
  },
  {
    "name": "Martinique",
    "code": "MQ",
    "dialCode": "+596",
    "flag": "🇲🇶",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Mauritania",
    "code": "MR",
    "dialCode": "+222",
    "flag": "🇲🇷",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Mauritius",
    "code": "MU",
    "dialCode": "+230",
    "flag": "🇲🇺",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Mayotte",
    "code": "YT",
    "dialCode": "+262",
    "flag": "🇾🇹",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Micronesia",
    "code": "FM",
    "dialCode": "+691",
    "flag": "🇫🇲",
    "priority": 99,
    "region": "Oceania"
  },
  {
    "name": "Moldova",
    "code": "MD",
    "dialCode": "+373",
    "flag": "🇲🇩",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Monaco",
    "code": "MC",
    "dialCode": "+377",
    "flag": "🇲🇨",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Mongolia",
    "code": "MN",
    "dialCode": "+976",
    "flag": "🇲🇳",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Montenegro",
    "code": "ME",
    "dialCode": "+382",
    "flag": "🇲🇪",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Montserrat",
    "code": "MS",
    "dialCode": "+1",
    "flag": "🇲🇸",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Morocco",
    "code": "MA",
    "dialCode": "+212",
    "flag": "🇲🇦",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Mozambique",
    "code": "MZ",
    "dialCode": "+258",
    "flag": "🇲🇿",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Myanmar",
    "code": "MM",
    "dialCode": "+95",
    "flag": "🇲🇲",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Namibia",
    "code": "NA",
    "dialCode": "+264",
    "flag": "🇳🇦",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Naoero",
    "code": "NR",
    "dialCode": "+674",
    "flag": "🇳🇷",
    "priority": 99,
    "region": "Oceania"
  },
  {
    "name": "Nepal",
    "code": "NP",
    "dialCode": "+977",
    "flag": "🇳🇵",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "New Caledonia",
    "code": "NC",
    "dialCode": "+687",
    "flag": "🇳🇨",
    "priority": 99,
    "region": "Oceania"
  },
  {
    "name": "Nicaragua",
    "code": "NI",
    "dialCode": "+505",
    "flag": "🇳🇮",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Niger",
    "code": "NE",
    "dialCode": "+227",
    "flag": "🇳🇪",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Niue",
    "code": "NU",
    "dialCode": "+683",
    "flag": "🇳🇺",
    "priority": 99,
    "region": "Oceania"
  },
  {
    "name": "Norfolk Island",
    "code": "NF",
    "dialCode": "+672",
    "flag": "🇳🇫",
    "priority": 99,
    "region": "Oceania"
  },
  {
    "name": "North Korea",
    "code": "KP",
    "dialCode": "+850",
    "flag": "🇰🇵",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "North Macedonia",
    "code": "MK",
    "dialCode": "+389",
    "flag": "🇲🇰",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Northern Mariana Islands",
    "code": "MP",
    "dialCode": "+1",
    "flag": "🇲🇵",
    "priority": 99,
    "region": "Oceania"
  },
  {
    "name": "Pakistan",
    "code": "PK",
    "dialCode": "+92",
    "flag": "🇵🇰",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Palau",
    "code": "PW",
    "dialCode": "+680",
    "flag": "🇵🇼",
    "priority": 99,
    "region": "Oceania"
  },
  {
    "name": "Palestine",
    "code": "PS",
    "dialCode": "+970",
    "flag": "🇵🇸",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Panama",
    "code": "PA",
    "dialCode": "+507",
    "flag": "🇵🇦",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Papua New Guinea",
    "code": "PG",
    "dialCode": "+675",
    "flag": "🇵🇬",
    "priority": 99,
    "region": "Oceania"
  },
  {
    "name": "Paraguay",
    "code": "PY",
    "dialCode": "+595",
    "flag": "🇵🇾",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Peru",
    "code": "PE",
    "dialCode": "+51",
    "flag": "🇵🇪",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Philippines",
    "code": "PH",
    "dialCode": "+63",
    "flag": "🇵🇭",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Pitcairn Islands",
    "code": "PN",
    "dialCode": "+64",
    "flag": "🇵🇳",
    "priority": 99,
    "region": "Oceania"
  },
  {
    "name": "Puerto Rico",
    "code": "PR",
    "dialCode": "+1",
    "flag": "🇵🇷",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Réunion",
    "code": "RE",
    "dialCode": "+262",
    "flag": "🇷🇪",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Romania",
    "code": "RO",
    "dialCode": "+40",
    "flag": "🇷🇴",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Russia",
    "code": "RU",
    "dialCode": "+7",
    "flag": "🇷🇺",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Saint Barthélemy",
    "code": "BL",
    "dialCode": "+590",
    "flag": "🇧🇱",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Saint Helena, Ascension and Tristan da Cunha",
    "code": "SH",
    "dialCode": "+290",
    "flag": "🇸🇭",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Saint Kitts and Nevis",
    "code": "KN",
    "dialCode": "+1",
    "flag": "🇰🇳",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Saint Lucia",
    "code": "LC",
    "dialCode": "+1",
    "flag": "🇱🇨",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Saint Martin",
    "code": "MF",
    "dialCode": "+590",
    "flag": "🇲🇫",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Saint Pierre and Miquelon",
    "code": "PM",
    "dialCode": "+508",
    "flag": "🇵🇲",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Saint Vincent and the Grenadines",
    "code": "VC",
    "dialCode": "+1",
    "flag": "🇻🇨",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Samoa",
    "code": "WS",
    "dialCode": "+685",
    "flag": "🇼🇸",
    "priority": 99,
    "region": "Oceania"
  },
  {
    "name": "San Marino",
    "code": "SM",
    "dialCode": "+378",
    "flag": "🇸🇲",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "São Tomé and Príncipe",
    "code": "ST",
    "dialCode": "+239",
    "flag": "🇸🇹",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Senegal",
    "code": "SN",
    "dialCode": "+221",
    "flag": "🇸🇳",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Serbia",
    "code": "RS",
    "dialCode": "+381",
    "flag": "🇷🇸",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Seychelles",
    "code": "SC",
    "dialCode": "+248",
    "flag": "🇸🇨",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Sierra Leone",
    "code": "SL",
    "dialCode": "+232",
    "flag": "🇸🇱",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Sint Maarten",
    "code": "SX",
    "dialCode": "+1",
    "flag": "🇸🇽",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Slovakia",
    "code": "SK",
    "dialCode": "+421",
    "flag": "🇸🇰",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Slovenia",
    "code": "SI",
    "dialCode": "+386",
    "flag": "🇸🇮",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Solomon Islands",
    "code": "SB",
    "dialCode": "+677",
    "flag": "🇸🇧",
    "priority": 99,
    "region": "Oceania"
  },
  {
    "name": "South Georgia",
    "code": "GS",
    "dialCode": "+500",
    "flag": "🇬🇸",
    "priority": 99,
    "region": "Antarctic"
  },
  {
    "name": "South Korea",
    "code": "KR",
    "dialCode": "+82",
    "flag": "🇰🇷",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Sri Lanka",
    "code": "LK",
    "dialCode": "+94",
    "flag": "🇱🇰",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Sudan",
    "code": "SD",
    "dialCode": "+249",
    "flag": "🇸🇩",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Suriname",
    "code": "SR",
    "dialCode": "+597",
    "flag": "🇸🇷",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Svalbard and Jan Mayen",
    "code": "SJ",
    "dialCode": "+47",
    "flag": "🇸🇯",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Syria",
    "code": "SY",
    "dialCode": "+963",
    "flag": "🇸🇾",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Taiwan",
    "code": "TW",
    "dialCode": "+886",
    "flag": "🇹🇼",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Tajikistan",
    "code": "TJ",
    "dialCode": "+992",
    "flag": "🇹🇯",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Thailand",
    "code": "TH",
    "dialCode": "+66",
    "flag": "🇹🇭",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Timor-Leste",
    "code": "TL",
    "dialCode": "+670",
    "flag": "🇹🇱",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Togo",
    "code": "TG",
    "dialCode": "+228",
    "flag": "🇹🇬",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Tokelau",
    "code": "TK",
    "dialCode": "+690",
    "flag": "🇹🇰",
    "priority": 99,
    "region": "Oceania"
  },
  {
    "name": "Tonga",
    "code": "TO",
    "dialCode": "+676",
    "flag": "🇹🇴",
    "priority": 99,
    "region": "Oceania"
  },
  {
    "name": "Trinidad and Tobago",
    "code": "TT",
    "dialCode": "+1",
    "flag": "🇹🇹",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Tunisia",
    "code": "TN",
    "dialCode": "+216",
    "flag": "🇹🇳",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Turkmenistan",
    "code": "TM",
    "dialCode": "+993",
    "flag": "🇹🇲",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Turks and Caicos Islands",
    "code": "TC",
    "dialCode": "+1",
    "flag": "🇹🇨",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Tuvalu",
    "code": "TV",
    "dialCode": "+688",
    "flag": "🇹🇻",
    "priority": 99,
    "region": "Oceania"
  },
  {
    "name": "Ukraine",
    "code": "UA",
    "dialCode": "+380",
    "flag": "🇺🇦",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "United States Minor Outlying Islands",
    "code": "UM",
    "dialCode": "+1",
    "flag": "🇺🇲",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "United States Virgin Islands",
    "code": "VI",
    "dialCode": "+1",
    "flag": "🇻🇮",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Uruguay",
    "code": "UY",
    "dialCode": "+598",
    "flag": "🇺🇾",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Uzbekistan",
    "code": "UZ",
    "dialCode": "+998",
    "flag": "🇺🇿",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Vanuatu",
    "code": "VU",
    "dialCode": "+678",
    "flag": "🇻🇺",
    "priority": 99,
    "region": "Oceania"
  },
  {
    "name": "Vatican City",
    "code": "VA",
    "dialCode": "+379",
    "flag": "🇻🇦",
    "priority": 99,
    "region": "Europe"
  },
  {
    "name": "Venezuela",
    "code": "VE",
    "dialCode": "+58",
    "flag": "🇻🇪",
    "priority": 99,
    "region": "Americas"
  },
  {
    "name": "Vietnam",
    "code": "VN",
    "dialCode": "+84",
    "flag": "🇻🇳",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Wallis and Futuna",
    "code": "WF",
    "dialCode": "+681",
    "flag": "🇼🇫",
    "priority": 99,
    "region": "Oceania"
  },
  {
    "name": "Western Sahara",
    "code": "EH",
    "dialCode": "+212",
    "flag": "🇪🇭",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Yemen",
    "code": "YE",
    "dialCode": "+967",
    "flag": "🇾🇪",
    "priority": 99,
    "region": "Asia"
  },
  {
    "name": "Zambia",
    "code": "ZM",
    "dialCode": "+260",
    "flag": "🇿🇲",
    "priority": 99,
    "region": "Africa"
  },
  {
    "name": "Zimbabwe",
    "code": "ZW",
    "dialCode": "+263",
    "flag": "🇿🇼",
    "priority": 99,
    "region": "Africa"
  }
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
        const seen = new Set();
        const deduplicated = [];
        data.data.forEach(item => {
          const name = typeof item === 'string' ? item : item.name;
          if (name && !seen.has(name.toLowerCase())) {
            seen.add(name.toLowerCase());
            deduplicated.push(item);
          }
        });
        return deduplicated;
      }
    }
  } catch (err) {
    console.warn('[Location] Failed to load remote countries, using offline dataset:', err.message);
  }
  return COUNTRY_OBJECTS;
};

export default COUNTRY_LIST;
