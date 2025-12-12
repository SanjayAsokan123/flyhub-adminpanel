import { HirePilot } from "../models/Hirepilot.model.js";
import { Seller } from "../models/Seller.model.js";
import { sendSellerStatusMail } from "../utils/emailService.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";
import { sendPushNotification } from "../utils/SendPushNotification.js";
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

   approvedHirePilotsPaginated: async (_, { page, limit, search }) => {
  const pageNumber = Math.max(page, 1);
  const pageSize = Math.max(limit, 1);
  const skip = (pageNumber - 1) * pageSize;

  // Build dynamic search filters
  const matchStage = {
    $match: {
      adminStatus: /^approved$/i,
      ...(search?.pilotName
        ? { pilotName: { $regex: search.pilotName, $options: "i" } }
        : {}),
      ...(search?.location
        ? { location: { $regex: search.location, $options: "i" } }
        : {}),
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
    },
  };

  const [result] = await HirePilot.aggregate([
    matchStage,
    {
      $facet: {
        items: [
          ...baseLookup, // keep your existing lookups
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

        await createSellerNotification({
          sellerId: input.sellerId,
          title: "🧑‍✈ New Pilot Submitted",
          message: `Your pilot "${input.pilotName}" has been submitted and is pending approval.`,
          type: "hire_pilot_listing",
          data: { pilotId: newPilot.pilotId },
          url: `/seller/pilots/${newPilot.pilotId}`,
          pubsub,
        });

        // 6️⃣ Return populated result
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

        if (deleted.certifications?.length) {
          for (const cert of deleted.certifications) {
            if (cert.url) await deleteFirebaseFile(cert.url);
          }
        }
        if (deleted.resume?.url) {
          await deleteFirebaseFile(deleted.resume.url);
        }

        await createSellerNotification({
          sellerId: deleted.sellerId,
          title: "🗑 Pilot Listing Deleted",
          message: `Your pilot "${deleted.pilotName}" has been removed.`,
          type: "hire_pilot_deleted",
          data: { pilotId },
          url: `/seller/pilots`,
          pubsub,
        });

        return { success: true, message: "Pilot and files deleted successfully" };
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
      if (seller?.email) {
        await sendSellerStatusMail({
          to: seller.email,
          productType: "Hire Pilot",
          productName: updated.pilotName,
          status: adminStatus,
        });
      }

      if (adminStatus === "approved") {
        await sendPushNotification(
          seller.fcmTokens,
          "Seller approved",
          "Explore your profile page and Thank you"
        );
      }
      else if (adminStatus === "approved") {
        await sendPushNotification(
          seller.fcmTokens,
          "Seller rejected",
          "Please contact admin for more info"
        );
      }

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

      const result = await HirePilot.aggregate([{ $match: { _id: updated._id } }, ...baseLookup]);
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
      if (seller?.email) {
        await sendSellerStatusMail({
          to: seller.email,
          productType: "Hire Pilot (Buyer Action)",
          productName: updated.pilotName,
          status: buyerStatus,
        });
      }

      await createSellerNotification({
        sellerId: updated.sellerId,
        title: `Buyer ${buyerStatus.toUpperCase()} for ${updated.pilotName}`,
        message: `A buyer has ${buyerStatus} your pilot post.`,
        type: "buyer_hire_pilot_status",
        data: { pilotId, buyerStatus },
        url: `/seller/pilots/${updated.pilotId}`,
        pubsub,
      });

      const result = await HirePilot.aggregate([{ $match: { _id: updated._id } }, ...baseLookup]);
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