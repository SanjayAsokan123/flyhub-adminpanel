import PilotRental from "../models/Buyer_Booking_Pilot_Rental.model.js";
import { HirePilot } from "../models/Hirepilot.model.js";
import { Seller } from "../models/Seller.model.js";
import {Buyer} from "../models/Buyer.model.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";
import { sendSellerStatusMail } from "../utils/emailService.js";
// BUYER push notifications
import { sendPushNotification as sendBuyerPush } from "../utils/pushNotification.js";

// SELLER push notifications
import { sendPushNotification as sendSellerPush } from "../utils/SendPushNotification.js";


const buildMatch = (base = {}) => {
  const match = { ...base };
  if (typeof match.status === "string") match.status = match.status.toLowerCase();
  if (typeof match.paymentStatus === "string") match.paymentStatus = match.paymentStatus.toLowerCase();
  return match;
};

export const rentalBookingResolvers = {
  Query: {

      getAllPilotRentals: async () =>
        PilotRental.aggregateWithPilotByRentalId({}, { createdAt: -1 }),

getPilotRentalsBySellerId: async (_, { sellerId }) => {
  if (!sellerId) throw new Error("Seller ID is required");

  const pilots = await HirePilot.find({ sellerId }).select("pilotId");
  const pilotIds = pilots.map((p) => p.pilotId);

  if (pilotIds.length === 0) return [];

  return PilotRental.aggregateWithPilotByRentalId({
    pilotId: { $in: pilotIds }
  });
},

    getPilotRentalsByStatus: async (_, { status }) => {
      const valid = ["pending", "confirmed", "cancelled"];
      if (!valid.includes(String(status).toLowerCase())) throw new Error("Invalid status");
      return PilotRental.aggregateWithPilotByRentalId(buildMatch({ status }));
    },

    getPilotRentalsByPaymentStatus: async (_, { paymentStatus }) => {
      const valid = ["pending", "failed", "completed"];
      if (!valid.includes(String(paymentStatus).toLowerCase()))
        throw new Error("Invalid payment status");
      return PilotRental.aggregateWithPilotByRentalId(buildMatch({ paymentStatus }));
    },

    getPilotRentalById: async (_, { pilot_rental_id }) => {
      const docs = await PilotRental.aggregateWithPilotByRentalId({ pilot_rental_id });
      if (!docs?.length) throw new Error(`Pilot rental with ID ${pilot_rental_id} not found`);
      return docs[0];
    },

    getPendingRentals: async () =>
      PilotRental.aggregateWithPilotByRentalId({ status: "pending" }),
    getConfirmedRentals: async () =>
      PilotRental.aggregateWithPilotByRentalId({ status: "confirmed" }),
    getCancelledRentals: async () =>
      PilotRental.aggregateWithPilotByRentalId({ status: "cancelled" }),
    getCompletedPaymentRentals: async () =>
      PilotRental.aggregateWithPilotByRentalId({ paymentStatus: "completed" }),
  },

  Mutation: {

   createPilotRental: async (
  _,
  { name, email, phone, location, amount, rentalDate, rentalPeriod, pilotId },
  { pubsub }
) => {
  const pilot = await HirePilot.findOne({ pilotId }).select("_id sellerId pilotName");
  if (!pilot) throw new Error("Pilot not found");

  const seller = await Seller.findOne({ customId: pilot.sellerId });
  const buyer = await Buyer.findOne({ email });

  const doc = await PilotRental.create({
    name,
    email,
    phone,
    location,
    amount,
    rentalDate: new Date(rentalDate),
    rentalPeriod: {
      startDate: new Date(rentalPeriod.startDate),
      endDate: new Date(rentalPeriod.endDate),
    },
    pilotId,
    status: "pending",
    paymentStatus: "pending",
  });

  const [withPilot] = await PilotRental.aggregateWithPilotByRentalId({
    pilot_rental_id: doc.pilot_rental_id,
  });

  // 🔔 SELLER PUSH
  if (seller?.fcmTokens?.length) {
    await sendSellerPush(
      seller.fcmTokens,
      "New Pilot Rental Request",
      `New booking received for pilot ${pilot.pilotName}`,
      {
        pilotId,
        pilot_rental_id: doc.pilot_rental_id,
        type: "pilot_rental_new",
      }
    );
  }

  // 🔔 BUYER PUSH
  if (buyer?.fcmToken) {
    await sendBuyerPush(
      buyer.fcmToken,
      "Pilot Rental Submitted",
      `Your pilot rental request (${doc.pilot_rental_id}) is pending approval.`,
      {
        pilot_rental_id: doc.pilot_rental_id,
        type: "pilot_rental_pending",
      }
    );
  }

  return withPilot;
},


    updatePilotRentalContact: async (_, { pilot_rental_id, phone, location }) => {
      try {
        const patch = {};
        if (phone) patch.phone = phone;
        if (location) patch.location = location;
        if (!Object.keys(patch).length)
          throw new Error("At least one field (phone or location) is required");

        const updated = await PilotRental.findOneAndUpdate(
          { pilot_rental_id },
          { $set: patch },
          { new: true, runValidators: true }
        );
        if (!updated) throw new Error(`Pilot rental with ID ${pilot_rental_id} not found`);

        const [withPilot] = await PilotRental.aggregateWithPilotByRentalId({ pilot_rental_id });
        return withPilot;
      } catch (err) {
        console.error("❌ Error updating pilot rental contact:", err);
        throw new Error("Failed to update contact info: " + err.message);
      }
    },

  updatePilotRentalStatus: async (_, { pilot_rental_id, status }, { pubsub }) => {
  const updated = await PilotRental.findOneAndUpdate(
    { pilot_rental_id },
    { $set: { status: status.toLowerCase() } },
    { new: true, runValidators: true }
  );

  if (!updated) throw new Error("Rental not found");

  const [withPilot] = await PilotRental.aggregateWithPilotByRentalId({ pilot_rental_id });

  const pilot = await HirePilot.findOne({ pilotId: updated.pilotId });
  const seller = pilot ? await Seller.findOne({ customId: pilot.sellerId }) : null;
  const buyer = await Buyer.findOne({ email: updated.email });

  // ================= BUYER =================
  if (buyer?.fcmToken) {
    if (status === "confirmed") {
      await sendBuyerPush(
        buyer.fcmToken,
        "Pilot Rental Confirmed 🎉",
        `Your booking for pilot ${pilot?.pilotName} is confirmed.`,
        { pilot_rental_id, type: "pilot_rental_confirmed" }
      );
    }

    if (status === "cancelled") {
      await sendBuyerPush(
        buyer.fcmToken,
        "Pilot Rental Cancelled ❌",
        `Your booking for pilot ${pilot?.pilotName} was cancelled.`,
        { pilot_rental_id, type: "pilot_rental_cancelled" }
      );
    }

    if (status === "pending") {
      await sendBuyerPush(
        buyer.fcmToken,
        "Pilot Rental Under Review",
        `Your booking for pilot ${pilot?.pilotName} is under review.`,
        { pilot_rental_id, type: "pilot_rental_pending" }
      );
    }
  }

  // ================= SELLER =================
  if (seller?.fcmTokens?.length) {
    await sendSellerPush(
      seller.fcmTokens,
      `Pilot Rental ${status.toUpperCase()}`,
      `Booking for pilot ${pilot?.pilotName} is now ${status}.`,
      { pilot_rental_id, type: "pilot_rental_status" }
    );
  }

  // existing email + DB notification (unchanged)
  if (seller?.email) {
    await sendSellerStatusMail({
      to: seller.email,
      productType: "Pilot Rental",
      productName: pilot?.pilotName,
      status,
    });
  }

  await createSellerNotification({
    sellerId: pilot?.sellerId,
    title: `Pilot Rental ${status.toUpperCase()}`,
    message: `Pilot "${pilot?.pilotName}" rental is ${status}.`,
    type: "pilot_rental_status",
    data: { pilot_rental_id, status },
    url: `/seller/pilots/${pilot?.pilotId}`,
    pubsub,
  });

  return withPilot;
},


  updatePaymentStatus: async (_, { pilot_rental_id, paymentStatus }, { pubsub }) => {
  const updated = await PilotRental.findOneAndUpdate(
    { pilot_rental_id },
    { $set: { paymentStatus: paymentStatus.toLowerCase() } },
    { new: true }
  );

  if (!updated) throw new Error("Rental not found");

  const [withPilot] = await PilotRental.aggregateWithPilotByRentalId({ pilot_rental_id });

  const pilot = await HirePilot.findOne({ pilotId: updated.pilotId });
  const seller = pilot ? await Seller.findOne({ customId: pilot.sellerId }) : null;
  const buyer = await Buyer.findOne({ email: updated.email });

  // 🔔 BUYER
  if (buyer?.fcmToken) {
    await sendBuyerPush(
      buyer.fcmToken,
      `Payment ${paymentStatus.toUpperCase()} 💳`,
      paymentStatus === "completed"
        ? "Payment completed successfully."
        : "Payment failed. Please retry.",
      { pilot_rental_id, type: "pilot_payment" }
    );
  }

  // 🔔 SELLER
  if (seller?.fcmTokens?.length) {
    await sendSellerPush(
      seller.fcmTokens,
      `Payment ${paymentStatus.toUpperCase()} 💰`,
      `Payment ${paymentStatus} for pilot ${pilot?.pilotName}.`,
      { pilot_rental_id, type: "pilot_payment" }
    );
  }

  await createSellerNotification({
    sellerId: pilot?.sellerId,
    title: `💰 Payment ${paymentStatus.toUpperCase()}`,
    message: `Payment ${paymentStatus} for pilot "${pilot?.pilotName}".`,
    type: "pilot_payment",
    data: { pilot_rental_id, paymentStatus },
    url: `/seller/pilots/${pilot?.pilotId}`,
    pubsub,
  });

  return withPilot;
},


    deletePilotRental: async (_, { pilot_rental_id }) => {
      try {
        const deleted = await PilotRental.findOneAndDelete({ pilot_rental_id });
        if (!deleted) throw new Error(`Pilot rental with ID ${pilot_rental_id} not found`);
        return { ...deleted.toObject(), pilot: null };
      } catch (err) {
        console.error("❌ Error deleting rental:", err);
        throw new Error("Failed to delete pilot rental: " + err.message);
      }
    },
  },
};

