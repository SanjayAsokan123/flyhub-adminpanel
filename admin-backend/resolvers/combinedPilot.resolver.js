// combinedPilotResolvers.js
import { HirePilot } from "../models/Hirepilot.model.js";
import { BuyerPilot } from "../models/BuyerPilot.model.js";

const sellerPilotLookup = [
  {
    $lookup: {
      from: "sellers",
      localField: "sellerId",
      foreignField: "customId",
      as: "sellerDetails",
    },
  },
  { $unwind: { path: "$sellerDetails", preserveNullAndEmptyArrays: true } },
  {
    $project: {
      _id: 1,
      pilotId: 1,
      pilotName: 1,
      pilotCompany: 1,
      location: 1,
      availability: 1,
      specification: 1,
      price: 1,
      certifications: 1,
      resume: 1,
      description: 1,
      newemail: 1,
      newphoneNumber: 1,
      adminStatus: 1,
      buyerStatus: 1,
      sellerId: 1,
      createdAt: 1,
      updatedAt: 1,
      source: { $literal: "seller" },
      displayId: "$pilotId",
      contactPerson: "$sellerDetails.name",
      contactEmail: { $ifNull: ["$newemail", "$sellerDetails.email"] },
      contactPhone: { $ifNull: ["$newphoneNumber", "$sellerDetails.phoneNumber"] },
    },
  },
];

const buyerPilotLookup = [
  {
    $lookup: {
      from: "buyers",
      localField: "buyerId",
      foreignField: "buyerId",
      as: "buyerDetails",
    },
  },
  { $unwind: { path: "$buyerDetails", preserveNullAndEmptyArrays: true } },
  {
    $project: {
      _id: 1,
      pilotId: "$buyerPilotId",
      pilotName: 1,
      pilotCompany: 1,
      location: 1,
      availability: 1,
      specification: 1,
      price: 1,
      certifications: 1,
      profilePhoto: 1,
      description: 1,
      newemail: 1,
      newphoneNumber: 1,
      adminStatus: 1,
      buyerStatus: 1,
      buyerId: 1,
      createdAt: 1,
      updatedAt: 1,
      source: { $literal: "buyer" },
      displayId: "$buyerPilotId",
      contactPerson: "$buyerDetails.name",
      contactEmail: { $ifNull: ["$newemail", "$buyerDetails.email"] },
      contactPhone: { $ifNull: ["$newphoneNumber", "$buyerDetails.phoneNumber"] },
    },
  },
];

function buildSearchFilter(query, search) {
  const filter = { 
    adminStatus: 'approved',
    availability: true 
  };

  // Text search
  if (query && query.trim()) {
    const searchRegex = { $regex: query, $options: 'i' };
    filter.$or = [
      { pilotName: searchRegex },
      { pilotCompany: searchRegex },
      { location: searchRegex },
      { specification: searchRegex },
      { description: searchRegex }
    ];
  }

  // Location filter
  if (search?.location) {
    filter.location = { $regex: search.location, $options: 'i' };
  }

  // Price filters
  if (search?.minPricePerHour || search?.maxPricePerHour) {
    filter['price.perHour'] = {};
    if (search.minPricePerHour) filter['price.perHour'].$gte = search.minPricePerHour;
    if (search.maxPricePerHour) filter['price.perHour'].$lte = search.maxPricePerHour;
  }

  if (search?.minPricePerDay || search?.maxPricePerDay) {
    filter['price.perDay'] = {};
    if (search.minPricePerDay) filter['price.perDay'].$gte = search.minPricePerDay;
    if (search.maxPricePerDay) filter['price.perDay'].$lte = search.maxPricePerDay;
  }

  return filter;
}

function sortPilots(pilots, sortBy) {
  const sortedPilots = [...pilots];
  
  switch (sortBy) {
    case 'price_low_high':
      return sortedPilots.sort((a, b) => (a.price?.perHour || 0) - (b.price?.perHour || 0));
    case 'price_high_low':
      return sortedPilots.sort((a, b) => (b.price?.perHour || 0) - (a.price?.perHour || 0));
    case 'name_asc':
      return sortedPilots.sort((a, b) => a.pilotName.localeCompare(b.pilotName));
    case 'name_desc':
      return sortedPilots.sort((a, b) => b.pilotName.localeCompare(a.pilotName));
    case 'newest':
      return sortedPilots.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    default:
      return sortedPilots;
  }
}

export const combinedPilotResolvers = {
  Query: {
    getAllApprovedPilotsPaginated: async (_, { page = 1, limit = 10, query = "", search = {} }) => {
      const pageNumber = Math.max(page, 1);
      const pageSize = Math.max(limit, 1);
      const skip = (pageNumber - 1) * pageSize;

      // Build search filter
      const searchFilter = buildSearchFilter(query, search);

      // Execute queries in parallel
      const [sellerPilots, buyerPilots] = await Promise.all([
        HirePilot.aggregate([
          { $match: searchFilter },
          ...sellerPilotLookup
        ]),
        BuyerPilot.aggregate([
          { $match: searchFilter },
          ...buyerPilotLookup
        ])
      ]);

      // Combine results
      let allPilots = [...sellerPilots, ...buyerPilots];

      // Apply sorting if specified
      if (search?.sortBy) {
        allPilots = sortPilots(allPilots, search.sortBy);
      }

     
      const totalCount = allPilots.length;

      
      const paginatedPilots = allPilots.slice(skip, skip + pageSize);

      return {
        items: paginatedPilots,
        totalCount,
        page: pageNumber,
        limit: pageSize,
        pageCount: Math.ceil(totalCount / pageSize),
      };
    },

    getApprovedPilotsCount: async () => {
      const [sellerCount, buyerCount] = await Promise.all([
        HirePilot.countDocuments({ adminStatus: 'approved', availability: true }),
        BuyerPilot.countDocuments({ adminStatus: 'approved', availability: true }),
      ]);
      
      return {
        total: sellerCount + buyerCount,
        sellerCount,
        buyerCount,
      };
    },
  },
};