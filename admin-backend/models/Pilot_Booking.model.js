import mongoose from "mongoose";

const pilotBookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, unique: true },
    pilotId: { type: String, required: true },
    pilotName: { type: String },
    pilotCompany: { type: String },
    
    // Pilot source info
    pilotType: {
      type: String,
      enum: ["seller", "buyer"],
      required: true,
      default: "seller"
    },
    
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
      enum: ["pending", "approved", "rejected", "completed", "cancelled"],
    },
    
    // For seller pilots
    sellerId: { type: String },
    sellerEmail: { type: String },
    sellerPhone: { type: String },
    sellerName: { type: String },
    
    // For buyer pilots (who posted the pilot listing)
    pilotOwnerId: { type: String },
    pilotOwnerType: { 
      type: String, 
      enum: ["seller", "buyer"] 
    },
    
    buyerDeleted: { type: Boolean, default: false },
    ownerDeleted: { type: Boolean, default: false },
    
    // Additional info
    duration: { type: Number }, // in hours
    totalAmount: { type: Number },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded"],
      default: "pending"
    },
    
    notes: { type: String },
  },
  { timestamps: true }
);

pilotBookingSchema.pre("save", async function (next) {
  if (this.isNew && !this.bookingId) {
    const count = await mongoose.models.PilotBooking.countDocuments();
    const number = String(count + 1).padStart(6, "0");
    this.bookingId = `PB${number}`;
  }
  
  // Calculate duration if start and end times are provided
  if (this.startTime && this.endTime) {
    const start = this.startTime.split(':');
    const end = this.endTime.split(':');
    const startHours = parseInt(start[0]) + parseInt(start[1]) / 60;
    const endHours = parseInt(end[0]) + parseInt(end[1]) / 60;
    this.duration = Math.max(0, endHours - startHours);
  }
  
  next();
});

export const PilotBooking =
  mongoose.models.PilotBooking ||
  mongoose.model("PilotBooking", pilotBookingSchema);