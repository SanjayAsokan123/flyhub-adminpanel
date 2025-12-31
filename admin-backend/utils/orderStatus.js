import { Drone } from "../models/Drone.model.js";
import { Part } from "../models/Parts.model.js";
import { Accessory } from "../models/Accessories.model.js";

/* ================= ORDER STATUS (SOURCE OF TRUTH) ================= */

export const ORDER_STATUS = {
  PENDING: "pending",
  PACKED: "packed",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
};

/* ================= DISPLAY LABELS ================= */

export const ORDER_STATUS_DISPLAY = {
  [ORDER_STATUS.PENDING]: "Order Placed",
  [ORDER_STATUS.PACKED]: "Packed by Seller",
  [ORDER_STATUS.SHIPPED]: "Shipped by Seller",
  [ORDER_STATUS.DELIVERED]: "Delivered",
  [ORDER_STATUS.REJECTED]: "Rejected by Seller",
  [ORDER_STATUS.CANCELLED]: "Cancelled",
};

/* ================= ARRAY (VALIDATION / ENUM USE) ================= */

export const ORDER_STATUS_ARRAY = Object.values(ORDER_STATUS);

/* ================= PRODUCT LOOKUP ================= */

export async function getProductDetailsById(productId) {
  // Drone
  const drone = await Drone.findOne({ droneId: productId })
    .select("name price sellerId image images")
    .lean();
  if (drone) return drone;

  // Part
  const part = await Part.findOne({ partId: productId })
    .select("name price sellerId image")
    .lean();
  if (part) return part;

  // Accessory
  const accessory = await Accessory.findOne({ accessoryId: productId })
    .select("name price sellerId image")
    .lean();
  if (accessory) return accessory;

  return null;
}
