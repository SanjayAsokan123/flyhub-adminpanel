import cron from "node-cron";
import DroneAlertSchema from "../models/Drone_rental_Alert_status.model.js";
// import {DroneRental} from "../models/Buyer_Booking_Drone_Rental.model.js";
import {Rental} from "../models/Rental.model.js";
import { Seller } from "../models/Seller.model.js";
import { sendAlertDeactivationEmail } from "../utils/emailService.js";
import { Buyer } from "../models/Buyer.model.js";
import { sendPushNotification as sendBuyerPush } from "../utils/pushNotification.js";
import { sendPushNotification as sendSellerPush } from "../utils/SendPushNotification.js";

  cron.schedule("0 * * * *", async () => { // every hour
  const now = new Date();

  console.log("\n========= DRONE RENTAL ALERT CRON =========");
  console.log("RUN AT:", now.toISOString());
  console.log("==========================================");

  try {
    /* =====================================================
       1️⃣ OWNER (RENTAL) REMINDERS
    ===================================================== */
    const ownerReminders = await DroneAlertSchema.find({
      DroneStatus: "ASSIGNED",
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

      await sendPilotMessage(
        booking.DroneId,
        "Reminder: Please confirm the drone rental booking.",
        booking.bookingId
      );

      booking.ownerNotifyCount += 1;
      booking.lastOwnerNotifiedAt = now;
      await booking.save();
    }

    /* =====================================================
       2️⃣ FINAL USER FALLBACK + AUTO DEACTIVATION
    ===================================================== */
    const userFallbacks = await DroneAlertSchema.find({
      DroneStatus: "ASSIGNED",
      userStatus: "ACTIVE",
      userFallbackAt: { $lte: now },
      userNotified: false,
    });

    for (const booking of userFallbacks) {

          await send_User_Message(
            booking.BuyerId,
            "Your booked drone is not available. Please book another drone.",
            booking.bookingId
          );

          booking.userNotified = true;
          booking.userStatus = "NOT_AVAILABLE";
          await booking.save();

          console.log(`🚨 Drone not available – fallback triggered`);

          const entity = await Rental.findOne({ rentalId: booking.DroneId });
          if (!entity) continue;

          entity.ignoredBookingCount += 1;
          entity.lastIgnoredAt = now;

          if (entity.ignoredBookingCount >= 2 && entity.status !== "temporarily_deactivated") {
            entity.status = "temporarily_deactivated";

            const seller = await Seller.findOne({ customId: entity.sellerId });
            if (seller) {
              await sendAlertDeactivationEmail({
                Type: "Drone",
                Name: seller.name,
                Email: seller.email,
                supportEmail: "support@abc.com",
                supportContact: "+91 xxxxxx xxxxxx",
              });
            }
          }

          await entity.save();
        }


  } catch (error) {
    console.error("Drone Rental Cron Error:", error);
  }
});



// ---------------- USER NOTIFICATION MOCK ----------------

async function sendPilotMessage(rentalId, message, bookingId) {
  // Implement user notification logic here
  console.log(`Drone Message to ${rentalId}: ${rentalId}`);

  const drone_rental = await Rental.findOne({ rentalId: rentalId });
  
  console.log(drone_rental);

  console.log(`from Drone in pilot alert status.......`);
  
  const sellerId = drone_rental?.sellerId;
  
  const seller = await Seller.findOne({ customId: sellerId });
    
  if (seller && seller.fcmTokens) {
    // Send push notification to drone
    console.log(`Sending push notification to Drone ${sellerId}`);

    if (seller?.fcmTokens?.length) {
      await sendSellerPush(
        seller.fcmTokens,
        "Remainder: Please confirm your booking ",
        `${message}`,
        {
          bookingId: bookingId,
          sellerId: sellerId,
          type: "Remainder_Drone_rental_confirmation",
        }
      );
    }
    console.log(`notification send to Drone from Drone_Alert_status to ${sellerId}`);

  }
  else {
    console.log(`No FCM tokens found for Drone ${sellerId}`);
  }


}

// ---------------- USER NOTIFICATION MOCK User-> Buyer----------------
async function send_User_Message(buyerId, message, bookingId) {
  // Implement user notification logic here
  console.log(`User Message to ${buyerId}: ${message}`);
  const buyer = await Buyer.findOne({ buyerId: buyerId });

  if (buyer && buyer.fcmTokens) {
    // Send push notification to buyer
    console.log(`Sending push notification to buyer ${buyerId}`);
    if (buyer?.fcmTokens?.length) {
      await sendBuyerPush(
        buyer.fcmTokens,
        "your Booked Drone Unavailable check in our Flyhub App ",
        `${message}`,
        {
          bookingId: bookingId,
          type: "pilot_unavailable_notification",
        }
      );
    }
    console.log(`notification send to buyer from pilot_Alret_status to ${buyerId}`);
  }
}