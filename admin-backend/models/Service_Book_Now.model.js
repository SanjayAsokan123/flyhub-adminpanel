import mongoose from "mongoose";
import { Seller } from "./Seller.model.js";
import {Buyer} from "./Buyer.model.js";
// ------------------ INTERNAL COUNTER SCHEMA ------------------
const internalCounterSchema = new mongoose.Schema({
  sellerId: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
});

const InternalCounter = mongoose.model("InternalCounter", internalCounterSchema);

// ------------------ SERVICE BOOKING SCHEMA ------------------
const serviceBookingSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    location: String,
    date: { type: Date, default: Date.now },
    information: String,
    status: { type: String, default: "pending" },
    sellerId: { type: String, required: true },
    serviceId: { type: String, required: true },
    buyerId :{type:String,required:true},
    serviceBookingId: { type: String, unique: true },
    // isBuyerStatusViewed: { type: Boolean, default: false },
    // isSellerStatusViewed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ------------------ AUTO GENERATE serviceBookingId ------------------
serviceBookingSchema.pre("save", async function (next) {
  try {
    // Avoid regenerating for updates
    if (!this.isNew || this.serviceBookingId) return next();

    // 1️⃣ Fetch seller using customId
    const seller = await Seller.findOne({ customId: this.sellerId });
    if (!seller)
      throw new Error("Seller not found while generating booking ID");

    // 2️⃣ Create or increment internal counter for this seller
    const counter = await InternalCounter.findOneAndUpdate(
      { sellerId: this.sellerId },
      { $inc: { count: 1 } },
      { new: true, upsert: true }
    );

    // 3️⃣ Format ID → FLYHUBS0081SB0001
    const serial = String(counter.count).padStart(4, "0");
    this.serviceBookingId = `${seller.customId}SB${serial}`;

    next();
  } catch (err) {
    next(err);
  }
});

export const ServiceBooking = mongoose.model(
  "ServiceBooking",
  serviceBookingSchema
);