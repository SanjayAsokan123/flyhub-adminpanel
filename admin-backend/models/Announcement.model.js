import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    imagePath: {
      type: String, // frontend image key or image name
      required: true,
    },
    imageUrl: {
      type: String, 
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // creates createdAt & updatedAt automatically
  }
);

export default mongoose.model("Announcement", announcementSchema);