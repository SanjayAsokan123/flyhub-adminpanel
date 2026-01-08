import { PilotBooking } from "../models/Pilot_Booking.model.js";
import { HirePilot } from "../models/Hirepilot.model.js";
import { BuyerPilot } from "../models/BuyerPilot.model.js";
import { Buyer } from "../models/Buyer.model.js";
import { Seller } from "../models/Seller.model.js";
import { sendPushNotification as sendBuyerPush } from "../utils/pushNotification.js";
import { sendPushNotification as sendSellerPush } from "../utils/SendPushNotification.js";

export const pilotBookingResolvers = {
  Query: {

    getSellerPilotBookings: async (_, { sellerId, status }) => {
      let query = {
        $or: [

          { sellerId, pilotType: "seller" },
          { buyerId: sellerId, pilotType: "buyer" },
        ]
      };
      if (status && status !== "all") {
        query.status = status;
      }
      return await PilotBooking.find(query)
        .sort({ createdAt: -1 });
    },


    getSellerPilotBookingsByPilot: async (_, { sellerId, pilotId, status }) => {
      const query = {
        sellerId,
        pilotId,
        pilotType: "seller"
      };

      if (status && status !== "all") {
        query.status = status;
      }

      return await PilotBooking.find(query)
        .sort({ createdAt: -1 });
    },


    getBuyerPilotBookings: async (_, { buyerId, status, role = "booker" }) => {
      let query = {};

      if (role === "booker") {

        query = { buyerId };
      } else if (role === "owner") {

        query = { pilotOwnerId: buyerId, pilotType: "buyer" };
      } else {

        query = {
          $or: [
            { buyerId },
            { pilotOwnerId: buyerId, pilotType: "buyer" }
          ]
        };
      }

      if (status && status !== "all") {
        query.status = status;
      }


      query.$or = [
        { buyerDeleted: false },
        { buyerDeleted: { $exists: false } }
      ];

      return await PilotBooking.find(query)
        .sort({ createdAt: -1 });
    },


    getSellerPendingPilotBookings: async (_, { sellerId }) => {
      const pilots = await HirePilot.find({ sellerId });
      const pilotIds = pilots.map(p => p.pilotId);

      return await PilotBooking.find({
        pilotId: { $in: pilotIds },
        pilotType: "seller",
        status: "pending",
        $or: [
          { ownerDeleted: false },
          { ownerDeleted: { $exists: false } }
        ]
      }).sort({ createdAt: -1 });
    },

    getSellerApprovedPilotBookings: async (_, { sellerId }) => {
      const pilots = await HirePilot.find({ sellerId });
      const pilotIds = pilots.map(p => p.pilotId);

      return await PilotBooking.find({
        pilotId: { $in: pilotIds },
        pilotType: "seller",
        status: "approved"
      }).sort({ createdAt: -1 });
    },

    getSellerRejectedPilotBookings: async (_, { sellerId }) => {
      const pilots = await HirePilot.find({ sellerId });
      const pilotIds = pilots.map(p => p.pilotId);

      return await PilotBooking.find({
        pilotId: { $in: pilotIds },
        pilotType: "seller",
        status: "rejected"
      }).sort({ createdAt: -1 });
    },

    getSellerCompletedPilotBookings: async (_, { sellerId }) => {
      const pilots = await HirePilot.find({ sellerId });
      const pilotIds = pilots.map(p => p.pilotId);

      return await PilotBooking.find({
        pilotId: { $in: pilotIds },
        pilotType: "seller",
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


    // In pilotBookingResolvers.js - Update this query:
    getBuyerPilotOwnerBookings: async (_, { buyerId, status }) => {
      const query = {
        pilotOwnerId: buyerId,
        pilotType: "buyer",
        buyerDeleted: false
      };

      if (status && status !== "all") {
        query.status = status;
      }

      return await PilotBooking.find(query)
        .sort({ createdAt: -1 });
    },
    getBuyerSpecificPilotBookings: async (_, { buyerId, status }) => {
      let query = {
        buyerId: buyerId,
        pilotType: "buyer"  // Only show buyer pilots
      };

      if (status && status !== "all") {
        query.status = status;
      }

      // Exclude soft-deleted bookings
      query.$or = [
        { buyerDeleted: false },
        { buyerDeleted: { $exists: false } }
      ];

      return await PilotBooking.find(query).sort({ createdAt: -1 });
    },

    // Get buyer pilot bookings for a specific buyer as owner
    getBuyerPilotOwnerSpecificBookings: async (_, { buyerId, status }) => {
      let query = {
        pilotOwnerId: buyerId,
        pilotType: "buyer"  // Only show buyer pilots
      };

      if (status && status !== "all") {
        query.status = status;
      }

      return await PilotBooking.find(query).sort({ createdAt: -1 });
    },
    getAllPilotBookings: async () => {
      return await PilotBooking.find().sort({ createdAt: -1 });
    },


    getPilotBookingStats: async (_, { userId, userType }) => {
      let query = {};

      if (userType === "seller") {
        query = {
          $or: [
            { sellerId: userId, pilotType: "seller" },
            { buyerId: userId, pilotType: "buyer" }
          ]
        };
      } else if (userType === "buyer") {
        query = {
          $or: [
            { buyerId: userId },
            { pilotOwnerId: userId, pilotType: "buyer" }
          ]
        };
      }

      const bookings = await PilotBooking.find(query);

      return {
        total: bookings.length,
        pending: bookings.filter(b => b.status === "pending").length,
        approved: bookings.filter(b => b.status === "approved").length,
        rejected: bookings.filter(b => b.status === "rejected").length,
        completed: bookings.filter(b => b.status === "completed").length,
        cancelled: bookings.filter(b => b.status === "cancelled").length,
      };
    },
  },

  Mutation: {


    bookPilot: async (_, { input }, { user }) => {
      try {
        const {
          pilotId,
          buyerId,
          buyerName,
          buyerEmail,
          contact,
          location,
          date,
          startTime,
          endTime,
          pilotType = "seller"
        } = input;

        console.log("🔍 BookPilot Request Received:", {
          pilotId,
          buyerId,
          buyerName,
          pilotType,
          date,
          startTime,
          endTime
        });

        let pilot, pilotOwner, pilotOwnerId, pilotOwnerType;
        let sellerId = null;
        let seller = null;
        let buyerPilotOwner = null;
        if (pilotType === "buyer" && buyerPilotOwner) {
          booking.pilotOwnerName = buyerPilotOwner.name;
          booking.pilotOwnerPhone = buyerPilotOwner.phoneNumber;
        }

        if (pilotType === "seller") {
          console.log("📋 Searching for SELLER pilot with ID:", pilotId);

          pilot = await HirePilot.findOne({
            pilotId: pilotId,
            adminStatus: "approved"
          });

          if (!pilot) {
            throw new Error(`Seller pilot not found or not approved (ID: ${pilotId})`);
          }

          console.log("✅ Found seller pilot:", pilot.pilotName);

          pilotOwner = await Seller.findOne({ customId: pilot.sellerId })
            .select("email phoneNumber name fcmTokens");

          if (!pilotOwner) {
            throw new Error("Pilot owner (seller) information not found");
          }

          pilotOwnerId = pilot.sellerId;
          pilotOwnerType = "seller";
          sellerId = pilot.sellerId;
          seller = pilotOwner;

        } else if (pilotType === "buyer") {
          console.log("📋 Searching for BUYER pilot with ID:", pilotId);


          pilot = await BuyerPilot.findOne({
            $or: [
              { buyerPilotId: pilotId },
              { pilotId: pilotId }
            ],
            adminStatus: "approved"
          });

          if (!pilot) {
            console.error("❌ Buyer pilot not found. Searched for:", pilotId);
            throw new Error(`Buyer pilot not found or not approved (ID: ${pilotId})`);
          }

          console.log("✅ Found buyer pilot:", pilot.pilotName);


          pilotOwner = await Buyer.findOne({
            buyerId: pilot.buyerId
          }).select("email name phoneNumber fcmTokens");

          if (!pilotOwner) {
            throw new Error("Pilot owner (buyer) information not found");
          }

          pilotOwnerId = pilot.buyerId;
          pilotOwnerType = "buyer";
          buyerPilotOwner = pilotOwner;

        } else {
          throw new Error("Invalid pilot type. Must be 'seller' or 'buyer'");
        }


        if (pilot.adminStatus !== "approved") {
          throw new Error(`Pilot is not approved for booking. Current status: ${pilot.adminStatus}`);
        }


        const existingBooking = await PilotBooking.findOne({
          buyerId: buyerId,
          pilotId: pilotId,
          date: date,
          startTime: startTime,
          endTime: endTime,
          status: { $in: ["pending", "approved"] },
        });

        if (existingBooking) {
          return {
            success: false,
            message: "You have already booked this pilot for the selected date and time.",
            booking: null,
          };
        }


        const buyer = await Buyer.findOne({
          buyerId: buyerId
        });

        if (!buyer) {
          console.error("❌ Buyer not found with buyerId:", buyerId);
          throw new Error(`Buyer profile not found (ID: ${buyerId})`);
        }

        console.log("✅ Found booking buyer:", buyer.name);


        console.log("📝 Creating booking record...");

        const booking = new PilotBooking({
          pilotId: pilotId,
          pilotName: pilot.pilotName || "Unknown Pilot",
          pilotCompany: pilot.pilotCompany || "",
          pilotType: pilotType,

          buyerId: buyerId,
          buyerName: buyerName,
          buyerEmail: buyerEmail,

          contact: contact,
          location: location,

          date: date,
          startTime: startTime,
          endTime: endTime,


          sellerId: sellerId,
          sellerEmail: seller?.email,
          sellerName: seller?.name,
          sellerPhone: seller?.phoneNumber,


          pilotOwnerId: pilotOwnerId,
          pilotOwnerType: pilotOwnerType,

          status: "pending",
          createdAt: new Date(),
        });

        await booking.save();

        console.log("✅ Booking created with ID:", booking.bookingId);


        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(`${date}T${endTime}`);
        const durationHours = (endDateTime - startDateTime) / (1000 * 60 * 60);
        const hourlyRate = pilot.price?.perHour || 0;

        booking.totalAmount = durationHours * hourlyRate;
        booking.duration = durationHours;
        await booking.save();


        console.log("🔔 Sending notifications...");

        if (pilotType === "seller" && seller?.fcmTokens?.length > 0) {
          await sendSellerPush(
            seller.fcmTokens,
            "✈️ New Pilot Booking",
            `${buyerName} booked your pilot ${pilot.pilotName} for ${date} (${startTime}-${endTime})`,
            {
              bookingId: booking.bookingId,
              pilotId: pilotId,
              pilotType: "seller",
              type: "pilot_booking_new",
            }
          );
          console.log("📤 Seller notification sent");
        }

        if (pilotType === "buyer" && buyerPilotOwner?.fcmTokens?.length > 0) {
          await sendBuyerPush(
            buyerPilotOwner.fcmTokens,
            "✈️ New Booking for Your Pilot",
            `${buyerName} booked your pilot ${pilot.pilotName} for ${date} (${startTime}-${endTime})`,
            {
              bookingId: booking.bookingId,
              pilotId: pilotId,
              pilotType: "buyer",
              type: "pilot_booking_new",
            }
          );
          console.log("📤 Buyer pilot owner notification sent");
        }


        if (buyer?.fcmTokens?.length > 0) {
          await sendBuyerPush(
            buyer.fcmTokens,
            "✅ Pilot Booking Submitted",
            `Your booking for ${pilot.pilotName} on ${date} (${startTime}-${endTime}) is pending approval.`,
            {
              bookingId: booking.bookingId,
              type: "pilot_booking_pending",
            }
          );
          console.log("📤 Booker notification sent");
        }


        console.log("🎉 Booking completed successfully!");

        return {
          success: true,
          message: "Pilot booked successfully! The pilot owner will review your request.",
          booking: {
            bookingId: booking.bookingId,
            pilotName: pilot.pilotName,
            date: booking.date,
            startTime: booking.startTime,
            endTime: booking.endTime,
            status: booking.status,
            totalAmount: booking.totalAmount,
          },
        };

      } catch (error) {
        console.error("❌ Error in bookPilot:", {
          error: error.message,
          stack: error.stack,
          input: input
        });

        return {
          success: false,
          message: error.message || "Something went wrong while booking the pilot. Please try again.",
          booking: null,
        };
      }
    },
    updatePilotBookingStatus: async (_, { input }, { user }) => {
      const { bookingId, status, userType, userId } = input;

      const valid = ["pending", "approved", "rejected", "completed", "cancelled"];
      if (!valid.includes(status)) throw new Error("Invalid status");

      const booking = await PilotBooking.findOne({ bookingId });
      if (!booking) throw new Error("Booking not found");

      // Authorization logic
      if (booking.pilotType === "seller") {
        if (userType !== "seller" || booking.sellerId !== userId) {
          throw new Error("Unauthorized: Only the pilot owner can update this booking");
        }
      } else if (booking.pilotType === "buyer") {
        if (booking.pilotOwnerId !== userId) {
          throw new Error("Unauthorized: Only the pilot owner can update this booking");
        }
      }

      const updated = await PilotBooking.findOneAndUpdate(
        { bookingId },
        { status },
        { new: true }
      );

      // Send notifications
      const buyer = await Buyer.findOne({ buyerId: updated.buyerId });

      let pilotOwner = null;
      if (updated.pilotType === "seller") {
        pilotOwner = await Seller.findOne({ customId: updated.sellerId });
      } else if (updated.pilotType === "buyer") {
        pilotOwner = await Buyer.findOne({ buyerId: updated.pilotOwnerId });
      }

      if (buyer?.fcmTokens?.length > 0) {
        let title = "Pilot Booking Updated";
        let message = `Your pilot booking (${bookingId}) status has been updated to ${status}.`;

        if (status === "approved") {
          title = "Pilot Booking Approved ✅";
          message = `Your pilot booking (${bookingId}) has been approved.`;
        } else if (status === "rejected") {
          title = "Pilot Booking Rejected ❌";
          message = `Your pilot booking (${bookingId}) was rejected.`;
        } else if (status === "completed") {
          title = "Pilot Booking Completed 🎉";
          message = `Your pilot booking (${bookingId}) is completed.`;
        } else if (status === "cancelled") {
          title = "Pilot Booking Cancelled";
          message = `Your pilot booking (${bookingId}) has been cancelled.`;
        }

        await sendBuyerPush(
          buyer.fcmTokens,
          title,
          message,
          { bookingId, type: `pilot_booking_${status}` }
        );
      }

      if (pilotOwner?.fcmTokens?.length > 0) {
        const pushMethod = updated.pilotType === "seller" ? sendSellerPush : sendBuyerPush;

        await pushMethod(
          pilotOwner.fcmTokens,
          `Pilot Booking ${status.toUpperCase()}`,
          `Booking (${bookingId}) is now ${status}.`,
          { bookingId, type: "pilot_booking_status_update" }
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

      if (!["pending", "approved"].includes(booking.status)) {
        return {
          success: false,
          message: "Only pending or approved bookings can be deleted",
        };
      }

      booking.buyerDeleted = true;
      await booking.save();


      let pilotOwner = null;
      if (booking.pilotType === "seller") {
        pilotOwner = await Seller.findOne({ customId: booking.sellerId });
      } else if (booking.pilotType === "buyer") {
        pilotOwner = await Buyer.findOne({ buyerId: booking.pilotOwnerId });
      }

      if (pilotOwner?.fcmTokens?.length > 0) {
        const pushMethod = booking.pilotType === "seller" ? sendSellerPush : sendBuyerPush;

        await pushMethod(
          pilotOwner.fcmTokens,
          "Booking Cancelled",
          `Booking (${bookingId}) has been cancelled by the buyer.`,
          { bookingId, type: "pilot_booking_cancelled" }
        );
      }

      return {
        success: true,
        message: "Booking cancelled successfully",
      };
    },

    deletePilotBookingByOwner: async (_, { bookingId, ownerId, pilotType }) => {
      const booking = await PilotBooking.findOne({ bookingId });

      if (!booking) {
        return { success: false, message: "Booking not found" };
      }

      if (pilotType === "seller" && booking.sellerId !== ownerId) {
        return { success: false, message: "Unauthorized" };
      }

      if (pilotType === "buyer" && booking.pilotOwnerId !== ownerId) {
        return { success: false, message: "Unauthorized" };
      }

      booking.ownerDeleted = true;
      await booking.save();


      const buyer = await Buyer.findOne({ buyerId: booking.buyerId });
      if (buyer?.fcmTokens?.length > 0) {
        await sendBuyerPush(
          buyer.fcmTokens,
          "Booking Cancelled",
          `Your pilot booking (${bookingId}) has been cancelled by the pilot owner.`,
          { bookingId, type: "pilot_booking_owner_cancelled" }
        );
      }

      return {
        success: true,
        message: "Booking removed successfully",
      };
    },
  },
};
