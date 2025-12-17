import mongoose from "mongoose";

const FailedPaymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
    },
    razorpayOrderId: {
      type: String,
    },
    reason: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    connectionStatus: {
      type: String,
      enum: ["online", "offline"],
      default: "online",
    },
    buyerId: {
      type: String,
    },
    metadata: {
      type: Object,
    }
  },
  {
    timestamps: true,
  }
);

export const FailedPayment = mongoose.model("FailedPayment", FailedPaymentSchema);