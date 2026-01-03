import Announcement from "../models/Announcement.model.js";

export const announcementResolvers = {
  Query: {
    // Fetch active announcement (for Home Page)
    getActiveAnnouncement: async () => {
      return await Announcement.findOne({ isActive: true })
        .sort({ createdAt: -1 });
    },
  },

  Mutation: {
    // ✅ CREATE
    createAnnouncement: async (_, args) => {
      try {
        const announcement = new Announcement(args);
        await announcement.save();

        return {
          success: true,
          message: "Announcement created successfully",
          data: announcement,
        };
      } catch (error) {
        return {
          success: false,
          message: error.message,
          data: null,
        };
      }
    },

    // ✏️ UPDATE
    updateAnnouncement: async (_, { id, ...updates }) => {
      try {
        const updatedAnnouncement =
          await Announcement.findByIdAndUpdate(
            id,
            updates,
            { new: true }
          );

        if (!updatedAnnouncement) {
          return {
            success: false,
            message: "Announcement not found",
            data: null,
          };
        }

        return {
          success: true,
          message: "Announcement updated successfully",
          data: updatedAnnouncement,
        };
      } catch (error) {
        return {
          success: false,
          message: error.message,
          data: null,
        };
      }
    },

    // ❌ DELETE
    deleteAnnouncement: async (_, { id }) => {
      try {
        const deleted = await Announcement.findByIdAndDelete(id);

        if (!deleted) {
          return {
            success: false,
            message: "Announcement not found",
            data: null,
          };
        }

        return {
          success: true,
          message: "Announcement deleted successfully",
          data: deleted,
        };
      } catch (error) {
        return {
          success: false,
          message: error.message,
          data: null,
        };
      }
    },
  },
};