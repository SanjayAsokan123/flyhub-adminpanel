import PilotAlertStatus from "../models/Pilot_Alert_status.model.js";

const PilotAlertStatusResolver = {
  Query: {
    /* ===================== FETCH ===================== */

    pilotAlertByBookingId: async (_, { bookingId }) => {
      return await PilotAlertStatus.findOne({ bookingId });
    },

    pilotAlertsByUserStatus: async (_, { userStatus }) => {
      return await PilotAlertStatus.find({ userStatus });
    },

    pilotAlertsByPilotStatus: async (_, { pilotStatus }) => {
      return await PilotAlertStatus.find({ pilotStatus });
    },

    allPilotAlerts: async () => {
      return await PilotAlertStatus.find().sort({ createdAt: -1 });
    }
  },

  Mutation: {
    /* ===================== CREATE ===================== */

    createPilotAlert: async (_, { input }) => {
      const alert = new PilotAlertStatus({
        buyerId: input.buyerId,
        pilotId: input.pilotId,
        bookingId: input.bookingId,
        reminderStartTime: input.reminderStartTime,
        pilotStatus: "ASSIGNED",
        userStatus: "ACTIVE"
      });

      return await alert.save();
    },

    /* ===================== UPDATE ===================== */

    updatePilotStatus: async (_, { input }) => {
      const updated = await PilotAlertStatus.findByIdAndUpdate(
        input.id,
        {
          pilotStatus: input.pilotStatus,
          pilotLastNotifiedAt: new Date()
        },
        { new: true }
      );

      if (!updated) {
        throw new Error("Pilot alert record not found");
      }

      return updated;
    },

    /* ===================== DELETE ===================== */

    deletePilotAlert: async (_, { id }) => {
      const result = await PilotAlertStatus.findByIdAndDelete(id);
      return !!result;
    },

    deleteAllPilotAlerts: async () => {
      await PilotAlertStatus.deleteMany({});
      return true;
    }
  }
};

export default PilotAlertStatusResolver;