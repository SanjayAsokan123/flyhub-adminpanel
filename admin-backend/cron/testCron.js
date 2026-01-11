import cron from "node-cron";
import { PilotBooking } from "./models/Pilot_Booking.model.js";
import { Buyer } from "./models/Buyer.model.js";
import { Seller } from "./models/Seller.model.js";

// TEST CRON - Runs every minute
cron.schedule("* * * * *", async () => {
  const now = new Date();
  console.log("\n🧪 TEST CRON RUNNING -", now.toLocaleTimeString());

  try {
    // Get bookings that need reminders
    const bookings = await PilotBooking.find({
      status: { $in: ["pending", "approved"] },
      "bookingReminders.remindersCompleted": false
    });

    console.log(`Found ${bookings.length} bookings to check`);

    for (const booking of bookings) {
      await processTestReminder(booking, now);
    }
  } catch (error) {
    console.error("Test cron error:", error);
  }
});

async function processTestReminder(booking, now) {
  // Initialize schedule if not set
  if (!booking.bookingReminders.reminderSchedule) {
    const schedule = getTestSchedule(booking.createdAt);
    booking.bookingReminders.reminderSchedule = schedule;
    await booking.save();
    console.log(`📝 Set test schedule for ${booking.bookingId}`);
  }

  const { frequency, maxReminders } = booking.bookingReminders.reminderSchedule;
  const { notificationsSent, lastReminderSent } = booking.bookingReminders;

  if (notificationsSent >= maxReminders) {
    booking.bookingReminders.remindersCompleted = true;
    await booking.save();
    console.log(`✅ Completed all reminders for ${booking.bookingId}`);
    return;
  }

  // Check if it's time to send a reminder
  let shouldSend = false;
  if (notificationsSent === 0) {
    shouldSend = true;
  } else if (lastReminderSent) {
    const timeSinceLast = now.getTime() - new Date(lastReminderSent).getTime();
    if (timeSinceLast >= frequency * 60 * 1000) {
      shouldSend = true;
    }
  }

  if (shouldSend) {
    console.log(`🔔 Sending test reminder ${notificationsSent + 1}/${maxReminders}`);
    console.log(`   Booking: ${booking.bookingId}`);
    console.log(`   Buyer: ${booking.buyerName}`);
    console.log(`   Pilot: ${booking.pilotName}`);
    console.log(`   Interval: ${frequency} minutes`);

    booking.bookingReminders.notificationsSent++;
    booking.bookingReminders.lastReminderSent = now;

    if (booking.bookingReminders.notificationsSent >= maxReminders) {
      booking.bookingReminders.remindersCompleted = true;
    }

    await booking.save();
  }
}

function getTestSchedule(createdAt) {
  const created = new Date(createdAt);
  const now = new Date();
  const minutesSinceCreation = Math.floor((now - created) / (1000 * 60));

  if (minutesSinceCreation < 5) {
    // First 5 minutes: every 1 minute (3 times)
    return { frequency: 1, maxReminders: 3, reminderEnd: new Date(created.getTime() + 5 * 60 * 1000) };
  } else if (minutesSinceCreation < 15) {
    // Next 10 minutes: every 2 minutes (4 times)
    return { frequency: 2, maxReminders: 4, reminderEnd: new Date(created.getTime() + 15 * 60 * 1000) };
  } else {
    // After 15 minutes: every 3 minutes (4 times)
    return { frequency: 3, maxReminders: 4, reminderEnd: new Date(created.getTime() + 30 * 60 * 1000) };
  }
}

console.log("✅ Test cron job scheduled to run every minute");