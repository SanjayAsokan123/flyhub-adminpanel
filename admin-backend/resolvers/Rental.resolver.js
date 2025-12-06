import { Rental } from "../models/Rental.model.js";
import { Seller } from "../models/Seller.model.js";
import { sendSellerStatusMail } from "../utils/emailService.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";
import { sendPushNotification } from "../utils/SendPushNotification.js";
import {
  uploadSingleFile,
  deleteFirebaseFile,
} from "../utils/uploadToFirebase.js";

export const rentalResolvers = {
  Query: {
    rentals: async () => {
      try {
        return await Rental.getWithSellerInfo();
      } catch (error) {
        console.error("❌ Error fetching rentals:", error);
        throw new Error("Failed to fetch rentals: " + error.message);
      }
    },

    rental: async (_, { rentalId }) => {
      try {
        const rental = await Rental.findOne({ rentalId });
        if (!rental) throw new Error("Rental not found");

        const seller = await Seller.findOne({ customId: rental.sellerId });
        return {
          ...rental.toObject(),
          sellerInfo: {
            email: seller?.email || null,
            phoneNumber: seller?.phoneNumber || null,
          },
        };
      } catch (error) {
        console.error("❌ Error fetching rental:", error);
        throw new Error("Failed to fetch rental: " + error.message);
      }
    },

    approvedRentals: async (_, { sellerId }) =>
      Rental.find({ sellerId, status: "approved" }),
    pendingRentals: async (_, { sellerId }) =>
      Rental.find({ sellerId, status: "pending" }),
    rejectedRentals: async (_, { sellerId }) =>
      Rental.find({ sellerId, status: "rejected" }),
  },

  Mutation: {
    createRental: async (_, { input }, { pubsub }) => {
      try {
        const {
          name,
          brand,
          location,
          pricePerHour,
          pricePerDay,
          description,
          image,
          imageFile,
          quantity,
          sellerId,
        } = input;

        if (!name || !sellerId)
          throw new Error("Missing required fields: name, sellerId");

        const seller = await Seller.findOne({ customId: sellerId });
        if (!seller) throw new Error(`Seller with ID ${sellerId} not found`);

        let finalImage = image || null;
        if (imageFile?.file) {
          finalImage = await uploadSingleFile(imageFile.file, "rentals");
        }

        const newRental = new Rental({
          name,
          brand,
          location,
          pricePerHour,
          pricePerDay,
          description,
          image: finalImage,
          quantity: quantity || 1,
          status: "pending",
          sellerId,
        });

        const saved = await newRental.save();

        await createSellerNotification({
          sellerId,
          title: "🚁 New Rental Submitted",
          message: `Your rental listing "${name}" has been submitted for admin approval.`,
          type: "rental_submission",
          data: { rentalId: saved.rentalId },
          url: `/seller/rentals/${saved.rentalId}`,
          pubsub,
        });

        return {
          ...saved.toObject(),
          sellerInfo: {
            email: seller.email,
            phoneNumber: seller.phoneNumber,
          },
        };
      } catch (error) {
        console.error("❌ Error creating rental:", error);
        throw new Error("Failed to create rental: " + error.message);
      }
    },

    updateRental: async (_, { rentalId, input }) => {
      try {
        const existing = await Rental.findOne({ rentalId });
        if (!existing) throw new Error("Rental not found");

        if (input.imageFile?.file) {
          if (existing.image) {
            await deleteFirebaseFile(existing.image);
          }
          input.image = await uploadSingleFile(input.imageFile.file, "rentals");
        }

        const updated = await Rental.findOneAndUpdate({ rentalId }, input, {
          new: true,
        });
        if (!updated) throw new Error("Rental not found after update");

        const seller = await Seller.findOne({ customId: updated.sellerId });

        return {
          ...updated.toObject(),
          sellerInfo: {
            email: seller?.email || null,
            phoneNumber: seller?.phoneNumber || null,
          },
        };
      } catch (error) {
        console.error("❌ Error updating rental:", error);
        throw new Error("Failed to update rental: " + error.message);
      }
    },

    updateRentalStatus: async (_, { rentalId, status }, { pubsub }) => {
      try {
        const updated = await Rental.findOneAndUpdate(
          { rentalId },
          { status },
          { new: true }
        );
        if (!updated) throw new Error("Rental not found");

        const seller = await Seller.findOne({ customId: updated.sellerId });

        if (seller?.email) {
          await sendSellerStatusMail({
            to: seller.email,
            productType: "Rental",
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
          sellerInfo: {
            email: seller?.email || null,
            phoneNumber: seller?.phoneNumber || null,
          },
        };
      } catch (err) {
        console.error("❌ Error updating rental status:", err);
        throw new Error("Failed to update rental status: " + err.message);
      }
    },

    deleteRental: async (_, { rentalId }, { pubsub }) => {
      try {
        const deleted = await Rental.findOneAndDelete({ rentalId });
        if (!deleted) throw new Error("Rental not found");

        if (deleted.image) {
          await deleteFirebaseFile(deleted.image);
        }

        const seller = await Seller.findOne({ customId: deleted.sellerId });

        await createSellerNotification({
          sellerId: deleted.sellerId,
          title: "🗑️ Rental Deleted",
          message: `Your rental "${deleted.name}" has been removed from the system.`,
          type: "rental_deleted",
          data: { rentalId },
          url: `/seller/rentals`,
          pubsub,
        });

        return {
          ...deleted.toObject(),
          sellerInfo: {
            email: seller?.email || null,
            phoneNumber: seller?.phoneNumber || null,
          },
        };
      } catch (error) {
        console.error("❌ Error deleting rental:", error);
        throw new Error("Failed to delete rental: " + error.message);
      }
    },
  },
};