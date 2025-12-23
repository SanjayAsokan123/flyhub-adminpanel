import mongoose from "mongoose";
import { Seller } from "./Seller.model.js";

const certificationSchema = new mongoose.Schema({
  url: { type: String, required: true },
});

const fileSchema = new mongoose.Schema({
  url: { type: String, required: true },
});
const hirePilotSchema = new mongoose.Schema(
  {
    pilotId: { type: String, unique: true },
    pilotName: { type: String, required: true   },
    pilotCompany: { type: String },
    location: { type: String  , required: true  },
    availability: { type: Boolean, default: true },
    specification: { type: String },
    price: {
      perHour: { type: Number, required: true },
      perDay: { type: Number, required: true },
    },
    certifications: [certificationSchema],
    resume: fileSchema,
    description: { type: String },
    newemail: { type: String, required: true },
    newphoneNumber: { type: String, required: true },

    adminStatus: {
      type: String,
      default: "pending",
      enum: ["pending", "approved", "rejected"],
    },
    buyerStatus: {
      type: String,
      default: "pending",
      enum: ["pending", "confirmed", "cancelled", "completed"],
    },

    sellerId: { type: String, required: true },
  },
  { timestamps: true }
);

hirePilotSchema.pre("save", async function (next) {
  if (this.isNew && !this.pilotId && this.sellerId) {
    const seller = await Seller.findOne({ customId: this.sellerId });
    if (!seller) throw new Error("Seller not found");

    const count = await mongoose.models.HirePilot.countDocuments({
      sellerId: this.sellerId,
    });
    const number = String(count + 1).padStart(3, "0");
    this.pilotId = `${seller.customId}P${number}`;
    if (!this.newemail) this.newemail = seller.email;
    if (!this.newphoneNumber) this.newphoneNumber = seller.phoneNumber;
  }
  next();
});
// TEXT SEARCH (search bar only)
hirePilotSchema.index({
  pilotName: "text",
  pilotCompany: "text",
  description: "text",
  specification: "text"
});

// FILTER INDEXES
hirePilotSchema.index({ location: 1 });
hirePilotSchema.index({ availability: 1 });
hirePilotSchema.index({ adminStatus: 1 });
hirePilotSchema.index({ buyerStatus: 1 });
hirePilotSchema.index({ sellerId: 1 });

// PRICE FILTERS
hirePilotSchema.index({ "price.perHour": 1 });
hirePilotSchema.index({ "price.perDay": 1 });


export const HirePilot =
  mongoose.models.HirePilot || mongoose.model("HirePilot", hirePilotSchema);
