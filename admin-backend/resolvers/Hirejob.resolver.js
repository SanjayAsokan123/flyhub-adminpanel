import { HireJob } from "../models/Hirejob.model.js";
import { Seller } from "../models/Seller.model.js";
import { sendSellerStatusMail } from "../utils/emailService.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";
import { sendPushNotification } from "../utils/SendPushNotification.js";
import {
  uploadSingleFile,
  uploadMultipleFiles,
  deleteFirebaseFile,
} from "../utils/uploadToFirebase.js";

export const jobResolvers = {
  Query: {
    jobs: async () => await HireJob.find().sort({ createdAt: -1 }),

    job: async (_, { jobId }) => await HireJob.findOne({ jobId }),

    approvedJobs: async (_, { sellerId }) =>
      await HireJob.find({ sellerId, status: "approved" }),
    pendingJobs: async (_, { sellerId }) =>
      await HireJob.find({ sellerId, status: "pending" }),
    rejectedJobs: async (_, { sellerId }) =>
      await HireJob.find({ sellerId, status: "rejected" }),
    getAllApprovedJobs: async () =>
      await HireJob.find({ status: "approved" }).sort({ createdAt: -1 }),

    approvedJobsPaginated: async (_, { page, limit, search = {}, query }) => {
      const pageNumber = Math.max(page, 1);
      const pageSize = Math.max(limit, 1);
      const skip = (pageNumber - 1) * pageSize;

      // 1. Parse Query String (if present)
      let dynamicFilters = {};
      let searchText = "";

      if (query) {
        // Extract Price (Salary)
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
              { jobName: regex },
              { companyName: regex },
              { jobType: regex },
              { experience: regex },
              { location: regex },
              { salary: regex },
              { description: regex },
              { requirement: regex }
            ]
          });
        });
      }

      // Build Match Stage with Aggregation Expr for Salary (String -> Number)
      let matchQuery = {
        status: { $regex: /^approved$/i },

        // Explicit Search Filters
        ...(search?.jobName ? { jobName: { $regex: search.jobName, $options: "i" } } : {}),
        ...(search?.companyName ? { companyName: { $regex: search.companyName, $options: "i" } } : {}),
        ...(search?.jobType ? { jobType: { $regex: search.jobType, $options: "i" } } : {}),
        ...(search?.experience ? { experience: { $regex: search.experience, $options: "i" } } : {}),
        ...(search?.location ? { location: { $regex: search.location, $options: "i" } } : {}),
        ...(search?.salary ? { salary: { $regex: search.salary, $options: "i" } } : {}),
        ...(search?.description ? { description: { $regex: search.description, $options: "i" } } : {}),
        ...(search?.requirement ? { requirement: { $regex: search.requirement, $options: "i" } } : {}),

        // Combine Text Search
        ...(textSearchStage.length > 0 ? { $and: textSearchStage } : {})
      };

      // Salary Numeric Filtering
      // Since 'salary' is a String (e.g., "5000", "5000-10000"), we try to convert to double.
      // If conversion fails (non-numeric text), it returns null/error in strict mode, 
      // but $toDouble returns null or 0 inside $expr usually or errors. 
      // Safest is to only apply if we have min/max and assume data is generally numeric or we accept missed hits.
      if (dynamicFilters.minPrice || dynamicFilters.maxPrice) {
        const salaryExpr = [];
        if (dynamicFilters.minPrice) {
          salaryExpr.push({ $gte: [{ $toDouble: "$salary" }, dynamicFilters.minPrice] });
        }
        if (dynamicFilters.maxPrice) {
          salaryExpr.push({ $lte: [{ $toDouble: "$salary" }, dynamicFilters.maxPrice] });
        }
        matchQuery = {
          $and: [
            matchQuery,
            { $expr: { $and: salaryExpr } }
          ]
        };
      }

      const [result] = await HireJob.aggregate([
        { $match: matchQuery },
        {
          $facet: {
            items: [
              { $sort: { createdAt: -1 } },
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

    addJob: async (_, { input }, { pubsub }) => {
      try {
        const seller = await Seller.findOne({ customId: input.sellerId });
        if (!seller) throw new Error("Seller not found");

        let uploadedFiles = [];
        if (input.attachments?.length) {
          const fileList = input.attachments.filter((f) => f.file);
          if (fileList.length) {
            uploadedFiles = await uploadMultipleFiles(
              fileList.map((f) => f.file),
              "job-attachments"
            );
          }
          input.attachments = input.attachments.map((f, i) =>
            f.url ? f : { url: uploadedFiles[i] }
          );
        }

        const count = await HireJob.countDocuments({ sellerId: input.sellerId });
        const jobNumber = String(count + 1).padStart(3, "0");
        const jobId = `${seller.customId}J${jobNumber}`;

        const newJob = new HireJob({
          ...input,
          jobId,
          email: seller.email,
          phoneNumber: seller.phoneNumber,
          status: "pending",
        });

        const savedJob = await newJob.save();

        await createSellerNotification({
          sellerId: input.sellerId,
          title: "🧾 Job Submitted for Review",
          message: `Your job "${input.jobName}" has been submitted and is pending approval.`,
          type: "job_listing",
          data: { jobId, status: "pending" },
          url: `/seller/jobs/${jobId}`,
          pubsub,
        });

        return savedJob;
      } catch (err) {
        console.error("❌ Error adding job:", err);
        throw new Error("Failed to add job: " + err.message);
      }
    },

    updateJob: async (_, { jobId, input }) => {
      try {
        const updated = await HireJob.findOneAndUpdate({ jobId }, input, {
          new: true,
        });
        if (!updated) throw new Error("Job not found");
        return updated;
      } catch (err) {
        console.error("❌ Error updating job:", err);
        throw new Error("Failed to update job: " + err.message);
      }
    },

    updateStatus: async (_, { jobId, status }, { pubsub }) => {
      try {
        const updated = await HireJob.findOneAndUpdate(
          { jobId },
          { status },
          { new: true }
        );
        if (!updated) throw new Error("Job not found");

        const seller = await Seller.findOne({ customId: updated.sellerId });
        if (!seller) throw new Error("Seller not found for this job");

        if (seller.email) {
          await sendSellerStatusMail({
            to: seller.email,
            productType: "Job",
            productName: updated.jobName,
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
        console.error("❌ Error updating job status:", err);
        throw new Error("Failed to update job status: " + err.message);
      }
    },

    deleteJob: async (_, { jobId }, { pubsub }) => {
      try {
        const deleted = await HireJob.findOneAndDelete({ jobId });
        if (!deleted) throw new Error("Job not found");

        if (deleted.attachments?.length) {
          for (const file of deleted.attachments) {
            if (file.url) await deleteFirebaseFile(file.url);
          }
        }

        await createSellerNotification({
          sellerId: deleted.sellerId,
          title: "🗑️ Job Deleted",
          message: `Your job "${deleted.jobName}" has been removed from Flyhub.`,
          type: "job_deleted",
          data: { jobId },
          url: `/seller/jobs`,
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
        console.error("❌ Error deleting job:", err);
        throw new Error("Failed to delete job: " + err.message);
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

  // IMPLICIT PRICE (Standalone numbers > 100)
  // If we haven't found a max price yet, and there's a standalone number, treat it as max price (budget).
  // We avoid small numbers to not capture "5 years experience" or "Phase 1".
  if (!ranges.max && !ranges.min) {
    const implicitMatch = cleaned.match(/\b(\d+)(k?)\b/i);
    if (implicitMatch) {
      const val = parseInt(implicitMatch[1]) * (implicitMatch[2].toLowerCase() === 'k' ? 1000 : 1);
      if (val > 100) { // Heuristic threshold
        cleaned = cleaned.replace(implicitMatch[0], '');
        ranges.max = val;
      }
    }
  }

  return { ...ranges, cleanedText: cleaned.replace(/\s+/g, ' ').trim() };
}

function removeStopWords(text) {
  if (!text) return "";
  const stopWords = ['near', 'in', 'at', 'from', 'around', 'for', 'with'];
  const words = text.split(/\s+/);
  return words.filter(w => !stopWords.includes(w.toLowerCase())).join(' ');
}