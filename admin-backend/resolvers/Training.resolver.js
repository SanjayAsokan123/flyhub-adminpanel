import mongoose from "mongoose";
import { Training } from "../models/Training.model.js";
import { Seller } from "../models/Seller.model.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";
import { sendSellerStatusMail, sendEnrollmentEmails } from "../utils/emailService.js";
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
        const enrollments = await TrainingEnroll.find().sort({ createdAt: -1 });
        return enrollments;
      } catch (err) {
        console.error("❌ Error fetching enrollments:", err);
        throw new Error("Failed to fetch enrollments: " + err.message);
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

        const sellers = await Seller.find({});
        await Promise.all(
          sellers.map(async (seller) => {
if (createSellerNotification && typeof createSellerNotification === "function") {
  await createSellerNotification({
    sellerId: "ADMIN",
    title: "🆕 New Training Added",
    message: `Admin added a new training course: "${saved.title}".`,
    type: "admin_training_log",
    data: { trainingId: saved._id },
    url: `/admin/trainings/${saved._id}`,
    pubsub,
  });
}
            if (seller.email) {
              await sendSellerStatusMail({
                to: seller.email,
                productType: "Training Program",
                productName: saved.title,
                status: "added",
              });
            }
          })
        );

        await createSellerNotification({
          sellerId: "ADMIN",
          title: "🆕 New Training Added",
          message: `Admin added a new training course: "${saved.title}".`,
          type: "admin_training_log",
          data: { trainingId: saved._id },
          url: `/admin/trainings/${saved._id}`,
          pubsub,
        });

        return saved;
      } catch (err) {
        console.error("❌ Error adding training:", err);
        throw new Error("Failed to add training: " + err.message);
      }
    },

    updateTraining: async (_, { id, imageFile, ...fields }, { pubsub }) => {
      try {
        const existing = await Training.findById(id);
        if (!existing) throw new Error("Training not found");

        // ✅ Handle image replacement
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
        const updated = await existing.save();
        console.log(`✏️ Training updated: ${updated.title}`);

        const sellers = await Seller.find({});
       await Promise.all(
         sellers.map(async (seller) => {
           if (!seller.customId) {
             console.warn(`⚠️ Skipping seller without customId: ${seller.email}`);
             return;
           }

           await createSellerNotification({
             sellerId: seller.customId,
             title: "🛠 Training Updated",
             message: `The training program "${updated.title}" has been updated.`,
             type: "training_update",
             data: { trainingId: updated._id },
             url: `/training/${updated._id}`,
             pubsub,
           });

           if (seller.email) {
             await sendSellerStatusMail({
               to: seller.email,
               productType: "Training Program",
               productName: updated.title,
               status: "updated",
             });
           }
         })
       );


        return updated;
      } catch (err) {
        console.error("❌ Error updating training:", err);
        throw new Error("Failed to update training: " + err.message);
      }
    },

    deleteTraining: async (_, { id }, { pubsub }) => {
      try {
        const deleted = await Training.findByIdAndDelete(id);
        if (!deleted) throw new Error("Training not found");

        if (deleted.imagePath) await deleteFirebaseFile(deleted.imagePath);
        console.log(`🗑 Training deleted: ${deleted.title}`);

        const sellers = await Seller.find({});
        await Promise.all(
          sellers.map(async (seller) => {
            await createSellerNotification({
              sellerId: seller.customId,
              title: "🗑 Training Removed",
              message: `The training program "${deleted.title}" has been removed.`,
              type: "training_deleted",
              data: { trainingId: id },
              url: `/training`,
              pubsub,
            });

            if (seller.email) {
              await sendSellerStatusMail({
                to: seller.email,
                productType: "Training Program",
                productName: deleted.title,
                status: "deleted",
              });
            }
          })
        );

        return "Training deleted successfully!";
      } catch (err) {
        console.error("❌ Error deleting training:", err);
        throw new Error("Failed to delete training: " + err.message);
      }
    },

    enrollTraining: async (_, { input }) => {
      try {
        console.log("📥 Enrollment request received:", input);

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

        console.log(`✅ Enrollment successful for ${input.name}`);
        return enrollment;
      } catch (err) {
        console.error("❌ Error enrolling student:", err);
        throw new Error("Failed to enroll in training: " + err.message);
      }
    },
  },
};
