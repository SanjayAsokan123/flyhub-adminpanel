import { Part } from "../models/Parts.model.js";
import { Seller } from "../models/Seller.model.js";
import { sendSellerStatusMail } from "../utils/emailService.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";
import {calculateFinalPrice} from "../utils/TaxCalculator.js";
import { sendPushNotification } from "../utils/SendPushNotification.js";
import {
  uploadSingleFile,
  deleteFirebaseFile,
} from "../utils/uploadToFirebase.js";


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
  },

  Mutation: {
    createPart: async (_, { input }, { pubsub }) => {
      try {
        const seller = await Seller.findOne({ customId: input.sellerId });
        if (!seller) throw new Error("Seller not found");
        const { finalPrice } = await calculateFinalPrice(input.price);
        input.price = finalPrice;
        const newPartData = { ...input, status: "pending" };

        if (input.imageFile?.file) {
          newPartData.image = await uploadSingleFile(input.imageFile.file, "parts");
        }

        const newPart = new Part(newPartData);
        const saved = await newPart.save();

        await createSellerNotification({
          sellerId: input.sellerId,
          title: "🧩 New Part Submitted",
          message: `Your part "${input.name}" has been submitted for admin approval.`,
          type: "part_submission",
          data: { partId: saved.partId },
          url: `/seller/parts/${saved.partId}`,
          pubsub,
        });

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

        if (seller?.email) {
          await sendSellerStatusMail({
            to: seller.email,
            productType: "Part",
            productName: updated.name,
            status,
          });
        }

      if(status==="approved")
           {
           await sendPushNotification(
           seller.fcmTokens,
           "Seller approved",
           "Explore your profile page and Thank you"
           );
           }
           else if(status==="approved")
                {
                await sendPushNotification(
                seller.fcmTokens,
                "Seller rejected",
                "Please contact admin for more info"
                );
                }

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

        if (deleted.image) {
          await deleteFirebaseFile(deleted.image);
        }

        const seller = await Seller.findOne({ customId: deleted.sellerId });

        await createSellerNotification({
          sellerId: deleted.sellerId,
          title: "🗑️ Part Deleted",
          message: `Your part "${deleted.name}" has been removed from the marketplace.`,
          type: "part_deleted",
          data: { partId },
          url: `/seller/parts`,
          pubsub,
        });

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