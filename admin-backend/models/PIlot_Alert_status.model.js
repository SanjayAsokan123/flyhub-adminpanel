import mongoose from "mongoose";

const { Schema } = mongoose;

const BookingSchema = new Schema({
  BuyerId: { type: String, required: true },
  pilotId: { type: String, required: true },
  bookingId: { type: String, required: true },
  bookingTime: Date,

  /* ------------ PILOT TYPE ------------ */
  pilotType: {
    type: String,
    enum: ["seller", "buyer"],
    required: true,
  },

  /* ------------ USER REMINDERS ------------ */
  reminderStartTime: Date,
  reminderCount: { type: Number, default: 0 },
  maxReminders: { type: Number, default: 3 },
  lastReminderSentAt: Date,
  
  pilotReminderStartAt: { type: Date },
  pilotReminderEndAt: { type: Date, required: true },
  userStatus: {
    type: String,
    enum: ["ACTIVE", "PILOT_NOT_AVAILABLE"],
    default: "ACTIVE"
  },

  /* ------------ PILOT CONFIRMATION ------------ */
  pilotStatus: {
    type: String,
    enum: ["ASSIGNED", "CONFIRMED", "PENDING"],
    default: "ASSIGNED"
  },

  pilotNotifyCount: { type: Number, default: 0 },
  maxPilotNotify: { type: Number, default: 2 },
  pilotLastNotifiedAt: Date

}, { timestamps: true });

export default mongoose.model("Pilot_alert_status", BookingSchema);