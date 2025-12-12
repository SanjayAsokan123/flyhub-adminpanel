import mongoose from "mongoose";

const SellerNotificationSchema = new mongoose.Schema({
  notificationId: { type: String, required: true, unique: true },
  sellerId: { type: String, required: true, index: true }, // customId or “ADMIN”
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: "seller_status_update" },
  data: { type: Object, default: {} },
  url: { type: String, default: null },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export const SellerNotification = mongoose.model(
  "SellerNotification",
  SellerNotificationSchema
);
