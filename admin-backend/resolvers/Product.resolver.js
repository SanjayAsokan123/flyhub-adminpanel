import { Drone } from "../models/Drone.model.js";
import { Part } from "../models/Parts.model.js";
import { Accessory } from "../models/Accessories.model.js";

export const productResolvers = {
  Query: {
    async getProduct(_, { productId }) {
      let product =
        (await Drone.findOne({ droneId: productId }).lean()) ||
        (await Part.findOne({ partId: productId }).lean()) ||
        (await Accessory.findOne({ accessoryId: productId }).lean());

      if (!product) return null;

      // convert database format → unified format
      return {
        productId,
        name: product.name,
        brand: product.brand || "",
        price: product.price,
        image: product.image,
        description: product.description,
        category: product.droneId ? "drone" :
                  product.partId ? "part" :
                  product.accessoryId ? "accessory" : "unknown",
        status: product.status
      };
    }
  }
};
