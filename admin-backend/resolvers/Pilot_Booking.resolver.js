import { PilotBooking } from "../models/Pilot_Booking.model.js";
import { HirePilot } from "../models/Hirepilot.model.js";
import { Buyer } from "../models/Buyer.model.js";
import { Seller } from "../models/Seller.model.js";
import { sendPushNotification as sendBuyerPush } from "../utils/pushNotification.js";
import { sendPushNotification as sendSellerPush } from "../utils/SendPushNotification.js";


export const pilotBookingResolvers = {
  Query: {

    getSellerPendingPilotBookings: async (_, { sellerId }) => {
      const pilots = await HirePilot.find({ sellerId });
      const pilotIds = pilots.map(p => p.pilotId);

      return await PilotBooking.find({
        pilotId: { $in: pilotIds },
        status: "pending",
        $or: [
          { sellerDeleted: false },
          { sellerDeleted: { $exists: false } }
        ]
      }).sort({ createdAt: -1 });
    },



    getSellerApprovedPilotBookings: async (_, { sellerId }) => {
      const pilots = await HirePilot.find({ sellerId });
      const pilotIds = pilots.map(p => p.pilotId);

      return await PilotBooking.find({
        pilotId: { $in: pilotIds },
        status: "approved"
      }).sort({ createdAt: -1 });
    },

    getSellerRejectedPilotBookings: async (_, { sellerId }) => {
      const pilots = await HirePilot.find({ sellerId });
      const pilotIds = pilots.map(p => p.pilotId);

      return await PilotBooking.find({
        pilotId: { $in: pilotIds },
        status: "rejected"
      }).sort({ createdAt: -1 });
    },

    getSellerCompletedPilotBookings: async (_, { sellerId }) => {
      const pilots = await HirePilot.find({ sellerId });
      const pilotIds = pilots.map(p => p.pilotId);

      return await PilotBooking.find({
        pilotId: { $in: pilotIds },
        status: "completed"
      }).sort({ createdAt: -1 });
    },

    getBuyerPendingPilotBookings: async (_, { buyerId }) =>
      await PilotBooking.find({
        buyerId,
        status: "pending",
        $or: [
          { buyerDeleted: false },
          { buyerDeleted: { $exists: false } }
        ]
      }).sort({ createdAt: -1 }),


    getBuyerApprovedPilotBookings: async (_, { buyerId }) =>
      await PilotBooking.find({
        buyerId,
        status: { $in: ["approved", "completed"] },
        $or: [
          { buyerDeleted: false },
          { buyerDeleted: { $exists: false } }
        ]
      }).sort({ createdAt: -1 }),


    getBuyerRejectedPilotBookings: async (_, { buyerId }) =>
      await PilotBooking.find({ buyerId, status: "rejected" })
        .sort({ createdAt: -1 }),

    getBuyerCompletedPilotBookings: async (_, { buyerId }) =>
      await PilotBooking.find({ buyerId, status: "completed" })
        .sort({ createdAt: -1 }),

    getAllPilotBookings: async () => {
      return await PilotBooking.find().sort({ createdAt: -1 });
    },

  },

  Mutation: {
    bookPilot: async (_, { input }, { user }) => {
      try {
        // 1️⃣ Find pilot
        const pilot = await HirePilot.findOne({ pilotId: input.pilotId });
        if (!pilot) throw new Error("Pilot not found");

        // 2️⃣ Prevent duplicate booking
        const existingBooking = await PilotBooking.findOne({
          buyerId: String(input.buyerId),
          pilotId: String(input.pilotId),
          date: String(input.date),
          startTime: String(input.startTime),
          endTime: String(input.endTime),
          status: { $in: ["pending", "approved"] },
        });

        if (existingBooking) {
          return {
            success: false,
            message: "You have already booked this pilot for the selected date and time.",
            booking: null,
          };
        }

        // 3️⃣ Fetch buyer
        const buyer = await Buyer.findOne({ buyerId: input.buyerId });

        // ✅ 4️⃣ Fetch seller WITH fcmTokens (FIX)
        const seller = await Seller.findOne({ customId: pilot.sellerId })
          .select("email phoneNumber name fcmTokens");

        // 5️⃣ Create booking
        const booking = new PilotBooking({
          pilotId: String(pilot.pilotId),
          pilotName: String(pilot.pilotName),
          pilotCompany: String(pilot.pilotCompany),

          buyerId: String(input.buyerId),
          buyerName: String(input.buyerName),
          buyerEmail: String(input.buyerEmail),

          contact: String(input.contact),
          location: String(input.location),

          date: String(input.date),
          startTime: String(input.startTime),
          endTime: String(input.endTime),

          sellerId: String(pilot.sellerId),
          sellerEmail: seller?.email,
          sellerName: seller?.name,
          sellerPhone: seller?.phoneNumber,

          status: "pending",
          createdAt: new Date(),
        });

        await booking.save();

        // ======================
        // 🔔 SELLER NOTIFICATION
        // ======================
        if (seller?.fcmTokens?.length > 0) {
          await sendSellerPush(
            seller.fcmTokens,
            "New Pilot Booking",
            `${input.buyerName} booked pilot ${pilot.pilotName}`,
            {
              bookingId: booking.bookingId,
              pilotId: pilot.pilotId,
              type: "pilot_booking_new",
            }
          );
        }

        // ======================
        // 🔔 BUYER NOTIFICATION
        // ======================
        if (buyer?.fcmTokens?.length > 0) {
          await sendBuyerPush(
            buyer.fcmTokens,
            "Pilot Booking Submitted",
            `Your booking for pilot ${pilot.pilotName} is pending approval.`,
            {
              bookingId: booking.bookingId,
              type: "pilot_booking_pending",
            }
          );
        }

        // 6️⃣ Success
        return {
          success: true,
          message: "Pilot booked successfully!",
          booking,
        };

      } catch (error) {
        console.error("Error in bookPilot:", error);
        return {
          success: false,
          message: "Something went wrong while booking the pilot",
          booking: null,
        };
      }
    },



    updatePilotBookingStatus: async (_, { bookingId, status }) => {
      const valid = ["pending", "approved", "rejected", "completed"];
      if (!valid.includes(status)) throw new Error("Invalid status");

      const updated = await PilotBooking.findOneAndUpdate(
        { bookingId },
        { status },
        { new: true }
      );

      if (!updated) throw new Error("Booking not found");

      const buyer = await Buyer.findOne({ buyerId: updated.buyerId });
      const seller = await Seller.findOne({ customId: updated.sellerId });


      if (buyer?.fcmTokens) {
        if (status === "approved") {
          await sendBuyerPush(
            buyer.fcmTokens,
            "Pilot Booking Approved ✅",
            `Your pilot booking (${bookingId}) has been approved.`,
            { bookingId, type: "pilot_booking_approved" }
          );
        }

        if (status === "rejected") {
          await sendBuyerPush(
            buyer.fcmTokens,
            "Pilot Booking Rejected ❌",
            `Your pilot booking (${bookingId}) was rejected.`,
            { bookingId, type: "pilot_booking_rejected" }
          );
        }

        if (status === "completed") {
          await sendBuyerPush(
            buyer.fcmTokens,
            "Pilot Booking Completed 🎉",
            `Your pilot booking (${bookingId}) is completed.`,
            { bookingId, type: "pilot_booking_completed" }
          );
        }

        if (status === "pending") {
          await sendBuyerPush(
            buyer.fcmTokens,
            "Pilot Booking Under Review",
            `Your pilot booking (${bookingId}) is under review.`,
            { bookingId, type: "pilot_booking_pending" }
          );
        }
      }


      if (seller?.fcmTokens?.length) {
        await sendSellerPush(
          seller.fcmTokens,
          `Pilot Booking ${status.toUpperCase()}`,
          `Booking (${bookingId}) is now ${status}.`,
          { bookingId, type: "pilot_booking_status" }
        );
      }

      return updated;
    },

    deletePilotBookingByBuyer: async (_, { bookingId, buyerId }) => {
      const booking = await PilotBooking.findOne({ bookingId });

      if (!booking) {
        return { success: false, message: "Booking not found" };
      }

      if (booking.buyerId !== buyerId) {
        return { success: false, message: "Unauthorized" };
      }

      if (booking.status !== "pending") {
        return {
          success: false,
          message: "Only pending bookings can be deleted",
        };
      }

      booking.buyerDeleted = true;
      booking.sellerDeleted = true;
      await booking.save();

      return {
        success: true,
        message: "Booking removed successfully",
      };
    },
  },
};