import mongoose from "mongoose";

const trainingEnrollSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Training",
      required: [true, "Course ID is required"],
    },

    courseTitle: {
      type: String,
      required: [true, "Course title is required"],
    },

    courseDays: {
      type: Number,
      required: [true, "Course duration required"],
    },

    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Amount cannot be negative"],
    },

    // Student Details
    name: {
      type: String,
      required: [true, "Student name is required"],
      minlength: [3, "Name must be at least 3 characters long"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [/.+@.+\..+/, "Please provide a valid email address"],
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      match: [/^[0-9]{10}$/, "Phone number must be 10 digits"],
    },

    address: {
      type: String,
      required: [true, "Address is required"],
      minlength: [5, "Address must be at least 5 characters long"],
    },

    isTenthPass: {
      type: Boolean,
      default: false,
    },

    isHaveLicence: {
      type: Boolean,
      default: false,
    },

    isAbove18: {
      type: Boolean,
      required: true,
      validate: {
        validator: (v) => v === true,
        message: "You must be above 18 years old to enroll",
      },
    },

    // Enrollment status
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Indexes for fast admin panel searching
trainingEnrollSchema.index({ name: "text", email: "text", phone: "text" });

// Safe export (prevents overwrite issues)
export const TrainingEnroll =
  mongoose.models.TrainingEnroll ||
  mongoose.model("TrainingEnroll", trainingEnrollSchema);
