import cron from "node-cron";
import Booking from "../models/Pilot_Alert_status.model.js";
import {PilotBooking} from "../models/Pilot_Booking.model.js";
import {HirePilot} from "../models/Hirepilot.model.js";
import { Seller } from "../models/Seller.model.js";
import { sendAlertDeactivationEmail } from "../utils/emailService.js";
import { Buyer } from "../models/Buyer.model.js";
import { sendPushNotification as sendBuyerPush } from "../utils/pushNotification.js";
import { sendPushNotification as sendSellerPush } from "../utils/SendPushNotification.js";

cron.schedule("0 * * * *", async () => {   // every hour
  const now = new Date();

  console.log("\n==============================");
  console.log("CRON RUN AT:", now.toISOString());
  console.log("==============================");

  try {
    /* =====================================================
       1️⃣ USER REMINDERS + IGNORE COUNT (BOOKING LEVEL)
    ===================================================== */
    const userBookings = await Booking.find({
      userStatus: "ACTIVE",
      pilotReminderEndAt: { $lte: now }
    });


    console.log(userBookings);
        
    for (const booking of userBookings) {

       console.log(
        `[USER FLOW] Booking: ${booking.bookingId}`,
        `Status: ${booking.userStatus}`,
        `ReminderCount: ${booking.reminderCount}`,
        `LastSent: ${booking.lastReminderSentAt}`
     );

     if (booking.pilotStatus === "CONFIRMED") {
        continue;
      }
    //  prevent duplicate hourly send
      if (
        booking.lastReminderSentAt &&
        now - booking.lastReminderSentAt < 60 * 60 * 1000
      ) continue;

      // temporarily testing every 1 minute
      // if (
      //   booking.lastReminderSentAt &&
      //   now - booking.lastReminderSentAt < 1 * 60 * 1000
      // )
      // { 
      //   continue;
      // }

      booking.reminderCount += 1;
      booking.lastReminderSentAt = now;

      // 🔴 FINAL REMINDER → USER NOTIFIED + PILOT IGNORE
      if (booking.reminderCount === booking.maxReminders) {
        booking.userStatus = "PILOT_NOT_AVAILABLE";

        // Notify user about pilot unavailability
        console.log(booking.BuyerId);
        
        await send_User_Message(
          booking.BuyerId,
          "Your booked pilot Not Available. Please book another pilot.",
          booking.bookingId
        );
       
        // 🔥 INCREMENT PILOT IGNORE COUNT (ONCE PER USER)
        const pilot = await HirePilot.findOne({ pilotId: booking.pilotId });

        if (pilot) {
          pilot.ignoredBookingCount += 1;

          // 🚨 DEACTIVATE ONLY AFTER 2 DIFFERENT USERS
          if (pilot.ignoredBookingCount >= 2) {
            pilot.adminStatus = "Temporarily_Deactivated";
            console.log(
                `[ADMIN FLOW] 🚨 PILOT DEACTIVATED`,
                `Pilot: ${pilot.pilotId}`
              );

            console.log(`Pilot ${pilot.pilotId} has been temporarily deactivated due to multiple ignores.`);

            await sendAlertDeactivationEmail({
              Type: "Pilot",
              pilotName: pilot.name,
              pilotEmail: pilot.email,
              supportEmail: "support@abc.com",
              supportContact: "+91 xxxxxx xxxxxx",
            });
          }

          await pilot.save();
        }
      }

      await booking.save();
    }

    /* =====================================================
       2️⃣ PILOT CONFIRMATION REMINDERS (BOOKING LEVEL)
    ===================================================== */
    const pilotBookings = await Booking.find({
      pilotStatus: "ASSIGNED",
      pilotReminderStartAt: { $lte: now },
      pilotReminderEndAt: { $gt: now },
      pilotNotifyCount: { $lt: 3 }
    });


    for (const booking of pilotBookings) {

      if (
        booking.pilotLastNotifiedAt &&
        now - booking.pilotLastNotifiedAt < 60 * 60 * 1000
      ) continue;

      // send pilot reminder Through push notification
      await sendPilotMessage(
        booking.pilotId,
        "Remainder : Waiting for Approval to User...!.",
        booking.bookingId
      );

      booking.pilotNotifyCount += 1;
      booking.pilotLastNotifiedAt = now;
      await booking.save();
    }

    /* =====================================================
       3️⃣ RESET PILOT IGNORE COUNT ON CONFIRMATION
    ===================================================== */
    const confirmedBookings = await Booking.find({
      pilotStatus: "CONFIRMED"
    });

    for (const booking of confirmedBookings) {
      const pilot = await HirePilot.findOne({ pilotId: booking.pilotId });

      if (pilot && pilot.ignoredBookingCount > 0) {
        pilot.ignoredBookingCount = 0;
        pilot.lastResponseAt = now;
        pilot.adminStatus = "approved";
        await pilot.save();
      }
    }

  } catch (error) {
    console.error("Booking Cron Error:", error);
  }
});

// ---------------- USER NOTIFICATION MOCK ----------------

async function sendPilotMessage(pilotId, message, bookingId) {
  // Implement user notification logic here
  console.log(`Pilot Message to ${pilotId}: ${pilotId}`);

  const pilot = await PilotBooking.findOne({ pilotId: pilotId });
  
  console.log(pilot);

  console.log(`from pilotPiltMessage in pilot alert status.......`);
  
  const sellerId = pilot?.sellerId;
  
  const seller = await Seller.findOne({ customId: sellerId });
    
  if (seller && seller.fcmTokens) {
    // Send push notification to pilot
    console.log(`Sending push notification to pilot ${pilotId}`);

    if (seller?.fcmTokens?.length) {
      await sendSellerPush(
        seller.fcmTokens,
        "Remander: Please confirm your booking ",
        `${message}`,
        {
          bookingId: bookingId,
          pilotId: pilotId,
          type: "Reminder_pilot_confirmation",
        }
      );
    }
    console.log(`notification send to pilot from pilot_Alret_status to ${pilotId}`);

  }
  else {
    console.log(`No FCM tokens found for pilot ${pilotId}`);
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
        "Pilot Unavailable Notification from pilot alert ",
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