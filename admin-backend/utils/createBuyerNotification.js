// utils/createBuyerNotification.js
import { BuyerNotification } from "../models/BuyerNotification.model.js";
import { Buyer } from "../models/Buyer.model.js";
import { sendPushNotification } from "./pushNotification.js";
import { v4 as uuidv4 } from "uuid";

import { BUYER_NOTIFICATION_TOPIC, pubsub } from "../pubsub.js";

export async function createBuyerNotification({
  buyerId,
  title,
  message,
  type = "buyer_status_update",
  data = {},
  url = null,
}) {
  try {
    const buyer = await Buyer.findOne({ buyerId });

    const notification = await BuyerNotification.create({
      notificationId: uuidv4(),
      buyerId,
      title,
      message,
      type,
      url,
      data,
      read: false,
    });

    // PUSH NOTIFICATION
    if (buyer) {
      const tokens = [
        ...(buyer.fcmTokens || []),
        ...(buyer.fcmToken ? [buyer.fcmToken] : []),
      ];

      if (tokens.length > 0) {
        await Promise.all(
          tokens.map((token) =>
            sendPushNotification(token, title, message)
          )
        );
      }
    }

    // GRAPHQL SUBSCRIPTION EVENT
    pubsub.publish(BUYER_NOTIFICATION_TOPIC, {
      buyerNotificationAdded: {
        ...notification.toObject(),
        createdAt: notification.createdAt.toISOString(),
      },
    });

    return notification;
  } catch (err) {
    console.error("🔥 Buyer Notification Error:", err);
    throw new Error("Failed to create buyer notification");
  }
}
