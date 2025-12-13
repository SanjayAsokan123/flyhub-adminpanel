import DroneRental from "../models/Buyer_Booking_Drone_Rental.model.js";
import { Rental } from "../models/Rental.model.js";
import { Seller } from "../models/Seller.model.js";
import { Buyer } from "../models/Buyer.model.js";


export const droneRentalBookingResolvers = {
  Query: {
    getDroneRentalById: async (_, { drone_rental_id }) =>
      DroneRental.findOne({ drone_rental_id }),
    getAllDroneRentals: async () => {
      return await DroneRental.find({}).sort({ createdAt: -1 });
    },
    // getDroneRentalsBySellerId: async (_, { sellerId }) =>
    //   DroneRental.find({ sellerId }).sort({ createdAt: -1 }),
    getDroneRentalsByBuyerId: async (_, { buyerId }) =>
      DroneRental.find({ buyerId }).sort({ createdAt: -1 }),

    // getConfirmedDroneRentalsByBuyer: async (_, { buyerId }) => {
    //   return await DroneRental.find({ buyerId, status: "confirmed" });
    // },

    // getPendingDroneRentalsByBuyer: async (_, { buyerId }) => {
    //   return await DroneRental.find({ buyerId, status: "pending" });
    // },

    // getCancelledDroneRentalsByBuyer: async (_, { buyerId }) => {
    //   return await DroneRental.find({ buyerId, status: "cancelled" });
    // },

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
    createDroneRental: async (_, { name, phone, location, rentalDate, rentalId, buyerId }) => {
      const listing = await Rental.findOne({ rentalId });
      if (!listing) throw new Error("Invalid rentalId");

      const seller = await Seller.findOne({ customId: listing.sellerId }).select("email phoneNumber");
      const buyer = await Buyer.findOne({ buyerId: listing.buyerId }).select("buyerId");
      const newBooking = new DroneRental({
        name,
        phone,
        location,
        rentalDate: new Date(rentalDate),
        rentalId,
        sellerId: listing.sellerId,
        buyerId: buyerId,
        sellerEmail: seller?.email,
        sellerPhone: seller?.phoneNumber,
        status: "pending",
      });

      await newBooking.save();
      return newBooking;
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

  if (!rental) {
    return {
      success: false,
      message: "Booking not found",
    };
  }

  // 🔵 PENDING → remove from buyer + seller
  if (rental.status === "pending") {
    await DroneRental.deleteOne({ drone_rental_id });

    return {
      success: true,
      message: "Pending booking deleted successfully",
    };
  }

  // 🟢 CONFIRMED → remove from both + notify seller
  if (rental.status === "confirmed") {
    await DroneRental.deleteOne({ drone_rental_id });

    if (rental.sellerEmail) {
      await sendSellerStatusMail({
        to: rental.sellerEmail,
        productType: "Drone Rental",
        productName: rental.drone_rental_id,
        status: "Deleted by Buyer",
      });
    }

    return {
      success: true,
      message: "Booking deleted & seller notified",
    };
  }

  // 🔴 CANCELLED → hide only from buyer
  if (rental.status === "cancelled") {
    rental.buyerDeleted = true;
    await rental.save();

    return {
      success: true,
      message: "Removed from your bookings",
    };
  }

  return {
    success: false,
    message: "Invalid booking state",
  };
},


    updateDroneRentalStatus: async (_, { drone_rental_id, status }) => {
      const updated = await DroneRental.findOneAndUpdate(
        { drone_rental_id },
        { $set: { status } },
        { new: true, runValidators: true }
      );
      if (!updated) throw new Error(`Booking ${drone_rental_id} not found`);
      return updated;
    },
  },
};