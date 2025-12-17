import crypto from "crypto";
import { razorpay } from "../utils/razorpay.js";
import { Buyer } from "../models/Buyer.model.js";
import { Order } from "../models/Order.model.js";
import { Drone } from "../models/Drone.model.js";
import { Part } from "../models/Parts.model.js";
import { Accessory } from "../models/Accessories.model.js";
import { Seller } from "../models/Seller.model.js";
import  Admin  from "../models/Admin.model.js";

import { sendSellerStatusMail } from "../utils/emailService.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";
import { createBuyerNotification } from "../utils/createBuyerNotification.js";

import { sendPushNotification } from "../utils/pushNotification.js";
import {  sendWhatsappMessage } from "../utils/firebaseWhatsapp.js";
import { FailedPayment } from "../models/FailedPayment.model.js"; 

import { ORDER_STATUS } from "../utils/orderStatus.js";


// ---------------------------------------------------------
// Utility: Fetch item details
// ---------------------------------------------------------
async function getProductDetails(productId, type) {
  switch (type?.toLowerCase()) {
    case "drone":
      return await Drone.findOne({ droneId: productId }).select("name price sellerId").lean();
    case "part":
      return await Part.findOne({ partId: productId }).select("name price sellerId").lean();
    case "accessory":
      return await Accessory.findOne({ accessoryId: productId }).select("name price sellerId").lean();
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

    getBuyerfirebaseUidInOrder: async (_, { firebaseUid }) => {
      const buyer = await Buyer.findOne({ firebaseUid });
      if (!buyer) throw new Error("Buyer not found");
      return buyer;
    },

    ordersByBuyer: async (_, { buyerId }) => {
      return await Order.find({ "buyer.buyerId": buyerId })
        .sort({ createdAt: -1 })
        .lean();
    },
  },

  // ---------------------------------------------------------
  // MUTATIONS START
  // ---------------------------------------------------------
  Mutation: {

    // -----------------------------
    // Razorpay — Create Order
    // -----------------------------
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

    // -----------------------------
    // Razorpay — Verify Payment
    // -----------------------------
    verifyRazorpayPayment: async (_, { razorpay_order_id, razorpay_payment_id, razorpay_signature, buyerId }) => {
      const body = razorpay_order_id + "|" + razorpay_payment_id;

      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET)
        .update(body)
        .digest("hex");

      const paymentValid = expectedSignature === razorpay_signature;

      const buyer = await Buyer.findOne({ buyerId });

      if (paymentValid && buyer) {
        await createBuyerNotification({
          buyerId: buyer.buyerId,
          title: "💳 Payment Successful",
          message: "Your Razorpay payment was verified successfully.",
          type: "payment_verified",
          url: `/buyer/orders`,
        });

        if (buyer.fcmTokens?.length > 0) {
          await sendPushNotification(
            buyer.fcmTokens,
            "Payment Verified!",
            "Your online payment has been confirmed.",
            { buyerId: buyer.buyerId }
          );
        }
      }

      return paymentValid;
    },

    // -----------------------------
    // CREATE ORDER
    // -----------------------------
    // In the createOrder mutation, update to accept connectionStatus:

    createOrder: async (_, { buyerData, items, paymentData, connectionStatus }, { pubsub }) => {
      try {
        if (!buyerData?.buyerId || !buyerData?.name)
          throw new Error("Buyer info incomplete");

        if (!items?.length)
          throw new Error("Order must contain items");

        const buyer = await Buyer.findOne({ buyerId: buyerData.buyerId });
        if (!buyer) throw new Error("Buyer not found");

        // Build detailed items
        const detailedItems = await Promise.all(
          items.map(async (item) => {
            const product = await getProductDetails(item.productId, item.type);
            return {
              productId: item.productId,
              type: item.type.charAt(0).toUpperCase() + item.type.slice(1).toLowerCase(),
              name: product?.name,
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

        // CREATE ORDER NOW
        const order = new Order({
          orderId: `FHO-${Date.now().toString().slice(-8)}`,
          buyer: buyerData,
          items: detailedItems,
          totalAmount,
          connectionStatus: connectionStatus || "online", // Add this
          payment: {
            method: paymentData.method,
            status: paymentData.status || "pending",
            transactionId: paymentData.transactionId || null,
            isOnlinePayment: paymentData.isOnlinePayment || false, // Add this
          },
        });

        await order.save();

        // ... rest of the code remains the same
        // HIGH VALUE ORDER ALERT, BUYER NOTIFICATION, SELLER NOTIFICATIONS

        return order;
      } catch (err) {
        console.error("❌ Order Create Error:", err);
        throw new Error("Failed to create order: " + err.message);
      }
    },

// Add the logFailedPayment resolver:

  logFailedPayment: async (_, { paymentId, razorpayOrderId, reason, amount, connectionStatus, buyerId }) => {
          try {
          const log = new FailedPayment({
            paymentId,
            razorpayOrderId,
            reason,
            amount,
            connectionStatus,
            buyerId,
            metadata: {
              timestamp: new Date().toISOString()
            }
          });

          await log.save();
          console.log("💾 Failed Payment Logged:", log._id);

          return {
            id: log._id,
            timestamp: log.createdAt,
            status: "logged"
          };
        } catch (err) {
          console.error("❌ Failed to log payment:", err);
          throw new Error("Failed to log payment error");
        }
      },

    // -----------------------------
    // UPDATE ORDER STATUS
    // -----------------------------
    updateOrderStatus: async (_, { orderId, status }, { pubsub }) => {
      const order = await Order.findOne({ orderId });
      if (!order) throw new Error("Order not found");

      order.status = status;
      await order.save();

      const buyer = await Buyer.findOne({ buyerId: order.buyer.buyerId });

      const titleMap = {
        packed: "📦 Your Order is Packed",
        shipped: "🚚 Your Order is on the Way",
        delivered: "📬 Order Delivered",
      };

      const messageMap = {
        packed: `Your order ${orderId} has been packed.`,
        shipped: `Your order ${orderId} is now shipped.`,
        delivered: `Your order ${orderId} was delivered successfully.`,
      };

      const title = titleMap[status];
      const message = messageMap[status];

      await createBuyerNotification({
        buyerId: buyer.buyerId,
        title,
        message,
        type: "order_update",
        data: { orderId },
        url: `/buyer/orders/${orderId}`,
      });

      // PUSH notification
      if (buyer.fcmTokens?.length > 0) {
        await sendPushNotification(
          buyer.fcmTokens,
          title,
          message,
          { orderId }
        );
      }

      // WhatsApp notifications
      if (status === ORDER_STATUS.SHIPPED) {
        await sendWhatsappMessage(
          buyer.phoneNumber,
          `Your order ${orderId} has been shipped. Track it in the Flyhub app.`
        );
      }

      if (status === ORDER_STATUS.DELIVERED) {
        await sendWhatsappMessage(
          buyer.phoneNumber,
          `Your order ${orderId} has been delivered. Thank you for shopping with Flyhub!`
        );
      }

      return order;
    },

    // -----------------------------
    // CANCEL ORDER
    // -----------------------------
    cancelOrder: async (_, { orderId, buyerId }, { pubsub }) => {
      const order = await Order.findOne({ orderId });
      if (!order) throw new Error("Order not found");

      order.status = ORDER_STATUS.CANCELLED;
      await order.save();

      const sellers = await Seller.find({
        customId: { $in: order.items.map((i) => i.sellerId) },
      });

      for (const seller of sellers) {
        await createSellerNotification({
          sellerId: seller.customId,
          title: "❌ Order Cancelled",
          message: `Order ${orderId} was cancelled by the buyer.`,
          type: "order_cancelled",
          data: { orderId },
          url: `/seller/orders/${orderId}`,
          pubsub,
        });

        if (seller.fcmTokens?.length) {
          await sendPushNotification(
            seller.fcmTokens,
            "Order Cancelled",
            `Order ${orderId} was cancelled by the buyer.`,
            { orderId }
          );
        }
      }

      return order;
    },

  },
};
