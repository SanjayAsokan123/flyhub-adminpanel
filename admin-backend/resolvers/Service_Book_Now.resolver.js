import { ServiceBooking } from "../models/Service_Book_Now.model.js";
import ServiceAlertSchema from "../models/Service_Alert_status.model.js";
import { Buyer } from "../models/Buyer.model.js";
import { Seller } from "../models/Seller.model.js";
import { Service } from "../models/Service.model.js";


import { sendPushNotification as sendBuyerPush } from "../utils/pushNotification.js";


import { sendPushNotification as sendSellerPush } from "../utils/SendPushNotification.js";

// Helper to send message to seller

function calculateServiceReminderTimes(serviceDate) {
  if (!serviceDate) return null;

  const bookingTime = new Date(serviceDate);

  // 🚫 invalid date protection
  if (isNaN(bookingTime.getTime())) return null;

  /* =====================================================
     PRODUCTION LOGIC (UNCOMMENT IN PROD)
  ===================================================== */

  const ownerReminderStartAt = new Date(bookingTime.getTime() - 3 * 60 * 60 * 1000);
  const ownerReminderEndAt   = new Date(bookingTime.getTime() - 1 * 60 * 60 * 1000);
  const userFallbackAt       = new Date(bookingTime.getTime() - 1 * 60 * 60 * 1000);

  /* =====================================================
     TEST LOGIC (FAST)
  ===================================================== */

  // const now = new Date();
  // const ownerReminderStartAt = new Date(now.getTime() + 1 * 60 * 1000);
  // const ownerReminderEndAt   = new Date(now.getTime() + 3 * 60 * 1000);
  // const userFallbackAt       = new Date(now.getTime() + 4 * 60 * 1000);

  return {
    ownerReminderStartAt,
    ownerReminderEndAt,
    userFallbackAt,

    ownerNotifyCount: 0,
    lastOwnerNotifiedAt: null,
    userNotified: false,
  };
}

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

        // Normalize date (ignore time)
        const selectedDate = new Date(input.date);
        selectedDate.setHours(0, 0, 0, 0);

        const nextDay = new Date(selectedDate);
        nextDay.setDate(nextDay.getDate() + 1);

        // Check if the same buyer already booked the same service on the same date
        const existing = await ServiceBooking.findOne({
          buyerId: input.buyerId,
          serviceId: input.serviceId, // block same service only
          date: { $gte: selectedDate, $lt: nextDay },
          status: { $in: ["pending", "approved"] },
        });

        if (existing) {
          return {
            success: false,
            message: "You have already booked this service for the selected date",
            errors: ["Duplicate booking for same service"],
            serviceBookingId: existing.serviceBookingId,
            status: existing.status,
            data: existing,
          };
        }

        const buyer = await Buyer.findOne({ buyerId: input.buyerId }).select("buyerId");
        if (!buyer) throw new Error("Invalid buyerId");

        const newBooking = new ServiceBooking({
          ...input,
          email: input.email?.toLowerCase(),
          date: selectedDate, // ensure date has no time component
          status: "pending"
        });

        const saved = await newBooking.save();

        // ---------------- SERVICE ALERT STATUS CREATION ----------------
        const reminderWindow = calculateServiceReminderTimes(selectedDate);

        if (reminderWindow) {
          await ServiceAlertSchema.create({
            bookingId: saved.serviceBookingId,
            serviceId: saved.serviceId,
            BuyerId: saved.buyerId,

            ServiceStatus: "ASSIGNED",
            userStatus: "ACTIVE",

            ...reminderWindow,
          });
        }

        return {
          success: true,
          message: "Service booking created successfully",
          errors: [],
          serviceBookingId: saved.serviceBookingId,
          status: saved.status,
          data: { ...saved.toObject(), id: saved._id.toString() }
        };

      } catch (err) {
        return {
          success: false,
          message: err.message,
          errors: [err.message],
          serviceBookingId: null,
          status: null,
          data: null
        };
      }
    },
    async updateContactStatus(_, { serviceBookingId, status }) {
      try {
        const updated = await ServiceBooking.findOneAndUpdate(
          { serviceBookingId },
          { status },
          { new: true }
        );

        if (!updated) throw new Error("Service booking not found");

        const buyer = await Buyer.findOne({ buyerId: updated.buyerId });
        const seller = await Seller.findOne({ customId: updated.sellerId });
        const service = await Service.findOne({ serviceId: updated.serviceId });

        if (buyer?.fcmToken) {
          if (status === "approved") {
            await sendBuyerPush(
              buyer.fcmToken,
              "Service Booking Approved ✅",
              `Your booking for ${service?.serviceName} has been approved.`,
              {
                serviceBookingId,
                type: "service_booking_approved",
              }
            );
          }

          if (status === "rejected") {
            await sendBuyerPush(
              buyer.fcmToken,
              "Service Booking Rejected ❌",
              `Your booking for ${service?.serviceName} was rejected.`,
              {
                serviceBookingId,
                type: "service_booking_rejected",
              }
            );
          }

          if (status === "pending") {
            await sendBuyerPush(
              buyer.fcmToken,
              "Service Booking Under Review ⏳",
              `Your booking for ${service?.serviceName} is under review.`,
              {
                serviceBookingId,
                type: "service_booking_pending",
              }
            );
          }
        }

        // ================= SELLER =================
        if (seller?.fcmTokens?.length) {
          await sendSellerPush(
            seller.fcmTokens,
            `Service Booking ${status.toUpperCase()}`,
            `Booking (${serviceBookingId}) is now ${status}.`,
            {
              serviceBookingId,
              type: "service_booking_status",
            }
          );
        }

        // ---------------- SERVICE ALERT STATUS UPDATE ----------------
        if (status === "approved" || status === "confirmed") {
          await ServiceAlertSchema.updateOne(
            { bookingId: serviceBookingId },
            {
              ServiceStatus: "CONFIRMED",
              userStatus: "ACTIVE"
            }
          );
        }

        if (status === "rejected" || status === "cancelled") {
          await ServiceAlertSchema.updateOne(
            { bookingId: serviceBookingId },
            { ServiceStatus: "PENDING" }
          );
        }

        return {
          success: true,
          message: "Status updated successfully",
          serviceBookingId,
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
        const deleted = await ServiceBooking.findOneAndDelete({
          serviceBookingId,
          status: "pending"
        });

        if (!deleted) {
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