import mongoose from "mongoose";

const { Schema } = mongoose;

const ServiceAlertSchema = new Schema({
  bookingId: { type: String, required: true },
  serviceId: { type: String, required: true },
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
    default: "ACTIVE"
  },

  ServiceStatus: {
    type: String,
    enum: ["ASSIGNED", "CONFIRMED", "PENDING"],
    default: "ASSIGNED"
  },

  bookingTime: Date,

  /* TRACKING */
  ignoredBookingCount: { type: Number, default: 0 },
  lastIgnoredAt: Date,
  ownerNotifyCount: { type: Number, default: 0 },
  lastOwnerNotifiedAt: Date,

}, { timestamps: true });

export default mongoose.model("Service_alert_status", ServiceAlertSchema);
