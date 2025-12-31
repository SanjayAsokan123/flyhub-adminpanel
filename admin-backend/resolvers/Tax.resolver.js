import { Tax } from "../models/Tax.model.js";

export const taxResolvers = {
  Query: {
    getTax: async () => {
      try {
        const latestTax = await Tax.findOne().sort({ createdAt: -1 });
        return latestTax;
      } catch (err) {
        console.error("Error fetching tax:", err);
        throw new Error("Failed to fetch tax");
      }
    },
  },

  Mutation: {
    updateTax: async (_, { input }) => {
      try {
        const newTax = new Tax({
          sgst: input.sgst,
          commission: input.commission,
        });

        const savedTax = await newTax.save();
        return savedTax;
      } catch (err) {
        console.error("Error updating tax:", err);
        throw new Error("Failed to update tax");
      }
    },
  },
};