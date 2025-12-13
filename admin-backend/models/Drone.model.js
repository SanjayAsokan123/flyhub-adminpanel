import mongoose from "mongoose";
import { Seller } from "./Seller.model.js";

const droneSchema = new mongoose.Schema(
  {
    droneId: { type: String, unique: true },
    name: { type: String, required: true },
    brand: { type: String, required: true },
    uin: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    image: { type: String },
    quantity: { type: Number, default: 1 },
    status: { type: String, default: "pending" , enum: ["pending", "approved", "rejected", "suspended"]},
    sellerId: { type: String, required: true },
  },
  { timestamps: true }
);
droneSchema.pre("save", async function (next) {
  try {
    if (this.isNew && !this.droneId && this.sellerId) {
      const seller = await Seller.findOne({ customId: this.sellerId });
      if (!seller) throw new Error("Seller not found");

      const count = await mongoose.models.Drone.countDocuments({ sellerId: this.sellerId });
      const droneNumber = String(count + 1).padStart(4, "0");
      this.droneId = `${seller.customId}D${droneNumber}`;
    }
    next();
  } catch (err) {
    next(err);
  }
});

export const Drone = mongoose.models.Drone || mongoose.model("Drone", droneSchema);
