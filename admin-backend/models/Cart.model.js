import mongoose from "mongoose";

const CartSchema = new mongoose.Schema({
    buyerId: { type: String, required: true },
    productId: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    addedAt: { type: Date, default: Date.now }
});

export default mongoose.model("Cart", CartSchema);
