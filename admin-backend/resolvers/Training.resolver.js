import mongoose from "mongoose";
import { Training } from "../models/Training.model.js";
import { TrainingEnroll } from "../models/TrainingEnroll.model.js";
import { sendEnrollmentEmails } from "../utils/emailService.js";
import { uploadSingleFile, deleteFirebaseFile } from "../utils/uploadToFirebase.js";

export const trainingResolvers = {
  Query: {
    getTrainings: async (_, { search, sortOrder }) => {
      try {
        const filter = search
          ? { title: { $regex: search, $options: "i" } }
          : {};
        const sort = sortOrder === "asc" ? 1 : -1;
        return await Training.find(filter).sort({ totalAmount: sort });
      } catch (err) {
        console.error("❌ Error fetching trainings:", err);
        throw new Error("Failed to fetch trainings: " + err.message);
      }
    },

    getTrainingById: async (_, { id }) => {
      try {
        const training = await Training.findById(id);
        if (!training) throw new Error("Training not found");
        return training;
      } catch (err) {
        console.error("❌ Error fetching training:", err);
        throw new Error("Failed to fetch training: " + err.message);
      }
    },

    getEnrollments: async () => {
      try {
        return await TrainingEnroll.find().sort({ createdAt: -1 });
      } catch (err) {
        console.error("❌ Error fetching enrollments:", err);
        throw new Error("Failed to fetch enrollments: " + err.message);
      }
    },

    getTrainingBanners: async () => {
      try {
        return await Training.find({}, { title: 1, imagePath: 1 })
          .sort({ createdAt: -1 })
          .limit(10);
      } catch (err) {
        console.error("❌ Error fetching training banners:", err);
        throw new Error("Failed to fetch training banners: " + err.message);
      }
    },
  },

  Mutation: {
    addTraining: async (
      _,
      { title, amount, gst, days, imageFile, imagePath, shortDescription, fullDescription },
      { pubsub }
    ) => {
      try {
        if (!title || !amount || !gst || !days)
          throw new Error("Missing required fields: title, amount, gst, days");

        let finalImagePath = imagePath;
        if (imageFile?.file) {
          finalImagePath = await uploadSingleFile(imageFile.file, "training");
        }

        const totalAmount = amount + (amount * gst) / 100;

        const newTraining = new Training({
          title,
          amount,
          gst,
          days,
          totalAmount,
          imagePath: finalImagePath,
          shortDescription,
          fullDescription,
        });

        const saved = await newTraining.save();
        console.log(`✅ Training added: ${saved.title}`);

        return saved;
      } catch (err) {
        console.error("❌ Error adding training:", err);
        throw new Error("Failed to add training: " + err.message);
      }
    },

    updateTraining: async (_, { id, imageFile, ...fields }) => {
      try {
        const existing = await Training.findById(id);
        if (!existing) throw new Error("Training not found");

        if (imageFile?.file) {
          if (existing.imagePath) {
            await deleteFirebaseFile(existing.imagePath);
          }
          fields.imagePath = await uploadSingleFile(imageFile.file, "training");
        }

        if (fields.amount && fields.gst) {
          fields.totalAmount = fields.amount + (fields.amount * fields.gst) / 100;
        }

        Object.assign(existing, fields);
        return await existing.save();
      } catch (err) {
        console.error("❌ Error updating training:", err);
        throw new Error("Failed to update training: " + err.message);
      }
    },

    deleteTraining: async (_, { id }) => {
      try {
        const deleted = await Training.findByIdAndDelete(id);
        if (!deleted) throw new Error("Training not found");

        if (deleted.imagePath) await deleteFirebaseFile(deleted.imagePath);

        return "Training deleted successfully!";
      } catch (err) {
        console.error("❌ Error deleting training:", err);
        throw new Error("Failed to delete training: " + err.message);
      }
    },

    enrollTraining: async (_, { input }) => {
      try {
        if (!input.courseId || !mongoose.Types.ObjectId.isValid(input.courseId)) {
          throw new Error("Invalid or missing courseId.");
        }

        const course = await Training.findById(input.courseId);
        if (!course) throw new Error("Training not found for provided ID.");

        const enrollment = await TrainingEnroll.create({
          ...input,
          courseTitle: course.title,
          courseDays: course.days,
          totalAmount: course.totalAmount,
          status: "pending",
        });

        await sendEnrollmentEmails({
          studentName: input.name,
          studentEmail: input.email,
          courseTitle: course.title,
          courseDays: course.days,
          totalAmount: course.totalAmount,
        });

        return enrollment;
      } catch (err) {
        console.error("❌ Error enrolling student:", err);
        throw new Error("Failed to enroll in training: " + err.message);
      }
    },
  },
};
