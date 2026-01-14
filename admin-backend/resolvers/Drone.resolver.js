import { Drone } from "../models/Drone.model.js";
import { Seller } from "../models/Seller.model.js";
import { sendSellerStatusMail } from "../utils/emailService.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";
import { calculateFinalPrice } from "../utils/TaxCalculator.js";
import { sendPushNotification as sendSellerPush } from "../utils/SendPushNotification.js";

import {
  uploadSingleFile,
  deleteFirebaseFile,
} from "../utils/uploadToFirebase.js";

const baseLookup = [
  {
    $lookup: {
      from: "sellers",
      localField: "sellerId",
      foreignField: "customId",
      as: "sellerInfo",
    },
  },
  { $unwind: { path: "$sellerInfo", preserveNullAndEmptyArrays: true } },
  {
    $project: {
      droneId: 1,
      name: 1,
      brand: 1,
      uin: 1,
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

export const droneResolvers = {
  Query: {
    drones: async () => {
      try {
        const drones = await Drone.aggregate([
          {
            $lookup: {
              from: "sellers",
              localField: "sellerId",
              foreignField: "customId",
              as: "sellerInfo",
            },
          },
          { $unwind: { path: "$sellerInfo", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              droneId: 1,
              name: 1,
              brand: 1,
              uin: 1,
              price: 1,
              description: 1,
              image: 1,
              status: 1,
              quantity: 1,
              sellerId: 1,
              "sellerInfo.email": 1,
              "sellerInfo.phoneNumber": 1,
            },
          },
        ]);
        return drones;
      } catch (err) {
        console.error("❌ Error fetching drones:", err);
        throw new Error("Failed to fetch drones");
      }
    },

    // ✅ Approved / Pending / Rejected Drones
    approvedDrones: async (_, { sellerId }) =>
      Drone.find({ sellerId, status: "approved" }),
    pendingDrones: async (_, { sellerId }) =>
      Drone.find({ sellerId, status: "pending" }),
    rejectedDrones: async (_, { sellerId }) =>
      Drone.find({ sellerId, status: "rejected" }),

    approvedDronePaginated: async (_, { page, limit }) => {
      const pageNumber = Math.max(page, 1);
      const pageSize = Math.max(limit, 1);
      const skip = (pageNumber - 1) * pageSize;

      const matchStage = { $match: { status: "approved" } };

      const [result] = await Drone.aggregate([
        matchStage,
        {
          $facet: {
            items: [
              ...baseLookup,
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
        result.totalCount?.length ? result.totalCount[0].count : 0;

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

    saveSellerFcmToken: async (_, { sellerId, token }) => {
      const seller = await Seller.findOne({ customId: sellerId });
      if (!seller) throw new Error("Seller not found");

      if (!seller.fcmTokens.includes(token)) {
        seller.fcmTokens.push(token);
        await seller.save();
      }

      return true;
    },
    createDrone: async (_, { input }, { pubsub }) => {
      try {
        const seller = await Seller.findOne({ customId: input.sellerId });
        if (!seller) throw new Error("Seller not found");

        /* ================= PRICE CALCULATION ================= */

        const { finalPrice } = await calculateFinalPrice(input.price);
        input.price = finalPrice;

        /* ================= IMAGE UPLOAD ================= */

        let imageUrl = input.image;
        if (input.imageFile?.file) {
          imageUrl = await uploadSingleFile(input.imageFile.file, "drones");
        }

        const newDrone = new Drone({
          name: input.name,
          brand: input.brand,
          uin: input.uin,
          price: input.price,
          description: input.description,
          image: imageUrl,
          quantity: input.quantity || 1,
          status: "pending",
          sellerId: input.sellerId,
          additionalInformation: input.additionalInformation,
        });

        const savedDrone = await newDrone.save();

        /* ================= SELLER DB NOTIFICATION ================= */

        await createSellerNotification({
          sellerId: input.sellerId,
          title: "🛩️ Drone Listing Submitted",
          message: `Your drone "${input.name}" has been submitted for review.`,
          type: "drone_listing",
          data: { uin: input.uin, status: "pending" },
          url: `/seller/drones/${input.uin}`,
          pubsub,
        });

        /* ================= SELLER PUSH ================= */

        if (seller.fcmTokens?.length) {
          await sendSellerPush(
            seller.fcmTokens,
            "Drone Submitted",
            `Your drone "${input.name}" has been submitted for admin review.`,
            {
              uin: input.uin,
              status: "pending",
              type: "drone_submitted",
            }
          );
        }

        return {
          ...savedDrone.toObject(),
          sellerInfo: {
            email: seller.email,
            phoneNumber: seller.phoneNumber,
          },
        };
      } catch (err) {
        console.error("❌ Error creating drone:", err);
        throw new Error("Failed to create drone: " + err.message);
      }
    },


    updateDrone: async (_, { droneId, input }) => {
      try {
        const updated = await Drone.findOneAndUpdate({ droneId }, input, {
          new: true,
        });
        if (!updated) throw new Error("Drone not found");
        return updated;
      } catch (err) {
        console.error("❌ Error updating drone:", err);
        throw new Error("Failed to update drone: " + err.message);
      }
    },

    updateDroneStatus: async (_, { droneId, status }, { pubsub }) => {
      try {
        let updatedDrone = await Drone.findOne({ droneId });
        if (!updatedDrone) {
          throw new Error(`Drone with droneId ${droneId} not found`);
        }

        // ✅ FIX: Explicit quantity handling
        if (status === "approved" && updatedDrone.quantity <= 0) {
          updatedDrone.quantity = 1;
        }

        updatedDrone.status = status;
        await updatedDrone.save();

        const seller = await Seller.findOne({ customId: updatedDrone.sellerId });
        if (!seller) throw new Error("Seller not found");

        /* ================= EMAIL ================= */
        if (seller.email) {
          await sendSellerStatusMail({
            to: seller.email,
            productType: "Drone",
            productName: updatedDrone.name,
            status,
          });
        }

        /* ================= PUSH ================= */
        if (seller.fcmTokens?.length) {
          const titleMap = {
            approved: "✅ Drone Approved",
            rejected: "❌ Drone Rejected",
            pending: "⏳ Drone Under Review",
          };

          const msgMap = {
            approved: `Your drone "${updatedDrone.name}" has been approved.`,
            rejected: `Your drone "${updatedDrone.name}" was rejected.`,
            pending: `Your drone "${updatedDrone.name}" is under review.`,
          };

          await sendSellerPush(
            seller.fcmTokens,
            titleMap[status],
            msgMap[status],
            { droneId, status, type: `drone_${status}` }
          );
        }

        await createSellerNotification({
          sellerId: updatedDrone.sellerId,
          title: `Drone ${status.toUpperCase()}`,
          message:
            status === "approved"
              ? `Your drone "${updatedDrone.name}" has been approved.`
              : status === "rejected"
                ? `Your drone "${updatedDrone.name}" was rejected.`
                : `Your drone "${updatedDrone.name}" is under review.`,
          type: "drone_status",
          data: { droneId, status },
          url: `/seller/drones/${droneId}`,
          pubsub,
        });

        return updatedDrone;
      } catch (error) {
        console.error("❌ updateDroneStatus Error:", error);
        throw new Error(`Failed to update drone status: ${error.message}`);
      }
    },




    deleteDrone: async (_, { droneId }, { pubsub }) => {
      try {
        const deleted = await Drone.findOneAndDelete({ droneId });
        if (!deleted) throw new Error("Drone not found");

        /* ================= DELETE IMAGE ================= */

        if (deleted.image) {
          await deleteFirebaseFile(deleted.image);
        }

        const seller = await Seller.findOne({ customId: deleted.sellerId });

        /* ================= SELLER DB NOTIFICATION ================= */

        await createSellerNotification({
          sellerId: deleted.sellerId,
          title: "🗑️ Drone Deleted",
          message: `Your drone "${deleted.name}" has been removed from Flyhub.`,
          type: "drone_deleted",
          data: { droneId },
          url: `/seller/drones`,
          pubsub,
        });

        /* ================= SELLER PUSH ================= */

        if (seller?.fcmTokens?.length) {
          await sendSellerPush(
            seller.fcmTokens,
            "🗑️ Drone Deleted",
            `Your drone "${deleted.name}" has been deleted successfully.`,
            {
              droneId,
              type: "drone_deleted",
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
        console.error("❌ Error deleting drone:", err);
        throw new Error("Failed to delete drone: " + err.message);
      }
    },

  },
};