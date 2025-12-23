import mongoose from "mongoose";
import { Seller } from "./Seller.model.js";

const droneSchema = new mongoose.Schema(
  {
    droneId: { type: String, unique: true , index: true},
    name: { type: String, required: true, index: true },
    brand: { type: String, required: true, index: true },
    uin: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    image: { type: String },
    quantity: { type: Number, default: 1 },
    status: { type: String, default: "pending" },
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

droneSchema.index({ name: 1, brand: 1 , uin: 1});
droneSchema.index({ name:"text" , brand:"text", uin:"text"});

export const Drone = mongoose.models.Drone || mongoose.model("Drone", droneSchema);
