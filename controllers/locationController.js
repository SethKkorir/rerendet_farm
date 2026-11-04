// controllers/locationController.js — Global Country & Location Management Controller
// Authenticated via REST Countries API v5 with in-memory caching and offline resilience

import asyncHandler from 'express-async-handler';
import { BASE_COUNTRIES, SUBDIVISIONS, getFlagEmoji } from '../utils/globalLocationsData.js';
import { KENYA_LOCATIONS, getShippingZone } from '../utils/kenyaLocations.js';

// In-memory cache for country dataset
let countriesCache = null;
let lastCacheSync = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch fresh country records from REST Countries API v5
 */
async function syncFromRestCountriesV5() {
  const apiKey = process.env.REST_COUNTRIES_API_KEY;
  if (!apiKey) {
    return BASE_COUNTRIES;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s network timeout

    const response = await fetch('https://api.restcountries.com/countries/v5?response_fields=names,codes,calling_codes,region,subregion,currencies', {
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[Location Service] REST Countries v5 returned HTTP ${response.status}. Using cached/fallback data.`);
      return BASE_COUNTRIES;
    }

    const payload = await response.json();
    const rawList = payload?.data?.objects || (Array.isArray(payload) ? payload : []);

    if (!rawList || rawList.length === 0) {
      return BASE_COUNTRIES;
    }

    // Merge and enrich with base countries
    const enriched = rawList.map(item => {
      const name = item.names?.common || item.name || 'Unknown';
      const code = (item.codes?.alpha_2 || item.cca2 || '').toUpperCase();
      const code3 = (item.codes?.alpha_3 || item.cca3 || '').toUpperCase();
      const rawDial = item.calling_codes?.[0] || item.idd?.root;
      let dialCode = '';
      if (rawDial) {
        dialCode = rawDial.startsWith('+') ? rawDial : `+${rawDial}`;
        if (item.idd?.suffixes?.[0] && !rawDial.includes('+')) {
          dialCode += item.idd.suffixes[0];
        }
      }

      const matchBase = BASE_COUNTRIES.find(b => b.code === code || b.name.toLowerCase() === name.toLowerCase());

      return {
        name: name,
        officialName: item.names?.official || name,
        code: code,
        code3: code3,
        dialCode: dialCode || matchBase?.dialCode || '',
        flag: matchBase?.flag || getFlagEmoji(code),
        region: item.region || matchBase?.region || 'International',
        subregion: item.subregion || '',
        priority: matchBase?.priority || 99
      };
    }).filter(c => c.name && c.code);

    // Ensure Kenya and top regional partners exist and stay prioritized
    const priorityMap = new Map();
    BASE_COUNTRIES.forEach(b => priorityMap.set(b.code, b));

    enriched.forEach(c => {
      if (priorityMap.has(c.code)) {
        c.priority = priorityMap.get(c.code).priority;
        if (!c.dialCode) c.dialCode = priorityMap.get(c.code).dialCode;
      }
    });

    // Sort: prioritized countries first (Kenya #1, East Africa #2-8, etc.), then alphabetically by name
    enriched.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.name.localeCompare(b.name);
    });

    countriesCache = enriched;
    lastCacheSync = Date.now();
    console.log(`[Location Service] Successfully refreshed ${enriched.length} countries from REST Countries API v5.`);
    return enriched;
  } catch (error) {
    console.warn(`[Location Service] REST Countries API fetch bypassed (${error.message}). Serving local resilient data.`);
    return BASE_COUNTRIES;
  }
}

/**
 * @desc    Get all supported countries with dialing codes and flags
 * @route   GET /api/locations/countries
 * @access  Public
 */
export const getCountries = asyncHandler(async (req, res) => {
  const now = Date.now();
  if (countriesCache && (now - lastCacheSync < CACHE_TTL)) {
    return res.json({
      success: true,
      source: 'cache',
      count: countriesCache.length,
      data: countriesCache
    });
  }

  // Trigger sync or fallback
  const countries = await syncFromRestCountriesV5();
  res.json({
    success: true,
    source: countriesCache ? 'api_v5' : 'fallback',
    count: countries.length,
    data: countries
  });
});

/**
 * @desc    Get country details by 2-letter or 3-letter code
 * @route   GET /api/locations/countries/:code
 * @access  Public
 */
export const getCountryByCode = asyncHandler(async (req, res) => {
  const codeParam = (req.params.code || '').toUpperCase().trim();
  const list = countriesCache || BASE_COUNTRIES;

  const found = list.find(c => c.code === codeParam || c.code3 === codeParam || c.name.toUpperCase() === codeParam);

  if (!found) {
    return res.status(404).json({
      success: false,
      message: `Country '${codeParam}' not found`
    });
  }

  const subdivisions = SUBDIVISIONS[found.code] || null;

  res.json({
    success: true,
    data: {
      ...found,
      subdivisions: subdivisions ? subdivisions.divisions : [],
      subdivisionType: subdivisions ? subdivisions.type : 'State / Province / County'
    }
  });
});

/**
 * @desc    Get administrative subdivisions (Counties / States / Provinces) for a country
 * @route   GET /api/locations/subdivisions/:code
 * @access  Public
 */
export const getSubdivisions = asyncHandler(async (req, res) => {
  const codeParam = (req.params.code || '').toUpperCase().trim();
  const data = SUBDIVISIONS[codeParam];

  if (!data) {
    return res.json({
      success: true,
      countryCode: codeParam,
      hasSubdivisions: false,
      type: 'State / Province / County',
      divisions: []
    });
  }

  res.json({
    success: true,
    countryCode: codeParam,
    hasSubdivisions: true,
    type: data.type,
    divisions: data.divisions,
    townsByDivision: data.townsByDivision || null
  });
});

/**
 * @desc    Get all 47 Kenyan Counties and towns
 * @route   GET /api/locations/kenya
 * @access  Public
 */
export const getKenyaLocations = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    country: 'Kenya',
    countiesCount: Object.keys(KENYA_LOCATIONS).length,
    counties: Object.keys(KENYA_LOCATIONS).sort(),
    locations: KENYA_LOCATIONS
  });
});
