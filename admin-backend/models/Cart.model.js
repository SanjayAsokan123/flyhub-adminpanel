import mongoose from "mongoose";
import { Buyer } from "./Buyer.model.js";

const CartSchema = new mongoose.Schema({
    buyerId: { type: String, required: true  , ref: 'Buyer'},
    productId: { type: String, required: true , refPath: 'Product' },
    quantity: { type: Number, default: 1 },
    addedAt: { type: Date, default: Date.now }
});

export default mongoose.model("Cart", CartSchema);
