import Announcement from "../models/Announcement.model.js";
import { deleteFirebaseFile } from "../utils/uploadToFirebase.js";

export const announcementResolvers = {
  Query: {
    // Fetch active announcement (for Home Page)
    getActiveAnnouncement: async () => {
      return await Announcement.findOne({ isActive: true })
        .sort({ createdAt: -1 });
    },
    // Fetch all announcements (for Admin Panel)
    getAllAnnouncements: async () => {
      return await Announcement.find().sort({ createdAt: -1 });
    },
  },

  Mutation: {
    // ✅ CREATE
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
    // ✏️ UPDATE
    updateAnnouncement: async (_, { id, ...updates }) => {
      try {
        const announcement = await Announcement.findById(id);
        if (!announcement) {
          return {
            success: false,
            message: "Announcement not found",
            data: null,
          };
        }

        // 🔁 Replace image if new one provided
        if (updates.imagePath && updates.imagePath !== announcement.imagePath) {
          await deleteFileFromFirebase(announcement.imagePath);
        }

        const updatedAnnouncement = await Announcement.findByIdAndUpdate(
          id,
          updates,
          { new: true }
        );

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
        const announcement = await Announcement.findById(id);

        if (!announcement) {
          return {
            success: false,
            message: "Announcement not found",
            data: null,
          };
        }

        // 🗑️ Delete image first
        await deleteFirebaseFile(announcement.imagePath);

        await Announcement.findByIdAndDelete(id);

        return {
          success: true,
          message: "Announcement deleted successfully",
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

  },
};