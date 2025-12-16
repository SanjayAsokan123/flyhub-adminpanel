import JobApplication from "../models/JobBooking.model.js";
import { HireJob } from "../models/Hirejob.model.js";
import { Buyer } from "../models/Buyer.model.js";

export const jobApplicationResolvers = {
  Query: {
    getSellerApplications: async (_, { sellerId }) => {
      return await JobApplication.find({ sellerId }).sort({ appliedAt: -1 });
    },

    getPendingApplications: async (_, { sellerId }) =>
      await JobApplication.find({ sellerId, status: "pending" }),

    getRejectedApplications: async (_, { sellerId }) =>
      await JobApplication.find({ sellerId, status: "rejected" }),

    getHiredApplications: async (_, { sellerId }) =>
      await JobApplication.find({ sellerId, status: "hired" }),

    getBuyerPendingApplications: async (_, { buyerId }) =>
      await JobApplication.find({ buyerId, status: "pending" }),

    getBuyerRejectedApplications: async (_, { buyerId }) =>
      await JobApplication.find({ buyerId, status: "rejected" }),

    getBuyerHiredApplications: async (_, { buyerId }) =>
      await JobApplication.find({ buyerId, status: "hired" }),

    getApplicationById: async (_, { id }) =>
      await JobApplication.findById(id),
    getJobApplications: async () => {
  return await JobApplication.find().sort({ appliedAt: -1 });
},


    getApplicationStats: async (_, { sellerId }) => {
      const pipeline = [
        { $match: { sellerId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          }
        }
      ];

      const results = await JobApplication.aggregate(pipeline);
      const stats = { total: 0, pending: 0, rejected: 0, hired: 0 };

      for (const r of results) {
        stats.total += r.count;
        stats[r._id] = r.count;
      }

      return stats;
    },

    buyerJobApplyStatus: async (_, { buyerId }) => {
      return await JobApplication.aggregate([
        { $match: { buyerId } },
        {
          $project: {
            jobId: 1,
            jobName: "$jobTitle",
            companyName: "$companyName",
            bookingId: "$_id",
            status: 1,
            createdAt: 1
          }
        }
      ]);
    },
  },

  Mutation: {
    submitJobApplication: async (_, { input }) => {
      const job = await HireJob.findOne({ jobId: input.jobId });
      if (!job) {
        return {
          success: false,
          message: "Job not found.",
          application: null,
        };
      }

      // Prevent duplicate
      const exists = await JobApplication.findOne({
        email: input.email,
        jobId: input.jobId,
      });

      if (exists) {
        return {
          success: false,
          message: "Already applied for this job.",
          application: exists,
        };
      }

      // Get buyer info
      const buyer = await Buyer.findOne({ email: input.email });

      const newApp = new JobApplication({
        buyerId: buyer?.buyerId || "UNKNOWN",
        sellerId: job.sellerId,

        jobId: job.jobId,
        jobTitle: job.jobName,
        companyName: job.companyName,

        name: input.name,
        email: input.email,
        phoneNumber: input.phoneNumber,
        resumeUrl: input.resumeUrl,
      });

      await newApp.save();

      return {
        success: true,
        message: "Application submitted!",
        application: newApp,
      };
    },

    updateApplicationStatus: async (_, { input }) => {
      const updated = await JobApplication.findByIdAndUpdate(
        input.applicationId,
        { status: input.status },
        { new: true }
      );

      return {
        success: true,
        message: "Status updated.",
        application: updated,
      };
    },

    deleteApplication: async (_, { id }) => {
      const deleted = await JobApplication.findByIdAndDelete(id);

      return {
        success: true,
        message: "Application deleted.",
        application: deleted,
      };
    },
  },
};
