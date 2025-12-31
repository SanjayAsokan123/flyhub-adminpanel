import { Service } from "../models/Service.model.js";
import { Seller } from "../models/Seller.model.js";
import { sendSellerStatusMail } from "../utils/emailService.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";
import { sendPushNotification as sendSellerPush } from "../utils/SendPushNotification.js";
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
  try {
    const pageNumber = Math.max(page, 1);
    const pageSize = Math.max(limit, 1);
    const skip = (pageNumber - 1) * pageSize;

   
    let dynamicFilters = {};
    let searchText = "";

    if (query) {
     
      const listPrice = extractPriceAndClean(query);
      const { min, max, cleanedText } = listPrice;

      if (min !== null) dynamicFilters.minPrice = min;
      if (max !== null) dynamicFilters.maxPrice = max;

      
      searchText = removeStopWords(cleanedText);
    }

   
    const matchConditions = {
      status: "approved"
    };

   
    if (searchText) {
      const words = searchText.split(/\s+/).filter(w => w.length > 0);
      if (words.length > 0) {
        matchConditions.$or = [
          { name: { $regex: words.join('|'), $options: 'i' } },
          { specificDrone: { $regex: words.join('|'), $options: 'i' } },
          { location: { $regex: words.join('|'), $options: 'i' } },
          { description: { $regex: words.join('|'), $options: 'i' } }
        ];
      }
    }

   
    if (search.name) {
      matchConditions.name = { $regex: search.name, $options: 'i' };
    }
    if (search.location) {
      matchConditions.location = { $regex: search.location, $options: 'i' };
    }
    if (search.specificDrone) {
      matchConditions.specificDrone = { $regex: search.specificDrone, $options: 'i' };
    }

    
    const priceFilter = {};
    if (search.minPrice !== undefined) {
      priceFilter.$gte = Number(search.minPrice);
    }
    if (search.maxPrice !== undefined) {
      priceFilter.$lte = Number(search.maxPrice);
    }
    
   
    if (Object.keys(priceFilter).length === 0) {
      if (dynamicFilters.minPrice !== undefined) {
        priceFilter.$gte = Number(dynamicFilters.minPrice);
      }
      if (dynamicFilters.maxPrice !== undefined) {
        priceFilter.$lte = Number(dynamicFilters.maxPrice);
      }
    }
    
   
    if (Object.keys(priceFilter).length > 0) {
      matchConditions.price = priceFilter;
    }

    
    const totalCount = await Service.countDocuments(matchConditions);
    const pageCount = Math.ceil(totalCount / pageSize);

   
    const items = await Service.aggregate([
      { $match: matchConditions },
      {
        $lookup: {
          from: 'sellers',
          localField: 'sellerId',
          foreignField: 'customId',
          as: 'sellerInfo'
        }
      },
      { $unwind: { path: '$sellerInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          serviceId: 1,
          name: 1,
          specificDrone: 1,
          experience: 1,
          location: 1,
          description: 1,
          price: 1,
          image: 1,
          status: 1,
          sellerId: 1,
          createdAt: 1,
          updatedAt: 1,
          sellerInfo: {
            email: '$sellerInfo.email',
            phoneNumber: '$sellerInfo.phoneNumber'
          }
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: pageSize }
    ]);

    return {
      items,
      totalCount,
      page: pageNumber,
      limit: pageSize,
      pageCount
    };
  } catch (error) {
    console.error("❌ Error in approvedServicesPaginated:", error);
    throw new Error("Failed to fetch paginated services: " + error.message);
  }
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

// 🔔 SELLER PUSH (NEW)
if (seller.fcmTokens?.length) {
  await sendSellerPush(
    seller.fcmTokens,
    "🛠️ Service Submitted",
    `Your service "${saved.name}" is pending admin approval.`,
    { serviceId: saved.serviceId, type: "service_submission" }
  );
}

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
    const normalizedStatus = status.toLowerCase();

    if (!validStatuses.includes(normalizedStatus)) {
      throw new Error("Invalid status. Must be pending, approved, or rejected.");
    }

    const updated = await Service.findOneAndUpdate(
      { serviceId },
      { status: normalizedStatus },
      { new: true }
    );
    if (!updated) throw new Error("Service not found");

    const seller = await Seller.findOne({ customId: updated.sellerId });

    if (seller?.email) {
      await sendSellerStatusMail({
        to: seller.email,
        productType: "Service",
        productName: updated.name,
        status: normalizedStatus,
      });
    }

    if (seller.fcmTokens?.length) {
      if (normalizedStatus === "approved") {
        await sendSellerPush(
          seller.fcmTokens,
          "✅ Service Approved",
          `Your service "${updated.name}" has been approved.`,
          { serviceId, type: "service_approved" }
        );
      } else if (normalizedStatus === "rejected") {
        await sendSellerPush(
          seller.fcmTokens,
          "❌ Service Rejected",
          `Your service "${updated.name}" was rejected.`,
          { serviceId, type: "service_rejected" }
        );
      }
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

// 🔔 SELLER PUSH (NEW)
if (seller?.fcmTokens?.length) {
  await sendSellerPush(
    seller.fcmTokens,
    "🗑️ Service Deleted",
    `Your service "${deleted.name}" has been removed.`,
    {
      serviceId,
      type: "service_deleted",
    }
  );
}
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

function extractPriceAndClean(text) {
  const ranges = { min: null, max: null };
  if (!text) return { ...ranges, cleanedText: "" };

  let cleaned = text;

  
  const maxPatterns = [/under\s*(\d+)(k?)/i, /below\s*(\d+)(k?)/i, /less\s+than\s*(\d+)(k?)/i];
  for (const regex of maxPatterns) {
    const match = cleaned.match(regex);
    if (match) {
      cleaned = cleaned.replace(match[0], '');
      ranges.max = parseInt(match[1]) * (match[2].toLowerCase() === 'k' ? 1000 : 1);
      break;
    }
  }

  
  const minPatterns = [/over\s*(\d+)(k?)/i, /above\s*(\d+)(k?)/i, /more\s+than\s*(\d+)(k?)/i];
  for (const regex of minPatterns) {
    const match = cleaned.match(regex);
    if (match) {
      cleaned = cleaned.replace(match[0], '');
      ranges.min = parseInt(match[1]) * (match[2].toLowerCase() === 'k' ? 1000 : 1);
      break;
    }
  }

 
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