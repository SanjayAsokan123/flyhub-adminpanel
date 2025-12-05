// admin-backend/models/Seller.js
import mongoose from "mongoose";
import { Counter } from "./Counter.model.js";

const SellerSchema = new mongoose.Schema(
  {
    /* ---------------------------------------------------
       IDENTIFIERS
    --------------------------------------------------- */
    customId: { type: String, unique: true, sparse: true },

    // Firebase Auth UID
    firebaseUid: { type: String, index: true, sparse: true },

    /* ---------------------------------------------------
       PROFILE DETAILS
    --------------------------------------------------- */
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
      match: [/^\d{10}$/, "Phone number must be 10 digits"],
    },

    name: { type: String },

    /* ---------------------------------------------------
       BANKING DETAILS
    --------------------------------------------------- */
    bankName: String,
    bankAccountNumber: String,
    bankIFCnumber: String,
    companyPan: String,
    authorized: String,

    /* ---------------------------------------------------
       ADDRESS LISTS
    --------------------------------------------------- */
    shippingAddresses: { type: [String], default: [] },
    pickupAddresses: { type: [String], default: [] },

    /* ---------------------------------------------------
       ROLE & STATUS
    --------------------------------------------------- */
    role: { type: String, default: "seller" },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
      index: true,
    },

    /* ---------------------------------------------------
       DRONES LINKED
    --------------------------------------------------- */
    Drones: [{ type: mongoose.Schema.Types.ObjectId, ref: "Drone" }],

    /* ---------------------------------------------------
       FCM TOKENS
    --------------------------------------------------- */
    fcmTokens: {
      type: [String],
      default: [],
    },

    // DEPRECATED — only keep latest token if needed
    fcmToken: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

/* -----------------------------------------------------------
   AUTO-INCREMENT HELPER
------------------------------------------------------------ */
async function getNextSequence(prefix) {
  const ret = await Counter.findByIdAndUpdate(
    prefix,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).lean();

  return ret.seq;
}

/* -----------------------------------------------------------
   AUTO-GENERATE customId
------------------------------------------------------------ */
SellerSchema.pre("save", async function (next) {
  try {
    if (this.isNew && !this.customId) {
      const prefix = "FLYHUBS";
      const nextSeq = await getNextSequence(prefix);

      // FLYHUBS0001, FLYHUBS0002 ...
      this.customId = `${prefix}${String(nextSeq).padStart(4, "0")}`;
    }
    next();
  } catch (err) {
    next(err);
  }
});

/* -----------------------------------------------------------
   METHODS
------------------------------------------------------------ */
SellerSchema.methods.addFcmToken = async function (token) {
  if (token && !this.fcmTokens.includes(token)) {
    this.fcmTokens.push(token);
    this.fcmToken = token; // deprecated but kept for compatibility
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

/* -----------------------------------------------------------
   EXTERNAL UTILITY FOR CUSTOM ID GENERATION
------------------------------------------------------------ */
export async function generateSellerCustomId() {
  const prefix = "FLYHUBS";
  const nextSeq = await getNextSequence(prefix);
  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

export const Seller =
  mongoose.models.Seller || mongoose.model("Newseller", SellerSchema);

export default Seller;