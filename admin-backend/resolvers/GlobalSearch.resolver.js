import { Drone } from "../models/Drone.model.js";
import { Part } from "../models/Parts.model.js";
import { Accessory } from "../models/Accessories.model.js";
import { HirePilot } from "../models/Hirepilot.model.js";
import { HireJob } from "../models/Hirejob.model.js";
import { Service } from "../models/Service.model.js";

export const globalSearchResolver = {
  SearchResult: {
    __resolveType(obj) {
      return obj._typename || null;
    }
  },

  Query: {
    globalSearch: async (_, { query, page = 1, limit = 10, filters = {}, sortBy = "RELEVANCE" }) => {
      // -------------------------
      // 1. QUERY PROCESSING
      // -------------------------
      const originalQuery = query.toLowerCase().trim();
      const skip = (page - 1) * limit;
      const perModelLimit = limit * 3;

      const { types = [], minPrice, maxPrice, brands = [], categories = [], locations = [] } = filters;

      // Step A: Extract Price Ranges & Clean Price Terms
      // e.g., "drone under 100k" -> price conditions, removes "under 100k"
      const { min: parsedMin, max: parsedMax, cleanedText: textAfterPrice } = extractPriceAndClean(originalQuery);

      const finalMinPrice = minPrice || parsedMin;
      const finalMaxPrice = maxPrice || parsedMax;

      // Step B: Extract Types (Fuzzy) & Clean Type Keywords
      // e.g., "partrs for dji" -> types=['PART'], text="for dji"
      const { text: cleanedText, detectedTypes } = extractTypesAndClean(textAfterPrice, types);

      // If user manually filtered types, use those. Otherwise use detected types. 
      // If neither, search everything (empty list).
      const typesToSearch = types.length > 0 ? types : detectedTypes;

      // -------------------------
      // 2. SEARCH EXECUTION
      // -------------------------
      const searchPromises = [];
      const aggregationPromises = [];

      // HELPER: Common query builder
      const buildCommonQuery = (baseQuery, typeName) => {
        // Price Filter
        if (finalMinPrice || finalMaxPrice) {
          if (typeName === 'PILOT') {
            // For pilots, check both perHour and perDay
            const priceOr = [];
            if (finalMinPrice) {
              priceOr.push({ "price.perHour": { $gte: finalMinPrice } });
              priceOr.push({ "price.perDay": { $gte: finalMinPrice } });
            }
            if (finalMaxPrice) {
              priceOr.push({ "price.perHour": { $lte: finalMaxPrice } });
              priceOr.push({ "price.perDay": { $lte: finalMaxPrice } });
            }

            // If we have price filters, we need to construct a valid query. 
            // Simplified logic: matches if EITHER perHour OR perDay fits the range
            // But actually, usually "under 100k" for a pilot might usually mean per day or per hour.
            // Let's being permissive: if the price fits in EITHER field, show it.
            const rangeQuery = {};
            if (finalMinPrice) rangeQuery.$gte = finalMinPrice;
            if (finalMaxPrice) rangeQuery.$lte = finalMaxPrice;

            baseQuery.$or = [
              { "price.perHour": rangeQuery },
              { "price.perDay": rangeQuery }
            ];

          } else {
            baseQuery.price = buildPriceFilter(finalMinPrice, finalMaxPrice);
          }
        }

        // Brand/Category/Location Filters
        if (brands.length && ['DRONE', 'PART', 'ACCESSORY'].includes(typeName)) {
          baseQuery.brand = { $in: brands };
        }
        if (categories.length && ['DRONE', 'ACCESSORY'].includes(typeName)) {
          baseQuery.category = { $in: categories };
        }
        if (locations.length && ['PILOT', 'JOB', 'SERVICE'].includes(typeName)) {
          baseQuery.location = { $in: locations };
        }

        return baseQuery;
      };

      // --- DRONE ---
      if (shouldSearch(typesToSearch, 'DRONE')) {
        let q = { status: "approved", ...buildDroneTextSearch(cleanedText) };
        q = buildCommonQuery(q, 'DRONE');

        let findQ = Drone.find(q).limit(perModelLimit).lean();
        if (sortBy !== "RELEVANCE") findQ = findQ.sort(buildSortOptions(sortBy, "price"));

        searchPromises.push(
          findQ.then(res => res.map(i => ({ ...i, _type: "DRONE", _typename: "DroneSearchResult" })))
        );

        aggregationPromises.push(
          Drone.aggregate([{ $match: { ...q, price: { $exists: true } } }, { $group: { _id: null, min: { $min: "$price" }, max: { $max: "$price" } } }])
        );
      }

      // --- PART ---
      if (shouldSearch(typesToSearch, 'PART')) {
        let q = { status: "approved", ...buildPartTextSearch(cleanedText) };
        q = buildCommonQuery(q, 'PART');

        let findQ = Part.find(q).limit(perModelLimit).lean();
        if (sortBy !== "RELEVANCE") findQ = findQ.sort(buildSortOptions(sortBy, "price"));

        searchPromises.push(
          findQ.then(res => res.map(i => ({ ...i, _type: "PART", _typename: "PartSearchResult" })))
        );
      }

      // --- ACCESSORY ---
      if (shouldSearch(typesToSearch, 'ACCESSORY')) {
        let q = { status: "approved", ...buildAccessoryTextSearch(cleanedText) };
        q = buildCommonQuery(q, 'ACCESSORY');

        let findQ = Accessory.find(q).limit(perModelLimit).lean();
        if (sortBy !== "RELEVANCE") findQ = findQ.sort(buildSortOptions(sortBy, "price"));

        searchPromises.push(
          findQ.then(res => res.map(i => ({ ...i, _type: "ACCESSORY", _typename: "AccessorySearchResult" })))
        );
      }

      // --- PILOT ---
      if (shouldSearch(typesToSearch, 'PILOT')) {
        let q = { adminStatus: "approved", ...buildPilotTextSearch(cleanedText) };
        q = buildCommonQuery(q, 'PILOT');

        let findQ = HirePilot.find(q).limit(perModelLimit).lean();
        if (sortBy !== "RELEVANCE") findQ = findQ.sort(buildSortOptions(sortBy, "price.perHour"));

        searchPromises.push(
          findQ.then(res => res.map(i => ({ ...i, _type: "PILOT", _typename: "HirePilotSearchResult" })))
        );
      }

      // --- JOB ---
      if (shouldSearch(typesToSearch, 'JOB')) {
        let q = { status: "approved", ...buildJobTextSearch(cleanedText) };
        q = buildCommonQuery(q, 'JOB');

        let findQ = HireJob.find(q).limit(perModelLimit).lean();
        if (sortBy !== "RELEVANCE") findQ = findQ.sort(buildSortOptions(sortBy, "postedDate"));

        searchPromises.push(
          findQ.then(res => res.map(i => ({ ...i, _type: "JOB", _typename: "HireJobSearchResult" })))
        );
      }

      // --- SERVICE ---
      if (shouldSearch(typesToSearch, 'SERVICE')) {
        let q = { status: "approved", ...buildServiceTextSearch(cleanedText) };
        q = buildCommonQuery(q, 'SERVICE');

        let findQ = Service.find(q).limit(perModelLimit).lean();
        if (sortBy !== "RELEVANCE") findQ = findQ.sort(buildSortOptions(sortBy, "rating"));

        searchPromises.push(
          findQ.then(res => res.map(i => ({ ...i, _type: "SERVICE", _typename: "ServiceSearchResult" })))
        );
      }

      // -------------------------
      // 3. RESULTS AGGREGATION
      // -------------------------
      const searchResults = await Promise.allSettled(searchPromises);
      const aggregationResults = await Promise.allSettled(aggregationPromises);

      let allResults = [];
      const typeCounts = { DRONE: 0, PART: 0, ACCESSORY: 0, PILOT: 0, JOB: 0, SERVICE: 0 };

      searchResults.forEach(result => {
        if (result.status === "fulfilled" && result.value) {
          const processed = result.value.map(item => {
            const score = calculateRelevanceScore(item, cleanedText); // Use cleaned text for scoring
            typeCounts[item._type]++;
            return {
              ...mapResultToType(item, item._type),
              id: item._id?.toString() || "unknown",
              type: item._type,
              score: score.total,
              relevance: score,
              _typename: item._typename
            };
          });
          allResults = [...allResults, ...processed];
        }
      });

      // Global Sort
      allResults = sortResults(allResults, sortBy);

      // Pagination
      const total = allResults.length;
      const paginatedResults = allResults.slice(skip, skip + limit);
      const totalPages = Math.ceil(total / limit);

      // Aggregations
      const aggregations = await buildAggregations(aggregationResults, typeCounts);

      return {
        results: paginatedResults,
        total,
        page,
        totalPages,
        hasNextPage: page < totalPages,
        aggregations
      };
    }
  }
};

// ==========================================
// HELPERS
// ==========================================

function shouldSearch(typesToSearch, type) {
  return typesToSearch.length === 0 || typesToSearch.includes(type);
}

// Extract price and return cleaned text
function extractPriceAndClean(text) {
  const ranges = { min: null, max: null };
  let cleaned = text;

  // Patterns
  // "under 100k", "under 500"
  // "over 100k", "over 500"
  // "500-1000", "50k-100k"
  const patterns = [
    { regex: /under\s*(\d+)(k?)/i, type: 'MAX' },
    { regex: /over\s*(\d+)(k?)/i, type: 'MIN' },
    { regex: /(\d+)(k?)\s*-\s*(\d+)(k?)/i, type: 'RANGE' }
  ];

  // We loop but only match one pattern meaningfully usually. 
  // Let's try to match them.

  // MAX
  let match = cleaned.match(/under\s*(\d+)(k?)/i);
  if (match) {
    cleaned = cleaned.replace(match[0], '');
    ranges.max = parseInt(match[1]) * (match[2].toLowerCase() === 'k' ? 1000 : 1);
  }

  // MIN
  match = cleaned.match(/over\s*(\d+)(k?)/i);
  if (match) {
    cleaned = cleaned.replace(match[0], '');
    ranges.min = parseInt(match[1]) * (match[2].toLowerCase() === 'k' ? 1000 : 1);
  }

  // RANGE
  match = cleaned.match(/(\d+)(k?)\s*-\s*(\d+)(k?)/i);
  if (match) {
    cleaned = cleaned.replace(match[0], '');
    ranges.min = parseInt(match[1]) * (match[2].toLowerCase() === 'k' ? 1000 : 1);
    ranges.max = parseInt(match[3]) * (match[4].toLowerCase() === 'k' ? 1000 : 1);
  }

  return { ...ranges, cleanedText: cleaned.replace(/\s+/g, ' ').trim() };
}

// Fuzzy matching for types
function extractTypesAndClean(text, existingTypes) {
  if (existingTypes.length > 0) return { text, detectedTypes: [] };

  const TYPE_KEYWORDS = {
    DRONE: ['drone', 'drones', 'uav', 'quadcopter'],
    PART: ['part', 'parts', 'spare', 'motor', 'propeller', 'battery'],
    ACCESSORY: ['accessory', 'accessories', 'case', 'charger'],
    PILOT: ['pilot', 'pilots', 'operator'],
    JOB: ['job', 'jobs', 'hiring', 'career'],
    SERVICE: ['service', 'services', 'repair']
  };

  const words = text.split(/\s+/);
  const detected = new Set();
  const keptWords = [];

  words.forEach(word => {
    let matched = false;
    const lowerWord = word.toLowerCase();

    // Skip short words
    if (lowerWord.length < 3) {
      keptWords.push(word);
      return;
    }

    for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
      if (keywords.some(k => isFuzzyMatch(lowerWord, k))) {
        detected.add(type);
        matched = true;
        break;
      }
    }

    // If matched a type keyword, we REMOVE it from search text (don't push to keptWords)
    // UNLESS... maybe user wants to search for "drone parts" -> Type: PART, Text: drone?
    // Actually "drone parts" -> Type: DRONE (from drone) and PART (from parts)? 
    // Our logic says: if "drone parts", match DRONE and PART. cleaned text empty.
    // This is arguably correct: show all Drones and Parts.

    if (!matched) keptWords.push(word);
  });

  return {
    text: keptWords.join(' '),
    detectedTypes: Array.from(detected)
  };
}

function isFuzzyMatch(word, keyword) {
  if (word === keyword) return true;
  // Simple length check optimization
  if (Math.abs(word.length - keyword.length) > 2) return false;
  return levenshtein(word, keyword) <= 2; // Allow distance of 2 (e.g. partrs -> parts is dist 2: delete r, s match? No wait. partrs -> parts: delete r (parts), match s. Dist 1 if substitution/insertion/deletion) 
  // partrs -> parts. p-p, a-a, r-r, t-t, r->s (sub) = 1. Or: p,a,r,t,r(del),s = 1. 2 is safe.
}

// Low-dependency Levenshtein
function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}


function buildPriceFilter(min, max) {
  const price = {};
  if (min != null) price.$gte = min;
  if (max != null) price.$lte = max;
  return price;
}

// ------------------- TEXT SEARCH BUILDERS -------------------
function buildDroneTextSearch(text) { return buildTextSearch(text, ['name', 'brand', 'model', 'description', 'category', 'uin']); }
function buildPartTextSearch(text) { return buildTextSearch(text, ['name', 'brand', 'model', 'description', 'category']); }
function buildAccessoryTextSearch(text) { return buildTextSearch(text, ['name', 'brand', 'category', 'description']); }
function buildPilotTextSearch(text) { return buildTextSearch(text, ['pilotName', 'pilotCompany', 'specification', 'description', 'location']); } // removed certifications.url as it's not text searchable directly usually
function buildJobTextSearch(text) { return buildTextSearch(text, ['jobName', 'companyName', 'description', 'requirement', 'location', 'jobType']); }
function buildServiceTextSearch(text) { return buildTextSearch(text, ['serviceName', 'serviceType', 'description', 'location']); }

function buildTextSearch(text, fields) {
  if (!text) return {};
  const words = text.split(/\s+/).filter(w => w.length > 2);
  if (!words.length) return {};

  return {
    $and: words.map(word => ({
      $or: fields.map(f => ({ [f]: { $regex: word, $options: 'i' } }))
    }))
  };
}

// ------------------- SORTING & SCORING -------------------
function buildSortOptions(sortBy, priceField = 'price') {
  switch (sortBy) {
    case 'PRICE_ASC': return { [priceField]: 1 };
    case 'PRICE_DESC': return { [priceField]: -1 };
    case 'NEWEST': return { createdAt: -1 };
    default: return null;
  }
}

function calculateRelevanceScore(item, searchText) {
  let textMatch = 0, popularity = 0, recency = 0;
  if (!searchText) return { total: 0, textMatch: 0, popularity: 0, recency: 0 };

  const searchWords = searchText.split(' ');
  const fields = ['name', 'brand', 'model', 'description', 'category', 'pilotName', 'pilotCompany', 'specification', 'jobName', 'companyName', 'serviceName', 'serviceType'];
  fields.forEach(f => {
    if (item[f]) searchWords.forEach(w => { if (item[f] && item[f].toLowerCase().includes(w)) textMatch += 10; });
  });
  textMatch = Math.min(70, textMatch);

  // Recency
  const created = item.createdAt || item.postedDate;
  if (created) {
    recency = Math.max(0, 10 - ((Date.now() - new Date(created)) / (1000 * 60 * 60 * 24 * 30)));
  }

  return { total: textMatch + popularity + recency, textMatch, popularity, recency };
}

function sortResults(results, sortBy) {
  if (sortBy === 'RELEVANCE') return results.sort((a, b) => b.score - a.score);
  return results.sort((a, b) => {
    let aValue = a.price?.perHour || a.price || a.salary || 0;
    let bValue = b.price?.perHour || b.price || b.salary || 0;
    switch (sortBy) {
      case 'PRICE_ASC': return aValue - bValue;
      case 'PRICE_DESC': return bValue - aValue;
      case 'NEWEST':
        const dateA = new Date(a.createdAt || a.postedDate || 0);
        const dateB = new Date(b.createdAt || b.postedDate || 0);
        return dateB - dateA;
      default: return b.score - a.score;
    }
  });
}

function buildAggregations(aggregationResults, typeCounts) {
  let minPrice = Infinity, maxPrice = 0;
  aggregationResults.forEach(r => { if (r.status === 'fulfilled' && r.value[0]) { minPrice = Math.min(minPrice, r.value[0].min || 0); maxPrice = Math.max(maxPrice, r.value[0].max || 0); } });
  if (minPrice === Infinity) minPrice = 0;

  const types = Object.entries(typeCounts).filter(([_, c]) => c > 0).map(([type, count]) => ({ type, count }));

  return { types, brands: [], categories: [], priceRange: { min: minPrice, max: maxPrice } };
}

function mapResultToType(item, type) {
  const base = {};
  switch (type) {
    case 'DRONE': return { ...base, name: item.name, brand: item.brand, model: item.model, price: item.price, image: item.image, quantity: item.quantity, category: item.category, createdAt: item.createdAt };
    case 'PART': return { ...base, name: item.name, brand: item.brand, model: item.model, price: item.price, image: item.image, quantity: item.quantity, compatibleDrones: item.compatibleDrones || [], createdAt: item.createdAt };
    case 'ACCESSORY': return { ...base, name: item.name, brand: item.brand, category: item.category, price: item.price, image: item.image, quantity: item.quantity, description: item.description, createdAt: item.createdAt };
    case 'PILOT': return { ...base, pilotName: item.pilotName, pilotCompany: item.pilotCompany, location: item.location, specification: item.specification, price: item.price, certifications: item.certifications?.map(c => c?.url || c) || [], resume: item.resume?.url || null, description: item.description, experienceYears: item.experienceYears, createdAt: item.createdAt };
    case 'JOB': return { ...base, jobName: item.jobName, companyName: item.companyName, jobType: item.jobType, experience: item.experience, location: item.location, salary: item.salary, description: item.description, requirement: item.requirement, postedDate: item.createdAt };
    case 'SERVICE': return { ...base, serviceName: item.serviceName, serviceType: item.serviceType, location: item.location, price: item.price, description: item.description, createdAt: item.createdAt };
    default: return base;
  }
}
