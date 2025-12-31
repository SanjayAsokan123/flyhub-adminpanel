// admin-backend/models/Seller.js
import mongoose from "mongoose";
import { Counter } from "./Counter.model.js";

const SellerSchema = new mongoose.Schema(
  {
    customId: { type: String, unique: true, sparse: true },
    firebaseUid: { type: String, index: true, sparse: true },

    companyName: { type: String, required: true },
    PANnumber: { type: String, required: true },
    gstNumber: { type: String },
    address: { type: String, required: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },

    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      match: [/^\d{10}$/, "Phone number must be 10 digits"],
    },

    name: String,
    bankName: String,
    bankAccountNumber: String,
    bankIFCnumber: String,
    companyPan: String,
    authorized: String,

    shippingAddresses: { type: [String], default: [] },
    pickupAddresses: { type: [String], default: [] },

    role: { type: String, default: "seller" },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended", "deactivated"],
      default: "pending",
      index: true,
    },

    // 🔐 OTP FIELDS (FIX)
    otp: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    otpVerified: { type: Boolean, default: false },

    fcmTokens: { type: [String], default: [] },
    fcmToken: { type: String, default: null },

    deactivatedAt: { type: Date, default: null },
    deactivatedReason: { type: String, default: null },
  },
  { timestamps: true }
);

async function getNextSequence(prefix) {
  const ret = await Counter.findByIdAndUpdate(
    prefix,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).lean();

  return ret.seq;
}

SellerSchema.pre("save", async function (next) {
  try {
    if (this.isNew && !this.customId) {
      const prefix = "FLYHUBS";
      const nextSeq = await getNextSequence(prefix);

      this.customId = `${prefix}${String(nextSeq).padStart(4, "0")}`;
    }
    next();
  } catch (err) {
    next(err);
  }
});

SellerSchema.methods.addFcmToken = async function (token) {
  if (token && !this.fcmTokens.includes(token)) {
    this.fcmTokens.push(token);
    this.fcmToken = token;
    await this.save();
  }
};

SellerSchema.methods.removeFcmTokens = async function (tokensToRemove = []) {
  if (!Array.isArray(tokensToRemove) || tokensToRemove.length === 0) return;

  this.fcmTokens = this.fcmTokens.filter((t) => !tokensToRemove.includes(t));

  if (tokensToRemove.includes(this.fcmToken)) {
    this.fcmToken = null;
  }

  await this.save();
};

export async function generateSellerCustomId() {
  const prefix = "FLYHUBS";
  const nextSeq = await getNextSequence(prefix);
  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

export const Seller =
  mongoose.models.Seller || mongoose.model("Newseller", SellerSchema);

export default Seller;