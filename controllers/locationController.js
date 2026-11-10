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
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s network timeout
    const cleanKey = apiKey.trim();

    // Fetch all pages (100 countries/page capped by API plan) to cover all 250+ world countries
    const pages = [0, 100, 200];
    const fetchPromises = pages.map(offset =>
      fetch(`https://restcountries.com/countries/v5?limit=100&offset=${offset}&api_key=${cleanKey}`, {
        signal: controller.signal
      }).then(r => r.ok ? r.json() : null).catch(() => null)
    );

    const results = await Promise.all(fetchPromises);
    clearTimeout(timeout);

    const rawList = [];
    results.forEach(res => {
      if (res && res.data && Array.isArray(res.data.objects)) {
        rawList.push(...res.data.objects);
      }
    });

    if (rawList.length === 0) {
      console.warn('[Location Service] Empty response from REST Countries v5. Using cached/fallback data.');
      return BASE_COUNTRIES;
    }

    // Map and enrich with base metadata
    const priorityMap = new Map();
    BASE_COUNTRIES.forEach(b => priorityMap.set(b.code, b));

    const enriched = rawList.map(item => {
      const name = item.names?.common || item.name || '';
      const code = (item.codes?.alpha_2 || item.cca2 || '').toUpperCase();
      const code3 = (item.codes?.alpha_3 || item.cca3 || '').toUpperCase();
      const rawDial = item.calling_codes?.[0] || item.idd?.root;
      let dialCode = '';
      if (rawDial) {
        dialCode = rawDial.startsWith('+') ? rawDial : `+${rawDial}`;
      }

      const matchBase = priorityMap.get(code) || BASE_COUNTRIES.find(b => b.name.toLowerCase() === name.toLowerCase());

      return {
        name,
        officialName: item.names?.official || name,
        code,
        code3,
        dialCode: dialCode || matchBase?.dialCode || '',
        flag: matchBase?.flag || (code.length === 2 ? getFlagEmoji(code) : '🌐'),
        currency: matchBase?.currency || item.currencies?.[0]?.code || 'USD',
        region: item.region || matchBase?.region || 'International',
        subregion: item.subregion || '',
        priority: matchBase?.priority || 99
      };
    }).filter(c => c.name && c.code && c.code.length === 2);

    // Deduplicate by ISO alpha-2 code
    const seen = new Set();
    const deduped = [];
    enriched.forEach(c => {
      if (!seen.has(c.code)) {
        seen.add(c.code);
        deduped.push(c);
      }
    });

    // Ensure Kenya and top regional partners exist and stay prioritized
    deduped.forEach(c => {
      if (priorityMap.has(c.code)) {
        c.priority = priorityMap.get(c.code).priority;
        if (!c.dialCode) c.dialCode = priorityMap.get(c.code).dialCode;
      }
    });

    // Sort: prioritized countries first (Kenya #1, East Africa #2-8, etc.), then alphabetically by name
    deduped.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.name.localeCompare(b.name);
    });

    countriesCache = deduped;
    lastCacheSync = Date.now();
    console.log(`[Location Service] Successfully refreshed all ${deduped.length} world countries from REST Countries API v5.`);
    return deduped;
  } catch (error) {
    console.warn(`[Location Service] REST Countries API fetch bypassed (${error.message}). Serving local resilient data.`);
    countriesCache = BASE_COUNTRIES;
    lastCacheSync = Date.now();
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

