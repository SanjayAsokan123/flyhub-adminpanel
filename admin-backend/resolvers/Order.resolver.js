import crypto from "crypto";
import { razorpay } from "../utils/razorpay.js";
import { Order } from "../models/Order.model.js";
import { Drone } from "../models/Drone.model.js";
import { Part } from "../models/Parts.model.js";
import { Accessory } from "../models/Accessories.model.js";
import { Seller } from "../models/Seller.model.js";
import { sendSellerStatusMail } from "../utils/emailService.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";

async function getProductDetails(productId, type) {
  switch (type?.toLowerCase()) {
    case "drone":
      return await Drone.findOne({ droneId: productId })
        .select("name price sellerId")
        .lean();
    case "part":
      return await Part.findOne({ partId: productId })
        .select("name price sellerId")
        .lean();
    case "accessory":
      return await Accessory.findOne({ accessoryId: productId })
        .select("name price sellerId")
        .lean();
    default:
      return null;
  }
}

export const orderResolvers = {
  Query: {
    orders: async () => await Order.find().sort({ createdAt: -1 }),
    order: async (_, { orderId }) => {
      const order = await Order.findOne({ orderId });
      if (!order) throw new Error("Order not found");
      return order;
    },
  },

  Mutation: {
    createRazorpayOrder: async (_, { amount }) => {
      try {
        const order = await razorpay.orders.create({
          amount: amount * 100,
          currency: "INR",
          receipt: "receipt_" + Date.now(),
        });
        return order.id;
      } catch (err) {
        console.error("❌ Razorpay Create Error:", err);
        throw new Error("Failed to create Razorpay order");
      }
    },

    verifyRazorpayPayment: async (
      _,
      { razorpay_order_id, razorpay_payment_id, razorpay_signature }
    ) => {
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET)
        .update(body)
        .digest("hex");

      return expectedSignature === razorpay_signature;
    },

    createOrder: async (_, { buyerData, items, paymentData }, { pubsub }) => {
      try {
        if (!buyerData?.buyerId || !buyerData?.name)
          throw new Error("Buyer info incomplete");

        if (!items || items.length === 0)
          throw new Error("Order must contain items");

        // ITEM PROCESSING
        const detailedItems = await Promise.all(
          items.map(async (item) => {
            const product = await getProductDetails(item.productId, item.type);

            return {
              productId: item.productId,
              type:
                item.type.charAt(0).toUpperCase() +
                item.type.slice(1).toLowerCase(), // FIXED ENUM
              name: product?.name || "Unknown Product",
              price: product?.price || 0,
              quantity: item.quantity || 1,
              sellerId: product?.sellerId,
            };
          })
        );

        const totalAmount = detailedItems.reduce(
          (sum, i) => sum + i.price * i.quantity,
          0
        );

        // CREATE ORDER
        const order = new Order({
          orderId: `FHO-${Date.now().toString().slice(-8)}`,
          buyer: buyerData,
          items: detailedItems,
          totalAmount,
          payment: {
            method: paymentData.method,
            status: paymentData.status || "pending",
            transactionId: paymentData.transactionId || null,
          },
        });

        await order.save();

        // NOTIFY SELLERS
        const sellerIds = [
          ...new Set(detailedItems.map((i) => i.sellerId).filter(Boolean)),
        ];
        const sellers = await Seller.find({ customId: { $in: sellerIds } });

        for (const seller of sellers) {
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
        }

        return order;
      } catch (err) {
        console.error("❌ Order Create Error:", err);
        throw new Error("Failed to create order: " + err.message);
      }
    },
  },
};
