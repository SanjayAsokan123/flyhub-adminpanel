import { Part } from "../models/Parts.model.js";
import { Seller } from "../models/Seller.model.js";
import { sendSellerStatusMail } from "../utils/emailService.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";
import { calculateFinalPrice } from "../utils/TaxCalculator.js";
import { sendPushNotification as sendSellerPush } from "../utils/SendPushNotification.js";

import {
  uploadSingleFile,
  deleteFirebaseFile,
} from "../utils/uploadToFirebase.js";

// 🔧 Base lookup for Part → Seller join
const baseLookupPart = [
  {
    $lookup: {
      from: "sellers",
      localField: "sellerId",
      foreignField: "customId",
      as: "sellerInfo",
    },
  },
  {
    $unwind: {
      path: "$sellerInfo",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $project: {
      partId: 1,
      name: 1,
      brand: 1,
      price: 1,
      description: 1,
      image: 1,
      status: 1,
      quantity: 1,
      additionalInformation: 1,
      sellerId: 1,
      "sellerInfo.email": 1,
      "sellerInfo.phoneNumber": 1,
    },
  },
];


export const partResolvers = {
  Query: {
    parts: async () => {
      try {
        const allParts = await Part.find();
        const sellerIds = [...new Set(allParts.map((p) => p.sellerId))];
        const sellers = await Seller.find({ customId: { $in: sellerIds } });

        const sellerMap = Object.fromEntries(
          sellers.map((s) => [
            s.customId,
            { email: s.email, phoneNumber: s.phoneNumber },
          ])
        );

        return allParts.map((part) => ({
          ...part.toObject(),
          sellerInfo: sellerMap[part.sellerId] || null,
        }));
      } catch (err) {
        console.error("❌ Error fetching parts:", err);
        throw new Error("Failed to fetch parts");
      }
    },

    approvedParts: async (_, { sellerId }) =>
      Part.find({ sellerId, status: "approved" }),
    pendingParts: async (_, { sellerId }) =>
      Part.find({ sellerId, status: "pending" }),
    rejectedParts: async (_, { sellerId }) =>
      Part.find({ sellerId, status: "rejected" }),

    part: async (_, { partId }) => {
      try {
        const part = await Part.findOne({ partId });
        if (!part) throw new Error("Part not found");
        const seller = await Seller.findOne({ customId: part.sellerId });

        return {
          ...part.toObject(),
          sellerInfo: seller
            ? { email: seller.email, phoneNumber: seller.phoneNumber }
            : null,
        };
      } catch (err) {
        console.error("❌ Error fetching part:", err);
        throw new Error("Failed to fetch part");
      }
    },
    approvedPartPaginated: async (_, { page, limit }) => {
      const pageNumber = Math.max(page, 1);
      const pageSize = Math.max(limit, 1);
      const skip = (pageNumber - 1) * pageSize;

      const matchStage = { $match: { status: "approved" } };

      const [result] = await Part.aggregate([
        matchStage,
        {
          $facet: {
            items: [
              ...baseLookupPart,
              { $skip: skip },
              { $limit: pageSize },
            ],
            totalCount: [
              { $count: "count" },
            ],
          },
        },
      ]);

      const totalCount =
        result.totalCount.length > 0 ? result.totalCount[0].count : 0;

      return {
        items: result.items,
        totalCount,
        page: pageNumber,
        limit: pageSize,
        pageCount: Math.ceil(totalCount / pageSize),
      };
    },

  },

  Mutation: {
    createPart: async (_, { input }, { pubsub }) => {
      try {
        const seller = await Seller.findOne({ customId: input.sellerId });
        if (!seller) throw new Error("Seller not found");

        /* ================= PRICE CALCULATION ================= */

        const { finalPrice } = await calculateFinalPrice(input.price);
        input.price = finalPrice;

        const newPartData = { ...input, status: "pending" };

        /* ================= IMAGE UPLOAD ================= */

        if (input.imageFile?.file) {
          newPartData.image = await uploadSingleFile(
            input.imageFile.file,
            "parts"
          );
        }

        const newPart = new Part(newPartData);
        const saved = await newPart.save();

        /* ================= SELLER DB NOTIFICATION ================= */

        await createSellerNotification({
          sellerId: input.sellerId,
          title: "New Part Submitted",
          message: `Your part "${input.name}" has been submitted for admin approval.`,
          type: "part_submission",
          data: { partId: saved.partId, status: "pending" },
          url: `/seller/parts/${saved.partId}`,
          pubsub,
        });

        /* ================= SELLER PUSH ================= */

        if (seller.fcmTokens?.length) {
          await sendSellerPush(
            seller.fcmTokens,
            "Part Submitted",
            `Your part "${input.name}" has been submitted for approval.`,
            {
              partId: saved.partId,
              status: "pending",
              type: "part_submitted",
            }
          );
        }

        return {
          ...saved.toObject(),
          sellerInfo: {
            email: seller.email,
            phoneNumber: seller.phoneNumber,
          },
        };
      } catch (err) {
        console.error("❌ Error creating part:", err);
        throw new Error("Failed to create part: " + err.message);
      }
    },


    updatePart: async (_, { partId, input }) => {
      try {
        const existing = await Part.findOne({ partId });
        if (!existing) throw new Error("Part not found");

        const updateData = { ...input };

        if (input.imageFile?.file) {
          if (existing.image) {
            await deleteFirebaseFile(existing.image);
          }
          updateData.image = await uploadSingleFile(input.imageFile.file, "parts");
        }

        const updated = await Part.findOneAndUpdate({ partId }, updateData, {
          new: true,
        });
        if (!updated) throw new Error("Part not found after update");

        const seller = await Seller.findOne({ customId: updated.sellerId });

        return {
          ...updated.toObject(),
          sellerInfo: seller
            ? { email: seller.email, phoneNumber: seller.phoneNumber }
            : null,
        };
      } catch (err) {
        console.error("❌ Error updating part:", err);
        throw new Error("Failed to update part");
      }
    },

    updatePartStatus: async (_, { partId, status }, { pubsub }) => {
      try {
        const updated = await Part.findOneAndUpdate(
          { partId },
          { status },
          { new: true }
        );
        if (!updated) throw new Error("Part not found");

        const seller = await Seller.findOne({ customId: updated.sellerId });

        /* ================= EMAIL ================= */

        if (seller?.email) {
          await sendSellerStatusMail({
            to: seller.email,
            productType: "Part",
            productName: updated.name,
            status,
          });
        }

        /* ================= SELLER PUSH ================= */

        if (seller?.fcmTokens?.length) {
          if (status === "approved") {
            await sendSellerPush(
              seller.fcmTokens,
              "✅ Part Approved",
              `Your part "${updated.name}" has been approved.`,
              {
                partId,
                status,
                type: "part_approved",
              }
            );
          }

          if (status === "rejected") {
            await sendSellerPush(
              seller.fcmTokens,
              "❌ Part Rejected",
              `Your part "${updated.name}" was rejected. Please contact admin.`,
              {
                partId,
                status,
                type: "part_rejected",
              }
            );
          }

          if (status === "pending") {
            await sendSellerPush(
              seller.fcmTokens,
              "Part Under Review",
              `Your part "${updated.name}" is under review.`,
              {
                partId,
                status,
                type: "part_pending",
              }
            );
          }
        }

        /* ================= SELLER DB NOTIFICATION ================= */

        await createSellerNotification({
          sellerId: updated.sellerId,
          title: `Part ${status.toUpperCase()}`,
          message:
            status === "approved"
              ? `Your part "${updated.name}" has been approved.`
              : status === "rejected"
                ? `Your part "${updated.name}" was rejected.`
                : `Your part "${updated.name}" is under review.`,
          type: "part_status",
          data: { partId, status },
          url: `/seller/parts/${partId}`,
          pubsub,
        });

        return {
          ...updated.toObject(),
          sellerInfo: seller
            ? { email: seller.email, phoneNumber: seller.phoneNumber }
            : null,
        };
      } catch (err) {
        console.error("❌ Error updating part status:", err);
        throw new Error("Failed to update part status");
      }
    },
    deletePart: async (_, { partId }, { pubsub }) => {
      try {
        const deleted = await Part.findOneAndDelete({ partId });
        if (!deleted) throw new Error("Part not found");

        /* ================= DELETE IMAGE ================= */

        if (deleted.image) {
          await deleteFirebaseFile(deleted.image);
        }

        const seller = await Seller.findOne({ customId: deleted.sellerId });

        /* ================= SELLER DB NOTIFICATION ================= */

        await createSellerNotification({
          sellerId: deleted.sellerId,
          title: "🗑️ Part Deleted",
          message: `Your part "${deleted.name}" has been removed from the marketplace.`,
          type: "part_deleted",
          data: { partId },
          url: `/seller/parts`,
          pubsub,
        });

        /* ================= SELLER PUSH ================= */

        if (seller?.fcmTokens?.length) {
          await sendSellerPush(
            seller.fcmTokens,
            "🗑️ Part Deleted",
            `Your part "${deleted.name}" has been deleted successfully.`,
            {
              partId,
              type: "part_deleted",
            }
          );
        }

        return {
          ...deleted.toObject(),
          sellerInfo: seller
            ? { email: seller.email, phoneNumber: seller.phoneNumber }
            : null,
        };
      } catch (err) {
        console.error("❌ Error deleting part:", err);
        throw new Error("Failed to delete part");
      }
    },

  },
};