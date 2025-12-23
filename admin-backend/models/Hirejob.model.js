import mongoose from "mongoose";
import { Seller } from "./Seller.model.js";

const hireJobSchema = new mongoose.Schema(
  {
    jobId: { type: String },
    jobName: { type: String, required: true },
    companyName: { type: String, required: true },
    jobType: { type: String, required: true },
    experience: String,
    location: { type: String, required: true },
    salary: { type: String, required: true },
    description: String,
    requirement: String,
    email: String,
    phoneNumber: String,
    status: { type: String, default: "pending" },
    sellerId: { type: String, required: true },
  },
  { timestamps: true }
);

hireJobSchema.pre("save", async function (next) {
  try {
    if (this.isNew && !this.jobId && this.sellerId) {
      const seller = await Seller.findOne({ customId: this.sellerId });
      if (!seller) throw new Error("Seller not found");

      const count = await mongoose.models.HireJob.countDocuments({
        sellerId: this.sellerId,
      });
      const jobNumber = String(count + 1).padStart(3, "0");
      this.jobId = `${seller.customId}J${jobNumber}`;
      this.email = seller.email;
      this.phoneNumber = seller.phoneNumber;
    }
    next();
  } catch (err) {
    next(err);
  }
});

// create text index for global search
hireJobSchema.index({
  jobName: "text",
  companyName: "text",
  description: "text",
  requirement: "text"
});
// create indexes for filtering and sorting
hireJobSchema.index({ location: 1, jobType: 1 });
hireJobSchema.index({ salary: 1 });
hireJobSchema.index({ sellerId: 1 });
hireJobSchema.index({ status: 1 });
hireJobSchema.index({ createdAt: -1 });


export const HireJob =
  mongoose.models.HireJob || mongoose.model("HireJob", hireJobSchema);
