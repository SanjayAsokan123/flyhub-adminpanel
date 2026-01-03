import { BuyerPilotBooking } from "../models/BuyerPilotBooking.model.js";
import { Buyer } from "../models/Buyer.model.js";

export const buyerPilotBookingResolvers = {
  Query: {
    getBuyerPilotBookings: async (_, { buyerId }) => {
      return await BuyerPilotBooking.find({
        buyerId,
        bookerDeleted: false,
      }).sort({ createdAt: -1 });
    },

    getAllBuyerPilotBookings: async () => {
      return await BuyerPilotBooking.find().sort({ createdAt: -1 });
    },
  },

  Mutation: {
    bookBuyerPilot: async (_, { input }) => {
      try {
        const exists = await BuyerPilotBooking.findOne({
          buyerPilotId: input.buyerPilotId,
          buyerId: input.buyerId,
          date: input.date,
          startTime: input.startTime,
          endTime: input.endTime,
          status: { $in: ["pending", "approved"] },
        });

        if (exists) {
          return {
            success: false,
            message: "You already booked this pilot for this time slot",
            booking: null,
          };
        }
        const buyer = await Buyer.findOne({ buyerId: input.buyerId });
        if (!buyer) throw new Error("Buyer not found");
        const booking = new BuyerPilotBooking({
          buyerPilotId: input.buyerPilotId,

          buyerId: buyer.buyerId,
          buyerName: buyer.name,
          buyerEmail: buyer.email,
          buyerPhone: buyer.phoneNumber,

          contact: input.contact,
          location: input.location,
          date: input.date,
          startTime: input.startTime,
          endTime: input.endTime,
        });

        await booking.save();

        return {
          success: true,
          message: "Buyer pilot booked successfully",
          booking,
        };
      } catch (err) {
        console.error("bookBuyerPilot error:", err);
        return {
          success: false,
          message: "Failed to book buyer pilot",
          booking: null,
        };
      }
    },

    updateBuyerPilotBookingStatus: async (_, { buyerPilotBookingId, status }) => {
      const valid = ["pending", "approved", "rejected", "completed"];
      if (!valid.includes(status)) throw new Error("Invalid status");

      const booking = await BuyerPilotBooking.findOneAndUpdate(
        { buyerPilotBookingId },
        { status },
        { new: true }
      );

      if (!booking) throw new Error("Booking not found");
      return booking;
    },

    deleteBuyerPilotBooking: async (_, { buyerPilotBookingId, buyerId }) => {
      const booking = await BuyerPilotBooking.findOne({ buyerPilotBookingId });

      if (!booking) throw new Error("Booking not found");
      if (booking.buyerId !== buyerId) throw new Error("Unauthorized");

      booking.bookerDeleted = true;
      await booking.save();
      return true;
    },
  },
};
