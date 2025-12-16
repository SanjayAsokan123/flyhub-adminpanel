import { PilotBooking } from "../models/Pilot_Booking.model.js";
import { HirePilot } from "../models/Hirepilot.model.js";
import { Buyer } from "../models/Buyer.model.js";
import { Seller } from "../models/Seller.model.js";

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
      await PilotBooking.find({ buyerId, status: "approved" })
        .sort({ createdAt: -1 }),

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
      const pilot = await HirePilot.findOne({ pilotId: input.pilotId });
      if (!pilot) throw new Error("Pilot not found");
      const seller = await Seller.findOne({ customId: pilot.sellerId }).select("email phoneNumber name");

      const booking = new PilotBooking({
        pilotId: pilot.pilotId,
        pilotName: pilot.pilotName,
        pilotCompany: pilot.pilotCompany,

        buyerId: input.buyerId,
        buyerName: input.buyerName,
        buyerEmail: input.buyerEmail,

        contact: input.contact,
        location: input.location,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        sellerId: pilot.sellerId,
        sellerEmail: seller?.email,
        sellerName: seller?.name,
        sellerPhone: seller?.phoneNumber,
        status: "pending",
      });

      await booking.save();

      return {
        success: true,
        message: "Pilot booked successfully!",
        booking,
      };
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