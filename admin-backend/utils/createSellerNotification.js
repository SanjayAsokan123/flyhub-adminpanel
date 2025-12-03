import { SellerNotification } from "../models/SellerNotification.model.js";
import { Seller } from "../models/Seller.model.js";
import { sendPushNotification } from "./pushNotification.js";
import { v4 as uuidv4 } from "uuid";

export const SELLER_NOTIFICATION_TOPIC = "SELLER_NOTIFICATION_ADDED";

export async function createSellerNotification({
  sellerId,
  title,
  message,
  type = "seller_status_update",
  data = {},
  url = null,
  pubsub = null,
}) {
  try {
    const seller = await Seller.findOne({ customId: sellerId });

    const notification = await SellerNotification.create({
      notificationId: uuidv4(),
      sellerId,
      title,
      message,
      type,
      url,
      data,
      read: false,
    });

    // Send push notification only to sellers (or ADMIN if used as flag)
    if (seller) {
      const tokens = [
        ...(seller.fcmTokens || []),
        ...(seller.fcmToken ? [seller.fcmToken] : [])
      ];

      if (tokens.length > 0) {
        await Promise.all(
          tokens.map(t => sendPushNotification(t, title, message))
        );
      }
    }

    // Subscription
    if (pubsub) {
      await pubsub.publish(SELLER_NOTIFICATION_TOPIC, {
        sellerNotificationAdded: {
          ...notification.toObject(),
          createdAt: notification.createdAt.toISOString(),
        },
      });
    }

    return notification;
  } catch (err) {
    throw new Error("Failed to create seller notification: " + err.message);
  }
}
