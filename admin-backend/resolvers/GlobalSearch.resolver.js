import { Drone } from "../models/Drone.model.js";
import { Part } from "../models/Parts.model.js";
import { Accessory } from "../models/Accessories.model.js";

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

      // OPTIMIZATION 1: Early return if query is empty and no critical filters are active
      if (!originalQuery && !minPrice && !maxPrice && brands.length === 0 && categories.length === 0) {
        return {
          results: [],
          total: 0,
          page,
          totalPages: 0,
          hasNextPage: false,
          aggregations: {
            types: [],
            brands: [],
            categories: [],
            priceRange: { min: 0, max: 0 }
          }
        };
      }

      // Step A: Extract Price Ranges & Clean Price Terms
      // e.g., "drone under 100k" -> price conditions, removes "under 100k"
      const { min: parsedMin, max: parsedMax, cleanedText: textAfterPrice } = extractPriceAndClean(originalQuery);

      const finalMinPrice = minPrice || parsedMin;
      const finalMaxPrice = maxPrice || parsedMax;

      // Step B: Extract Types (Fuzzy) & Clean Type Keywords
      // e.g., "partrs for dji" -> types=['PART'], text="for dji"
      const { text: cleanedTextWithStopWords, detectedTypes } = extractTypesAndClean(textAfterPrice, types);

      // Step C: Remove Spatial Stop Words
      // e.g. "pilot near chennai" -> "pilot chennai"
      const cleanedText = removeStopWords(cleanedTextWithStopWords);

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
          // Pilot logic removed, standard price filter for products
          baseQuery.price = buildPriceFilter(finalMinPrice, finalMaxPrice);
        }

        // Brand/Category Filters
        if (brands.length && ['DRONE', 'PART', 'ACCESSORY'].includes(typeName)) {
          baseQuery.brand = { $in: brands }; // Case sensitivity might need $regex if brands are free-text
        }
        if (categories.length && ['DRONE', 'ACCESSORY'].includes(typeName)) {
          baseQuery.category = { $in: categories };
        }

        // Location filters removed for pure product search unless Products have location?
        // Usually Products are shippable, but if they have seller location...
        // Assuming current Product Schema doesn't heavily rely on location filter for Global Search.

        return baseQuery;
      };

      // --- DRONE ---
      if (shouldSearch(typesToSearch, 'DRONE')) {
        let q = { status: "approved", ...buildDroneTextSearch(cleanedText) };
        q = buildCommonQuery(q, 'DRONE');

        let findQ = Drone.find(q).select('name brand model uin price image quantity category createdAt').limit(perModelLimit).lean();
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

        let findQ = Part.find(q).select('name brand model description price image quantity compatibleDrones createdAt').limit(perModelLimit).lean();
        if (sortBy !== "RELEVANCE") findQ = findQ.sort(buildSortOptions(sortBy, "price"));

        searchPromises.push(
          findQ.then(res => res.map(i => ({ ...i, _type: "PART", _typename: "PartSearchResult" })))
        );
      }

      // --- ACCESSORY ---
      if (shouldSearch(typesToSearch, 'ACCESSORY')) {
        let q = { status: "approved", ...buildAccessoryTextSearch(cleanedText) };
        q = buildCommonQuery(q, 'ACCESSORY');

        let findQ = Accessory.find(q).select('name brand category description price image quantity createdAt').limit(perModelLimit).lean();
        if (sortBy !== "RELEVANCE") findQ = findQ.sort(buildSortOptions(sortBy, "price"));

        searchPromises.push(
          findQ.then(res => res.map(i => ({ ...i, _type: "ACCESSORY", _typename: "AccessorySearchResult" })))
        );
      }

      // -------------------------
      // 3. RESULTS AGGREGATION
      // -------------------------
      const searchResults = await Promise.allSettled(searchPromises);
      const aggregationResults = await Promise.allSettled(aggregationPromises);

      let allResults = [];
      const typeCounts = { DRONE: 0, PART: 0, ACCESSORY: 0 };

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
  // MAX: "under 100k", "below 500", "less than 500", "under 500"
  // MIN: "over 100k", "above 500", "more than 500"
  // RANGE: "500-1000", "50k-100k"

  // We process specific patterns and remove them from text.

  // MAX
  const maxPatterns = [/under\s*(\d+)(k?)/i, /below\s*(\d+)(k?)/i, /less\s+than\s*(\d+)(k?)/i];
  for (const regex of maxPatterns) {
    const match = cleaned.match(regex);
    if (match) {
      cleaned = cleaned.replace(match[0], '');
      ranges.max = parseInt(match[1]) * (match[2].toLowerCase() === 'k' ? 1000 : 1);
      break; // Assume only one price constraint of this type
    }
  }

  // MIN
  const minPatterns = [/over\s*(\d+)(k?)/i, /above\s*(\d+)(k?)/i, /more\s+than\s*(\d+)(k?)/i];
  for (const regex of minPatterns) {
    const match = cleaned.match(regex);
    if (match) {
      cleaned = cleaned.replace(match[0], '');
      ranges.min = parseInt(match[1]) * (match[2].toLowerCase() === 'k' ? 1000 : 1);
      break;
    }
  }

  // RANGE
  const rangeMatch = cleaned.match(/(\d+)(k?)\s*-\s*(\d+)(k?)/i);
  if (rangeMatch) {
    cleaned = cleaned.replace(rangeMatch[0], '');
    ranges.min = parseInt(rangeMatch[1]) * (rangeMatch[2].toLowerCase() === 'k' ? 1000 : 1);
    ranges.max = parseInt(rangeMatch[3]) * (rangeMatch[4].toLowerCase() === 'k' ? 1000 : 1);
  }

  return { ...ranges, cleanedText: cleaned.replace(/\s+/g, ' ').trim() };
}

// Fuzzy matching for types
function extractTypesAndClean(text, existingTypes) {
  if (existingTypes.length > 0) return { text, detectedTypes: [] };

  const TYPE_KEYWORDS = {
    DRONE: ['drone', 'drones', 'uav', 'quadcopter'],
    PART: ['part', 'parts', 'spare', 'motor', 'propeller', 'battery'],
    ACCESSORY: ['accessory', 'accessories', 'case', 'charger']
    // Pilot, Job, Service removed
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
// Removed Pilot, Job, Service text search builders

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
  const fields = ['name', 'brand', 'model', 'description', 'category', 'specification'];
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
    default: return base;
  }
}

function removeStopWords(text) {
  if (!text) return "";
  const stopWords = ['near', 'in', 'at', 'from', 'around'];
  const words = text.split(/\s+/);
  return words.filter(w => !stopWords.includes(w.toLowerCase())).join(' ');
}
