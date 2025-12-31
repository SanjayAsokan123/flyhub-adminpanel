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
      unique: true,
    },

    password: String,
    fcmTokens: { type: [String], default: [] },
    otp: {
      type: String,
    },
    otpExpiresAt: {
      type: Date,
    },
    otpAttempts: {
      type: Number,
      default: 0,
    },
    otpVerified: {
  type: Boolean,
  default: false,
},
welcomeNotificationSent: {
  type: Boolean,
  default: false,
},

fcmTokenMeta: [{
  token: String,
  platform: String,
  lastActive: Date,
}]


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

BuyerSchema.pre("save", async function (next) {
  if (this.isNew && !this.buyerId) {
    const seq = await getNextSequence("FLYHUBB");
    this.buyerId = `FLYHUBB${String(seq).padStart(4, "0")}`;
  }
  next();
});

BuyerSchema.methods.addFcmToken = async function (
  token,
  meta = { platform: "unknown" }
) {
  if (!token) return this;

  // Remove existing occurrence
  this.fcmTokens = this.fcmTokens.filter(t => t !== token);

  // Add newest token first
  this.fcmTokens.unshift(token);

  // 🔒 LIMIT TOKENS (VERY IMPORTANT)
  this.fcmTokens = this.fcmTokens.slice(0, 5);

  // ---- META ----
  this.fcmTokenMeta = this.fcmTokenMeta.filter(m => m.token !== token);

  this.fcmTokenMeta.unshift({
    token,
    platform: meta.platform || "unknown",
    lastActive: new Date(),
  });

  this.fcmTokenMeta = this.fcmTokenMeta.slice(0, 5);

  await this.save();
  return this;
};


export const Buyer =
  mongoose.models.Buyer || mongoose.model("Buyer", BuyerSchema);
