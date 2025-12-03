import { Order } from "../models/Order.model.js";
import { Drone } from "../models/Drone.model.js";
import { Part } from "../models/Parts.model.js";
import { Accessory } from "../models/Accessories.model.js";
import { Seller } from "../models/Seller.model.js";
import { sendSellerStatusMail } from "../utils/emailService.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";

async function getProductDetails(productId, type) {
  try {
    switch (type?.toLowerCase()) {
      case "drone":
        return await Drone.findOne({ droneId: productId }).select("name price sellerId -_id");
      case "part":
        return await Part.findOne({ partId: productId }).select("name price sellerId -_id");
      case "accessory":
        return await Accessory.findOne({ accessoryId: productId }).select("name price sellerId -_id");
      default:
        console.warn(`⚠️ Unknown product type: ${type}`);
        return null;
    }
  } catch (error) {
    console.error("❌ Product fetch error:", error);
    return null;
  }
}

export const orderResolvers = {
  Query: {
    orders: async () => {
      try {
        return await Order.find().sort({ createdAt: -1 });
      } catch (err) {
        console.error("❌ Error fetching orders:", err);
        throw new Error("Failed to fetch orders");
      }
    },

    order: async (_, { orderId }) => {
      try {
        const order = await Order.findOne({ orderId });
        if (!order) throw new Error("Order not found");
        return order;
      } catch (err) {
        console.error("❌ Error fetching order:", err);
        throw new Error("Failed to fetch order");
      }
    },
  },

  Mutation: {
    createOrder: async (_, { buyerData, items, paymentData }, { pubsub }) => {
      try {
        if (!buyerData?.buyerId || !buyerData?.name) {
          throw new Error("Buyer information incomplete (buyerId, name required)");
        }
        if (!Array.isArray(items) || items.length === 0) {
          throw new Error("Order must contain at least one valid item");
        }

        const detailedItems = await Promise.all(
          items.map(async (item) => {
            const product = await getProductDetails(item.productId, item.type);
            return {
              productId: item.productId,
              type: item.type,
              name: product?.name || "Unknown Product",
              price: product?.price || 0,
              quantity: item.quantity || 1,
              sellerId: product?.sellerId || null,
            };
          })
        );

        const totalAmount = detailedItems.reduce(
          (sum, i) => sum + i.price * i.quantity,
          0
        );

        const order = new Order({
          orderId: `FHO-${Date.now().toString().slice(-8)}`,
          buyer: buyerData,
          items: detailedItems,
          totalAmount,
          payment: {
            ...paymentData,
            status: paymentData?.status || "pending",
          },
        });

        await order.save();
        console.log(`✅ Order Created: ${order.orderId}`);

        const sellerIds = [
          ...new Set(detailedItems.map((i) => i.sellerId).filter(Boolean)),
        ];
        const sellers = await Seller.find({ customId: { $in: sellerIds } });

        for (const seller of sellers) {
          try {
            if (seller.email) {
              await sendSellerStatusMail({
                to: seller.email,
                productType: "Order",
                productName: `New Order from ${buyerData.name}`,
                status: "new",
              });
            }

            await createSellerNotification({
              sellerId: seller.customId,
              title: "🛒 New Order Received",
              message: `You have a new order from ${buyerData.name}. Total ₹${totalAmount}.`,
              type: "new_order",
              data: { orderId: order.orderId, total: totalAmount },
              url: `/seller/orders/${order.orderId}`,
              pubsub,
            });
          } catch (err) {
            console.error("⚠️ Seller notification error:", err);
          }
        }

        try {
          await createSellerNotification({
            sellerId: buyerData.buyerId,
            title: "✅ Order Confirmed",
            message: `Your order #${order.orderId} was placed successfully. Total ₹${totalAmount}.`,
            type: "buyer_order_confirmed",
            data: { orderId: order.orderId },
            url: `/buyer/orders/${order.orderId}`,
            pubsub,
          });
        } catch (err) {
          console.error("⚠️ Buyer notification error:", err);
        }

        return order;
      } catch (err) {
        console.error("❌ Error creating order:", err);
        throw new Error("Failed to create order: " + err.message);
      }
    },

    updateOrder: async (_, { orderId, address, phone }) => {
      try {
        const updateFields = {};
        if (address) updateFields["buyer.address"] = address;
        if (phone) updateFields["buyer.phone"] = phone;

        const updatedOrder = await Order.findOneAndUpdate(
          { orderId },
          updateFields,
          { new: true }
        );
        if (!updatedOrder) throw new Error("Order not found");
        return updatedOrder;
      } catch (err) {
        console.error("❌ Error updating order:", err);
        throw new Error("Failed to update order: " + err.message);
      }
    },

    deleteOrder: async (_, { orderId }, { pubsub }) => {
      try {
        const deletedOrder = await Order.findOneAndDelete({ orderId });
        if (!deletedOrder) throw new Error("Order not found");

        await createSellerNotification({
          sellerId: deletedOrder.buyer.buyerId,
          title: "🗑️ Order Deleted",
          message: `Your order #${orderId} has been cancelled or deleted.`,
          type: "order_deleted",
          data: { orderId },
          url: `/buyer/orders`,
          pubsub,
        });

        console.log(`🗑️ Order Deleted: ${orderId}`);
        return deletedOrder;
      } catch (err) {
        console.error("❌ Error deleting order:", err);
        throw new Error("Failed to delete order: " + err.message);
      }
    },
  },
};
