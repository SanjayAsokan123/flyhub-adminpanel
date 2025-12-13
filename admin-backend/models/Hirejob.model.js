import mongoose from "mongoose";
import { Seller } from "./Seller.model.js";

const hireJobSchema = new mongoose.Schema(
  {
    jobId: { type: String },
    jobName: { type: String, required: true },
    companyName: { type: String, required: true },
    jobType: String,
    experience: String,
    location: String,
    salary: String,
    description: String,
    requirement: String,
    email: String,
    phoneNumber: String,
    status: { type: String, default: "pending"  , enum: ["pending", "approved", "rejected", "suspended"]},
    sellerId: { type: String, required: true, ref: "Newseller" },
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

export const HireJob =
  mongoose.models.HireJob || mongoose.model("HireJob", hireJobSchema);
