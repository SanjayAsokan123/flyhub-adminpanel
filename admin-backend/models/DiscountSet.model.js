import mongoose from "mongoose";

const discountSchema = new mongoose.Schema(
  {
    // Discount in percentage (ex: 10 = 10%)
    discountForDrones: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    discountForAccessory: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    discountForParts: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true } // createdAt, updatedAt auto-added
);

// AUTO UPDATE updatedAt
discountSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

export const Discount =
  mongoose.models.Discount || mongoose.model("Discount", discountSchema);