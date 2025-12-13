import mongoose from "mongoose";

const pilotBookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, unique: true },
    pilotId: { type: String, required: true },
    pilotName: { type: String },
    pilotCompany: { type: String },
    buyerId: { type: String, required: true },
    buyerName: { type: String, required: true },
    buyerEmail: { type: String },
    contact: { type: String, required: true },
    location: { type: String },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "approved", "rejected", "completed"],
    }
  },
  { timestamps: true }
);

pilotBookingSchema.pre("save", async function (next) {
  if (this.isNew && !this.bookingId) {
    const count = await mongoose.models.PilotBooking.countDocuments();
    const number = String(count + 1).padStart(4, "0");
    this.bookingId = `PB${number}`;
  }
  next();
});

export const PilotBooking =
  mongoose.models.PilotBooking ||
  mongoose.model("PilotBooking", pilotBookingSchema);
