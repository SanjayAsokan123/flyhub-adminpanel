// resolvers/accessoryResolvers.js
import { Accessory } from "../models/Accessories.model.js";
import { Seller } from "../models/Seller.model.js";
import { sendSellerStatusMail } from "../utils/emailService.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";
import {calculateFinalPrice} from "../utils/TaxCalculator.js";
import { sendPushNotification as sendSellerPush } from "../utils/SendPushNotification.js";

const baseLookupAccessory = [
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
      accessoryId: 1,
      name: 1,
      brand: 1,
      category: 1,
      price: 1,
      description: 1,
      image: 1,
      status: 1,
      additionalInformation:1,
      quantity: 1,
      sellerId: 1,
      "sellerInfo.email": 1,
      "sellerInfo.phoneNumber": 1,
    },
  },
];

export const accessoryResolvers = {
  Query: {
    accessories: async () => {
      try {
        const accessories = await Accessory.find().sort({ createdAt: -1 });

        return Promise.all(
          accessories.map(async (a) => {
            const seller = await Seller.findOne({ customId: a.sellerId });
            return {
              ...a.toObject(),
              sellerInfo: seller
                ? {
                    email: seller.email,
                    phoneNumber: seller.phoneNumber,
                  }
                : null,
            };
          })
        );
      } catch (error) {
        console.error("❌ Error fetching accessories:", error);
        throw new Error("Failed to fetch accessories: " + error.message);
      }
    },

    accessory: async (_, { accessoryId }) => {
      try {
        const accessory = await Accessory.findOne({ accessoryId });
        if (!accessory) throw new Error("Accessory not found");

        const seller = await Seller.findOne({ customId: accessory.sellerId });
        return {
          ...accessory.toObject(),
          sellerInfo: seller
            ? {
                email: seller.email,
                phoneNumber: seller.phoneNumber,
              }
            : null,
        };
      } catch (error) {
        console.error("❌ Error fetching accessory:", error); 
        throw new Error("Failed to fetch accessory: " + error.message);
      }
    },
    rejectedAccessories: async (_, { sellerId }) =>
       Accessory.find({ sellerId, status: "rejected" }),

    approvedAccessories: async (_, { sellerId }) =>
      Accessory.find({ sellerId, status: "approved" }),
    pendingAccessories: async (_, { sellerId }) =>
      Accessory.find({ sellerId, status: "pending" }),

    approvedAccessoriesPaginated: async (_, { page, limit }) => {
  const pageNumber = Math.max(page, 1);
  const pageSize = Math.max(limit, 1);
  const skip = (pageNumber - 1) * pageSize;

  // Only fetch approved accessories
  const matchStage = { $match: { status: "approved" } };

  const [result] = await Accessory.aggregate([
    matchStage,
    {
      $facet: {
        items: [
          ...baseLookupAccessory,
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
    result.totalCount?.length > 0 ? result.totalCount[0].count : 0;

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
   createAccessory: async (_, { input }, { pubsub }) => {
  try {
    const seller = await Seller.findOne({ customId: input.sellerId });
    if (!seller) throw new Error("Seller not found");

    const { finalPrice } = await calculateFinalPrice(input.price);
    input.price = finalPrice;

    const newAccessory = new Accessory({
      name: input.name,
      brand: input.brand,
      category: input.category,
      price: input.price,
      description: input.description,
      image: input.image,
      quantity: input.quantity || 1,
      additionalInformation:input.additionalInformation,
      status: "pending",
      sellerId: input.sellerId,
    });

    const saved = await newAccessory.save();

    // 🔔 DB NOTIFICATION (already correct)
    await createSellerNotification({
      sellerId: input.sellerId,
      title: "Accessory Submitted for Review",
      message: `Your accessory "${input.name}" has been submitted and is pending approval.`,
      type: "accessory_listing",
      data: { accessoryId: saved.accessoryId, status: "pending" },
      url: `/seller/accessories/${saved.accessoryId}`,
      pubsub,
    });

    // ✅ ADD THIS: SELLER PUSH NOTIFICATION
    if (seller?.fcmTokens?.length) {
      await sendSellerPush(
        seller.fcmTokens,
        "🧩 Accessory Submitted",
        `Your accessory "${input.name}" is pending admin approval.`,
        {
          accessoryId: saved.accessoryId,
          status: "pending",
          type: "accessory_submitted",
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
    console.error("❌ Error creating accessory:", err);
    throw new Error("Failed to create accessory: " + err.message);
  }
},


    updateAccessory: async (_, { accessoryId, input }) => {
      try {
        const updated = await Accessory.findOneAndUpdate(
          { accessoryId },
          input,
          { new: true, runValidators: true }
        );

        if (!updated) throw new Error("Accessory not found");

        const seller = await Seller.findOne({ customId: updated.sellerId });
        return {
          ...updated.toObject(),
          sellerInfo: seller
            ? {
                email: seller.email,
                phoneNumber: seller.phoneNumber,
              }
            : null,
        };
      } catch (err) {
        console.error("❌ Error updating accessory:", err);
        throw new Error("Failed to update accessory: " + err.message);
      }
    },

  updateAccessoryStatus: async (_, { accessoryId, status }, { pubsub }) => {
  try {
    const validStatuses = ["pending", "approved", "rejected"];
    const normalizedStatus = status.toLowerCase();

    if (!validStatuses.includes(normalizedStatus)) {
      throw new Error(`Invalid status. Use one of: ${validStatuses.join(", ")}`);
    }

    const updated = await Accessory.findOneAndUpdate(
      { accessoryId },
      { status: normalizedStatus },
      { new: true }
    );
    if (!updated) throw new Error("Accessory not found");

    const seller = await Seller.findOne({ customId: updated.sellerId });

    /* 📧 EMAIL NOTIFICATION */
    if (seller?.email) {
      await sendSellerStatusMail({
        to: seller.email,
        productType: "Accessory",
        productName: updated.name,
        status: normalizedStatus,
      });
    }

    /* 🔔 DB NOTIFICATION */
    await createSellerNotification({
      sellerId: updated.sellerId,
      title:
        normalizedStatus === "approved"
          ? "✅ Accessory Approved"
          : normalizedStatus === "rejected"
          ? "❌ Accessory Rejected"
          : "⏳ Accessory Status Updated",
      message:
        normalizedStatus === "approved"
          ? `Your accessory "${updated.name}" has been approved.`
          : normalizedStatus === "rejected"
          ? `Your accessory "${updated.name}" was rejected.`
          : `Status updated to ${normalizedStatus}.`,
      type: "accessory_status_update",
      data: {
        accessoryId,
        status: normalizedStatus,
      },
      url: `/seller/accessories/${accessoryId}`,
      pubsub,
    });

    /* 📲 PUSH NOTIFICATION */
    if (seller?.fcmTokens?.length) {
      if (normalizedStatus === "approved") {
        await sendSellerPush(
          seller.fcmTokens,
          "✅ Accessory Approved",
          `Your accessory "${updated.name}" is now live on Flyhub.`,
          {
            accessoryId,
            status: "approved",
            type: "accessory_approved",
          }
        );
      } else if (normalizedStatus === "rejected") {
        await sendSellerPush(
          seller.fcmTokens,
          "❌ Accessory Rejected",
          `Your accessory "${updated.name}" was rejected. Please contact admin.`,
          {
            accessoryId,
            status: "rejected",
            type: "accessory_rejected",
          }
        );
      }
    }

    return {
      ...updated.toObject(),
      sellerInfo: seller
        ? {
            email: seller.email,
            phoneNumber: seller.phoneNumber,
          }
        : null,
    };
  } catch (err) {
    console.error("❌ Error updating accessory status:", err);
    throw new Error("Failed to update accessory status: " + err.message);
  }
},


   deleteAccessory: async (_, { accessoryId }, { pubsub }) => {
  try {
    const deleted = await Accessory.findOneAndDelete({ accessoryId });
    if (!deleted) throw new Error("Accessory not found");

    const seller = await Seller.findOne({ customId: deleted.sellerId });

    /* 🔔 DB NOTIFICATION */
    await createSellerNotification({
      sellerId: deleted.sellerId,
      title: "🗑️ Accessory Deleted",
      message: `Your accessory "${deleted.name}" has been removed from Flyhub.`,
      type: "accessory_deleted",
      data: { accessoryId },
      url: `/seller/accessories`,
      pubsub,
    });

    /* 📲 PUSH NOTIFICATION */
    if (seller?.fcmTokens?.length) {
      await sendSellerPush(
        seller.fcmTokens,
        "🗑️ Accessory Deleted",
        `Your accessory "${deleted.name}" has been deleted.`,
        {
          accessoryId,
          type: "accessory_deleted",
        }
      );
    }

    /* 📧 OPTIONAL EMAIL (recommended) */
    if (seller?.email) {
      await sendSellerStatusMail({
        to: seller.email,
        productType: "Accessory",
        productName: deleted.name,
        status: "deleted",
      });
    }

    return {
      ...deleted.toObject(),
      sellerInfo: seller
        ? {
            email: seller.email,
            phoneNumber: seller.phoneNumber,
          }
        : null,
    };
  } catch (err) {
    console.error("❌ Error deleting accessory:", err);
    throw new Error("Failed to delete accessory: " + err.message);
  }
},

  },
};