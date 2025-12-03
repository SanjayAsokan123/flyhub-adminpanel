import Contact from "../models/Service_Book_Now.model.js";

export const ServiceBookingResolvers = {
  Query: {
    // -------------------------------------------------
    // GET ALL CONTACTS (pagination + sort + filter)
    // -------------------------------------------------
    async getAllContacts(_, { page = 1, limit = 10, status, sortBy = "-date" }) {
      try {
        const skip = (page - 1) * limit;
        let query = {};

        if (status) query.status = status;

        const contacts = await Contact.find(query)
          .sort(sortBy)
          .skip(skip)
          .limit(limit);

        const total = await Contact.countDocuments(query);
        const pages = Math.ceil(total / limit);

        return {
          success: true,
          message: "Contacts fetched",
          data: contacts,
          total,
          page,
          pages,
        };
      } catch (err) {
        return {
          success: false,
          message: err.message,
          data: [],
          total: 0,
          page,
          pages: 0,
        };
      }
    },

    // -------------------------------------------------
    getContactById: async (_, { id }) => {
      const contact = await Contact.findById(id);
      if (!contact) throw new Error("Contact not found");
      return contact;
    },

    // -------------------------------------------------
    getContactsBySellerId: async (_, { sellerId }) => {
      return await Contact.find({ sellerId }).sort("-date");
    },

    // -------------------------------------------------
    getContactsByEmail: async (_, { email }) => {
      return await Contact.find({ email: email.toLowerCase() });
    },

    // -------------------------------------------------
    getContactsByStatus: async (_, { status }) => {
      return await Contact.find({ status }).sort("-date");
    },

    getConfirmedContact: async () =>
          Contact.find({ status: "confirmed" }).sort({ createdAt: -1 }),
        getPendingContact: async () =>
          Contact.find({ status: "pending"}).sort({ createdAt: -1 }),
        getCancelledContact: async () =>
          Contact.find({ status: "cancelled" }).sort({ createdAt: -1 }),
  },

  Mutation: {
    // -------------------------------------------------
    // CREATE CONTACT
    // -------------------------------------------------
    async createContact(_, { input }) {
      try {
        // Generate booking ID if not sent from frontend
        const bookingId =
          input.serviceBookingId ||
          "BOOK" + Date.now().toString().slice(-6);

        const newContact = new Contact({
          ...input,
          email: input.email.toLowerCase(),
          date: input.date ? new Date(input.date) : new Date(),
          serviceBookingId: bookingId,
          status: "pending",
        });

        const saved = await newContact.save();

        return {
          success: true,
          message: "Contact created successfully",
          data: saved,
        };
      } catch (err) {
        return {
          success: false,
          message: err.message,
          data: null,
          errors: [err.message],
        };
      }
    },

    // -------------------------------------------------
    // UPDATE STATUS
    // -------------------------------------------------
    async updateContactStatus(_, { id, status }) {
      try {
        const updated = await Contact.findByIdAndUpdate(
          id,
          { status },
          { new: true }
        );

        if (!updated) throw new Error("Contact not found");

        return {
          success: true,
          message: "Status updated",
          data: updated,
        };
      } catch (err) {
        return {
          success: false,
          message: err.message,
          data: null,
        };
      }
    },

    // -------------------------------------------------
    // UPDATE NORMAL FIELDS
    // -------------------------------------------------
    async updateContact(_, { id, input }) {
      try {
        const updateData = { ...input };

        if (input.email) updateData.email = input.email.toLowerCase();

        const updated = await Contact.findByIdAndUpdate(id, updateData, {
          new: true,
        });

        if (!updated) throw new Error("Contact not found");

        return {
          success: true,
          message: "Updated successfully",
          data: updated,
        };
      } catch (err) {
        return {
          success: false,
          message: err.message,
          data: null,
        };
      }
    },

    // -------------------------------------------------
    // DELETE
    // -------------------------------------------------
    async deleteContact(_, { id }) {
      try {
        const deleted = await Contact.findByIdAndDelete(id);

        return {
          success: true,
          message: "Contact deleted",
          deletedId: id,
        };
      } catch (err) {
        return {
          success: false,
          message: err.message,
          deletedId: null,
        };
      }
    },
  },
};

