import DroneRental from "../models/Buyer_Booking_Drone_Rental.model.js";
import { Rental } from "../models/Rental.model.js";
import { Seller } from "../models/Seller.model.js";
import { Buyer } from "../models/Buyer.model.js";
// Drone Alert schema
import DroneAlertSchema from "../models/Drone_rental_Alert_status.model.js";

// BUYER notifications
import { sendPushNotification as sendBuyerPush } from "../utils/pushNotification.js";

// SELLER notifications
import { sendPushNotification as sendSellerPush } from "../utils/SendPushNotification.js";

// ============================================
// BUYER BOOKING Time Calculation DRONE RENTAL Resolvers
// ============================================================

function calculateDroneReminderTimes(rentalDate) {
  const now = new Date();

  const bookingDay = new Date(rentalDate);
  bookingDay.setHours(0, 0, 0, 0);

  // Cutoff: previous day 6 PM
  const deadline = new Date(bookingDay);
  deadline.setDate(deadline.getDate() - 1);
  deadline.setHours(18, 0, 0, 0);

  // If booking is too late
  if (now >= deadline) return null;

  return {
    ownerReminderStartAt: now,
    ownerReminderEndAt: deadline,
    userFallbackAt: deadline,
  };
}


export const droneRentalBookingResolvers = {
  Query: {
    getDroneRentalById: async (_, { drone_rental_id }) =>
      DroneRental.findOne({ drone_rental_id }),
    getAllDroneRentals: async () => {
      return await DroneRental.find({}).sort({ createdAt: -1 });
    },

    getDroneRentalsByBuyerId: async (_, { buyerId }) =>
      DroneRental.find({ buyerId }).sort({ createdAt: -1 }),



    getBuyerfirebaseUidInDroneRental: async (_, { firebaseUid }) => {
      const buyer = await Buyer.findOne({ firebaseUid });

      if (!buyer) {
        throw new Error("Buyer not found");
        console.log('buyer not found');
      }

      return buyer;
    },

    getConfirmedDroneRentalsByBuyer: async (_, { buyerId }) =>
      DroneRental.find({
        buyerId,
        status: "confirmed",
        buyerDeleted: false,
      }),

    getPendingDroneRentalsByBuyer: async (_, { buyerId }) =>
      DroneRental.find({
        buyerId,
        status: "pending",
        buyerDeleted: false,
      }),

    getCancelledDroneRentalsByBuyer: async (_, { buyerId }) =>
      DroneRental.find({
        buyerId,
        status: "cancelled",
        buyerDeleted: false,
      }),

    getDroneRentalsBySellerId: async (_, { sellerId }) =>
      DroneRental.find({
        sellerId,
        sellerDeleted: false,
      }).sort({ createdAt: -1 }),

  },


  Mutation: {

      createDroneRental: async (_,{ name, phone, location, rentalDate, rentalId, buyerId }) => {
            try {
      /* --------------------------------------------------
        1️⃣ Validate Rental Listing
      -------------------------------------------------- */
      const listing = await Rental.findOne({ rentalId });
      if (!listing) {
        return { success: false, message: "Invalid rentalId" };
      }
      console.log(rentalId);
      console.log("==============================");
      console.log(listing);
      console.log("==============================");
      
      
      
      /* --------------------------------------------------
        2️⃣ Normalize Date (IGNORE TIME)
      -------------------------------------------------- */
      const bookingDate = new Date(rentalDate);
      bookingDate.setHours(0, 0, 0, 0);

      const nextDate = new Date(bookingDate);
      nextDate.setDate(nextDate.getDate() + 1);

      /* --------------------------------------------------
        3️⃣ Check Already Booked (same drone + same date)
      -------------------------------------------------- */
      const alreadyBooked = await DroneRental.findOne({
        rentalId,
        buyerId,
        rentalDate: {
        $gte: bookingDate,
        $lt: nextDate,
      },
      });

     if (alreadyBooked) {
        return {
          success: false,
          message: "You have already booked this service for the selected date",
        };
      }

      /* --------------------------------------------------
        4️⃣ Fetch Buyer & Seller
      -------------------------------------------------- */
      const buyer = await Buyer.findOne({ buyerId });
      const seller = await Seller.findOne({ customId: listing.sellerId })
        .select("email phoneNumber name fcmTokens");

      /* --------------------------------------------------
        5️⃣ Create Booking
      -------------------------------------------------- */
      const newBooking = new DroneRental({
        name,
        phone,
        location,
        rentalDate: bookingDate,
        rentalId,
        sellerId: listing.sellerId,
        buyerId,

        sellerEmail: seller?.email,
        sellerName: seller?.name,
        sellerPhone: seller?.phoneNumber,

        status: "pending",
      });

      await newBooking.save();

      /* --------------------------------------------------
        6️⃣ Notifications
      -------------------------------------------------- */

      // 🔔 Seller Notification
      if (seller?.fcmTokens?.length) {
        await sendSellerPush(
          seller.fcmTokens,
          "New Drone Rental REQUEST ",
          `Drone Rental request from ${name}`,
          {
            bookingId: newBooking.drone_rental_id,
            type: "drone_rental_new",
          }
        );
      }

      // 🔔 Buyer Notification
      if (buyer?.fcmToken) {
        await sendBuyerPush(
          buyer.fcmToken,
          "Rental Request Submitted ⏳",
          `Your booked(${newBooking.name}).`,
          {
            bookingId: newBooking.drone_rental_id,
            type: "drone_rental_pending",
          }
        );
      }
   // ---------------- DRONE ALERT STATUS CREATION ----------------
     const reminderWindow = calculateDroneReminderTimes(rentalDate);

      if (reminderWindow) {
        await DroneAlertSchema.create({
          bookingId: newBooking.drone_rental_id,
          DroneId: newBooking.rentalId,
          BuyerId: newBooking.buyerId,

          DroneStatus: "ASSIGNED",
          userStatus: "ACTIVE",

          ...reminderWindow,
        });
      }
      
      // ============================
      // testing purpose only...........
      // =============================

      //   // owner reminder window (1–3 minutes)
      //   const ownerReminderStartAt = new Date(now.getTime() + 1 * 60 * 1000);
      //   const ownerReminderEndAt   = new Date(now.getTime() + 3 * 60 * 1000);

      //   // user fallback at 4 minutes
      //   const userFallbackAt = new Date(now.getTime() + 4 * 60 * 1000);

      //   await DroneAlertSchema.create({
      //     bookingId: newBooking.drone_rental_id,
      //     DroneId: newBooking.rentalId,
      //     BuyerId: newBooking.buyerId,

      //     DroneStatus: "ASSIGNED",

      //     ownerReminderStartAt,
      //     ownerReminderEndAt,
      //     userFallbackAt,

      //     ownerNotifyCount: 0,
      //     userNotified: false,
      //     userStatus: "ACTIVE",
      //   });



       console.log(`check 1 : user drone booked and save in drone_alert page ${DroneAlertSchema}`);
                

      /* --------------------------------------------------
        7️⃣ Success Response
      -------------------------------------------------- */
      return {
        success: true,
        message: "Booking created successfully",
      };

    } catch (err) {
      /* --------------------------------------------------
        8️⃣ Handle Duplicate Index Error (MongoDB)
      -------------------------------------------------- */
      if (err.code === 11000) {
        return {
          success: false,
          message: "This drone is already booked for the selected date",
        };
      }

      console.error("Error in createDroneRental:", err);
      return {
        success: false,
        message: "Something went wrong",
      };
    }
      },

    updateDroneRentalContact: async (_, { drone_rental_id, phone, location }) => {
      const updateData = {};
      if (phone) updateData.phone = phone;
      if (location) updateData.location = location;

      const updated = await DroneRental.findOneAndUpdate(
        { drone_rental_id },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updated) throw new Error(`Booking ${drone_rental_id} not found`);
      return updated;
    },

    updateDroneRentalId: async (_, { drone_rental_id, rentalId }) => {
      const listing = await Rental.findOne({ rentalId }).select("sellerId");
      if (!listing) throw new Error("Invalid rentalId");

      const seller = await Seller.findOne({ customId: listing.sellerId }).select("email phoneNumber");

      const updateData = {
        rentalId,
        sellerId: listing.sellerId,
        sellerEmail: seller?.email || null,
        sellerPhone: seller?.phoneNumber || null,
      };

      const updated = await DroneRental.findOneAndUpdate(
        { drone_rental_id },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updated) throw new Error(`Booking ${drone_rental_id} not found`);
      return updated;
    },

   deleteDroneRentalByBuyer: async (_, { drone_rental_id }) => {
  const rental = await DroneRental.findOne({ drone_rental_id });
  if (!rental) return { success: false, message: "Booking not found" };

  const seller = await Seller.findOne({ customId: rental.sellerId });

  if (rental.status === "pending") {
    await DroneRental.deleteOne({ drone_rental_id });
    return { success: true, message: "Pending booking deleted" };
  }

  if (rental.status === "confirmed") {
    await DroneRental.deleteOne({ drone_rental_id });

    // 🔔 SELLER – Buyer deleted booking
    if (seller?.fcmTokens?.length) {
      await sendSellerPush(
        seller.fcmTokens,
        "Booking Deleted by Buyer ⚠️",
        `Confirmed booking (${drone_rental_id}) was deleted by buyer.`,
        {
          bookingId: drone_rental_id,
          type: "drone_rental_deleted_by_buyer",
        }
      );
    }

    return {
      success: true,
      message: "Booking deleted & seller notified",
    };
  }

  if (rental.status === "cancelled") {
    rental.buyerDeleted = true;
    await rental.save();
    return { success: true, message: "Removed from your bookings" };
  }

  return { success: false, message: "Invalid booking state" };
    },

    updateDroneRentalStatus: async (_, { drone_rental_id, status }) => {
      const updated = await DroneRental.findOneAndUpdate(
        { drone_rental_id },
        { $set: { status } },
        { new: true, runValidators: true }
      );
      
      
      if (!updated) throw new Error(`Booking ${drone_rental_id} not found`);

        if (status === "approved" || status === "confirmed") {
        await DroneAlertSchema.updateOne(
          { bookingId: drone_rental_id },
          {
            DroneStatus: "CONFIRMED",
            userStatus: "ACTIVE"
          }
        );
       }
      
          if (status === "rejected" || status === "cancelled") {
            await DroneAlertSchema.updateOne(
              { bookingId: drone_rental_id },
              { DroneStatus: "PENDING" }
            );
         }
      
          if (status === "completed") {
            await updateDroneAlertStatusByBooking(
              bookingId,
              "CONFIRMED"
            );
            console.log(`drone rental completed the task`);
            // optional cleanup
            await deleteDroneAlertByBooking(bookingId);
          }

      const buyer = await Buyer.findOne({ buyerId: updated.buyerId });
      const seller = await Seller.findOne({ customId: updated.sellerId });

      // ======================
      // BUYER NOTIFICATIONS
      // ======================
      if (buyer?.fcmToken) {
        if (status === "confirmed") {
          await sendBuyerPush(
            buyer.fcmToken,
            "Drone Rental Approved 🎉",
            `Your drone rental booking (${updated.drone_rental_id}) has been approved.`,
            {
              bookingId: updated.drone_rental_id,
              rentalId: updated.rentalId,
              type: "drone_rental_confirmed",
            }
          );
        }

        if (status === "cancelled") {
          await sendBuyerPush(
            buyer.fcmToken,
            "Drone Rental Cancelled ❌",
            `Your drone rental booking (${updated.drone_rental_id}) has been cancelled.`,
            {
              bookingId: updated.drone_rental_id,
              type: "drone_rental_cancelled",
            }
          );
        }
      }

      // ======================
      // SELLER NOTIFICATIONS
      // ======================
      if (seller?.fcmTokens?.length) {
        if (status === "confirmed") {
          await sendSellerPush(
            seller.fcmTokens,
            "Rental Confirmed ✅",
            `You confirmed booking (${updated.drone_rental_id}).`,
            {
              bookingId: updated.drone_rental_id,
              type: "drone_rental_confirmed_seller",
            }
          );
        }

        if (status === "cancelled") {
          await sendSellerPush(
            seller.fcmTokens,
            "Rental Cancelled ❌",
            `Booking (${updated.drone_rental_id}) was cancelled.`,
            {
              bookingId: updated.drone_rental_id,
              type: "drone_rental_cancelled_seller",
            }
          );
        }
      }

      return updated;
    },

  },
};