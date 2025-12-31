import { Drone } from "../models/Drone.model.js";
import { Part } from "../models/Parts.model.js";
import { Accessory } from "../models/Accessories.model.js";

export const globalSearchResolvers = {
  SearchResult: {
    __resolveType(obj) {
      if (obj.type === 'DRONE') return 'DroneSearchResult';
      if (obj.type === 'PART') return 'PartSearchResult';
      if (obj.type === 'ACCESSORY') return 'AccessorySearchResult';
      return null;
    }
  },

  Query: {
    globalSearch: async (_, { query, page = 1, limit = 10, filters = {}, sortBy = "RELEVANCE" }) => {
      try {
        console.log('=== INTELLIGENT SEARCH START ===');
        console.log('Original Query:', query);
        console.log('Filters:', JSON.stringify(filters, null, 2));
        console.log('SortBy:', sortBy);

        const skip = (page - 1) * limit;

        const {
          types = [],
          minPrice,
          maxPrice,
          brands = [],
          categories = []
        } = filters;

        const parsedQuery = parseNaturalLanguageQuery(query);
        console.log('Parsed Query:', parsedQuery);

        const { searchKeywords, priceRange, brands: queryBrands, categories: queryCategories } = parsedQuery;

        const combinedFilters = {
          types: types.length > 0 ? types : parsedQuery.types,
          minPrice: minPrice || parsedQuery.priceRange?.min,
          maxPrice: maxPrice || parsedQuery.priceRange?.max,
          brands: [...new Set([...brands, ...queryBrands])],
          categories: [...new Set([...categories, ...queryCategories])]
        };

        console.log('Combined Filters:', combinedFilters);

        const buildBaseQuery = (itemType) => {
          const query = { status: "approved" };

          if (searchKeywords.length > 0) {
            const searchConditions = [];

            searchKeywords.forEach(keyword => {
              if (keyword.length > 2) {
                searchConditions.push(
                  { name: { $regex: keyword, $options: 'i' } },
                  { brand: { $regex: keyword, $options: 'i' } },
                  { model: { $regex: keyword, $options: 'i' } },
                  { category: { $regex: keyword, $options: 'i' } },
                  { description: { $regex: keyword, $options: 'i' } },
                  { tags: { $regex: keyword, $options: 'i' } }
                );
              }
            });

            searchKeywords.forEach(keyword => {
              if (keyword.length > 3) {
                searchConditions.push(
                  { name: { $regex: `.*${keyword}.*`, $options: 'i' } },
                  { brand: { $regex: `.*${keyword}.*`, $options: 'i' } }
                );
              }
            });

            query.$or = searchConditions;
          } else {
            query.$or = [
              { name: { $regex: query, $options: 'i' } },
              { brand: { $regex: query, $options: 'i' } },
              { category: { $regex: query, $options: 'i' } }
            ];
          }

          if (combinedFilters.minPrice != null || combinedFilters.maxPrice != null) {
            query.price = {};
            if (combinedFilters.minPrice != null) {
              query.price.$gte = parseFloat(combinedFilters.minPrice);
            }
            if (combinedFilters.maxPrice != null) {
              query.price.$lte = parseFloat(combinedFilters.maxPrice);
            }
          }

          if (combinedFilters.brands.length > 0) {
            query.brand = { $in: combinedFilters.brands.map(b => b.trim()) };
          }

          if (combinedFilters.categories.length > 0) {
            query.category = { $in: combinedFilters.categories.map(c => c.trim()) };
          }

          return query;
        };

        const searchPromises = [];

        const shouldSearchDrones = combinedFilters.types.length === 0 || combinedFilters.types.includes('DRONE');
        const shouldSearchParts = combinedFilters.types.length === 0 || combinedFilters.types.includes('PART');
        const shouldSearchAccessories = combinedFilters.types.length === 0 || combinedFilters.types.includes('ACCESSORY');

        console.log('Search Scope - Drones:', shouldSearchDrones, 'Parts:', shouldSearchParts, 'Accessories:', shouldSearchAccessories);

        if (shouldSearchDrones) {
          const droneQuery = buildBaseQuery('DRONE');
          searchPromises.push(
            Drone.find(droneQuery)
              .limit(limit * 3)
              .lean()
              .then(drones => {
                console.log(`Found ${drones.length} drones`);
                return drones.map(d => ({
                  ...d,
                  id: d._id?.toString() || d.id?.toString() || '',
                  type: 'DRONE',
                  score: calculateIntelligentRelevanceScore(d, parsedQuery, 'DRONE')
                }));
              })
          );
        }

        if (shouldSearchParts) {
          const partQuery = buildBaseQuery('PART');
          searchPromises.push(
            Part.find(partQuery)
              .limit(limit * 3)
              .lean()
              .then(parts => {
                console.log(`Found ${parts.length} parts`);
                return parts.map(p => ({
                  ...p,
                  id: p._id?.toString() || p.id?.toString() || '',
                  type: 'PART',
                  score: calculateIntelligentRelevanceScore(p, parsedQuery, 'PART')
                }));
              })
          );
        }

        if (shouldSearchAccessories) {
          const accessoryQuery = buildBaseQuery('ACCESSORY');
          searchPromises.push(
            Accessory.find(accessoryQuery)
              .limit(limit * 3)
              .lean()
              .then(accessories => {
                console.log(`Found ${accessories.length} accessories`);
                return accessories.map(a => ({
                  ...a,
                  id: a._id?.toString() || a.id?.toString() || '',
                  type: 'ACCESSORY',
                  score: calculateIntelligentRelevanceScore(a, parsedQuery, 'ACCESSORY')
                }));
              })
          );
        }

        const results = await Promise.allSettled(searchPromises);

        let allResults = [];
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const items = result.value;
            const validItems = items.filter(item => item.id && item.id.trim() !== '');
            allResults = allResults.concat(validItems);
          }
        });

        console.log(`Total valid results before sorting: ${allResults.length}`);

        if (allResults.length === 0) {
          console.log('No results found, trying broader search...');
          return await fallbackSearch(query, page, limit);
        }

        allResults = sortResults(allResults, sortBy);

        const total = allResults.length;
        const paginatedResults = allResults.slice(skip, skip + limit);
        const totalPages = Math.ceil(total / limit);

        console.log('=== INTELLIGENT SEARCH END ===');
        console.log(`Returning ${paginatedResults.length} results`);

        return {
          results: paginatedResults,
          total,
          page,
          totalPages,
          hasNextPage: page < totalPages
        };
      } catch (error) {
        console.error('Search error:', error);
        console.error('Error stack:', error.stack);
        return await fallbackSearch(query, page, limit);
      }
    },

    distinctBrands: async () => {
      try {
        const [droneBrands, partBrands, accessoryBrands] = await Promise.all([
          Drone.distinct('brand', { status: "approved" }),
          Part.distinct('brand', { status: "approved" }),
          Accessory.distinct('brand', { status: "approved" })
        ]);

        const allBrands = [...droneBrands, ...partBrands, ...accessoryBrands]
          .filter(brand => brand && brand.trim())
          .map(brand => brand.trim());

        return [...new Set(allBrands)].sort();
      } catch (error) {
        console.error('Error fetching brands:', error);
        return [];
      }
    },

    distinctCategories: async () => {
      try {
        const [droneCategories, accessoryCategories] = await Promise.all([
          Drone.distinct('category', { status: "approved" }),
          Accessory.distinct('category', { status: "approved" })
        ]);

        const allCategories = [...droneCategories, ...accessoryCategories]
          .filter(cat => cat && cat.trim())
          .map(cat => cat.trim());

        return [...new Set(allCategories)].sort();
      } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
      }
    },

    searchSuggestions: async (_, { query }) => {
      try {
        if (query.length < 2) return [];

        const searchText = query.toLowerCase().trim();
        const parsedQuery = parseNaturalLanguageQuery(searchText);

        const [drones, parts, accessories] = await Promise.all([
          Drone.find({
            $or: [
              { name: { $regex: searchText, $options: 'i' } },
              { brand: { $regex: searchText, $options: 'i' } },
              { model: { $regex: searchText, $options: 'i' } }
            ],
            status: "approved"
          }).limit(5).select('name brand model').lean(),

          Part.find({
            $or: [
              { name: { $regex: searchText, $options: 'i' } },
              { brand: { $regex: searchText, $options: 'i' } }
            ],
            status: "approved"
          }).limit(5).select('name brand').lean(),

          Accessory.find({
            $or: [
              { name: { $regex: searchText, $options: 'i' } },
              { brand: { $regex: searchText, $options: 'i' } }
            ],
            status: "approved"
          }).limit(5).select('name brand').lean()
        ]);

        const suggestions = new Set();

        [...drones, ...parts, ...accessories].forEach(item => {
          if (item.name) suggestions.add(item.name);
          if (item.brand) suggestions.add(`${item.brand} ${item.model || ''}`.trim());
        });

        if (parsedQuery.searchKeywords.length > 0) {
          const mainKeyword = parsedQuery.searchKeywords[0];
          suggestions.add(`${mainKeyword} drone`);
          suggestions.add(`${mainKeyword} camera`);
          suggestions.add(`${mainKeyword} battery`);
        }

        if (searchText.includes('dron')) suggestions.add('Drones');
        if (searchText.includes('part')) suggestions.add('Parts');
        if (searchText.includes('accessor')) suggestions.add('Accessories');
        if (searchText.includes('batter')) suggestions.add('Batteries');
        if (searchText.includes('camera')) suggestions.add('Cameras');
        if (searchText.includes('remote')) suggestions.add('Controllers');

        return Array.from(suggestions)
          .slice(0, 10)
          .map(text => ({ text, type: 'suggestion' }));
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        return [];
      }
    },

    testDataCheck: async () => {
      try {
        const [droneCount, partCount, accessoryCount] = await Promise.all([
          Drone.countDocuments({ status: "approved" }),
          Part.countDocuments({ status: "approved" }),
          Accessory.countDocuments({ status: "approved" })
        ]);

        const [sampleDrone, samplePart, sampleAccessory] = await Promise.all([
          Drone.findOne({ status: "approved" }).lean(),
          Part.findOne({ status: "approved" }).lean(),
          Accessory.findOne({ status: "approved" }).lean()
        ]);

        return {
          counts: {
            drones: droneCount,
            parts: partCount,
            accessories: accessoryCount
          },
          sampleDrone: sampleDrone ? {
            id: sampleDrone._id?.toString() || '',
            name: sampleDrone.name,
            brand: sampleDrone.brand,
            price: sampleDrone.price,
            category: sampleDrone.category
          } : null,
          samplePart: samplePart ? {
            id: samplePart._id?.toString() || '',
            name: samplePart.name,
            brand: samplePart.brand,
            price: samplePart.price,
            category: samplePart.category || 'part'
          } : null,
          sampleAccessory: sampleAccessory ? {
            id: sampleAccessory._id?.toString() || '',
            name: sampleAccessory.name,
            brand: sampleAccessory.brand,
            price: sampleAccessory.price,
            category: sampleAccessory.category
          } : null
        };
      } catch (error) {
        console.error('Test data check error:', error);
        return {
          counts: {
            drones: 0,
            parts: 0,
            accessories: 0
          },
          sampleDrone: null,
          samplePart: null,
          sampleAccessory: null
        };
      }
    }
  }
};

function parseNaturalLanguageQuery(query) {
  const queryLower = query.toLowerCase().trim();

  const result = {
    searchKeywords: [],
    types: [],
    priceRange: null,
    brands: [],
    categories: []
  };

  if (queryLower.includes('drone') || queryLower.includes('quadcopter')) {
    result.types.push('DRONE');
    result.searchKeywords.push('drone');
  }
  if (queryLower.includes('part') || queryLower.includes('component')) {
    result.types.push('PART');
    result.searchKeywords.push('part');
  }
  if (queryLower.includes('accessory') || queryLower.includes('accessories')) {
    result.types.push('ACCESSORY');
    result.searchKeywords.push('accessory');
  }

  const pricePatterns = [
    { regex: /under\s*(\d+)/i, type: 'max' },
    { regex: /below\s*(\d+)/i, type: 'max' },
    { regex: /less than\s*(\d+)/i, type: 'max' },
    { regex: /above\s*(\d+)/i, type: 'min' },
    { regex: /over\s*(\d+)/i, type: 'min' },
    { regex: /more than\s*(\d+)/i, type: 'min' },
    { regex: /between\s*(\d+)\s*and\s*(\d+)/i, type: 'range' },
    { regex: /(\d+)\s*to\s*(\d+)/i, type: 'range' }
  ];

  for (const pattern of pricePatterns) {
    const match = queryLower.match(pattern.regex);
    if (match) {
      if (pattern.type === 'max') {
        result.priceRange = { max: parseInt(match[1]) };
      } else if (pattern.type === 'min') {
        result.priceRange = { min: parseInt(match[1]) };
      } else if (pattern.type === 'range') {
        result.priceRange = { min: parseInt(match[1]), max: parseInt(match[2]) };
      }
      break;
    }
  }

  const knownBrands = ['dji', 'autel', 'parrot', 'skydio', 'yuneec', 'holy stone', 'potensic'];
  knownBrands.forEach(brand => {
    if (queryLower.includes(brand)) {
      result.brands.push(brand.toUpperCase());
      result.searchKeywords.push(brand);
    }
  });

  const categories = {
    'camera': ['camera', '4k', 'hd', 'gimbal'],
    'racing': ['racing', 'fpv', 'speed'],
    'toy': ['toy', 'beginner', 'kid'],
    'professional': ['professional', 'commercial', 'enterprise'],
    'battery': ['battery', 'power', 'charger'],
    'controller': ['controller', 'remote', 'transmitter']
  };

  Object.entries(categories).forEach(([category, keywords]) => {
    if (keywords.some(keyword => queryLower.includes(keyword))) {
      result.categories.push(category);
      result.searchKeywords.push(category);
    }
  });

  const stopWords = ['low', 'high', 'price', 'cheap', 'expensive', 'best', 'good', 'quality',
    'buy', 'find', 'search', 'looking', 'for', 'want', 'need', 'the', 'a', 'an'];

  const words = queryLower.split(/\s+/)
    .filter(word => word.length > 2)
    .filter(word => !stopWords.includes(word))
    .filter(word => !result.searchKeywords.some(kw => kw.includes(word)));

  result.searchKeywords = [...result.searchKeywords, ...words];

  if (result.searchKeywords.length === 0) {
    result.searchKeywords.push(queryLower);
  }

  console.log('Parsed Query Result:', result);
  return result;
}

function calculateIntelligentRelevanceScore(item, parsedQuery, type) {
  let score = 0;
  const { searchKeywords, priceRange } = parsedQuery;

  searchKeywords.forEach(keyword => {
    const fields = getSearchFieldsForType(type);
    fields.forEach(field => {
      const fieldValue = item[field]?.toString().toLowerCase();
      if (fieldValue) {
        if (fieldValue === keyword) score += 100;
        if (fieldValue.includes(keyword)) score += 50;
        if (fieldValue.startsWith(keyword)) score += 75;
      }
    });
  });

  if (item.name) {
    const nameLower = item.name.toLowerCase();
    searchKeywords.forEach(keyword => {
      if (nameLower.includes(keyword)) score += 80;
      if (nameLower === keyword) score += 120;
    });
  }

  if (item.brand) {
    const brandLower = item.brand.toLowerCase();
    searchKeywords.forEach(keyword => {
      if (brandLower.includes(keyword)) score += 60;
    });
  }

  if (priceRange && item.price) {
    const price = item.price;
    if (priceRange.min && price >= priceRange.min) score += 40;
    if (priceRange.max && price <= priceRange.max) score += 40;
  }

  if (item.category && parsedQuery.categories.includes(item.category.toLowerCase())) {
    score += 70;
  }

  if (item.createdAt) {
    const daysOld = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld < 30) score += 30;
  }

  return Math.min(200, score) / 200;
}

async function fallbackSearch(query, page, limit) {
  console.log('Running fallback search for:', query);

  try {
    const [drones, parts, accessories] = await Promise.all([
      Drone.find({
        status: "approved",
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { brand: { $regex: query, $options: 'i' } }
        ]
      }).limit(limit).lean(),

      Part.find({
        status: "approved",
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { brand: { $regex: query, $options: 'i' } }
        ]
      }).limit(limit).lean(),

      Accessory.find({
        status: "approved",
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { brand: { $regex: query, $options: 'i' } }
        ]
      }).limit(limit).lean()
    ]);

    const allResults = [
      ...drones.map(d => ({ ...d, id: d._id?.toString(), type: 'DRONE', score: 0.5 })),
      ...parts.map(p => ({ ...p, id: p._id?.toString(), type: 'PART', score: 0.5 })),
      ...accessories.map(a => ({ ...a, id: a._id?.toString(), type: 'ACCESSORY', score: 0.5 }))
    ];

    const total = allResults.length;
    const skip = (page - 1) * limit;
    const paginatedResults = allResults.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit);

    return {
      results: paginatedResults,
      total,
      page,
      totalPages,
      hasNextPage: page < totalPages
    };
  } catch (error) {
    console.error('Fallback search error:', error);
    return {
      results: [],
      total: 0,
      page,
      totalPages: 0,
      hasNextPage: false
    };
  }
}

function getSearchFieldsForType(type) {
  switch (type) {
    case 'DRONE':
      return ['name', 'brand', 'model', 'category', 'description', 'tags'];
    case 'PART':
      return ['name', 'brand', 'model', 'description', 'tags'];
    case 'ACCESSORY':
      return ['name', 'brand', 'category', 'description', 'tags'];
    default:
      return ['name', 'brand', 'description'];
  }
}

function sortResults(results, sortBy) {
  if (!results || results.length === 0) return results;

  const resultsCopy = [...results];

  switch (sortBy.toUpperCase()) {
    case 'PRICE_ASC':
      return resultsCopy.sort((a, b) => (a.price || 0) - (b.price || 0));

    case 'PRICE_DESC':
      return resultsCopy.sort((a, b) => (b.price || 0) - (a.price || 0));

    case 'NEWEST':
      return resultsCopy.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });

    case 'RELEVANCE':
    default:
      return resultsCopy.sort((a, b) => (b.score || 0) - (a.score || 0));
  }
}