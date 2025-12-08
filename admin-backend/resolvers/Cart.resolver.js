import Cart from "../models/Cart.model.js";

export const cartResolvers = {
  Query: {
    getCart: async (_, { buyerId }) => {
      return await Cart.find({ buyerId });
    },
  },

  Mutation: {
    addToCart: async (_, { buyerId, productId }) => {
      let item = await Cart.findOne({ buyerId, productId });

      if (item) {
        item.quantity += 1;
        await item.save();
        return item;
      }

      return await Cart.create({ buyerId, productId });
    },

    updateCartQty: async (_, { buyerId, productId, quantity }) => {
      return await Cart.findOneAndUpdate(
        { buyerId, productId },
        { quantity },
        { new: true }
      );
    },

    removeFromCart: async (_, { buyerId, productId }) => {
      await Cart.deleteOne({ buyerId, productId });
      return true;
    },
  },
};
