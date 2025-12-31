import mongoose from "mongoose";
import { Seller } from "./Seller.model.js";

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
    sellerId: { type: String, required: true, ref: "Newseller" },
    serviceId: { type: String, required: true, ref: "Service" },
    buyerId: { type: String, required: true },
    serviceBookingId: { type: String, unique: true },
  },
  { timestamps: true }
);

// ------------------ INDEXES ------------------
// Speeds up queries for duplicate check but not unique
serviceBookingSchema.index({ buyerId: 1, serviceId: 1, date: 1 });

// ------------------ AUTO GENERATE serviceBookingId ------------------
serviceBookingSchema.pre("save", async function (next) {
  try {
    if (!this.isNew || this.serviceBookingId) return next();

    const seller = await Seller.findOne({ customId: this.sellerId });
    if (!seller) throw new Error("Seller not found while generating booking ID");

    const counter = await InternalCounter.findOneAndUpdate(
      { sellerId: this.sellerId },
      { $inc: { count: 1 } },
      { new: true, upsert: true }
    );

    const serial = String(counter.count).padStart(4, "0");
    this.serviceBookingId = `${seller.customId}SB${serial}`;

    next();
  } catch (err) {
    next(err);
  }
});

export const ServiceBooking = mongoose.model("ServiceBooking", serviceBookingSchema);
