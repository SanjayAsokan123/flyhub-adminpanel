import { Discount } from "../models/DiscountSet.model.js";

export const discountResolvers = {
  Query: {
    getDiscounts: async () => {
      try {
        // Only one discount document should exist
        let discount = await Discount.findOne();

        // If not exist, create default one
        if (!discount) {
          discount = await Discount.create({});
        }

        return discount;
      } catch (err) {
        console.error("Error fetching discounts", err);
        throw new Error("Unable to fetch discounts");
      }
    },
  },

  Mutation: {
    updateDiscounts: async (_, { input }) => {
      try {
        let discount = await Discount.findOne();

        // If first time updating, create document
        if (!discount) {
          discount = new Discount({});
        }

        // Update the fields
        if (input.discountForDrones !== undefined)
          discount.discountForDrones = input.discountForDrones;

        if (input.discountForAccessory !== undefined)
          discount.discountForAccessory = input.discountForAccessory;

        if (input.discountForParts !== undefined)
          discount.discountForParts = input.discountForParts;

        // Save updated data
        await discount.save();

        return discount;
      } catch (err) {
        console.error("Error updating discounts", err);
        throw new Error("Unable to update discounts");
      }
    },
  },
};
