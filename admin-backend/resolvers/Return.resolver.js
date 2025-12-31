import { ReturnRequest } from "../models/Return.model.js";
import { Seller } from "../models/Seller.model.js";
import { Order } from "../models/Order.model.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";
import { sendSellerStatusMail } from "../utils/emailService.js";
import { sendPushNotification as sendSellerPush } from "../utils/SendPushNotification.js";

import {
  uploadSingleFile,
  deleteFirebaseFile,
} from "../utils/uploadToFirebase.js";

async function generateReturnId() {
  const count = await ReturnRequest.countDocuments();
  return `FHR${count + 1}`;
}

export const returnResolvers = {
  Query: {
    returnRequests: async () => {
      try {
        const returns = await ReturnRequest.find().sort({ createdAt: -1 });

        const populated = await Promise.all(
          returns.map(async (ret) => {
            const order = await Order.findOne({ orderId: ret.orderId });

            if (!order) return ret;

            const item = order.items.find((i) => i.productId === ret.productId);

            const seller = item?.sellerId
              ? await Seller.findOne({ customId: item.sellerId }).select(
                  "customId name phoneNumber email address"
                )
              : null;

            return {
              ...ret.toObject(),
              seller: seller
                ? {
                    sellerId: seller.customId,
                    name: seller.name,
                    phone: seller.phoneNumber,
                    email: seller.email,
                    address: seller.address,
                  }
                : null,
              buyer: order.buyer || null,
            };
          })
        );

        return populated;
      } catch (err) {
        console.error("❌ Error:", err);
        throw new Error("Failed to fetch return requests");
      }
    },
  },

Mutation: {
    requestReturn: async (_, { data }, { pubsub }) => {
      try {
        const order = await Order.findOne({ orderId: data.orderId });
        if (!order) throw new Error("Order not found");

        const item = order.items.find((i) => i.productId === data.productId);
        if (!item) throw new Error("Product not found in order");

        const sellerId = item.sellerId;
        const buyerId = order.buyer?.buyerId;

        const returnId = await generateReturnId();

        let proofUrl = data.proofUrl || null;
        if (data.proofFile?.file) {
          proofUrl = await uploadSingleFile(data.proofFile.file, "return-proofs");
        }

        const newReturn = await ReturnRequest.create({
          returnId,
          ...data,
          proofUrl,
          status: "requested",
        });

        let seller = null;
        if (seller) {
  await createSellerNotification({
    sellerId: seller.customId,
    title: "📦 New Return Request",
    message: `A buyer requested return for "${item.name}".`,
    type: "return_request",
    data: { returnId, orderId: data.orderId, productId: data.productId },
    url: `/seller/returns/${returnId}`,
    pubsub,
  });

  // 🔔 PUSH NOTIFICATION (NEW)
  if (seller.fcmTokens?.length) {
    await sendSellerPush(
      seller.fcmTokens,
      "📦 New Return Request",
      `Return requested for "${item.name}".`,
      {
        returnId,
        orderId: data.orderId,
        productId: data.productId,
        type: "return_request",
      }
    );
  }
}
        return {
          ...newReturn.toObject(),

          seller: seller
            ? {
                sellerId: seller.customId,
                name: seller.name,
                phone: seller.phoneNumber,
                email: seller.email,
                address: seller.address,
              }
            : null,
          buyer: order.buyer || null,
        };
      } catch (err) {
        throw new Error("Failed to create return request: " + err.message);
      }
    },
    updateReturnStatus: async (_, { returnId, status }, { pubsub }) => {
  try {
    const validStatuses = ["requested", "approved", "rejected", "picked", "refunded"];
    if (!validStatuses.includes(status))
      throw new Error(`Invalid status. Allowed: ${validStatuses.join(", ")}`);

    const ret = await ReturnRequest.findOne({ returnId });
    if (!ret) throw new Error("Return request not found");

    ret.status = status;
    await ret.save();

    const order = await Order.findOne({ orderId: ret.orderId });
    const item = order?.items.find((i) => i.productId === ret.productId);

    let seller = null;
    if (item?.sellerId) {
      seller = await Seller.findOne({ customId: item.sellerId });

      if (seller) {
        /* 🔔 DB Notification */
        await createSellerNotification({
          sellerId: seller.customId,
          title: "🔄 Return Status Updated",
          message: `Return request ${returnId} is now "${status}".`,
          type: "return_status",
          data: { returnId, status },
          url: `/seller/returns/${returnId}`,
          pubsub,
        });

        /* 📧 Email */
        await sendSellerStatusMail({
          to: seller.email,
          productType: "Return",
          productName: item.name,
          status,
        });

        /* 📲 Push */
        if (seller.fcmTokens?.length) {
          await sendSellerPush(
            seller.fcmTokens,
            "🔄 Return Status Updated",
            `Return ${returnId} status changed to "${status}".`,
            {
              returnId,
              status,
              type: "return_status",
            }
          );
        }
      }
    }

    return {
      ...ret.toObject(),
      seller: seller
        ? {
            sellerId: seller.customId,
            name: seller.name,
            phone: seller.phoneNumber,
            email: seller.email,
            address: seller.address,
          }
        : null,
      buyer: order?.buyer || null,
    };
  } catch (err) {
    throw new Error("Failed to update return status: " + err.message);
  }
},

deleteReturn: async (_, { returnId }, { pubsub }) => {
  try {
    const ret = await ReturnRequest.findOne({ returnId });
    if (!ret) throw new Error("Return request not found");

    if (ret.proofUrl) {
      await deleteFirebaseFile(ret.proofUrl);
    }

    const order = await Order.findOne({ orderId: ret.orderId });
    const item = order?.items.find((i) => i.productId === ret.productId);

    if (item?.sellerId) {
      const seller = await Seller.findOne({ customId: item.sellerId });

      if (seller) {
        await createSellerNotification({
          sellerId: seller.customId,
          title: "🗑 Return Deleted",
          message: `Return request ${returnId} has been deleted.`,
          type: "return_deleted",
          data: { returnId },
          url: `/seller/returns`,
          pubsub,
        });

        if (seller.fcmTokens?.length) {
          await sendSellerPush(
            seller.fcmTokens,
            "🗑 Return Deleted",
            `Return request ${returnId} has been removed.`,
            {
              returnId,
              type: "return_deleted",
            }
          );
        }
      }
    }

    await ReturnRequest.deleteOne({ returnId });

    return {
      success: true,
      message: `Return request ${returnId} deleted successfully.`,
    };
  } catch (err) {
    throw new Error("Failed to delete return request: " + err.message);
  }
},

  },
};