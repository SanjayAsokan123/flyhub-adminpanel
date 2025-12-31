import mongoose from "mongoose";

const returnRequestSchema = new mongoose.Schema(
  {
    returnId: { type: String, unique: true },
    orderId: { type: String, required: true },
    productId: { type: String, required: true },
    type: { type: String, required: true },
    reason: { type: String, required: true },
    deliveryDate: { type: String, required: true },
    proofUrl: { type: String },
    status: {
      type: String,
      enum: ["requested", "approved", "rejected", "completed"],
      default: "requested",
    },
  },
  { timestamps: true }
);

export const ReturnRequest =
  mongoose.models.ReturnRequest ||
  mongoose.model("ReturnRequest", returnRequestSchema);