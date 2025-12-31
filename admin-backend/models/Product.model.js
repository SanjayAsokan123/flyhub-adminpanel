import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true },

  // Common fields
  name: { type: String, required: true },
  brand: { type: String },
  price: { type: Number, required: true },
  image: { type: String },
  description: { type: String },
  quantity: { type: Number, default: 0 },
  // drone | part | accessory
  category: { type: String, required: true },

  status: { type: String, default: "approved" }, // your marketplace filter
}, {
  timestamps: true
});

export default mongoose.model("Product", ProductSchema);
