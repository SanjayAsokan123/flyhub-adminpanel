import { ServiceBooking } from "../models/Service_Book_Now.model.js";
import { Buyer } from "../models/Buyer.model.js";
import { Seller } from "../models/Seller.model.js";
import { Service } from "../models/Service.model.js";


export const ServiceBookingResolvers = {
  Query: {
    async getAllContacts(_, { page = 1, limit = 10, status, sortBy = "-date" }) {
      try {
        const skip = (page - 1) * limit;
        let query = {};

        if (status) query.status = status;

        let bookings = await ServiceBooking.find(query)
          .sort(sortBy)
          .skip(skip)
          .limit(limit)
          .lean();

        // 🔥 ADD id field for GraphQL
        bookings = bookings.map(b => ({
          ...b,
          id: b._id.toString(),
        }));

        const total = await ServiceBooking.countDocuments(query);
        const pages = Math.ceil(total / limit);

        return {
          success: true,
          message: "Service bookings fetched",
          data: bookings,
          total,
          page,
          pages
        };
      } catch (err) {
        console.error("getAllContacts error:", err);
        return {
          success: false,
          message: err.message,
          data: [],
          total: 0,
          page,
          pages: 0
        };
      }
    },

    async getContactById(_, { id }) {
      try {
        const booking = await ServiceBooking.findById(id).lean();
        if (!booking) throw new Error("Service booking not found");

        return { ...booking, id: booking._id.toString() };
      } catch (err) {
        throw new Error(err.message);
      }
    },

    async getContactsBySellerId(_, { sellerId }) {
      try {
        const list = await ServiceBooking.find({ sellerId })
          .sort({ createdAt: -1 })
          .lean();

        return list.map(b => ({ ...b, id: b._id.toString() }));
      } catch (err) {
        throw new Error(err.message);
      }
    },

    async getContactsByEmail(_, { email }) {
      try {
        const list = await ServiceBooking.find({
          email: email.toLowerCase()
        }).lean();

        return list.map(b => ({ ...b, id: b._id.toString() }));
      } catch (err) {
        throw new Error(err.message);
      }
    },

    async getContactsByStatus(_, { status }) {
      try {
        const list = await ServiceBooking.find({ status })
          .sort({ createdAt: -1 })
          .lean();

        return list.map(b => ({ ...b, id: b._id.toString(), serviceBookingId: b.serviceBookingId }));
      } catch (err) {
        throw new Error(err.message);
      }
    },

    async getConfirmedContact(_, { buyerId }) {
      try {
        // 1️⃣ Fetch approved bookings
        const bookings = await ServiceBooking.find({
          status: "approved",
          buyerId
        }).lean();

        if (!bookings.length) return [];

        // 2️⃣ Extract seller customIds
        const sellerCustomIds = bookings
          .map(b => b.sellerId)
          .filter(Boolean);

        // 3️⃣ Fetch sellers using customId
        const sellers = await Seller.find({
          customId: { $in: sellerCustomIds }
        })
          .select("customId name phoneNumber")
          .lean();

        // 4️⃣ Create lookup map
        const sellerMap = {};
        sellers.forEach(s => {
          sellerMap[s.customId] = s;
        });

        // 5️⃣ Merge data (RETURN ALL REQUIRED GRAPHQL FIELDS)
        return bookings.map(b => ({
          name: b.name,
          email: b.email,
          location: b.location,
          information: b.information,
          status: b.status,

          phone: b.phone,
          date: b.date,
          buyerId: b.buyerId,
          sellerId: b.sellerId,
          serviceId: b.serviceId,
          serviceBookingId: b.serviceBookingId,
          createdAt: b.createdAt,

          Seller: sellerMap[b.sellerId]
            ? {
              name: sellerMap[b.sellerId].name,
              phoneNumber: sellerMap[b.sellerId].phoneNumber
            }
            : {
              name: "N/A",
              phoneNumber: "N/A"
            }
        }));

      } catch (err) {
        throw new Error(err.message);
      }
    },




    async getPendingContact(_, { buyerId }) {
      try {
        const list = await ServiceBooking.find({
          status: "pending",
          buyerId
        })
          .sort({ createdAt: -1 })
          .lean();

        return list.map(b => ({ ...b, id: b._id.toString(), serviceBookingId: b.serviceBookingId }));
      } catch (err) {
        throw new Error(err.message);
      }
    },

    async getCancelledContact(_, { buyerId }) {
      try {
        const list = await ServiceBooking.find({
          status: "rejected",
          buyerId
        })
          .sort({ createdAt: -1 })
          .lean();

        return list.map(b => ({ ...b, id: b._id.toString() }));
      } catch (err) {
        throw new Error(err.message);
      }
    },

    async getBuyerfirebaseUidInServiceBooking(_, { firebaseUid }) {
      try {
        const buyer = await Buyer.findOne({ firebaseUid });
        if (!buyer) throw new Error("Buyer not found");

        return buyer;
      } catch (err) {
        throw new Error(err.message);
      }
    }
  },

  Mutation: {
    async createContact(_, { input }) {
      try {
        if (!input.buyerId) throw new Error("buyerId is required");
        if (!input.sellerId) throw new Error("sellerId is required");
        if (!input.serviceId) throw new Error("serviceId is required");

        const buyer = await Buyer.findOne({ buyerId: input.buyerId }).select("buyerId");
        if (!buyer) throw new Error("Invalid buyerId");

        const newBooking = new ServiceBooking({
          ...input,
          email: input.email?.toLowerCase(),
          date: input.date ? new Date(input.date) : new Date(),
          status: "pending"
        });

        const saved = await newBooking.save();
        const result = saved.toObject();

        return {
          success: true,
          message: "Service booking created successfully",
          data: {
            ...result,
            id: result._id.toString()
          }
        };
      } catch (err) {
        return {
          success: false,
          message: err.message,
          data: null,
          errors: [err.message]
        };
      }
    },

    async updateContactStatus(_, { serviceBookingId, status }) {
      try {
        const updated = await ServiceBooking.findOneAndUpdate(
          { serviceBookingId },
          { status },
          { new: true }
        ).lean();

        if (!updated) {
          throw new Error("Service booking not found");
        }

        return {
          success: true,
          message: "Status updated successfully",
          serviceBookingId: updated.serviceBookingId,
          status: updated.status,
        };
      } catch (err) {
        return {
          success: false,
          message: err.message,
          serviceBookingId: null,
          status: null,
        };
      }
    },


    async updateContact(_, { id, input }) {
      try {
        const updateData = { ...input };
        if (input.email) updateData.email = input.email.toLowerCase();

        const updated = await ServiceBooking.findByIdAndUpdate(
          id,
          updateData,
          { new: true }
        ).lean();

        if (!updated) throw new Error("Service booking not found");

        return {
          success: true,
          message: "Updated successfully",
          data: { ...updated, id: updated._id.toString() }
        };
      } catch (err) {
        return {
          success: false,
          message: err.message,
          data: null
        };
      }
    },

    async deleteContact(_, { serviceBookingId }) {
      try {
        await ServiceBooking.findByIdAndDelete(serviceBookingId);

        return {
          success: true,
          message: "Service booking deleted",
          deletedId: serviceBookingId
        };
      } catch (err) {
        return {
          success: false,
          message: err.message,
          deletedId: null
        };
      }
    },
    async deleteServiceBookingContact(_, { serviceBookingId }) {
      try {
        const deletedBooking = await ServiceBooking.findOneAndDelete({
          serviceBookingId,
          status: "pending"
        });

        if (!deletedBooking) {
          throw new Error("Booking not found or not in pending state");
        }
        return {
          success: true,
          message: "Service booking deleted",
          deletedId: serviceBookingId
        };
      } catch (err) {
        return {
          success: false,
          message: err.message,
          deletedId: null
        };
      }
    },
  }
};