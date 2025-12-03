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
    },
    phoneNumber: { type: String, required: true },
    name: { type: String },
    bankName: { type: String },
    bankAccountNumber: { type: String },
    bankIFCnumber: { type: String },
    companyPan: { type: String },
    authorized: { type: String },
    shippingAddresses: { type: [String], default: [] },
    pickupAddresses: { type: [String], default: [] },
    passwordHash: { type: String, select: false },
    plainPassword: { type: String, select: false, default: undefined },
    role: { type: String, default: "seller" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
    },
    Drones: [{ type: mongoose.Schema.Types.ObjectId, ref: "Drone" }],
    fcmTokens: {
      type: [String],
      default: [],
    },
    fcmToken: {
      type: String,
      default: null,
    },
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
  if (tokensToRemove.includes(this.fcmToken)) this.fcmToken = null;
  await this.save();
};

export async function generateSellerCustomId() {
  const prefix = "FLYHUBS";
  const nextSeq = await getNextSequence(prefix);
  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

export const Seller =
  mongoose.models.Seller || mongoose.model("Seller", SellerSchema);

export default Seller;
