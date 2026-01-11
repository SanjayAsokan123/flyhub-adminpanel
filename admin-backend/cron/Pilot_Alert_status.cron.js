import cron from "node-cron";
import Booking from "../models/Pilot_Alert_status.model.js";
import { PilotBooking } from "../models/Pilot_Booking.model.js";
import { HirePilot } from "../models/Hirepilot.model.js";
import { BuyerPilot } from "../models/BuyerPilot.model.js";
import { Seller } from "../models/Seller.model.js";
import { Buyer } from "../models/Buyer.model.js";
import {
  sendAlertDeactivationEmail,
  sendPilotReminderEmail,
  sendUserPilotUnavailableEmail
} from "../utils/emailService.js";
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


    console.log(`Checking ${userBookings.length} bookings for User Alerts...`);

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


      booking.reminderCount += 1;
      booking.lastReminderSentAt = now;

      // 🔴 FINAL REMINDER → USER NOTIFIED + PILOT IGNORE
      if (booking.reminderCount === booking.maxReminders) {
        booking.userStatus = "PILOT_NOT_AVAILABLE";

        // Notify user about pilot unavailability
        console.log(`🚫 Pilot Unavailable. Notifying User ${booking.BuyerId}`);

        // 1. Send Push
        await send_User_Message(
          booking.BuyerId,
          "Your booked pilot Not Available. Please book another pilot.",
          booking.bookingId
        );

        // 2. Send Email
        const buyer = await Buyer.findOne({ buyerId: booking.BuyerId });
        if (buyer) {
          const detailedBooking = await PilotBooking.findOne({ bookingId: booking.bookingId });
          await sendUserPilotUnavailableEmail({
            to: buyer.email,
            name: buyer.name,
            bookingId: booking.bookingId,
            pilotName: detailedBooking?.pilotName || "Unknown Pilot"
          });
        }

        // 🔥 INCREMENT PILOT IGNORE COUNT (ONCE PER USER)
        let pilot = null;
        let pilotOwnerEmail = null;
        let pilotOwnerName = null;

        if (booking.pilotType === "seller") {
          pilot = await HirePilot.findOne({ pilotId: booking.pilotId });
          if (pilot) {
            const seller = await Seller.findOne({ customId: pilot.sellerId });
            pilotOwnerEmail = seller?.email;
            pilotOwnerName = seller?.name;
          }
        } else if (booking.pilotType === "buyer") {
          pilot = await BuyerPilot.findOne({ $or: [{ pilotId: booking.pilotId }, { buyerPilotId: booking.pilotId }] });
          if (pilot) {
            // For BuyerPilot, the owner is a Buyer
            const ownerBuyer = await Buyer.findOne({ buyerId: pilot.buyerId });
            pilotOwnerEmail = ownerBuyer?.email;
            pilotOwnerName = ownerBuyer?.name;
          }
        }


        if (pilot) {
          pilot.ignoredBookingCount = (pilot.ignoredBookingCount || 0) + 1;

          console.log(`⚠️ Pilot ${booking.pilotId} Ignore Count: ${pilot.ignoredBookingCount}`);

          // 🚨 DEACTIVATE ONLY AFTER 2 DIFFERENT USERS (IGNORES)
          if (pilot.ignoredBookingCount >= 2) {
            pilot.adminStatus = "Temporarily_Deactivated";

            console.log(
              `[ADMIN FLOW] 🚨 PILOT DEACTIVATED`,
              `Pilot: ${booking.pilotId}`
            );

            if (pilotOwnerEmail) {
              await sendAlertDeactivationEmail({
                Type: "Pilot",
                Name: pilotOwnerName || "Partner",
                Email: pilotOwnerEmail,
                supportEmail: "support@flyhub.in",
                supportContact: "+91 XXXXX XXXXX",
              });
            }
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

      console.log(`🔔 Sending Reminder to Pilot for Booking ${booking.bookingId}`);

      // Get Detailed Booking for names
      const detailedBooking = await PilotBooking.findOne({ bookingId: booking.bookingId });
      const pilotName = detailedBooking?.pilotName || "Unknown Pilot";

      // 1. Send Push
      await sendPilotMessage(
        booking.pilotId,
        booking.pilotType, // Pass pilotType
        "Reminder: Waiting for Approval to User...!",
        booking.bookingId
      );

      // 2. Send Email
      let pilotOwnerEmail = null;
      let pilotOwnerName = null;

      if (booking.pilotType === "seller") {
        // We might not have easy access to Owner Email here without querying, 
        // but `sendPilotMessage` does query. Let's do a quick query here or rely on push for now?
        // Ideally we query to get email.
        const pilot = await HirePilot.findOne({ pilotId: booking.pilotId });
        if (pilot) {
          const seller = await Seller.findOne({ customId: pilot.sellerId });
          pilotOwnerEmail = seller?.email;
          pilotOwnerName = seller?.name;
        }

      } else if (booking.pilotType === "buyer") {
        const pilot = await BuyerPilot.findOne({ $or: [{ pilotId: booking.pilotId }, { buyerPilotId: booking.pilotId }] });
        if (pilot) {
          const owner = await Buyer.findOne({ buyerId: pilot.buyerId });
          pilotOwnerEmail = owner?.email;
          pilotOwnerName = owner?.name;
        }
      }

      if (pilotOwnerEmail) {
        await sendPilotReminderEmail({
          to: pilotOwnerEmail,
          name: pilotOwnerName,
          bookingId: booking.bookingId,
          pilotName: pilotName
        });
      }


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

      let pilot = null;
      if (booking.pilotType === "seller") {
        pilot = await HirePilot.findOne({ pilotId: booking.pilotId });
      } else if (booking.pilotType === "buyer") {
        pilot = await BuyerPilot.findOne({ $or: [{ pilotId: booking.pilotId }, { buyerPilotId: booking.pilotId }] });
      }

      if (pilot && pilot.ignoredBookingCount > 0) {
        pilot.ignoredBookingCount = 0;
        pilot.lastResponseAt = now;

        // Ensure status is active if it was temporarily deactivated? 
        // User said "reset ignore count", presumably if they confirm one, they are active.
        if (pilot.adminStatus === "Temporarily_Deactivated") {
          pilot.adminStatus = "approved";
        }

        await pilot.save();
        console.log(`✅ Pilot ${booking.pilotId} Ignore Count Reset`);
      }
    }

  } catch (error) {
    console.error("Booking Cron Error:", error);
  }
});

// ---------------- USER NOTIFICATION MOCK ----------------

async function sendPilotMessage(pilotId, pilotType, message, bookingId) {
  console.log(`Pilot Message to ${pilotId} [${pilotType}]: ${message}`);

  let pilotOwner = null;
  let ownerType = null; // seller or buyer

  if (pilotType === "seller") {
    const pilot = await HirePilot.findOne({ pilotId: pilotId });
    if (pilot) {
      pilotOwner = await Seller.findOne({ customId: pilot.sellerId });
      ownerType = "seller";
    }
  } else if (pilotType === "buyer") { // Should be 'buyer'
    const pilot = await BuyerPilot.findOne({ $or: [{ pilotId: pilotId }, { buyerPilotId: pilotId }] });
    if (pilot) {
      pilotOwner = await Buyer.findOne({ buyerId: pilot.buyerId });
      ownerType = "buyer";
    }
  }

  if (pilotOwner && pilotOwner.fcmTokens?.length) {
    console.log(`Sending push notification to ${ownerType} ${pilotOwner.email}`);

    const pushMethod = ownerType === "seller" ? sendSellerPush : sendBuyerPush;

    await pushMethod(
      pilotOwner.fcmTokens,
      "Reminder: Please confirm your booking",
      `${message}`,
      {
        bookingId: bookingId,
        pilotId: pilotId,
        type: "Reminder_pilot_confirmation",
      }
    );
    console.log(`Push sent successfully`);
  } else {
    console.log(`No FCM tokens found or owner not found for pilot ${pilotId}`);
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
        "Pilot Unavailable Notification",
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