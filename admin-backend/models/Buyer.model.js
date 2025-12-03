// models/Buyer.model.js
import mongoose from "mongoose";
import { Counter } from "./Counter.model.js";

const BuyerSchema = new mongoose.Schema(
  {
    buyerId: {
      type: String,
      unique: true,
      index: true,
    },

    firebaseUid: {
      type: String,
      sparse: true,
      index: true,
    },

    name: String,

    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },

    phoneNumber: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },

    password: String,

    fcmToken: { type: String, default: null },
    fcmTokens: { type: [String], default: [] },
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

// Auto-generate buyerId
BuyerSchema.pre("save", async function (next) {
  if (this.isNew && !this.buyerId) {
    const seq = await getNextSequence("FLYHUBB");
    this.buyerId = `FLYHUBB${String(seq).padStart(4, "0")}`;
  }
  next();
});

BuyerSchema.methods.addFcmToken = async function (token) {
  if (!token) return;

  const set = new Set(this.fcmTokens);
  set.add(token);

  this.fcmTokens = Array.from(set);
  this.fcmToken = token;
  await this.save();

  return this;
};

export const Buyer =
  mongoose.models.Buyer || mongoose.model("Buyer", BuyerSchema);
