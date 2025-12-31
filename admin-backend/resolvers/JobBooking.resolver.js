import JobApplication from "../models/JobBooking.model.js";
import { HireJob } from "../models/Hirejob.model.js";
import { Buyer } from "../models/Buyer.model.js";
import { Seller } from "../models/Seller.model.js";

// BUYER notifications
import { sendPushNotification as sendBuyerPush } from "../utils/pushNotification.js";

// SELLER notifications
import { sendPushNotification as sendSellerPush } from "../utils/SendPushNotification.js";

export const jobApplicationResolvers = {
  Query: {
    getSellerApplications: async (_, { sellerId }) =>
      await JobApplication.find({ sellerId }).sort({ appliedAt: -1 }),

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

    getJobApplications: async () =>
      await JobApplication.find().sort({ appliedAt: -1 }),
  },

  Mutation: {
    // ===============================
    // SUBMIT APPLICATION
    // ===============================
    submitJobApplication: async (_, { input }) => {
      try {
        // 1️⃣ Find job
        const job = await HireJob.findOne({ jobId: input.jobId });
        if (!job) {
          return { success: false, message: "Job not found.", application: null };
        }

        // 2️⃣ Prevent duplicate application
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

        // 3️⃣ Fetch buyer WITH fcmTokens
        const buyer = await Buyer.findOne({ email: input.email })
          .select("buyerId fcmTokens");

        // 4️⃣ Fetch seller WITH fcmTokens (IMPORTANT FIX)
        const seller = await Seller.findOne({ customId: job.sellerId })
          .select("name fcmTokens");

        // 5️⃣ Create application
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
          status: "pending",
        });

        await newApp.save();

        // ======================
        // 🔔 SELLER NOTIFICATION
        // ======================
        if (seller?.fcmTokens?.length > 0) {
          await sendSellerPush(
            seller.fcmTokens,
            "New Job Application 📩",
            `${input.name} applied for ${job.jobName}`,
            {
              applicationId: newApp._id,
              jobId: job.jobId,
              type: "job_application_new",
            }
          );
        }

        // ======================
        // 🔔 BUYER NOTIFICATION
        // ======================
        if (buyer?.fcmTokens?.length > 0) {
          await sendBuyerPush(
            buyer.fcmTokens,
            "Application Submitted ⏳",
            `Your application for ${job.jobName} has been submitted successfully.`,
            {
              applicationId: newApp._id,
              type: "job_application_submitted",
            }
          );
        }

        return {
          success: true,
          message: "Application submitted!",
          application: newApp,
        };

      } catch (err) {
        console.error("submitJobApplication error:", err);
        return {
          success: false,
          message: "Something went wrong",
          application: null,
        };
      }
    },


    // ===============================
    // UPDATE APPLICATION STATUS
    // ===============================
    updateApplicationStatus: async (_, { input }) => {
      const updated = await JobApplication.findByIdAndUpdate(
        input.applicationId,
        { status: input.status },
        { new: true }
      );

      if (!updated) {
        return { success: false, message: "Application not found" };
      }

      const buyer = await Buyer.findOne({ buyerId: updated.buyerId });
      const seller = await Seller.findOne({ sellerId: updated.sellerId });

      // 🔔 BUYER NOTIFICATIONS
      if (buyer?.fcmTokens) {
        if (input.status === "pending") {
          await sendBuyerPush(
            buyer.fcmTokens,
            "Application Under Review ⏳",
            `Your application for ${updated.jobTitle} is under review.`,
            {
              applicationId: updated._id,
              type: "job_application_pending",
            }
          );
        }

        if (input.status === "approved") {
          await sendBuyerPush(
            buyer.fcmTokens,
            "Application Approved ✅",
            `Your application for ${updated.jobTitle} has been approved.`,
            {
              applicationId: updated._id,
              type: "job_application_approved",
            }
          );
        }

        if (input.status === "rejected") {
          await sendBuyerPush(
            buyer.fcmTokens,
            "Application Rejected ❌",
            `Your application for ${updated.jobTitle} was rejected.`,
            {
              applicationId: updated._id,
              type: "job_application_rejected",
            }
          );
        }

        if (input.status === "hired") {
          await sendBuyerPush(
            buyer.fcmTokens,
            "You’re Hired 🎉",
            `Congratulations! You are hired for ${updated.jobTitle}.`,
            {
              applicationId: updated._id,
              type: "job_application_hired",
            }
          );
        }
      }

      // 🔔 SELLER NOTIFICATION (Hired)
      if (input.status === "hired" && seller?.fcmTokens?.length) {
        await sendSellerPush(
          seller.fcmTokens,
          "Candidate Hired 🎯",
          `${updated.name} has been hired for ${updated.jobTitle}.`,
          {
            applicationId: updated._id,
            type: "job_candidate_hired",
          }
        );
      }

      return {
        success: true,
        message: "Status updated.",
        application: updated,
      };
    },

    // ===============================
    // DELETE APPLICATION
    // ===============================
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
