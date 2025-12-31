import mongoose from "mongoose";

const BuyerNotificationSchema = new mongoose.Schema({
  notificationId: { type: String, required: true, unique: true },
  buyerId: { type: String, required: true, index: true },   // FIXED
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: "buyer_status_update" },
  data: { type: Object, default: {} },
  url: { type: String, default: null },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const BuyerNotification = mongoose.model("BuyerNotification", BuyerNotificationSchema);
