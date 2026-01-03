import { HirePilot } from "../models/Hirepilot.model.js";
import { Seller } from "../models/Seller.model.js";
import { sendSellerStatusMail } from "../utils/emailService.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";
import { sendPushNotification as sendSellerPush } from "../utils/SendPushNotification.js";

import {
  uploadSingleFile,
  uploadMultipleFiles,
  deleteFirebaseFile,
} from "../utils/uploadToFirebase.js";

const baseLookup = [
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
      seller: {
        name: "$sellerDetails.name",
        email: "$sellerDetails.email",
        phoneNumber: "$sellerDetails.phoneNumber",
      },
    },
  },
];

export const hirePilotResolvers = {
  Query: {
    hirePilots: async () => HirePilot.aggregate(baseLookup),

    hirePilot: async (_, { pilotId }) => {
      const result = await HirePilot.aggregate([
        { $match: { pilotId } },
        ...baseLookup,
      ]);
      return result[0] || null;
    },

    hirePilotsBySeller: async (_, { sellerId }) =>
      HirePilot.aggregate([{ $match: { sellerId } }, ...baseLookup]),

    hirePilotsByStatus: async (_, { adminStatus }) => {
      const validStatuses = ["pending", "approved", "rejected"];
      if (!validStatuses.includes(adminStatus.toLowerCase())) {
        throw new Error(
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        );
      }
      return HirePilot.aggregate([
        { $match: { adminStatus: { $regex: new RegExp(`^${adminStatus}$`, "i") } } },
        ...baseLookup,
      ]);
    },

    approvedHirePilotsByStatus: async () =>
      HirePilot.aggregate([{ $match: { adminStatus: /^approved$/i } }, ...baseLookup]),

    hirePilotsApproved: async (_, { sellerId }) =>
      HirePilot.aggregate([
        { $match: { adminStatus: /^approved$/i, sellerId } },
        ...baseLookup
      ]),

    hirePilotsPending: async (_, { sellerId }) =>
      HirePilot.aggregate([
        { $match: { adminStatus: /^pending$/i, sellerId } },
        ...baseLookup
      ]),

    hirePilotsRejected: async (_, { sellerId }) =>
      HirePilot.aggregate([
        { $match: { adminStatus: /^rejected$/i, sellerId } },
        ...baseLookup
      ]),

    approvedHirePilotsPaginated: async (_, { page, limit, search = {}, query }) => {
      const pageNumber = Math.max(page, 1);
      const pageSize = Math.max(limit, 1);
      const skip = (pageNumber - 1) * pageSize;
      let dynamicFilters = {};
      let searchText = "";
      if (query) {
        const listPrice = extractPriceAndClean(query);
        const { min, max, cleanedText } = listPrice;

        if (min !== null) {
          dynamicFilters.minPrice = min;
        }
        if (max !== null) {
          dynamicFilters.maxPrice = max;
        }
        searchText = removeStopWords(cleanedText);
      }

      const finalMinPricePerHour = search?.minPricePerHour ?? dynamicFilters.minPrice;
      const finalMaxPricePerHour = search?.maxPricePerHour ?? dynamicFilters.maxPrice;
      const finalMinPricePerDay = search?.minPricePerDay ?? dynamicFilters.minPrice;
      const finalMaxPricePerDay = search?.maxPricePerDay ?? dynamicFilters.maxPrice;
      const textSearchStage = [];
      if (searchText) {
        const words = searchText.split(/\s+/).filter(w => w.length > 0);

        words.forEach(word => {
          const regex = { $regex: word, $options: "i" };
          textSearchStage.push({
            $or: [
              { pilotName: regex },
              { pilotCompany: regex },
              { location: regex },
              { specification: regex },
              { description: regex }
            ]
          });
        });
      }
      const matchStage = {
        $match: {
          adminStatus: /^approved$/i,

          ...(search?.pilotName
            ? { pilotName: { $regex: search.pilotName, $options: "i" } }
            : {}),
          ...(search?.location
            ? { location: { $regex: search.location, $options: "i" } }
            : {}),

          ...((dynamicFilters.minPrice || dynamicFilters.maxPrice) && !search?.minPricePerHour && !search?.minPricePerDay
            ? {
              $or: [
                {
                  "price.perHour": {
                    ...(dynamicFilters.minPrice ? { $gte: dynamicFilters.minPrice } : {}),
                    ...(dynamicFilters.maxPrice ? { $lte: dynamicFilters.maxPrice } : {})
                  }
                },
                {
                  "price.perDay": {
                    ...(dynamicFilters.minPrice ? { $gte: dynamicFilters.minPrice } : {}),
                    ...(dynamicFilters.maxPrice ? { $lte: dynamicFilters.maxPrice } : {})
                  }
                }
              ]
            }
            : {}
          ),
          ...(search?.minPricePerHour || search?.maxPricePerHour
            ? {
              "price.perHour": {
                ...(search.minPricePerHour
                  ? { $gte: search.minPricePerHour }
                  : {}),
                ...(search.maxPricePerHour
                  ? { $lte: search.maxPricePerHour }
                  : {}),
              },
            }
            : {}),
          ...(search?.minPricePerDay || search?.maxPricePerDay
            ? {
              "price.perDay": {
                ...(search.minPricePerDay
                  ? { $gte: search.minPricePerDay }
                  : {}),
                ...(search.maxPricePerDay
                  ? { $lte: search.maxPricePerDay }
                  : {}),
              },
            }
            : {}),

          ...(textSearchStage.length > 0 ? { $and: textSearchStage } : {})
        },
      };

      const [result] = await HirePilot.aggregate([
        matchStage,
        {
          $facet: {
            items: [
              ...baseLookup,
              { $skip: skip },
              { $limit: pageSize },
            ],
            totalCount: [{ $count: "count" }],
          },
        },
      ]);

      const totalCount =
        result.totalCount && result.totalCount.length > 0
          ? result.totalCount[0].count
          : 0;

      const pageCount = Math.ceil(totalCount / pageSize);

      return {
        items: result.items,
        totalCount,
        page: pageNumber,
        limit: pageSize,
        pageCount,
      };
    },

  },

  Mutation: {

    addHirePilot: async (_, { input }, { pubsub }) => {
      try {
        const seller = await Seller.findOne({ customId: input.sellerId });
        if (!seller) throw new Error("Seller not found");

        if (!input.pilotId || input.pilotId.trim() === "") {
          throw new Error("pilotId is required");
        }

        const existingPilot = await HirePilot.findOne({ pilotId: input.pilotId });
        if (existingPilot) {
          throw new Error(
            `Pilot ID already exists: ${input.pilotId}. Please regenerate a new ID.`
          );
        }

        const newPilot = new HirePilot({
          ...input,
          adminStatus: "pending",
          buyerStatus: "pending",
        });

        await newPilot.save();

        /* ================= SELLER DB NOTIFICATION ================= */

        await createSellerNotification({
          sellerId: input.sellerId,
          title: "New Pilot Submitted",
          message: `Your pilot "${input.pilotName}" has been submitted and is pending approval.`,
          type: "hire_pilot_listing",
          data: { pilotId: newPilot.pilotId, status: "pending" },
          url: `/seller/pilots/${newPilot.pilotId}`,
          pubsub,
        });

        /* ================= SELLER PUSH ================= */

        if (seller.fcmTokens?.length) {
          await sendSellerPush(
            seller.fcmTokens,
            "Pilot Submitted",
            `Your pilot "${input.pilotName}" has been submitted for approval.`,
            {
              pilotId: newPilot.pilotId,
              status: "pending",
              type: "hire_pilot_submitted",
            }
          );
        }

        /* ================= RETURN POPULATED RESULT ================= */

        const result = await HirePilot.aggregate([
          { $match: { _id: newPilot._id } },
          ...baseLookup,
        ]);

        return result[0];
      } catch (err) {
        console.error("❌ Error adding hire pilot:", err);
        throw new Error("Failed to add hire pilot: " + err.message);
      }
    },


    deleteHirePilot: async (_, { pilotId }, { pubsub }) => {
      try {
        const deleted = await HirePilot.findOneAndDelete({ pilotId });
        if (!deleted) throw new Error("Pilot not found");

        /* ================= DELETE FILES ================= */

        if (deleted.certifications?.length) {
          for (const cert of deleted.certifications) {
            if (cert.url) await deleteFirebaseFile(cert.url);
          }
        }

        if (deleted.resume?.url) {
          await deleteFirebaseFile(deleted.resume.url);
        }

        const seller = await Seller.findOne({ customId: deleted.sellerId });

        /* ================= SELLER DB NOTIFICATION ================= */

        await createSellerNotification({
          sellerId: deleted.sellerId,
          title: "🗑 Pilot Listing Deleted",
          message: `Your pilot "${deleted.pilotName}" has been removed.`,
          type: "hire_pilot_deleted",
          data: { pilotId },
          url: `/seller/pilots`,
          pubsub,
        });

        /* ================= SELLER PUSH ================= */

        if (seller?.fcmTokens?.length) {
          await sendSellerPush(
            seller.fcmTokens,
            "🗑 Pilot Listing Deleted",
            `Your pilot "${deleted.pilotName}" has been deleted successfully.`,
            {
              pilotId,
              type: "hire_pilot_deleted",
            }
          );
        }

        return {
          success: true,
          message: "Pilot and files deleted successfully",
        };
      } catch (err) {
        console.error("❌ Error deleting pilot:", err);
        throw new Error("Failed to delete pilot: " + err.message);
      }
    },

    adminUpdateHirePilotStatus: async (_, { pilotId, adminStatus }, { pubsub }) => {
      const updated = await HirePilot.findOneAndUpdate(
        { pilotId },
        { adminStatus },
        { new: true }
      );
      if (!updated) throw new Error("Pilot not found");

      const seller = await Seller.findOne({ customId: updated.sellerId });

      /* ================= EMAIL ================= */

      if (seller?.email) {
        await sendSellerStatusMail({
          to: seller.email,
          productType: "Hire Pilot",
          productName: updated.pilotName,
          status: adminStatus,
        });
      }

      /* ================= SELLER PUSH ================= */

      if (seller?.fcmTokens?.length) {
        if (adminStatus === "approved") {
          await sendSellerPush(
            seller.fcmTokens,
            "✅ Pilot Approved",
            `Your pilot "${updated.pilotName}" has been approved.`,
            {
              pilotId,
              status: adminStatus,
              type: "hire_pilot_approved",
            }
          );
        }

        if (adminStatus === "rejected") {
          await sendSellerPush(
            seller.fcmTokens,
            "❌ Pilot Rejected",
            `Your pilot "${updated.pilotName}" was rejected. Please contact admin.`,
            {
              pilotId,
              status: adminStatus,
              type: "hire_pilot_rejected",
            }
          );
        }

        if (adminStatus === "pending") {
          await sendSellerPush(
            seller.fcmTokens,
            "Pilot Under Review",
            `Your pilot "${updated.pilotName}" is under review.`,
            {
              pilotId,
              status: adminStatus,
              type: "hire_pilot_pending",
            }
          );
        }
      }

      /* ================= PUBSUB ================= */

      if (pubsub) {
        await pubsub.publish("HIRE_PILOT_STATUS_CHANGED", {
          hirePilotStatusChanged: {
            pilotId,
            pilotName: updated.pilotName,
            adminStatus,
            sellerId: updated.sellerId,
          },
        });
      }

      const result = await HirePilot.aggregate([
        { $match: { _id: updated._id } },
        ...baseLookup,
      ]);

      return result[0];
    },


    buyerUpdateHirePilotStatus: async (_, { pilotId, buyerStatus }, { pubsub }) => {
      const updated = await HirePilot.findOneAndUpdate(
        { pilotId },
        { buyerStatus },
        { new: true }
      );
      if (!updated) throw new Error("Pilot not found");

      const seller = await Seller.findOne({ customId: updated.sellerId });

      /* ================= EMAIL ================= */

      if (seller?.email) {
        await sendSellerStatusMail({
          to: seller.email,
          productType: "Hire Pilot (Buyer Action)",
          productName: updated.pilotName,
          status: buyerStatus,
        });
      }

      /* ================= SELLER DB NOTIFICATION ================= */

      await createSellerNotification({
        sellerId: updated.sellerId,
        title: `Buyer ${buyerStatus.toUpperCase()} for ${updated.pilotName}`,
        message: `A buyer has ${buyerStatus} your pilot post.`,
        type: "buyer_hire_pilot_status",
        data: { pilotId, buyerStatus },
        url: `/seller/pilots/${updated.pilotId}`,
        pubsub,
      });

      /* ================= SELLER PUSH ================= */

      if (seller?.fcmTokens?.length) {
        await sendSellerPush(
          seller.fcmTokens,
          `Buyer ${buyerStatus.toUpperCase()}`,
          `A buyer has ${buyerStatus} your pilot "${updated.pilotName}".`,
          {
            pilotId,
            buyerStatus,
            type: "buyer_hire_pilot_status",
          }
        );
      }

      const result = await HirePilot.aggregate(
        [{ $match: { _id: updated._id } }, ...baseLookup]
      );

      return result[0];
    },

  },

  Subscription: {
    hirePilotStatusChanged: {
      subscribe: (_, __, { pubsub }) =>
        pubsub.asyncIterator("HIRE_PILOT_STATUS_CHANGED"),
    },
  },
};


function extractPriceAndClean(text) {
  const ranges = { min: null, max: null };
  if (!text) return { ...ranges, cleanedText: "" };

  let cleaned = text;

  const maxPatterns = [/under\s*(\d+)(k?)/i, /below\s*(\d+)(k?)/i, /less\s+than\s*(\d+)(k?)/i];
  for (const regex of maxPatterns) {
    const match = cleaned.match(regex);
    if (match) {
      cleaned = cleaned.replace(match[0], '');
      ranges.max = parseInt(match[1]) * (match[2].toLowerCase() === 'k' ? 1000 : 1);
      break;
    }
  }

  const minPatterns = [/over\s*(\d+)(k?)/i, /above\s*(\d+)(k?)/i, /more\s+than\s*(\d+)(k?)/i];
  for (const regex of minPatterns) {
    const match = cleaned.match(regex);
    if (match) {
      cleaned = cleaned.replace(match[0], '');
      ranges.min = parseInt(match[1]) * (match[2].toLowerCase() === 'k' ? 1000 : 1);
      break;
    }
  }

  const rangeMatch = cleaned.match(/(\d+)(k?)\s*-\s*(\d+)(k?)/i);
  if (rangeMatch) {
    cleaned = cleaned.replace(rangeMatch[0], '');
    ranges.min = parseInt(rangeMatch[1]) * (rangeMatch[2].toLowerCase() === 'k' ? 1000 : 1);
    ranges.max = parseInt(rangeMatch[3]) * (rangeMatch[4].toLowerCase() === 'k' ? 1000 : 1);
  }

  return { ...ranges, cleanedText: cleaned.replace(/\s+/g, ' ').trim() };
}

function removeStopWords(text) {
  if (!text) return "";
  const stopWords = ['near', 'in', 'at', 'from', 'around'];
  const words = text.split(/\s+/);
  return words.filter(w => !stopWords.includes(w.toLowerCase())).join(' ');
}