import { ReturnRequest } from "../models/Return.model.js";
import { Seller } from "../models/Seller.model.js";
import { Order } from "../models/Order.model.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";
import { sendSellerStatusMail } from "../utils/emailService.js";
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
        if (sellerId) {
          seller = await Seller.findOne({ customId: sellerId }).select(
            "customId name phoneNumber email address"
          );

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
            await createSellerNotification({
              sellerId: seller.customId,
              title: "🔄 Return Status Updated",
              message: `Return request ${returnId} is now "${status}".`,
              type: "return_status",
              data: { returnId, status },
              url: `/seller/returns/${returnId}`,
              pubsub,
            });

            await sendSellerStatusMail({
              to: seller.email,
              subject: "Return Status Updated",
              message: `The return request ${returnId} status changed to ${status}.`,
            });
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
deleteReturn: async (_, { returnId }) => {
  try {
    const ret = await ReturnRequest.findOne({ returnId });
    if (!ret) throw new Error("Return request not found");

    if (ret.proofUrl) {
      await deleteFirebaseFile(ret.proofUrl);
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