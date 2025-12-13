import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true, required: true },

    buyer: {
      buyerId: { type: String, required: true , ref: 'Buyer' },
      name: { type: String },
      email: { type: String },
      phone: { type: String },
      address: { type: String },
    },

    items: [
      {
        productId: { type: String, required: true , refPath: 'Product' },
        type: {
          type: String,
          enum: ["Drone", "Part", "Accessory", "Rental", "Service"],
          required: true,
        },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        sellerId: { type: String, required: true },
      },
    ],

    totalAmount: { type: Number, required: true },

    status: {
      type: String,
      enum: ["pending", "shipped", "delivered", "canceled", "rejected"],
      default: "pending",
    },

    payment: {
      method: {
        type: String,
        enum: ["UPI", "COD", "CARD", "WALLET"],
        required: true,
      },
      status: {
        type: String,
        enum: ["pending", "received", "failed"],
        default: "pending",
      },
      transactionId: { type: String, default: null },
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

orderSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

export const Order =
  mongoose.models.Order || mongoose.model("Order", orderSchema);