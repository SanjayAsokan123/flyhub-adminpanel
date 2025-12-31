import mongoose from "mongoose";

const taxSchema = new mongoose.Schema(
  {
    sgst: { type: Number, default: 5 },
    commission: { type: Number, default: 5 },
  },
  { timestamps: true }
);

export const Tax = mongoose.models.Tax || mongoose.model("Tax", taxSchema);