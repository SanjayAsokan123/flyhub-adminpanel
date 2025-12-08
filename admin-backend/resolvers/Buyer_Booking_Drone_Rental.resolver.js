import DroneRental from "../models/Buyer_Booking_Drone_rental.model.js";
import { Rental } from "../models/Rental.model.js";
import { Seller } from "../models/Seller.model.js";
import { Buyer } from "../models/Buyer.model.js";


export const droneRentalBookingResolvers = {
  Query: {
    getDroneRentalById: async (_, { drone_rental_id }) =>
      DroneRental.findOne({ drone_rental_id }),
      getAllDroneRentals: async () => {
        return await DroneRental.find({}).sort({ createdAt: -1 }); },
    getDroneRentalsBySellerId: async (_, { sellerId }) =>
      DroneRental.find({ sellerId }).sort({ createdAt: -1 }),
  getDroneRentalsByBuyerId: async (_, { buyerId }) =>
    DroneRental.find({ buyerId }).sort({ createdAt: -1 }),

  getConfirmedDroneRentalsByBuyer: async (_, { buyerId }) => {
    return await DroneRental.find({ buyerId, status: "confirmed" });
  },

  getPendingDroneRentalsByBuyer: async (_, { buyerId }) => {
    return await DroneRental.find({ buyerId, status: "pending" });
  },

  getCancelledDroneRentalsByBuyer: async (_, { buyerId }) => {
    return await DroneRental.find({ buyerId, status: "cancelled" });
  },

  getBuyerfirebaseUidInDroneRental: async (_, { firebaseUid }) => {
                    // Find buyer using firebase UID
                    const buyer = await Buyer.findOne({ firebaseUid });

                    if (!buyer) {
                      throw new Error("Buyer not found");
                      console.log('buyer not found');
                    }

                    return buyer;   // 👈 return full buyer object
                  },

  },


  Mutation: {
    createDroneRental: async (_, { name, phone, location, rentalDate, rentalId ,buyerId }) => {
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
        buyerId:buyerId,
        sellerEmail: seller?.email ,
        sellerPhone: seller?.phoneNumber ,
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

    deleteDroneRental: async (_, { drone_rental_id }) => {
      const deleted = await DroneRental.findOneAndDelete({ drone_rental_id });
      if (!deleted) throw new Error(`Booking ${drone_rental_id} not found`);
      return deleted;
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