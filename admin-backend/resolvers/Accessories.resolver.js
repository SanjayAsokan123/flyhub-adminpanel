// resolvers/accessoryResolvers.js
import { Accessory } from "../models/Accessories.model.js";
import { Seller } from "../models/Seller.model.js";
import { sendSellerStatusMail } from "../utils/emailService.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";
import {calculateFinalPrice} from "../utils/TaxCalculator.js";
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

    rejectedAccessories: async () => {
      const accessories = await Accessory.find({ status: "rejected" });
      return Promise.all(
        accessories.map(async (a) => {
          const seller = await Seller.findOne({ customId: a.sellerId });
          return {
            ...a.toObject(),
            sellerInfo: seller
              ? { email: seller.email, phoneNumber: seller.phoneNumber }
              : null,
          };
        })
      );
    },

    approvedAccessories: async (_, { sellerId }) => {
      const accessories = await Accessory.find({ sellerId, status: "approved" });
      return Promise.all(
        accessories.map(async (a) => {
          const seller = await Seller.findOne({ customId: a.sellerId });
          return {
            ...a.toObject(),
            sellerInfo: seller
              ? { email: seller.email, phoneNumber: seller.phoneNumber }
              : null,
          };
        })
      );
    },

    pendingAccessories: async (_, { sellerId }) => {
      const accessories = await Accessory.find({ sellerId, status: "pending" });
      return Promise.all(
        accessories.map(async (a) => {
          const seller = await Seller.findOne({ customId: a.sellerId });
          return {
            ...a.toObject(),
            sellerInfo: seller
              ? { email: seller.email, phoneNumber: seller.phoneNumber }
              : null,
          };
        })
      );
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
          status: "pending",
          sellerId: input.sellerId,
        });
        const saved = await newAccessory.save();

        await createSellerNotification({
          sellerId: input.sellerId,
          title: "Accessory Submitted for Review",
          message: `Your accessory "${input.name}" has been submitted and is pending approval.`,
          type: "accessory_listing",
          data: { accessoryId: saved.accessoryId, status: "pending" },
          url: `/seller/accessories/${saved.accessoryId}`,
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
        if (!validStatuses.includes(status.toLowerCase()))
          throw new Error(`Invalid status. Use one of: ${validStatuses.join(", ")}`);

        const updated = await Accessory.findOneAndUpdate(
          { accessoryId },
          { status: status.toLowerCase() },
          { new: true }
        );
        if (!updated) throw new Error("Accessory not found");

        const seller = await Seller.findOne({ customId: updated.sellerId });

        if (seller?.email) {
          try {
            await sendSellerStatusMail({
              to: seller.email,
              productType: "Accessory",
              productName: updated.name,
              status,
            });
          } catch (mailErr) {
            console.error("⚠️ sendSellerStatusMail failed:", mailErr);
          }
        }

        try {
          await createSellerNotification({
            sellerId: updated.sellerId,
            title: `Accessory ${status.toUpperCase()}: ${updated.name}`,
            message:
              status === "approved"
                ? `Your accessory "${updated.name}" has been approved and is now live on Flyhub.`
                : status === "rejected"
                ? `Your accessory "${updated.name}" was rejected. Please check details and resubmit.`
                : `Status updated to ${status} for "${updated.name}".`,
            type: "accessory_status",
            data: { accessoryId: updated.accessoryId, status },
            url: `/seller/accessories/${updated.accessoryId}`,
            pubsub,
          });
        } catch (notifErr) {
          console.error("⚠️ createSellerNotification failed:", notifErr);
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

        await createSellerNotification({
          sellerId: deleted.sellerId,
          title: `Accessory Deleted`,
          message: `Your accessory "${deleted.name}" has been removed from Flyhub.`,
          type: "accessory_deleted",
          data: { accessoryId },
          url: `/seller/accessories`,
          pubsub,
        });

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
