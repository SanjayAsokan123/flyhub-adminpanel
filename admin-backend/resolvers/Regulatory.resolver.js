import { Regulatory } from "../models/Regulatory.model.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";
import {
  uploadSingleFile,
  deleteFirebaseFile,
} from "../utils/uploadToFirebase.js";

export const regulatoryResolvers = {
  Query: {
    regulatory: async (_, { id }) => {
      const record = await Regulatory.findById(id);
      if (!record) throw new Error("Regulatory record not found");

      return {
        ...record.toObject(),
        id: record._id.toString(),
        title: record.title || "Untitled Regulation",
        imagePath: record.imagePath || "N/A",
        shortDescription:
          record.shortDescription || "No short description provided.",
        fullDescription:
          record.fullDescription || "No detailed description available.",
      };
    },

    regulatoryAll: async () => {
      const records = await Regulatory.find().sort({ createdAt: -1 });
      return records.map((r) => ({
        ...r.toObject(),
        id: r._id.toString(),
        title: r.title || "Untitled Regulation",
        imagePath: r.imagePath || "N/A",
        shortDescription:
          r.shortDescription || "No short description provided.",
        fullDescription:
          r.fullDescription || "No detailed description available.",
      }));
    },
  },

  Mutation: {
    createRegulatory: async (_, { input }, { pubsub }) => {
      try {
        const sanitizedInput = {
          title: input.title?.trim() || "Untitled Regulation",
          date: input.date || new Date().toISOString().split("T")[0],
          imagePath: input.imagePath?.trim() || null,
          shortDescription:
            input.shortDescription?.trim() || "No short description provided.",
          fullDescription:
            input.fullDescription?.trim() || "No detailed description available.",
        };

        if (input.imageFile?.file) {
          sanitizedInput.imagePath = await uploadSingleFile(
            input.imageFile.file,
            "regulatory"
          );
        }

        const newRecord = new Regulatory(sanitizedInput);
        await newRecord.save();

        await createSellerNotification({
          sellerId: "ADMIN",
          title: "📜 New Regulation Added",
          message: `A new regulatory update "${sanitizedInput.title}" has been published.`,
          type: "regulatory_create",
          data: { id: newRecord._id.toString() },
          url: `/admin/regulatory/${newRecord._id}`,
          pubsub,
        });

        return {
          ...newRecord.toObject(),
          id: newRecord._id.toString(),
        };
      } catch (error) {
        console.error("❌ Error creating regulation:", error);
        throw new Error("Failed to create regulation: " + error.message);
      }
    },

    updateRegulatory: async (_, { id, input }, { pubsub }) => {
      try {
        const existing = await Regulatory.findById(id);
        if (!existing) throw new Error("Regulatory record not found");

        const updateData = { ...input };

        if (input.imageFile?.file) {
          if (existing.imagePath) {
            await deleteFirebaseFile(existing.imagePath);
          }
          updateData.imagePath = await uploadSingleFile(
            input.imageFile.file,
            "regulatory"
          );
        }

        const updatedRecord = await Regulatory.findByIdAndUpdate(id, updateData, {
          new: true,
          runValidators: true,
        });

        await createSellerNotification({
          sellerId: "ADMIN",
          title: "📢 Regulation Updated",
          message: `Regulation "${updatedRecord.title}" has been modified.`,
          type: "regulatory_update",
          data: { id },
          url: `/admin/regulatory/${id}`,
          pubsub,
        });

        return {
          ...updatedRecord.toObject(),
          id: updatedRecord._id.toString(),
        };
      } catch (error) {
        console.error("❌ Error updating regulation:", error);
        throw new Error("Failed to update regulation: " + error.message);
      }
    },

    deleteRegulatory: async (_, { id }, { pubsub }) => {
      try {
        const deletedRecord = await Regulatory.findByIdAndDelete(id);
        if (!deletedRecord) throw new Error("Regulatory record not found");

        if (deletedRecord.imagePath) {
          await deleteFirebaseFile(deletedRecord.imagePath);
        }

        await createSellerNotification({
          sellerId: "ADMIN",
          title: "❌ Regulation Deleted",
          message: `Regulatory record "${deletedRecord.title}" has been removed.`,
          type: "regulatory_delete",
          data: { id },
          url: `/admin/regulatory`,
          pubsub,
        });

        return {
          ...deletedRecord.toObject(),
          id: deletedRecord._id.toString(),
        };
      } catch (error) {
        console.error("❌ Error deleting regulation:", error);
        throw new Error("Failed to delete regulation: " + error.message);
      }
    },
  },
};
