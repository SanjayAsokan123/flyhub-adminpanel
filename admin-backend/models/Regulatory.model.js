import mongoose from "mongoose";

const regulatorySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    date: { type: String },
    imagePath: { type: String, required: true },
    shortDescription: { type: String, required: true },
    fullDescription: { type: String, required: true },
  },
  { timestamps: true }
);

export const Regulatory =
  mongoose.models.Regulatory || mongoose.model("Regulatory", regulatorySchema);
