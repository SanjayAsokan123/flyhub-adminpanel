import mongoose from "mongoose";
import { Seller } from "./Seller.model.js";

const partSchema = new mongoose.Schema(
  {
    partId: { type: String, unique: true },
    name: { type: String, required: true },
    brand: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    image: { type: String },
    quantity: { type: Number, default: 0 },
    status: { type: String, default: "pending" },
    additionalInformation:{type :String},
    sellerId: { type: String, required: true },
  },
  { timestamps: true }
);
partSchema.pre("save", async function (next) {
  if (this.isNew && !this.partId && this.sellerId) {
    const seller = await Seller.findOne({ customId: this.sellerId });
    if (!seller) throw new Error("Seller not found");

    const count = await mongoose.models.Part.countDocuments({ sellerId: this.sellerId });
    const partNumber = String(count + 1).padStart(4, "0");
    this.partId = `${seller.customId}P${partNumber}`;
  }
  next();
});

export const Part = mongoose.models.Part || mongoose.model("Part", partSchema);