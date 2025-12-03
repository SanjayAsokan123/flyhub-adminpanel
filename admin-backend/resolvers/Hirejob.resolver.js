import { HireJob } from "../models/Hirejob.model.js";
import { Seller } from "../models/Seller.model.js";
import { sendSellerStatusMail } from "../utils/emailService.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";
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

        await createSellerNotification({
          sellerId: updated.sellerId,
          title: `Job ${status.toUpperCase()}: ${updated.jobName}`,
          message:
            status === "approved"
              ? `Your job "${updated.jobName}" has been approved and is now live.`
              : status === "rejected"
              ? `Your job "${updated.jobName}" was rejected. Please review and resubmit.`
              : `Your job status has been updated to "${status}".`,
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
