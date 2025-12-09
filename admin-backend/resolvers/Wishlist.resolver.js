import WishlistModel from "../models/Wishlist.model.js";
import { Drone } from "../models/Drone.model.js";
import { Part } from "../models/Parts.model.js";
import { Accessory } from "../models/Accessories.model.js";
import { Buyer } from "../models/Buyer.model.js";

export const wishlistResolvers = {
  Query: {
    async getWishlist(_, { buyerId }) {
      const items = await WishlistModel.find({ buyerId });

      const result = [];

      for (const w of items) {
        const productId = w.productId;

        const product =
          (await Drone.findOne({ droneId: productId }).lean()) ||
          (await Part.findOne({ partId: productId }).lean()) ||
          (await Accessory.findOne({ accessoryId: productId }).lean());

        result.push({
          id: w._id,
          buyerId: w.buyerId,
          productId,
          addedAt: w.addedAt,
          product: product
            ? {
                productId,
                name: product.name,
                brand: product.brand,
                price: product.price,
                image: product.image,
                description: product.description,
                status: product.status,
                category: product.droneId
                  ? "drone"
                  : product.partId
                  ? "part"
                  : "accessory",
              }
            : null,
        });
      }

      return result;
    },
    async getBuyerfirebaseUidWish(_, { firebaseUid }) {
      const buyer = await Buyer.findOne({ firebaseUid }).lean();

      if (!buyer) {
        throw new Error("Buyer not found for this Firebase UID");
      }

      return {
        firebaseUid: buyer.firebaseUid,
        buyerId: buyer.buyerId,
        name: buyer.name,
        email: buyer.email,
      };
    },
    async getProduct(_, { productId }) {
      const product =
        (await Drone.findOne({ droneId: productId }).lean()) ||
        (await Part.findOne({ partId: productId }).lean()) ||
        (await Accessory.findOne({ accessoryId: productId }).lean());

      if (!product) return null;

      return {
        productId,
        name: product.name,
        brand: product.brand,
        price: product.price,
        image: product.image,
        description: product.description,
        status: product.status,
        category: product.droneId
          ? "drone"
          : product.partId
          ? "part"
          : "accessory",
      };
    },
  },

  Mutation: {
    // ---------------------------------------------------------
    // ⭐ ADD TO WISHLIST
    // ---------------------------------------------------------
    async addToWishlist(_, { buyerId, productId }) {
      let existing = await WishlistModel.findOne({ buyerId, productId });
      if (existing) return existing;

      const item = new WishlistModel({
        buyerId,
        productId,
        addedAt: new Date(),
      });

      await item.save();
      return item;
    },

    // ---------------------------------------------------------
    // ⭐ REMOVE FROM WISHLIST
    // ---------------------------------------------------------
    async removeFromWishlist(_, { buyerId, productId }) {
      const res = await WishlistModel.deleteOne({ buyerId, productId });
      return res.deletedCount > 0;
    },
  },
};
