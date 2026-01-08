import cron from "node-cron";
import ServiceAlertSchema from "../models/Service_Alert_status.model.js";
import { Service } from "../models/Service.model.js";
import { Seller } from "../models/Seller.model.js";
import { sendAlertDeactivationEmail } from "../utils/emailService.js";
import { Buyer } from "../models/Buyer.model.js";
import { sendPushNotification as sendBuyerPush } from "../utils/pushNotification.js";
import { sendPushNotification as sendSellerPush } from "../utils/SendPushNotification.js";

cron.schedule("0 * * * *", async () => { // every hour
  const now = new Date();

  console.log("\n========= SERVICE ALERT STATUS CRON =========");
  console.log("RUN AT:", now.toISOString());
  console.log("===========================================");

  try {
    /* =====================================================
       1️⃣ SELLER (SERVICE PROVIDER) REMINDERS
    ===================================================== */
    const ownerReminders = await ServiceAlertSchema.find({
      ServiceStatus: "ASSIGNED",
      ownerReminderStartAt: { $lte: now },
      ownerReminderEndAt: { $gt: now },
      ownerNotifyCount: { $lt: 3 },
    });

    for (const booking of ownerReminders) {

      // prevent duplicate within 1 hour
      if (
        booking.lastOwnerNotifiedAt &&
        now - booking.lastOwnerNotifiedAt < 60 * 60 * 1000
      ) continue;

      await sendSellerMessage(
        booking.serviceId,
        "Reminder: Please confirm the service booking.",
        booking.bookingId
      );

      booking.ownerNotifyCount += 1;
      booking.lastOwnerNotifiedAt = now;
      await booking.save();
    }

    /* =====================================================
       2️⃣ FINAL USER FALLBACK + AUTO DEACTIVATION
    ===================================================== */
    const userFallbacks = await ServiceAlertSchema.find({
      ServiceStatus: "ASSIGNED",
      userStatus: "ACTIVE",
      userFallbackAt: { $lte: now },
      userNotified: false,
    });

    for (const booking of userFallbacks) {

      await send_User_Message(
        booking.BuyerId,
        "Your booked service is not available. Please book another service.",
        booking.bookingId
      );

      booking.userNotified = true;
      booking.userStatus = "NOT_AVAILABLE";
      await booking.save();

      console.log(`🚨 Service not available – fallback triggered`);

      const entity = await Service.findOne({ serviceId: booking.serviceId });
      if (!entity) continue;

      entity.ignoredBookingCount += 1;
      entity.lastIgnoredAt = now;

      if (
        entity.ignoredBookingCount >= 2 &&
        entity.status !== "temporarily_deactivated"
      ) {
        entity.status = "temporarily_deactivated";

        const seller = await Seller.findOne({ customId: entity.sellerId });
        if (seller) {
          await sendAlertDeactivationEmail({
            Type: "Service Provider",
            Name: seller.name,
            Email: seller.email,
            supportEmail: "support@flyhub.com",
            supportContact: "+91 xxxxxx xxxxxx",
          });
        }
      }

      await entity.save();
    }


  } catch (error) {
    console.error("Service Alert Cron Error:", error);
  }
});



// ---------------- SELLER NOTIFICATION MOCK ----------------

async function sendSellerMessage(serviceId, message, bookingId) {
  console.log(`Service Message to ${serviceId}: ${message}`);

  const service = await Service.findOne({ serviceId: serviceId });

  if (!service) {
    console.log("Service not found");
    return;
  }

  const sellerId = service.sellerId;
  const seller = await Seller.findOne({ customId: sellerId });

  if (seller && seller.fcmTokens) {
    if (seller?.fcmTokens?.length) {
      await sendSellerPush(
        seller.fcmTokens,
        "Reminder: Please confirm your booking",
        `${message}`,
        {
          bookingId: bookingId,
          serviceId: serviceId,
          type: "Reminder_Service_confirmation",
        }
      );
    }
    console.log(`notification sent to Seller (Service) ${sellerId}`);
  }
  else {
    console.log(`No FCM tokens found for Seller ${sellerId}`);
  }
}

// ---------------- BUYER NOTIFICATION MOCK ----------------
async function send_User_Message(buyerId, message, bookingId) {
  console.log(`User Message to ${buyerId}: ${message}`);
  const buyer = await Buyer.findOne({ buyerId: buyerId });

  if (buyer && buyer.fcmTokens) {
    if (buyer.fcmTokens.length > 0) {
      console.log(`Sending push notification to buyer ${buyerId}`);
      await sendBuyerPush(
        buyer.fcmTokens,
        "Your Booked Service Unavailable",
        `${message}`,
        {
          bookingId: bookingId,
          type: "service_unavailable_notification",
        }
      );
      console.log(`notification sent to buyer ${buyerId}`);
    }
  }
}