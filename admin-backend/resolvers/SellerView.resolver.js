import {Seller} from "../models/Seller.model.js";
import {Service} from "../models/Service.model.js";
import {Accessory} from "../models/Accessories.model.js";
import {Part} from "../models/Parts.model.js";
import {HireJob} from "../models/Hirejob.model.js";
import {Rental} from "../models/Rental.model.js";
// import {Hirepilot} from "../models/Hirepilot.model.js";

export const getSellerViewResolver = {
  Query: {
    getSellerView: async (_, { sellerId }) => {
      const seller = await Seller.findOne({ customId: sellerId });
      if (!seller) throw new Error("Seller not found");
      return seller;
    },
  },

  SellerView: {
    parts: async(parent) =>
      await Part.find({ sellerId: parent.customId }),

    accessories: async(parent) =>
      await Accessory.find({ sellerId: parent.customId }),

    rentals: async(parent) =>
      await Rental.find({ sellerId: parent.customId }),

    services: async(parent) =>
      await Service.find({ sellerId: parent.customId }),
  },
};
