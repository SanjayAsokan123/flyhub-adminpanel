import mongoose from 'mongoose';

const jobApplicationSchema = new mongoose.Schema({

  buyerId: {
    type: String,
    required: true,
  },

  sellerId: {
    type: String,
    required: true,
  },

  jobId: {
    type: String,
    required: true,
  },

  jobTitle: {
    type: String,
    required: true,
  },

  companyName: {
    type: String,
    default: "",
  },

  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },

  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },

  resumeUrl: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: ["pending", "rejected", "hired"],
    default: "pending"
  },

  appliedAt: {
    type: Date,
    default: Date.now
  }

}, { timestamps: true });

jobApplicationSchema.index({ email: 1, jobId: 1 });

export const JobApplication =
  mongoose.models.JobApplication ||
  mongoose.model("JobApplication", jobApplicationSchema);

export default JobApplication;
