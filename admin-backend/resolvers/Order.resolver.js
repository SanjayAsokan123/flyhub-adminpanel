import crypto from "crypto";
import { razorpay } from "../utils/razorpay.js";
import { Buyer } from "../models/Buyer.model.js";
import { Order } from "../models/Order.model.js";
import { Drone } from "../models/Drone.model.js";
import { Part } from "../models/Parts.model.js";
import { Accessory } from "../models/Accessories.model.js";
import { Seller } from "../models/Seller.model.js";
import  Admin  from "../models/Admin.model.js";
import mongoose from "mongoose";
import { normalizeType } from "../utils/normalizeType.js";
import { sendInvoiceEmail } from "../utils/invoice/invoiceEmail.js";
import { sendSellerStatusMail } from "../utils/emailService.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";
import { createBuyerNotification } from "../utils/createBuyerNotification.js";
import { sendWhatsappMessage } from "../utils/firebaseWhatsapp.js";
import { ORDER_STATUS } from "../utils/orderStatus.js";
import Cart from "../models/Cart.model.js";
import { generateInvoicePDF } from "../utils/invoice/generateInvoicePDF.js";
import { sendPushNotification as sendBuyerPush } from "../utils/pushNotification.js";
import { sendPushNotification as sendSellerPush } from "../utils/SendPushNotification.js";
// import { createShiprocketOrder } from "../utils/createShiprocketOrder.js";
import { generateSellerPackingSlipBuffer } from "../utils/invoice/generateSellerPackingSlipBuffer.js";
import { uploadPdfBuffer } from "../utils/uploadToFirebase.js";
import { createSellerPackingSlip } from "../utils/sellerPackingSlipService.js";

async function getProductDetails(productId, type) {
  switch (type?.toLowerCase()) {
    case "drone":
      return await Drone.findOne({ droneId: productId })
        .select("name price sellerId image images")
        .lean();

    case "part":
      return await Part.findOne({ partId: productId })
        .select("name price sellerId image")
        .lean();

    case "accessory":
      return await Accessory.findOne({ accessoryId: productId })
        .select("name price sellerId image")
        .lean();

    default:
      return null;
  }
}

export const OrderMutation = {
  generateSellerPackingSlip: async (_, { orderId, sellerId }) => {
    const order = await Order.findOne({ orderId });
    if (!order) throw new Error("Order not found");

    const pdfBuffer = await generateSellerPackingSlipBuffer(order, sellerId);

    const fileName = `PACKING-${orderId}-${sellerId}.pdf`;
    const url = await uploadPdfBuffer(pdfBuffer, fileName);

    // 🔑 Save URL per seller
    if (!order.sellerPackingSlips) {
      order.sellerPackingSlips = {};
    }

    order.sellerPackingSlips[sellerId] = url;
    await order.save();

    return url;
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
  

  Mutation: {

  createRazorpayOrder: async (_, { amount }) => {
  try {
    if (!amount || amount <= 0) {
      throw new Error("Invalid amount");
    }
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });
    return order.id;
  } catch (err) {
    console.error("❌ Razorpay Create Error:", err);
    throw new Error("Failed to create Razorpay order");
  }
},

verifyRazorpayPayment: async (
  _,
  { razorpay_order_id, razorpay_payment_id, razorpay_signature, buyerId }
) => {
  try {
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.warn("❌ Razorpay signature mismatch");
      return false;
    }

const order = await Order.findOne({
  "buyer.buyerId": buyerId,
  "payment.mode": "ONLINE",
  "payment.status": { $ne: "paid" },
});

    if (!order || order.payment.status === "paid") {
      console.warn("⚠️ Order not found or already paid");
      return true;
    }
    order.payment.transactionId = razorpay_payment_id;
    order.payment.status = "paid";
    if (!order.invoiceUrl) {
      const { invoiceNo, invoiceUrl } = await generateInvoicePDF(order);
      order.invoiceNo = invoiceNo;
      order.invoiceUrl = invoiceUrl;

      await sendInvoiceEmail({
        to: order.buyer.email,
        orderId: order.orderId,
        invoiceUrl,
      });
    }

    await order.save();
    await createBuyerNotification({
      buyerId: order.buyer.buyerId,
      title: "💳 Payment Successful",
      message: `Invoice for order ${order.orderId} is ready.`,
      type: "payment_verified",
      data: {
        orderId: order.orderId,
        invoiceUrl: order.invoiceUrl,
      },
      url: `/buyer/orders/${order.orderId}`,
    });

    return true;
  } catch (err) {
    console.error("❌ verifyRazorpayPayment error:", err);
    return false;
  }
},

createOrder: async (_, { buyerData, items, paymentData }, { pubsub }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!buyerData?.buyerId || !buyerData?.name)
      throw new Error("Buyer info incomplete");

    if (!items?.length)
      throw new Error("Order must contain items");

    const buyer = await Buyer.findOne(
      { buyerId: buyerData.buyerId }
    ).session(session);

    if (!buyer) throw new Error("Buyer not found");

    const detailedItems = [];

    // 🔁 PROCESS EACH ITEM (ATOMIC + SAFE)
    for (const item of items) {
      const type = item.type.toLowerCase();
      let Model, query;

      if (type === "drone") {
        Model = Drone;
        query = { droneId: item.productId };
      } else if (type === "part") {
        Model = Part;
        query = { partId: item.productId };
      } else if (type === "accessory") {
        Model = Accessory;
        query = { accessoryId: item.productId };
      } else {
        throw new Error(`Invalid product type: ${item.type}`);
      }

      // 🔒 FETCH PRODUCT
      const product = await Model.findOne(query).session(session);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      // 🔥 ATOMIC STOCK CHECK + DECREMENT (ANTI-OVERSELL)
      const updateResult = await Model.updateOne(
        {
          ...query,
          quantity: { $gte: item.quantity },
        },
        {
          $inc: { quantity: -item.quantity },
        },
        { session }
      );

      if (updateResult.modifiedCount === 0) {
        throw new Error(
          `${product.name} is out of stock. Available: ${product.quantity}`
        );
      }

      detailedItems.push({
        productId: item.productId,
        type: item.type,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        sellerId: product.sellerId,
        image: product.image || "",
      });
    }

    // 💰 TOTAL
    const totalAmount = detailedItems.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );

    // 📦 CREATE ORDER
    const order = new Order({
      orderId: `FHO-${Date.now().toString().slice(-8)}`,
      buyer: buyerData,
      items: detailedItems,
      totalAmount,
      payment: {
        mode: paymentData.mode,
        method: paymentData.method || null,
        status: paymentData.status || "pending",
        transactionId: paymentData.transactionId || null,
      },
    });

    await order.save({ session });

    // 🧹 CLEAR CART
    await Cart.deleteMany({ buyerId: buyer.buyerId }).session(session);

    // ✅ COMMIT EVERYTHING
    await session.commitTransaction();
    session.endSession();

    /* =======================
       🔔 NOTIFICATIONS (POST-COMMIT)
       ======================= */

    const HIGH_VALUE_LIMIT = process.env.HIGH_VALUE_ORDER_LIMIT || 50000;

    if (totalAmount >= HIGH_VALUE_LIMIT) {
      const admins = await Admin.find();
      const adminTokens = admins.flatMap(a => a.fcmTokens || []);

      if (adminTokens.length > 0) {
        await sendBuyerPush(
          adminTokens,
          "⚠️ High-Value Order Alert",
          `Order ${order.orderId} worth ₹${totalAmount} placed.`,
          { orderId: order.orderId, type: "high_value_order" }
        );
      }
    }

    await createBuyerNotification({
      buyerId: buyer.buyerId,
      title: "🛍 Order Placed Successfully",
      message: `Your order ${order.orderId} has been placed.`,
      type: "order_created",
      data: { orderId: order.orderId },
      url: `/buyer/orders/${order.orderId}`,
    });

    if (buyer.fcmTokens?.length > 0) {
      await sendBuyerPush(
        buyer.fcmTokens,
        "🛍 Order Placed!",
        `Your order ${order.orderId} has been placed successfully.`,
        { orderId: order.orderId, type: "order_created" }
      );
    }

    // 🧑‍💼 SELLER NOTIFICATIONS
    const sellerIds = [...new Set(detailedItems.map(i => i.sellerId))];
    const sellers = await Seller.find({ customId: sellerIds });

    for (const seller of sellers) {
      if (seller.email) {
        await sendSellerStatusMail({
          to: seller.email,
          productType: "Order",
          productName: `New Order from ${buyer.name}`,
          status: "new",
        });
      }

      await createSellerNotification({
        sellerId: seller.customId,
        title: "🛒 New Order Received",
        message: `New order from ${buyer.name}. Order ID: ${order.orderId}`,
        type: "new_order",
        data: { orderId: order.orderId },
        url: `/seller/orders/${order.orderId}`,
        pubsub,
      });

      if (seller.fcmTokens?.length > 0) {
        await sendSellerPush(
          seller.fcmTokens,
          "🛒 New Order Received",
          `New order from ${buyer.name}. Order ID: ${order.orderId}`,
          { orderId: order.orderId, type: "new_order" }
        );
      }
    }

    return order;

  } catch (err) {
    // 🔁 FULL ROLLBACK
    await session.abortTransaction();
    session.endSession();

    console.error("❌ Order Create Error:", err);
    throw new Error("Failed to create order: " + err.message);
  }
},


updateOrderStatus: async (
  _,
  { orderId, status, trackingNumber },
  { pubsub }
) => {
  const order = await Order.findOne({ orderId });
  if (!order) throw new Error("Order not found");
  order.items.forEach(item => {
    if (item.status !== "rejected") {
      item.status = status;
    }
  });
  if (status === ORDER_STATUS.SHIPPED && trackingNumber) {
    order.trackingNumber = trackingNumber;
  }

//   if (status === ORDER_STATUS.SHIPPED) {
//   const shiprocket = await createShiprocketOrder(order);

//   order.trackingNumber = shiprocket.trackingNumber;
//   order.trackingProvider = "SHIPROCKET";
// }

if (status === ORDER_STATUS.PACKED) {
  const sellerIds = [...new Set(order.items.map(i => i.sellerId))];

  for (const sellerId of sellerIds) {
    if (!order.sellerPackingSlips?.get(sellerId)) {
      const url = await createSellerPackingSlip(order, sellerId);
      order.sellerPackingSlips.set(sellerId, url);
    }
  }
}

  const allDelivered = order.items.every(i => i.status === "delivered");
  const allRejected  = order.items.every(i => i.status === "rejected");
  if (allDelivered) {
    order.status = "delivered";
    order.payoutStatus = "processing";
  } else if (allRejected) {
    order.status = "rejected";
  } else {
    order.status = status;
  }
  await order.save();
  const buyer = await Buyer.findOne({ buyerId: order.buyer.buyerId });
  const titleMap = {
    packed: "📦 Your Order is Packed",
    shipped: "🚚 Your Order is on the Way",
    delivered: "📬 Order Delivered",
  };
  const messageMap = {
    packed: `Your order ${orderId} has been packed.`,
    shipped: `Your order ${orderId} has been shipped.${
      order.trackingNumber ? ` Tracking No: ${order.trackingNumber}` : ""
    }`,
    delivered: `Your order ${orderId} was delivered successfully.`,
  };
  const title = titleMap[status];
  const message = messageMap[status];
  await createBuyerNotification({
    buyerId: buyer.buyerId,
    title,
    message,
    type: "order_update",
    data: { orderId, status, trackingNumber: order.trackingNumber },
    url: `/buyer/orders/${orderId}`,
  });
  if (buyer?.fcmTokens?.length) {
    await sendBuyerPush(buyer.fcmTokens, title, message, {
      orderId,
      status,
      trackingNumber: order.trackingNumber,
      type: "order_update",
    });
  }
  const sellers = await Seller.find({
    customId: { $in: order.items.map(i => i.sellerId) },
  });
  for (const seller of sellers) {
    if (seller.fcmTokens?.length) {
      await sendSellerPush(
        seller.fcmTokens,
        `Order ${status.toUpperCase()}`,
        `Order ${orderId} status updated to ${status}`,
        { orderId, status }
      );
    }
  }
  if (status === ORDER_STATUS.SHIPPED) {
    await sendWhatsappMessage(
      buyer.phone,
      `🚚 Your Flyhub order ${orderId} has been shipped.${
        order.trackingNumber ? ` Tracking No: ${order.trackingNumber}` : ""
      }`
    );
  }
  if (status === ORDER_STATUS.DELIVERED) {
    await sendWhatsappMessage(
      buyer.phone,
      `📬 Your Flyhub order ${orderId} has been delivered. Thank you for shopping with Flyhub!`
    );
  }
  pubsub.publish("ORDER_STATUS_UPDATED", {
    orderStatusUpdated: order,
  });
  return order;
},

confirmOrderDelivery: async (_, { orderId, buyerId }, { pubsub }) => {
  const order = await Order.findOne({ orderId });
  if (!order) throw new Error("Order not found");

  if (order.buyer.buyerId !== buyerId) {
    throw new Error("Unauthorized");
  }
  if (order.status !== "shipped") {
    throw new Error("Order not eligible for delivery confirmation");
  }
  order.items.forEach(i => {
    if (i.status !== "rejected") {
      i.status = "delivered";
    }
  });
  order.status = "delivered";
  order.payoutStatus = "processing";
  await order.save();
  const sellers = await Seller.find({
    customId: { $in: order.items.map(i => i.sellerId) },
  });
  for (const seller of sellers) {
    if (seller.fcmTokens?.length) {
      await sendSellerPush(
        seller.fcmTokens,
        "📦 Order Delivered",
        `Order ${orderId} marked delivered by buyer`,
        { orderId }
      );
    }
  }
  pubsub.publish("ORDER_DELIVERED", { orderDelivered: order });
  return order;
},


rejectOrderBySeller: async (
  _,
  { orderId, sellerId, reason },
  { pubsub }
) => {
  if (!reason || reason.trim().length < 3) {
    throw new Error("Rejection reason is required");
  }
  const order = await Order.findOne({ orderId });
  if (!order) throw new Error("Order not found");

  let rejectedCount = 0;

  order.items.forEach(item => {
    if (item.sellerId === sellerId) {
      item.status = "rejected";
      item.rejectReason = reason;
      rejectedCount++;
    }
  });
  if (!rejectedCount) {
    throw new Error("Seller has no items in this order");
  }
  const allRejected = order.items.every(i => i.status === "rejected");
  if (allRejected) {
    order.status = "rejected";

    if (order.payment.mode === "ONLINE") {
      order.payment.status = "refunded";
    }
  }
  await order.save();
  const buyer = await Buyer.findOne({ buyerId: order.buyer.buyerId });
  const seller = await Seller.findOne({ customId: sellerId });
  await createBuyerNotification({
    buyerId: buyer.buyerId,
    title: "❌ Order Rejected",
    message: `Seller rejected your order. Reason: ${reason}`,
    type: "order_rejected",
    data: { orderId, sellerId, reason },
    url: `/buyer/orders/${orderId}`,
  });

  if (buyer?.fcmTokens?.length) {
    await sendBuyerPush(
      buyer.fcmTokens,
      "❌ Order Rejected",
      `Seller rejected your order: ${reason}`,
      { orderId }
    );
  }
  if (seller?.fcmTokens?.length) {
    await sendSellerPush(
      seller.fcmTokens,
      "Order Rejected",
      `You rejected order ${orderId}`,
      { orderId }
    );
  }
  await sendWhatsappMessage(
    buyer.phone,
    `❌ Flyhub Update: Order ${orderId} was rejected.\nReason: ${reason}`
  );

  pubsub.publish("ORDER_REJECTED", {
    orderRejected: order,
  });

  return order;
},
cancelOrder: async (_, { orderId, buyerId, reason }, { pubsub }) => {
  if (!reason || reason.trim().length < 3) {
    throw new Error("Cancellation reason is required");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findOne({ orderId }).session(session);
    if (!order) throw new Error("Order not found");

    if (order.buyer.buyerId !== buyerId) {
      throw new Error("Unauthorized cancellation attempt");
    }

    if (order.status === ORDER_STATUS.DELIVERED) {
      throw new Error("Delivered orders cannot be cancelled");
    }

    if (order.status === ORDER_STATUS.CANCELLED) {
      throw new Error("Order already cancelled");
    }

    /* ================= RESTORE STOCK ================= */
    for (const item of order.items) {
      let Model, query;

      if (item.type.toLowerCase() === "drone") {
        Model = Drone;
        query = { droneId: item.productId };
      } else if (item.type.toLowerCase() === "part") {
        Model = Part;
        query = { partId: item.productId };
      } else if (item.type.toLowerCase() === "accessory") {
        Model = Accessory;
        query = { accessoryId: item.productId };
      } else {
        continue;
      }

      const updated = await Model.findOneAndUpdate(
        query,
        { $inc: { quantity: item.quantity } },
        { new: true, session }
      );

      // 🔔 REAL-TIME STOCK UPDATE
      if (updated) {
        pubsub.publish("STOCK_UPDATED", {
          stockUpdated: {
            productId: item.productId,
            type: item.type,
            quantity: updated.quantity,
          },  
        });
      }
    }

    /* ================= UPDATE ORDER ================= */
    order.status = ORDER_STATUS.CANCELLED;
    order.cancelReason = reason;

    order.items.forEach((item) => {
      if (item.status !== "delivered") {
        item.status = "cancelled";
      }
    });

    if (order.payment.mode === "ONLINE") {
      order.payment.status = "refunded";
    }

    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    /* ================= BUYER NOTIFICATION ================= */
    const buyer = await Buyer.findOne({ buyerId });

    await createBuyerNotification({
      buyerId,
      title: "❌ Order Cancelled",
      message: `Your order ${orderId} was cancelled.\nReason: ${reason}`,
      type: "order_cancelled",
      data: { orderId, reason },
      url: `/buyer/orders/${orderId}`,
    });

    if (buyer?.fcmTokens?.length) {
      await sendBuyerPush(
        buyer.fcmTokens,
        "❌ Order Cancelled",
        `Order cancelled: ${reason}`,
        { orderId, type: "order_cancelled" }
      );
    }

    /* ================= SELLER NOTIFICATION ================= */
    const sellers = await Seller.find({
      customId: { $in: order.items.map((i) => i.sellerId) },
    });

    for (const seller of sellers) {
      await createSellerNotification({
        sellerId: seller.customId,
        title: "❌ Order Cancelled by Buyer",
        message: `Order ${orderId} cancelled.\nReason: ${reason}`,
        type: "order_cancelled",
        data: { orderId, reason },
        url: `/seller/orders/${orderId}`,
        pubsub,
      });

      if (seller.fcmTokens?.length) {
        await sendSellerPush(
          seller.fcmTokens,
          "❌ Order Cancelled",
          `Order ${orderId} cancelled by buyer`,
          { orderId, type: "order_cancelled" }
        );
      }
    }

    /* ================= WHATSAPP ================= */
    await sendWhatsappMessage(
      buyer.phone,
      `❌ Flyhub Update\nOrder ${orderId} cancelled.\nReason: ${reason}`
    );

    /* ================= REAL-TIME ORDER EVENT ================= */
    pubsub.publish("ORDER_CANCELLED", {
      orderCancelled: order,
    });

    return order;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw new Error(err.message);
  }
},
  },
Subscription: {
  stockUpdated: {
    subscribe: (_, __, { pubsub }) =>
      pubsub.asyncIterator(["STOCK_UPDATED"]),
  },
},

};
