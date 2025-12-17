import Cart from "../models/Cart.model.js";
import { Drone } from "../models/Drone.model.js";
import { Part } from "../models/Parts.model.js";
import { Accessory } from "../models/Accessories.model.js";
import { Buyer } from "../models/Buyer.model.js";

export const cartResolvers = {
  Query: {
    getBuyerfirebaseUidCart: async (_, { firebaseUid }) => {
      const buyer = await Buyer.findOne({ firebaseUid }).lean();

      if (!buyer) {
        throw new Error("Buyer not found for this Firebase UID");
      }

      return {
        firebaseUid: buyer.firebaseUid,
        buyerId: buyer.buyerId,
        name: buyer.name,
        email: buyer.email
      };
    },
    getCart: async (_, { buyerId }) => {
      const items = await Cart.find({ buyerId });

      const result = [];

      for (const c of items) {
        const productId = c.productId;

        const product =
          (await Drone.findOne({ droneId: productId }).lean()) ||
          (await Part.findOne({ partId: productId }).lean()) ||
          (await Accessory.findOne({ accessoryId: productId }).lean());

        result.push({
          id: c._id,
          buyerId: c.buyerId,
          productId,
          quantity: c.quantity,
          addedAt: c.addedAt,
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
  },

  Mutation: {
   async addToCart(_, { buyerId, productId, quantity = 1 }) {
  let item = await Cart.findOne({ buyerId, productId });

  if (item) {
    item.quantity += quantity; // 🔥 overwrite instead of increment
    await item.save();
    return item;
  }

  return await Cart.create({
    buyerId,
    productId,
    quantity,
  });
},


    async updateCartQty(_, { buyerId, productId, quantity }) {
      return await Cart.findOneAndUpdate(
        { buyerId, productId },
        { quantity },
        { new: true }
      );
    },

    async removeFromCart(_, { buyerId, productId }) {
      await Cart.deleteOne({ buyerId, productId });
      return true;
    },
  },
};
