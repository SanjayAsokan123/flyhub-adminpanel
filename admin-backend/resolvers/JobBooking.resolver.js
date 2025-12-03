import JobApplication from "../models/JobBooking.model.js";
import { HireJob } from "../models/Hirejob.model.js";
import { Buyer } from "../models/Buyer.model.js";

export const jobApplicationResolvers = {
  Query: {
getJobApplications: async (_, { jobId }) => {
  try {
    const query = jobId ? { jobId } : {};  // allow all applications
    const applications = await JobApplication.find(query).sort({ createdAt: -1 });
    return applications;
  } catch (error) {
    throw new Error("Failed to fetch applications");
  }
},


    getMyApplications: async (_, { email }) => {
      try {
        const applications = await JobApplication.find({ email }).sort({
          createdAt: -1,
        });
        console.log(`📋 Found ${applications.length} applications for ${email}`);
        return applications;
      } catch (error) {
        console.error("❌ Get my applications error:", error);
        throw new Error(`Failed to fetch applications: ${error.message}`);
      }
    },

    getApplicationById: async (_, { id }) => {
      try {
        const application = await JobApplication.findById(id);
        if (!application) {
          throw new Error("Application not found");
        }
        return application;
      } catch (error) {
        console.error("❌ Get application error:", error);
        throw new Error(`Failed to fetch application: ${error.message}`);
      }
    },

    getPendingApplications: async (_, { jobId }) => {
      try {
        const query = { status: "pending" };
        if (jobId) query.jobId = jobId;

        const applications = await JobApplication.find(query).sort({
          createdAt: -1,
        });

        console.log(`⏳ Found ${applications.length} pending applications`);
        return applications;
      } catch (error) {
        console.error("❌ Get pending applications error:", error);
        throw new Error(`Failed to fetch pending applications: ${error.message}`);
      }
    },

    getRejectedApplications: async (_, { jobId }) => {
      try {
        const query = { status: "rejected" };
        if (jobId) query.jobId = jobId;

        const applications = await JobApplication.find(query).sort({
          createdAt: -1,
        });

        console.log(`❌ Found ${applications.length} rejected applications`);
        return applications;
      } catch (error) {
        console.error("❌ Get rejected applications error:", error);
        throw new Error(`Failed to fetch rejected applications: ${error.message}`);
      }
    },

    getHiredApplications: async (_, { jobId }) => {
      try {
        const query = { status: "hired" };
        if (jobId) query.jobId = jobId;

        const applications = await JobApplication.find(query).sort({
          createdAt: -1,
        });

        console.log(`✅ Found ${applications.length} hired applications`);
        return applications;
      } catch (error) {
        console.error("❌ Get hired applications error:", error);
        throw new Error(`Failed to fetch hired applications: ${error.message}`);
      }
    },

    getReviewedApplications: async (_, { jobId }) => {
      try {
        const query = { status: "reviewed" };
        if (jobId) query.jobId = jobId;

        const applications = await JobApplication.find(query).sort({
          createdAt: -1,
        });

        console.log(`👁 Found ${applications.length} reviewed applications`);
        return applications;
      } catch (error) {
        console.error("❌ Get reviewed applications error:", error);
        throw new Error(`Failed to fetch reviewed applications: ${error.message}`);
      }
    },

    getShortlistedApplications: async (_, { jobId }) => {
      try {
        const query = { status: "shortlisted" };
        if (jobId) query.jobId = jobId;

        const applications = await JobApplication.find(query).sort({
          createdAt: -1,
        });

        console.log(`⭐ Found ${applications.length} shortlisted applications`);
        return applications;
      } catch (error) {
        console.error("❌ Get shortlisted applications error:", error);
        throw new Error(`Failed to fetch shortlisted applications: ${error.message}`);
      }
    },

    getApplicationsByStatus: async (_, { jobId, status }) => {
      try {
        const validStatuses = ["pending", "reviewed", "shortlisted", "rejected", "hired"];

        if (!validStatuses.includes(status)) {
          throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
        }

        const query = { status };
        if (jobId) query.jobId = jobId;

        const applications = await JobApplication.find(query).sort({
          createdAt: -1,
        });

        console.log(`📊 Found ${applications.length} ${status} applications`);
        return applications;
      } catch (error) {
        console.error("❌ Get applications by status error:", error);
        throw new Error(`Failed to fetch applications: ${error.message}`);
      }
    },

    getApplicationStats: async (_, { jobId }) => {
      try {
        const query = jobId ? { jobId } : {};

        const [total, pending, reviewed, shortlisted, rejected, hired] =
          await Promise.all([
            JobApplication.countDocuments(query),
            JobApplication.countDocuments({ ...query, status: "pending" }),
            JobApplication.countDocuments({ ...query, status: "reviewed" }),
            JobApplication.countDocuments({ ...query, status: "shortlisted" }),
            JobApplication.countDocuments({ ...query, status: "rejected" }),
            JobApplication.countDocuments({ ...query, status: "hired" }),
          ]);

        console.log(
          `📊 Stats - Total: ${total}, Pending: ${pending}, Rejected: ${rejected}, Hired: ${hired}`
        );

        return { total, pending, reviewed, shortlisted, rejected, hired };
      } catch (error) {
        console.error("❌ Get stats error:", error);
        throw new Error(`Failed to fetch statistics: ${error.message}`);
      }
    },
    
    buyerJobApplyStatus: async (_, { buyerId }) => {
  try {
    const applications = await JobApplication.find({ buyerId }).sort({ createdAt: -1 });

    const results = await Promise.all(applications.map(async (app) => {
      // Fetch job details from HireJob collection
      const job = await HireJob.findOne({ jobId: app.jobId });
      return {
        jobId: app.jobId,
        jobName: job ? job.jobName : null,
        companyName: job ? job.companyName : null,
        bookingId: app._id.toString(),
        status: app.status,
        createdAt: app.createdAt,
      };
    }));

    console.log(`🔍 Found ${results.length} applications for buyer ${buyerId}`);
    return results;
  } catch (error) {
    console.error("❌ buyerJobApplyStatus error:", error);
    throw new Error(`Failed to fetch buyer job apply status: ${error.message}`);
  }
},

  },

  Mutation: {
    submitJobApplication: async (_, { input }) => {
      try {
        const { jobId, name, email, phoneNumber, resumeUrl } = input;

        if (!jobId || !name || !email || !phoneNumber || !resumeUrl) {
          return {
            success: false,
            message: "All fields are required",
            application: null,
          };
        }

        const job = await HireJob.findOne({ jobId });
        if (!job) {
          return {
            success: false,
            message: "Invalid Job ID",
            application: null,
          };
        }

        const existing = await JobApplication.findOne({ email, jobId });
        if (existing) {
          return {
            success: false,
            message: "You have already applied for this job",
            application: null,
          };
        }

        const application = new JobApplication({
          jobId,
          name,
          email,
          phoneNumber,
          resumeUrl,
          status: "pending",
        });

        await application.save();
        console.log(`✅ Job application submitted: ${application._id}`);

        return {
          success: true,
          message: "Application submitted successfully",
          application,
        };
      } catch (error) {
        console.error("❌ Submit application error:", error);
        return {
          success: false,
          message: `Error: ${error.message}`,
          application: null,
        };
      }
    },

    updateApplicationStatus: async (_, { input }) => {
      try {
        const { applicationId, status } = input;

        const validStatuses = ["pending", "reviewed", "shortlisted", "rejected", "hired"];
        if (!validStatuses.includes(status)) {
          return {
            success: false,
            message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
            application: null,
          };
        }

        const application = await JobApplication.findByIdAndUpdate(
          applicationId,
          { status },
          { new: true }
        );

        if (!application) {
          return {
            success: false,
            message: "Application not found",
            application: null,
          };
        }

        console.log(`✅ Application ${applicationId} status updated to ${status}`);

        return {
          success: true,
          message: `Application status updated to ${status}`,
          application,
        };
      } catch (error) {
        console.error("❌ Update status error:", error);
        return {
          success: false,
          message: `Error: ${error.message}`,
          application: null,
        };
      }
    },

    deleteApplication: async (_, { id }) => {
      try {
        const application = await JobApplication.findByIdAndDelete(id);

        if (!application) {
          return {
            success: false,
            message: "Application not found",
            application: null,
          };
        }

        console.log(`🗑 Application ${id} deleted`);
        return {
          success: true,
          message: "Application deleted successfully",
          application,
        };
      } catch (error) {
        console.error("❌ Delete application error:", error);
        return {
          success: false,
          message: `Error: ${error.message}`,
          application: null,
        };
      }
    },
  },
};
