import { Service } from "../models/Service.model.js";
import { Seller } from "../models/Seller.model.js";
import { sendSellerStatusMail } from "../utils/emailService.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";
import { sendPushNotification } from "../utils/SendPushNotification.js";
import {
  uploadSingleFile,
  deleteFirebaseFile,
} from "../utils/uploadToFirebase.js";

export const serviceResolvers = {
  Query: {

    services: async () => {
      try {
        const services = await Service.find().sort({ createdAt: -1 });
        return Promise.all(
          services.map(async (s) => {
            const seller = await Seller.findOne({ customId: s.sellerId });
            return {
              ...s.toObject(),
              sellerInfo: seller
                ? { email: seller.email, phoneNumber: seller.phoneNumber }
                : null,
            };
          })
        );
      } catch (error) {
        console.error("❌ Error fetching services:", error);
        throw new Error("Failed to fetch services: " + error.message);
      }
    },
    service: async (_, { serviceId }) => {
      try {
        const s = await Service.findOne({ serviceId });
        if (!s) throw new Error("Service not found");

        const seller = await Seller.findOne({ customId: s.sellerId });
        return {
          ...s.toObject(),
          sellerInfo: seller
            ? { email: seller.email, phoneNumber: seller.phoneNumber }
            : null,
        };
      } catch (error) {
        console.error("❌ Error fetching service:", error);
        throw new Error("Failed to fetch service: " + error.message);
      }
    },
    approvedServices: async (_, { sellerId }) =>
      Service.find({ sellerId, status: "approved" }),
    pendingServices: async (_, { sellerId }) =>
      Service.find({ sellerId, status: "pending" }),
    rejectedServices: async (_, { sellerId }) =>
      Service.find({ sellerId, status: "rejected" }),

    approvedServicesPaginated: async (_, { page, limit, search = {}, query }) => {
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

        if (min !== null) dynamicFilters.minPrice = min;
        if (max !== null) dynamicFilters.maxPrice = max;

        // Remove Stopwords
        searchText = removeStopWords(cleanedText);
      }

      // Text Search Stage
      const textSearchStage = [];
      if (searchText) {
        const words = searchText.split(/\s+/).filter(w => w.length > 0);
        words.forEach(word => {
          const regex = { $regex: word, $options: "i" };
          textSearchStage.push({
            $or: [
              { name: regex },
              { specificDrone: regex },
              { location: regex },
              { description: regex },
              // experience is Int, cannot use regex directly unless converted. 
              // Usually users search "5 years experience". 
              // We can try to match exact number if word is number?
              // For now let's stick to text fields.
            ]
          });
        });
      }

      // Build Match Stage
      const matchStage = {
        $match: {
          status: { $regex: /^approved$/i },

          // Explicit Search Filters
          ...(search?.name ? { name: { $regex: search.name, $options: "i" } } : {}),
          ...(search?.location ? { location: { $regex: search.location, $options: "i" } } : {}),
          ...(search?.specificDrone ? { specificDrone: { $regex: search.specificDrone, $options: "i" } } : {}),

          // Price Filters (Merged)
          ...((dynamicFilters.minPrice || dynamicFilters.maxPrice) && !search?.minPrice && !search?.maxPrice
            ? {
              price: {
                ...(dynamicFilters.minPrice ? { $gte: dynamicFilters.minPrice } : {}),
                ...(dynamicFilters.maxPrice ? { $lte: dynamicFilters.maxPrice } : {})
              }
            }
            : {}
          ),

          // Explicit Price
          ...(search?.minPrice || search?.maxPrice
            ? {
              price: {
                ...(search.minPrice ? { $gte: search.minPrice } : {}),
                ...(search.maxPrice ? { $lte: search.maxPrice } : {})
              }
            }
            : {}
          ),

          // Combine Text Search
          ...(textSearchStage.length > 0 ? { $and: textSearchStage } : {})
        }
      };

      const [result] = await Service.aggregate([
        matchStage,
        {
          $facet: {
            items: [
              ...baseLookup, // We need to define baseLookup for Service if not exists, or reuse logic
              { $skip: skip },
              { $limit: pageSize },
            ],
            totalCount: [{ $count: "count" }],
          },
        },
      ]);

      const totalCount = result.totalCount?.[0]?.count || 0;
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
    createService: async (_, { input }, { pubsub }) => {
      try {
        const allowedFields = [
          "name",
          "specificDrone",
          "experience",
          "location",
          "description",
          "price",
          "image",
          "sellerId",
        ];

        const data = Object.fromEntries(
          Object.entries(input).filter(([key]) => allowedFields.includes(key))
        );

        if (input.imageFile?.file) {
          data.image = await uploadSingleFile(input.imageFile.file, "services");
        }

        const count = await Service.countDocuments();
        data.serviceId = count + 1;
        data.status = "pending";

        const seller = await Seller.findOne({ customId: data.sellerId });
        if (!seller) throw new Error("Seller not found");

        const saved = await new Service(data).save();

        await createSellerNotification({
          sellerId: seller.customId,
          title: "🛠️ New Service Added",
          message: `Your service "${saved.name}" has been submitted for review.`,
          type: "service_submission",
          data: { serviceId: saved.serviceId },
          url: `/seller/services/${saved.serviceId}`,
          pubsub,
        });

        await createSellerNotification({
          sellerId: "ADMIN",
          title: "🆕 New Service Pending Review",
          message: `A new service "${saved.name}" was added by seller "${seller.name}".`,
          type: "service_pending",
          data: { serviceId: saved.serviceId },
          url: `/admin/services/${saved.serviceId}`,
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
        console.error("❌ Create Service Error:", error);
        throw new Error("Failed to add service: " + error.message);
      }
    },

    updateService: async (_, { serviceId, input }) => {
      try {
        const allowedFields = [
          "name",
          "specificDrone",
          "experience",
          "location",
          "description",
          "price",
          "image",
          "sellerId",
          "status",
        ];

        const updateData = Object.fromEntries(
          Object.entries(input).filter(([key]) => allowedFields.includes(key))
        );

        const existing = await Service.findOne({ serviceId });
        if (!existing) throw new Error("Service not found");

        if (input.imageFile?.file) {
          if (existing.image) {
            await deleteFirebaseFile(existing.image);
          }
          updateData.image = await uploadSingleFile(
            input.imageFile.file,
            "services"
          );
        }

        const updated = await Service.findOneAndUpdate(
          { serviceId },
          updateData,
          { new: true, runValidators: true }
        );
        if (!updated) throw new Error("Service not found");

        const seller = await Seller.findOne({ customId: updated.sellerId });

        return {
          ...updated.toObject(),
          sellerInfo: seller
            ? { email: seller.email, phoneNumber: seller.phoneNumber }
            : null,
        };
      } catch (error) {
        console.error("❌ Error updating service:", error);
        throw new Error("Failed to update service: " + error.message);
      }
    },

    updateServiceStatus: async (_, { serviceId, status }, { pubsub }) => {
      try {
        const validStatuses = ["pending", "approved", "rejected"];
        if (!validStatuses.includes(status.toLowerCase())) {
          throw new Error(
            "Invalid status. Must be pending, approved, or rejected."
          );
        }

        const updated = await Service.findOneAndUpdate(
          { serviceId },
          { status },
          { new: true }
        );
        if (!updated) throw new Error("Service not found");

        const seller = await Seller.findOne({ customId: updated.sellerId });

        if (seller?.email) {
          await sendSellerStatusMail({
            to: seller.email,
            productType: "Service",
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
          sellerInfo: seller
            ? { email: seller.email, phoneNumber: seller.phoneNumber }
            : null,
        };
      } catch (err) {
        console.error("❌ Error updating service status:", err);
        throw new Error("Failed to update service status: " + err.message);
      }
    },

    deleteService: async (_, { serviceId }, { pubsub }) => {
      try {
        const deleted = await Service.findOneAndDelete({ serviceId });
        if (!deleted) throw new Error("Service not found");

        if (deleted.image) {
          await deleteFirebaseFile(deleted.image);
        }

        const seller = await Seller.findOne({ customId: deleted.sellerId });

        await createSellerNotification({
          sellerId: deleted.sellerId,
          title: "🗑️ Service Deleted",
          message: `Your service "${deleted.name}" has been removed from the system.`,
          type: "service_deleted",
          data: { serviceId },
          url: `/seller/services`,
          pubsub,
        });

        return {
          ...deleted.toObject(),
          sellerInfo: seller
            ? { email: seller.email, phoneNumber: seller.phoneNumber }
            : null,
        };
      } catch (error) {
        console.error("❌ Error deleting service:", error);
        throw new Error("Failed to delete service: " + error.message);
      }
    },
  },
};

// ==========================================
// HELPERS
// ==========================================

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
  return words.filter(w => !stopWords.includes(w.toLowerCase())).join(' ');
}