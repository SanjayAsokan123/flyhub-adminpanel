import mongoose from "mongoose";
import { type } from "os";

const rentalSchema = new mongoose.Schema(
  {
    rentalId: { type: String, unique: true },
    name: { type: String, required: true, index: true },
    brand: { type: String, required: true, index: true },
    location: { type: String, required: true, index: true },
    pricePerHour: { type: Number, required: true, index: true },
    pricePerDay: { type: Number, required: true, index: true },
    description: { type: String, required: true },
    image: { type: String },
    quantity: { type: Number, default: 1 },
    insurance: { type: Boolean, default: false },
    with_pilot: { type: Boolean, default: false },
    available_today: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    sellerId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);
rentalSchema.statics.getWithSellerInfo = async function () {
  const rentals = await this.find();
  const sellers = await mongoose.model("Newseller").find();

  return rentals.map((r) => {
    const s = sellers.find((sel) => sel.customId === r.sellerId);
    return {
      ...r.toObject(),
      sellerInfo: {
        email: s?.email || null,
        phoneNumber: s?.phoneNumber || null,
      },
    };
  });
};

rentalSchema.pre("save", async function (next) {
  try {
    if (this.isNew && !this.rentalId && this.sellerId) {
      const seller = await mongoose
        .model("Newseller")
        .findOne({ customId: this.sellerId });

      if (!seller) throw new Error("Seller not found");

      const count = await mongoose.models.Rental.countDocuments({
        sellerId: this.sellerId,
      });

      const rentalNumber = String(count + 1).padStart(4, "0");

      this.rentalId = `${seller.customId}R${rentalNumber}`;
    }

    next();
  } catch (err) {
    next(err);
  }
});

rentalSchema.index({ name: 1, location: 1, pricePerHour: 1, pricePerDay: 1 });
rentalSchema.index({ name: "text", brand: "text", location: "text" });
export const Rental =
  mongoose.models.Rental || mongoose.model("Rental", rentalSchema);
