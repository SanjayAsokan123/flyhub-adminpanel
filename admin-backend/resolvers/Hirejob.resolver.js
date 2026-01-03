import { HireJob } from "../models/Hirejob.model.js";
import { Seller } from "../models/Seller.model.js";
import { sendSellerStatusMail } from "../utils/emailService.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";
import { sendPushNotification as sendSellerPush } from "../utils/SendPushNotification.js";
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
      HireJob.find({ sellerId, status: "approved" }),
    pendingJobs: async (_, { sellerId }) =>
      HireJob.find({ sellerId, status: "pending" }),
    rejectedJobs: async (_, { sellerId }) =>
      HireJob.find({ sellerId, status: "rejected" }),
    getAllApprovedJobs: async () =>
      await HireJob.find({ status: "approved" }).sort({ createdAt: -1 }),
    approvedJobsPaginated: async (_, { page, limit, search = {}, query }) => {
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
      let matchQuery = {
        status: { $regex: /^approved$/i },
        ...(search?.jobName ? { jobName: { $regex: search.jobName, $options: "i" } } : {}),
        ...(search?.companyName ? { companyName: { $regex: search.companyName, $options: "i" } } : {}),
        ...(search?.jobType ? { jobType: { $regex: search.jobType, $options: "i" } } : {}),
        ...(search?.experience ? { experience: { $regex: search.experience, $options: "i" } } : {}),
        ...(search?.location ? { location: { $regex: search.location, $options: "i" } } : {}),
        ...(search?.salary ? { salary: { $regex: search.salary, $options: "i" } } : {}),
        ...(search?.description ? { description: { $regex: search.description, $options: "i" } } : {}),
        ...(search?.requirement ? { requirement: { $regex: search.requirement, $options: "i" } } : {}),
        ...(textSearchStage.length > 0 ? { $and: textSearchStage } : {})
      };

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
        let imageUrl = input.image;
        if (input.imageFile?.file) {
          imageUrl = await uploadSingleFile(
            input.imageFile.file,
            "job-images"
          );
        }
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
          image: imageUrl,
          jobId,
          email: seller.email,
          phoneNumber: seller.phoneNumber,
          status: "pending",
        });
        const savedJob = await newJob.save();
        await createSellerNotification({
          sellerId: input.sellerId,
          title: "🧾 Job Submitted for Review",
          message: `Your job "${input.jobName}" has been submitted.`,
          type: "job_listing",
          data: { jobId, status: "pending" },
          url: `/seller/jobs/${jobId}`,
          pubsub,
        });
        if (seller.fcmTokens?.length) {
          await sendSellerPush(
            seller.fcmTokens,
            "🧾 Job Submitted",
            `Your job "${input.jobName}" has been submitted for review.`,
            { jobId, status: "pending", type: "job_submitted" }
          );
        }
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

        /* ================= EMAIL ================= */

        if (seller.email) {
          await sendSellerStatusMail({
            to: seller.email,
            productType: "Job",
            productName: updated.jobName,
            status,
          });
        }

        /* ================= SELLER PUSH ================= */

        if (seller.fcmTokens?.length) {
          if (status === "approved") {
            await sendSellerPush(
              seller.fcmTokens,
              "✅ Job Approved",
              `Your job "${updated.jobName}" has been approved.`,
              {
                jobId,
                status,
                type: "job_approved",
              }
            );
          }

          if (status === "rejected") {
            await sendSellerPush(
              seller.fcmTokens,
              "❌ Job Rejected",
              `Your job "${updated.jobName}" was rejected. Please contact admin.`,
              {
                jobId,
                status,
                type: "job_rejected",
              }
            );
          }

          if (status === "pending") {
            await sendSellerPush(
              seller.fcmTokens,
              "Job Under Review",
              `Your job "${updated.jobName}" is under review.`,
              {
                jobId,
                status,
                type: "job_pending",
              }
            );
          }
        }

        /* ================= SELLER DB NOTIFICATION ================= */

        await createSellerNotification({
          sellerId: updated.sellerId,
          title: `Job ${status.toUpperCase()}`,
          message:
            status === "approved"
              ? `Your job "${updated.jobName}" has been approved.`
              : status === "rejected"
                ? `Your job "${updated.jobName}" was rejected.`
                : `Your job "${updated.jobName}" is under review.`,
          type: "job_status",
          data: { jobId, status },
          url: `/seller/jobs/${jobId}`,
          pubsub,
        });

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

        /* ================= DELETE ATTACHMENTS ================= */

        if (deleted.attachments?.length) {
          for (const file of deleted.attachments) {
            if (file.url) await deleteFirebaseFile(file.url);
          }
        }

        const seller = await Seller.findOne({ customId: deleted.sellerId });

        /* ================= SELLER DB NOTIFICATION ================= */

        await createSellerNotification({
          sellerId: deleted.sellerId,
          title: "🗑️ Job Deleted",
          message: `Your job "${deleted.jobName}" has been removed from Flyhub.`,
          type: "job_deleted",
          data: { jobId },
          url: `/seller/jobs`,
          pubsub,
        });

        /* ================= SELLER PUSH ================= */

        if (seller?.fcmTokens?.length) {
          await sendSellerPush(
            seller.fcmTokens,
            "🗑️ Job Deleted",
            `Your job "${deleted.jobName}" has been deleted successfully.`,
            {
              jobId,
              type: "job_deleted",
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
        console.error("❌ Error deleting job:", err);
        throw new Error("Failed to delete job: " + err.message);
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


  if (!ranges.max && !ranges.min) {
    const implicitMatch = cleaned.match(/\b(\d+)(k?)\b/i);
    if (implicitMatch) {
      const val = parseInt(implicitMatch[1]) * (implicitMatch[2].toLowerCase() === 'k' ? 1000 : 1);
      if (val > 100) {
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