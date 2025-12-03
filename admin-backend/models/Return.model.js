import mongoose from "mongoose";

const returnRequestSchema = new mongoose.Schema(
  {
    returnId: { type: String, unique: true },
    orderId: { type: String, required: true },
    productId: { type: String, required: true },
    type: { type: String, required: true },
    sellerId: { type: String },
    buyerId: { type: String },
    reason: { type: String, required: true },
    deliveryDate: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  },
  { timestamps: true }
);

export const ReturnRequest =
  mongoose.models.ReturnRequest ||
  mongoose.model("ReturnRequest", returnRequestSchema);
