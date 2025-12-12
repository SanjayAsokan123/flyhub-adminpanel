import mongoose from "mongoose";

const WishlistSchema = new mongoose.Schema({
    buyerId: { type: String, required: true },
    productId: { type: String, required: true },
    addedAt: { type: Date, default: Date.now }
});

export default mongoose.model("Wishlist", WishlistSchema);
