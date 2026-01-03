import DroneRental from "../models/Buyer_Booking_Drone_Rental.model.js";
import { Rental } from "../models/Rental.model.js";
import { Seller } from "../models/Seller.model.js";
import { Buyer } from "../models/Buyer.model.js";
// BUYER notifications
import { sendPushNotification as sendBuyerPush } from "../utils/pushNotification.js";

// SELLER notifications
import { sendPushNotification as sendSellerPush } from "../utils/SendPushNotification.js";


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
        status: { $in: ["confirmed", "completed"] },
        buyerDeleted: false,
      }).sort({ createdAt: -1 }),


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
    createDroneRental: async (_, { name, phone, location, rentalDate, rentalId, buyerId }) => {
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
        if (seller?.fcmTokens?.length > 0) {
          await sendSellerPush(
            seller.fcmTokens,
            "New Drone Rental Request",
            `New rental request from ${name}`,
            {
              bookingId: newBooking.drone_rental_id,
              type: "drone_rental_new",
            }
          );
        }

        // 🔔 Buyer Notification
        if (buyer?.fcmTokens?.length > 0) {
          await sendBuyerPush(
            buyer.fcmTokens,
            "Rental Request Submitted",
            `Your rental request (${newBooking.drone_rental_id}) is pending approval.`,
            {
              bookingId: newBooking.drone_rental_id,
              type: "drone_rental_pending",
            }
          );
        }

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

      const buyer = await Buyer.findOne({ buyerId: updated.buyerId });
      const seller = await Seller.findOne({ customId: updated.sellerId });

      // ======================
      // BUYER NOTIFICATIONS
      // ======================
      if (buyer?.fcmTokens) {
        if (status === "confirmed") {
          await sendBuyerPush(
            buyer.fcmTokens,
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
            buyer.fcmTokens,
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