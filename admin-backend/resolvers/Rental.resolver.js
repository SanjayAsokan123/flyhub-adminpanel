import { Rental } from "../models/Rental.model.js";
import { Seller } from "../models/Seller.model.js";
import { sendSellerStatusMail } from "../utils/emailService.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";
import { sendPushNotification } from "../utils/SendPushNotification.js";
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
      as: "sellerInfo"
    }
  },
  { $unwind: { path: "$sellerInfo", preserveNullAndEmptyArrays: true } }
];
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
    approvedRentalsPaginated: async (_, { page, limit, search = {}, query }) => {
      const pageNumber = Math.max(page, 1);
      const pageSize = Math.max(limit, 1);
      const skip = (pageNumber - 1) * pageSize;

      // 1. Parse Query String (if present)
      let dynamicFilters = {};
      let searchText = "";

      if (query) {
        // Extract Price
        const listPrice = extractPriceAndClean(query);
        const { min, max, cleanedText } = listPrice;

        if (min !== null) {
          dynamicFilters.minPrice = min;
        }
        if (max !== null) {
          dynamicFilters.maxPrice = max;
        }

        // Remove Stopwords (near, in, etc.)
        searchText = removeStopWords(cleanedText);
      }

      // Text Search Stage
      const textSearchStage = [];
      if (searchText) {
        // Split by space and filter empty strings
        const words = searchText.split(/\s+/).filter(w => w.length > 0);

        // For each word, we want it to match AT LEAST ONE of the fields (name OR brand OR location)
        // AND this must be true for ALL words.
        // So "DJI Mumbai" -> (name=DJI OR brand=DJI OR loc=DJI) AND (name=Mum OR brand=Mum OR loc=Mum)

        words.forEach(word => {
          const regex = { $regex: word, $options: "i" };
          textSearchStage.push({
            $or: [
              { name: regex },
              { brand: regex },
              { location: regex },
              { description: regex }
            ]
          });
        });
      }

      const matchStage = {
        $match: {
          status: { $regex: /^approved$/i },

          // Explicit Search Filters
          ...(search?.brand
            ? { brand: { $regex: search.brand, $options: "i" } }
            : {}),
          ...(search?.location
            ? { location: { $regex: search.location, $options: "i" } }
            : {}),

          // Price Filters (Merged)
          // If dynamic filters exist but no explicit price filter, apply to both Hour/Day via $or
          ...((dynamicFilters.minPrice || dynamicFilters.maxPrice) &&
            !search?.minPricePerHour && !search?.maxPricePerHour &&
            !search?.minPricePerDay && !search?.maxPricePerDay
            ? {
              $or: [
                {
                  pricePerHour: {
                    ...(dynamicFilters.minPrice ? { $gte: dynamicFilters.minPrice } : {}),
                    ...(dynamicFilters.maxPrice ? { $lte: dynamicFilters.maxPrice } : {})
                  }
                },
                {
                  pricePerDay: {
                    ...(dynamicFilters.minPrice ? { $gte: dynamicFilters.minPrice } : {}),
                    ...(dynamicFilters.maxPrice ? { $lte: dynamicFilters.maxPrice } : {})
                  }
                }
              ]
            }
            : {}
          ),

          // Explicit Price Filters
          ...(search?.minPricePerHour || search?.maxPricePerHour
            ? {
              pricePerHour: {
                ...(search.minPricePerHour ? { $gte: search.minPricePerHour } : {}),
                ...(search.maxPricePerHour ? { $lte: search.maxPricePerHour } : {}),
              },
            }
            : {}),
          ...(search?.minPricePerDay || search?.maxPricePerDay
            ? {
              pricePerDay: {
                ...(search.minPricePerDay ? { $gte: search.minPricePerDay } : {}),
                ...(search.maxPricePerDay ? { $lte: search.maxPricePerDay } : {}),
              },
            }
            : {}),

          // Combine Text Search
          ...(textSearchStage.length > 0 ? { $and: textSearchStage } : {})
        },
      };

      const [result] = await Rental.aggregate([
        matchStage,
        {
          $facet: {
            items: [
              ...baseLookup, // your existing lookup pipeline
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

        if (status === "approved") {
          await sendPushNotification(
            seller.fcmTokens,
            "Seller approved",
            "Explore your profile page and Thank you"
          );
        }
        else if (status === "approved") {
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
          title: "🗑 Rental Deleted",
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

// ==========================================
// HELPERS
// ==========================================

function extractPriceAndClean(text) {
  const ranges = { min: null, max: null };
  if (!text) return { ...ranges, cleanedText: "" };

  let cleaned = text;

  // Patterns for MAX (under/below/less than)
  const maxPatterns = [/under\s*(\d+)(k?)/i, /below\s*(\d+)(k?)/i, /less\s+than\s*(\d+)(k?)/i];
  for (const regex of maxPatterns) {
    const match = cleaned.match(regex);
    if (match) {
      cleaned = cleaned.replace(match[0], '');
      ranges.max = parseInt(match[1]) * (match[2].toLowerCase() === 'k' ? 1000 : 1);
      break;
    }
  }

  // Patterns for MIN (over/above/more than)
  const minPatterns = [/over\s*(\d+)(k?)/i, /above\s*(\d+)(k?)/i, /more\s+than\s*(\d+)(k?)/i];
  for (const regex of minPatterns) {
    const match = cleaned.match(regex);
    if (match) {
      cleaned = cleaned.replace(match[0], '');
      ranges.min = parseInt(match[1]) * (match[2].toLowerCase() === 'k' ? 1000 : 1);
      break;
    }
  }

  // RANGE (500-1000)
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
  // Filter out stop words
  return words.filter(w => !stopWords.includes(w.toLowerCase())).join(' ');
}