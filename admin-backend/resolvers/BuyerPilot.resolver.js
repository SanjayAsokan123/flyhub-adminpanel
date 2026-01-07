import { BuyerPilot } from "../models/BuyerPilot.model.js";
import { Buyer } from "../models/Buyer.model.js";

const baseLookup = [
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
      buyerPilotId: 1,
      pilotName: 1,
      pilotCompany: 1,
      location: 1,
      availability: 1,
      specification: 1,
      price: 1,
      profilePhoto: 1,
      certifications: 1,
      description: 1,
      newemail: 1,
      newphoneNumber: 1,
      adminStatus: 1,
      buyerStatus: 1,
      buyerId: 1,
      createdAt: 1,
      updatedAt: 1,
      buyer: {
        id: "$buyerDetails._id", 
        buyerId: "$buyerDetails.buyerId",
        name: "$buyerDetails.name",
        email: "$buyerDetails.email",
        phoneNumber: "$buyerDetails.phoneNumber",
      },
    },
  },
];

export const buyerPilotResolvers = {
  Query: {
    buyerPilots: async () => BuyerPilot.aggregate(baseLookup),

    buyerPilot: async (_, { buyerPilotId }) => {
      const res = await BuyerPilot.aggregate([
        { $match: { buyerPilotId } },
        ...baseLookup,
      ]);
      return res[0] || null;
    },

    buyerPilotsByBuyer: async (_, { buyerId }) =>
      BuyerPilot.aggregate([{ $match: { buyerId } }, ...baseLookup]),
    
    getApprovedPilots: async () => {
      return BuyerPilot.aggregate([
        { 
          $match: { 
            adminStatus: 'approved',
            availability: true 
          } 
        },
        ...baseLookup
      ]);
    },

    getApprovedPilotsPaginated: async (_, { page, limit, search, query }) => {
      const skip = (page - 1) * limit;
      
      const matchFilter = {
        adminStatus: 'approved',
        availability: true
      };

      if (query && query.trim()) {
        matchFilter.$or = [
          { pilotName: { $regex: query, $options: 'i' } },
          { pilotCompany: { $regex: query, $options: 'i' } },
          { location: { $regex: query, $options: 'i' } },
          { specification: { $regex: query, $options: 'i' } }
        ];
      }

      if (search) {
        Object.keys(search).forEach(key => {
          if (search[key] !== undefined && search[key] !== null) {
            if (key === 'minPricePerHour') {
              matchFilter['price.perHour'] = { ...matchFilter['price.perHour'], $gte: search[key] };
            } else if (key === 'maxPricePerHour') {
              matchFilter['price.perHour'] = { ...matchFilter['price.perHour'], $lte: search[key] };
            } else {
              matchFilter[key] = search[key];
            }
          }
        });
      }

      const pipeline = [
        { $match: matchFilter },
        ...baseLookup,
        { $facet: {
            items: [
              { $skip: skip },
              { $limit: limit }
            ],
            totalCount: [
              { $count: "count" }
            ]
          }
        },
        { $unwind: { path: "$totalCount", preserveNullAndEmptyArrays: true } },
        { $project: {
            items: 1,
            totalCount: { $ifNull: ["$totalCount.count", 0] },
            pageCount: { $ceil: { $divide: [{ $ifNull: ["$totalCount.count", 0] }, limit] } },
            currentPage: page,
            hasNextPage: { $lt: [skip + limit, { $ifNull: ["$totalCount.count", 0] }] }
          }
        }
      ];

      const result = await BuyerPilot.aggregate(pipeline);
      return result[0] || { 
        items: [], 
        totalCount: 0, 
        pageCount: 0, 
        currentPage: page, 
        hasNextPage: false 
      };
    },

    getApprovedPilotById: async (_, { buyerPilotId }) => {
      const res = await BuyerPilot.aggregate([
        { 
          $match: { 
            buyerPilotId, 
            adminStatus: 'approved',
            availability: true 
          } 
        },
        ...baseLookup
      ]);
      return res[0] || null;
    },

    getApprovedPilotLocations: async () => {
      const locations = await BuyerPilot.distinct('location', {
        adminStatus: 'approved',
        availability: true
      });
      return { locations: locations.filter(loc => loc) };
    },
  },

  Mutation: {
    addBuyerPilot: async (_, { input }) => {
      const buyer = await Buyer.findOne({ buyerId: input.buyerId });
      if (!buyer) throw new Error("Buyer not found");

      const pilot = new BuyerPilot(input);
      await pilot.save();

      const res = await BuyerPilot.aggregate([
        { $match: { _id: pilot._id } },
        ...baseLookup,
      ]);

      return res[0];
    },

    adminUpdateBuyerPilotStatus: async (_, { buyerPilotId, adminStatus }) =>
      BuyerPilot.findOneAndUpdate(
        { buyerPilotId },
        { adminStatus },
        { new: true }
      ),

    buyerUpdateBuyerPilotStatus: async (_, { buyerPilotId, buyerStatus }) =>
      BuyerPilot.findOneAndUpdate(
        { buyerPilotId },
        { buyerStatus },
        { new: true }
      ),

    deleteBuyerPilot: async (_, { buyerPilotId }) => {
      await BuyerPilot.findOneAndDelete({ buyerPilotId });
      return true;
    },
  },

  BuyerPilot: {
    // Additional fields for combined queries
    _source: () => "buyer",
    displayId: (parent) => parent.buyerPilotId,
    contactEmail: (parent) => parent.newemail,
    contactPhone: (parent) => parent.newphoneNumber,
  },
};