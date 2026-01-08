import mongoose from "mongoose";
const buyerPilotBookingSchema = new mongoose.Schema(
  {
    buyerPilotBookingId: {
      type: String,
      unique: true,
      index: true,
    },
    buyerPilotId: { type: String, required: true },
    contact: { type: String, required: true },
    location: { type: String },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "pending",
    },
    buyerId: { type: String },
    buyerName: { type: String },
    buyerEmail: { type: String },
    buyerPhone: { type: String },
    ownerDeleted: { type: Boolean, default: false },
    bookerDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);
buyerPilotBookingSchema.pre("save", async function (next) {
  if (this.isNew && !this.buyerPilotBookingId) {
    const count = await mongoose.models.BuyerPilotBooking.countDocuments();
    this.buyerPilotBookingId = `BPB${String(count + 1).padStart(4, "0")}`;
  }
  next();
});
export const BuyerPilotBooking =
  mongoose.models.BuyerPilotBooking ||
  mongoose.model("BuyerPilotBooking", buyerPilotBookingSchema);
