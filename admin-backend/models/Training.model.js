import mongoose from "mongoose";

const trainingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters long"],
    },

    amount: {
      type: Number,
      required: [true, "Base amount is required"],
      min: [0, "Amount cannot be negative"],
    },

    gst: {
      type: Number,
      required: [true, "GST percentage is required"],
      min: [0, "GST cannot be negative"],
      max: [100, "GST cannot exceed 100%"],
    },

    days: {
      type: Number,
      required: [true, "Number of days is required"],
      min: [1, "Training must be at least 1 day long"],
    },

    imagePath: {
      type: String,
      default: "",
      trim: true,
    },

    shortDescription: {
      type: String,
      default: "",
      maxlength: [300, "Short description cannot exceed 300 characters"],
    },

    fullDescription: {
      type: String,
      default: "",
    },

    totalAmount: {
      type: Number,
      default: 0,
      min: [0, "Total amount cannot be negative"],
    },
  },
  { timestamps: true }
);

trainingSchema.pre("save", function (next) {
  if (this.amount != null && this.gst != null) {
    this.totalAmount = this.amount + (this.amount * this.gst) / 100;
  }
  next();
});

trainingSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  if (update.amount != null && update.gst != null) {
    update.totalAmount = update.amount + (update.amount * update.gst) / 100;
  }
  next();
});

trainingSchema.index({ title: "text", shortDescription: "text" });

export const Training = mongoose.model("Training", trainingSchema);
