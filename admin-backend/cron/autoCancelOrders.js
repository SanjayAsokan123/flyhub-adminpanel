import cron from "node-cron";
import { Order } from "../models/Order.model.js";
import { ORDER_STATUS } from "../utils/orderStatus.js";
import { orderResolvers } from "../resolvers/Order.resolver.js";
import { pubsub } from "../pubsub.js";

cron.schedule("*/5 * * * *", async () => {
  const expiry = new Date(Date.now() - 15 * 60 * 1000);

  const orders = await Order.find({
    "payment.status": "pending",
    status: { $ne: ORDER_STATUS.CANCELLED },
    createdAt: { $lt: expiry },
  });

  for (const order of orders) {
    try {
      await orderResolvers.Mutation.cancelOrder(
        null,
        {
          orderId: order.orderId,
          buyerId: order.buyer.buyerId,
          reason: "Payment timeout",
        },
        { pubsub }
      );
    } catch (err) {
      console.error("⏳ Auto-cancel failed:", err.message);
    }
  }
});
