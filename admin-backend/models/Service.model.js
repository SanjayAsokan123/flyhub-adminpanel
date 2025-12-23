import mongoose from "mongoose";
import { Seller } from "./Seller.model.js";
import { Counter } from "./Counter.js";

const serviceSchema = new mongoose.Schema({
  serviceId: { type: String, unique: true },
  name: { type: String, required: true , index: true},
  specificDrone: { type: String, required: true },
  experience: { type: Number, required: true , index: true},
  location: { type: String, required: true, index: true },
  description: { type: String },
  price: { type: Number, required: true },
  image: { type: String },
  status: { type: String, default: "pending" },
  sellerId: { type: String, required: true , ref:"Newseller" },
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

serviceSchema.index({ name: 1, location: 1 , experience: 1});
serviceSchema.index({ name: "text", specificDrone: "text", location: "text" });
export const Service =
  mongoose.models.Service || mongoose.model("Service", serviceSchema);