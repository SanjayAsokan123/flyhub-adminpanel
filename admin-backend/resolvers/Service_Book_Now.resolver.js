// import { ServiceBooking } from "../models/Service_Book_Now.model.js";
// import {Buyer} from "../models/Buyer.model.js";
// export const ServiceBookingResolvers = {
//   Query: {
//     async getAllContacts(_, { page = 1, limit = 10, status, sortBy = "-date" }) {
//       try {
//         const skip = (page - 1) * limit;
//         let query = {};

//         if (status) query.status = status;

//         const bookings = await ServiceBooking.find(query)
//           .sort(sortBy)
//           .skip(skip)
//           .limit(limit);

//         const total = await ServiceBooking.countDocuments(query);
//         const pages = Math.ceil(total / limit);

//         return {
//           success: true,
//           message: "Service bookings fetched",
//           data: bookings,
//           total,
//           page,
//           pages,
//         };
//       } catch (err) {
//         return {
//           success: false,
//           message: err.message,
//           data: [],
//           total: 0,
//           page,
//           pages: 0,
//         };
//       }
//     },

//     getContactById: async (_, { id }) => {
//       const booking = await ServiceBooking.findById(id);
//       if (!booking) throw new Error("Service booking not found");
//       return booking;
//     },

//     getContactsBySellerId: async (_, { sellerId }) => {
//       return await ServiceBooking.find({ sellerId }).sort("-date");
//     },

//     getContactsByEmail: async (_, { email }) => {
//       return await ServiceBooking.find({ email: email.toLowerCase() });
//     },

//     getContactsByStatus: async (_, { status }) => {
//       return await ServiceBooking.find({ status }).sort("-date");
//     },

//     getConfirmedContact: async (_,{ buyerId }) =>
//       ServiceBooking.find({ status: "confirmed", buyerId })
//         .sort({ createdAt: -1 }),

//     getPendingContact: async (_,{ buyerId }) =>
//       ServiceBooking.find({ status: "pending", buyerId })
//         .sort({ createdAt: -1 }),

//     getCancelledContact: async (_,{ buyerId }) =>
//       ServiceBooking.find({ status: "cancelled", buyerId })
//         .sort({ createdAt: -1 }),


//       getBuyerfirebaseUidInServiceBooking: async (_, { firebaseUid }) => {
//                           const buyer = await Buyer.findOne({ firebaseUid });

//                           if (!buyer) {
//                             throw new Error("Buyer not found");
//                             console.log('buyer not found');
//                           }

//                           return buyer;
//                         },
//   },

//   Mutation: {
//     async createContact(_, { input }) {
//       try {
//         let buyer = null;
//         if (input.buyerId) {
//           buyer = await Buyer.findOne({ buyerId: input.buyerId }).select("buyerId");
//           if (!buyer) throw new Error("Invalid buyerId");
//         }

//         const newBooking = new ServiceBooking({
//           ...input,
//           buyerId: input.buyerId,
//           email: input.email.toLowerCase(),
//           date: input.date ? new Date(input.date) : new Date(),
//           status: "pending",
//         });

//         const saved = await newBooking.save();

//         return {
//           success: true,
//           message: "Service booking created successfully",
//           data: saved,
//         };
//       } catch (err) {
//         return {
//           success: false,
//           message: err.message,
//           data: null,
//           errors: [err.message],
//         };
//       }
//     },

//     async updateContactStatus(_, { id, status }) {
//       try {
//         const updated = await ServiceBooking.findByIdAndUpdate(
//           id,
//           { status },
//           { new: true }
//         );

//         if (!updated) throw new Error("Service booking not found");

//         return {
//           success: true,
//           message: "Status updated",
//           data: updated,
//         };
//       } catch (err) {
//         return {
//           success: false,
//           message: err.message,
//           data: null,
//         };
//       }
//     },

//     async updateContact(_, { id, input }) {
//       try {
//         const updateData = { ...input };

//         if (input.email) updateData.email = input.email.toLowerCase();

//         const updated = await ServiceBooking.findByIdAndUpdate(
//           id,
//           updateData,
//           { new: true }
//         );

//         if (!updated) throw new Error("Service booking not found");

//         return {
//           success: true,
//           message: "Updated successfully",
//           data: updated,
//         };
//       } catch (err) {
//         return {
//           success: false,
//           message: err.message,
//           data: null,
//         };
//       }
//     },

//     async deleteContact(_, { id }) {
//       try {
//         await ServiceBooking.findByIdAndDelete(id);

//         return {
//           success: true,
//           message: "Service booking deleted",
//           deletedId: id,
//         };
//       } catch (err) {
//         return {
//           success: false,
//           message: err.message,
//           deletedId: null,
//         };
//       }
//     },
//   },
// };


import { ServiceBooking } from "../models/Service_Book_Now.model.js";
import { Buyer } from "../models/Buyer.model.js";

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

        return list.map(b => ({ ...b, id: b._id.toString() }));
      } catch (err) {
        throw new Error(err.message);
      }
    },

    async getConfirmedContact(_, { buyerId }) {
      try {
        const list = await ServiceBooking.find({
          status: "confirmed",
          buyerId
        })
          .sort({ createdAt: -1 })
          .lean();

        return list.map(b => ({ ...b, id: b._id.toString() }));
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

        return list.map(b => ({ ...b, id: b._id.toString() }));
      } catch (err) {
        throw new Error(err.message);
      }
    },

    async getCancelledContact(_, { buyerId }) {
      try {
        const list = await ServiceBooking.find({
          status: "cancelled",
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

    async updateContactStatus(_, { id, status }) {
      try {
        const updated = await ServiceBooking.findByIdAndUpdate(
          id,
          { status },
          { new: true }
        ).lean();

        if (!updated) throw new Error("Service booking not found");

        return {
          success: true,
          message: "Status updated",
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
    }
  }
};