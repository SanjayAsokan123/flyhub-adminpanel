import { Drone } from "../models/Drone.model.js";
import { Seller } from "../models/Seller.model.js";
import { sendSellerStatusMail } from "../utils/emailService.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";
import {calculateFinalPrice} from "../utils/TaxCalculator.js";
import { sendPushNotification } from "../utils/SendPushNotification.js";

import {
  uploadSingleFile,
  deleteFirebaseFile,
} from "../utils/uploadToFirebase.js";

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
              wishlist: 1,
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

        const { finalPrice } = await calculateFinalPrice(input.price);
        input.price = finalPrice;

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
          status: "pending",
          sellerId: input.sellerId,
        });

        const savedDrone = await newDrone.save();

        await createSellerNotification({
          sellerId: input.sellerId,
          title: "🛩️ Drone Listing Submitted",
          message: `Your drone "${input.name}" has been submitted for review.`,
          type: "drone_listing",
          data: { uin: input.uin, status: "pending" },
          url: `/seller/drones/${input.uin}`,
          pubsub,
        });

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

    updateDrone: async (_, { uin, input }) => {
      try {
        const updated = await Drone.findOneAndUpdate({ uin }, input, {
          new: true,
        });
        if (!updated) throw new Error("Drone not found");
        return updated;
      } catch (err) {
        console.error("❌ Error updating drone:", err);
        throw new Error("Failed to update drone: " + err.message);
      }
    },

updateDroneStatus: async (_, { uin, status }, { pubsub }) => {
  try {
    const drone = await Drone.findOne({ uin });
    if (!drone) throw new Error(`Drone with UIN ${uin} not found`);
    drone.status = status;
    const updatedDrone = await drone.save();

    const seller = await Seller.findOne({ customId: updatedDrone.sellerId });
    if (!seller) throw new Error(`Seller not found for ID ${updatedDrone.sellerId}`);

  const tokens = seller.fcmTokens || [];
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
    if (pubsub) {
      await createSellerNotification({
        title: "Drone Status Update",
        profileImage: updatedDrone.images?.[0] || "",
        message: `Your drone '${updatedDrone.name}' status changed to '${status}'.`,
        sellerId: updatedDrone.sellerId,
        type: "Drone",
        drone: updatedDrone,
        pubsub,
      });
    }
    await sendSellerStatusMail({
      to: seller.email,
      productType: "Drone",
      productName: updatedDrone.name,
      status,
    });

    return updatedDrone;

  } catch (error) {
    console.error("❌ updateDroneStatus Error:", error);
    throw new Error(`Failed to update drone status: ${error.message}`);
  }
},

    deleteDrone: async (_, { uin }, { pubsub }) => {
      try {
        const deleted = await Drone.findOneAndDelete({ uin });
        if (!deleted) throw new Error("Drone not found");

        if (deleted.image) {
          await deleteFirebaseFile(deleted.image);
        }

        await createSellerNotification({
          sellerId: deleted.sellerId,
          title: "🗑️ Drone Deleted",
          message: `Your drone "${deleted.name}" has been removed from Flyhub.`,
          type: "drone_deleted",
          data: { uin },
          url: `/seller/drones`,
          pubsub,
        });

        const seller = await Seller.findOne({ customId: deleted.sellerId });
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