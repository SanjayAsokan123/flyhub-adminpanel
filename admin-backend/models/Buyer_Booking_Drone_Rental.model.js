import mongoose from "mongoose";
import { Rental } from "./Rental.model.js";
import { Seller } from "./Seller.model.js";
import { Buyer } from "./Buyer.model.js";
const rentalSchema = new mongoose.Schema(
  {
    drone_rental_id: { type: String, unique: true, index: true },
    buyerId: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    location: { type: String, required: true }, 

    rentalDate: { type: Date, required: true },

    rentalId: { type: String, required: true },

    sellerId: {
      type: String,
      required: true,
    },
    buyerId: {
      type: String,
      required: true,
    },
    sellerEmail: { type: String },
    sellerPhone: { type: String },
    sellerName: { type : String}, 
    status: { type: String, default: "pending" },
    buyerDeleted: { type: Boolean, default: false },
    sellerDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);


rentalSchema.pre("save", async function (next) {
  if (this.drone_rental_id) return next();
  const last = await this.constructor
    .findOne({ drone_rental_id: { $regex: /^DR\d+$/ } })
    .sort({ createdAt: -1, _id: -1 });

  if (last?.drone_rental_id) {
    const match = last.drone_rental_id.match(/^DR(\d+)$/);
    const num = match ? parseInt(match[1], 10) : NaN;
    this.drone_rental_id = !Number.isNaN(num) ? `DR${num + 1}` : "DR1";
  } else {
    this.drone_rental_id = "DR1";
  }
  next();
});

rentalSchema.methods.attachSellerFromRental = async function () {
  if (!this.rentalId) return;
  const listing = await Rental.findOne({ rentalId: this.rentalId }).select("sellerId");
  if (!listing?.sellerId) return;
  const seller = await Seller.findOne({ customId: listing.sellerId }).select("email phoneNumber");
  if (seller) {
    this.sellerId = listing.sellerId;
    this.sellerEmail = seller.email || null;
    this.sellerPhone = seller.phoneNumber || null;
  }
};

const DroneRental = mongoose.models.DroneRental || mongoose.model("DroneRental", rentalSchema);
export default DroneRental;