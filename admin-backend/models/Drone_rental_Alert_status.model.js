import mongoose from "mongoose";

const { Schema } = mongoose;

const DroneAlertSchema = new Schema({
  bookingId: { type: String, required: true },
  DroneId: { type: String, required: true },
  BuyerId: { type: String, required: true },

  /* OWNER REMINDER WINDOW */
  ownerReminderStartAt: { type: Date, required: true },
  ownerReminderEndAt: { type: Date, required: true },

  /* USER FALLBACK */
  userFallbackAt: { type: Date, required: true },
  userNotified: { type: Boolean, default: false },

  /* STATUS */
  userStatus: {
    type: String,
    enum: ["ACTIVE", "NOT_AVAILABLE"],
    default: "ACTIVE",
  },

  DroneStatus: {
    type: String,
    enum: ["ASSIGNED", "CONFIRMED", "PENDING"],
    default: "ASSIGNED",
  },

  ignoredBookingCount: { type: Number, default: 0 },
  lastIgnoredAt: Date,
  status: {
    type: String,
    enum: ["approved", "temporarily_deactivated"],
    default: "approved"
  },
  ownerNotifyCount: { type: Number, default: 0 },
  lastOwnerNotifiedAt: Date,

}, { timestamps: true });


export default mongoose.model("Drone_alert_status", DroneAlertSchema);
