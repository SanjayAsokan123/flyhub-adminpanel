import mongoose from "mongoose";
import { Seller } from "./Seller.model.js";
import { Counter } from "./Counter.js";

const serviceSchema = new mongoose.Schema({
  serviceId: { type: String, unique: true },
  name: { type: String, required: true },
  specificDrone: { type: String, required: true },
  experience: { type: Number, required: true },
  location: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  image: { type: String },
  status: { type: String, default: "pending", enum: ["pending", "approved", "rejected", "suspended"] },
    sellerId: { type: String, required: true, ref: "Newseller" },
}, { timestamps: true });

serviceSchema.pre("save", async function(next) {
  try {
    if (this.isNew && !this.serviceId) {
      const seller = await Seller.findOne({ customId: this.sellerId });
      if (!seller) throw new Error("Seller not found");

      const counter = await Counter.findOneAndUpdate(
        { name: this.sellerId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      this.serviceId = `${seller.customId}SS${String(counter.seq).padStart(4, "0")}`;
    }
    next();
  } catch (err) {
    next(err);
  }
});

export const Service =
  mongoose.models.Service || mongoose.model("Service", serviceSchema);
