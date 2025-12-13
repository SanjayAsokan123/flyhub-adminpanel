  import { Drone } from "../models/Drone.model.js";
import { Part } from "../models/Parts.model.js";
import { Accessory } from "../models/Accessories.model.js";

export const ORDER_STATUS = {
  PACKED: "packed",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};
export const ORDER_STATUS_DISPLAY = {
  [ORDER_STATUS.PACKED]: "Packed",
  [ORDER_STATUS.SHIPPED]: "Shipped",
  [ORDER_STATUS.DELIVERED]: "Delivered",
  [ORDER_STATUS.CANCELLED]: "Cancelled",
};
export const ORDER_STATUS_ARRAY = Object.values(ORDER_STATUS);

export async function getProductDetailsById(productId) {


  // Try to find the product in each collection
  const drone = await Drone.findOne({ droneId: productId })
    .select("name price sellerId")
    .lean();
  if (drone) return drone;

  const part = await Part.findOne({ partId: productId })
    .select("name price sellerId")
    .lean();
  if (part) return part;

  const accessory = await Accessory.findOne({ accessoryId: productId })
    .select("name price sellerId")
    .lean();
  if (accessory) return accessory;

  return null; // Product not found
}