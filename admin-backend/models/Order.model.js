import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true, required: true },

    buyer: {
      buyerId: { type: String, required: true },
      name: { type: String },
      email: { type: String },
      phone: { type: String },
      address: { type: String },
    },

    items: [
      {
        productId: { type: String, required: true },
        type: {
          type: String,
          enum: ["Drone", "Part", "Accessory", "Rental", "Service"],
          required: true,
        },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        sellerId: { type: String, required: true },
        image: { type: String, default: "" },
        cancelReason: {
          type: String,
          default: null,
        },
        status: {
          type: String,
          enum: [
            "pending",
            "packed",
            "shipped",
            "delivered",
            "cancelled",
            "rejected",
          ],
          default: "pending",
        },


        rejectReason: {
          type: String,
          default: null,
        },
      },
    ],

    totalAmount: { type: Number, required: true },

       status: {
      type: String,
      enum: [
        "pending",
        "packed",
        "shipped",
        "delivered",
        "cancelled",
        "rejected",
      ],
      default: "pending",
    },


    payment: {
      mode: {
        type: String,
        enum: ["ONLINE", "COD"],
        required: true,
      },
      method: {
        type: String,
        enum: ["UPI", "CARD", "NETBANKING", "WALLET"],
      },
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
      },
      transactionId: String,
    },
    trackingNumber: {
      type: String,
      default: null,
    },

    payoutStatus: {
      type: String,
      enum: ["pending", "processing", "paid"],
      default: "pending",
    },

    trackingProvider: {
      type: String,
      enum: ["SHIPROCKET", "DELHIVERY"],
      default: null,
    },

    shipmentId: String,
    invoiceUrl: { type: String, default: "" },
    invoiceNo: { type: String, default: "" },
    sellerPackingSlips: {
      type: Map,
      of: String,
      default: {},
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