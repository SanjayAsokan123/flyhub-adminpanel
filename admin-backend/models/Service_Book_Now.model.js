import mongoose from "mongoose";
import { Seller } from "./Seller.model.js"; // Required for seller.customId

// ======================================================
// INTERNAL COUNTER SCHEMA (NO SEPARATE FILE NEEDED)
// ======================================================
const internalCounterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

const InternalCounter = mongoose.model("InternalCounter", internalCounterSchema);

// ======================================================
// CONTACT SCHEMA
// ======================================================
const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    location: { type: String, required: true },
    date: { type: Date, default: Date.now },
    information: { type: String, required: true, trim: true },

   status: { type: String, default: "pending" },

    phone: {
      type: String,
      default: null,
      trim: true,
    },

    sellerId: {
      type: String,
      required: true,
      trim: true,
    },

    serviceId: {
      type: String,
      required: true,
      trim: true,
    },

    serviceBookingId: {
      type: String,
      unique: true,
      trim: true,
    },
  },
  { timestamps: true }
);

// ======================================================
// AUTO-GENERATE serviceBookingId  (Pattern: FLYHUBS0081SB0001)
// ======================================================
contactSchema.pre("save", async function (next) {
  try {
    if (this.isNew && !this.serviceBookingId) {
      // 1️⃣ Find seller to get customId prefix
      const seller = await Seller.findOne({ customId: this.sellerId });
      if (!seller) throw new Error("Seller not found for auto ID generation");

      // 2️⃣ Increment internal counter
      const counter = await InternalCounter.findOneAndUpdate(
        { name: `contact_${this.sellerId}` },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      // 3️⃣ Generate ID: FLYHUBS0081SB0001
      this.serviceBookingId =
        `${seller.customId}SB${String(counter.seq).padStart(4, "0")}`;
    }

    next();
  } catch (err) {
    next(err);
  }
});

// Indexes
contactSchema.index({ email: 1 });
contactSchema.index({ sellerId: 1 });
contactSchema.index({ serviceBookingId: 1 });

export default mongoose.model("Contact", contactSchema);