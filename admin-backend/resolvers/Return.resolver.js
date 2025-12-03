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
  return `FHR${count + 1}`; // Flyhub Return ID
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
            const sellerId = item?.sellerId;

            const seller = sellerId
              ? await Seller.findOne({ customId: sellerId }).select(
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
        console.error("❌ Error fetching return requests:", err);
        throw new Error("Failed to fetch return requests");
      }
    },

    returnRequestsByStatus: async (_, { status }) => {
      const validStatuses = ["requested", "approved", "rejected", "completed"];
      if (!validStatuses.includes(status))
        throw new Error(
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        );

      const returns = await ReturnRequest.find({ status }).sort({
        createdAt: -1,
      });
      return returns;
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
        const buyerId = order.buyer?.buyerId || null;
        const returnId = await generateReturnId();

        let proofUrl = data.proofUrl || null;
        if (data.proofFile?.file) {
          proofUrl = await uploadSingleFile(data.proofFile.file, "return-proofs");
        }

        const newReturn = await ReturnRequest.create({
          returnId,
          ...data,
          proofUrl,
          sellerId,
          buyerId,
          status: "requested",
        });

        const seller = await Seller.findOne({ customId: sellerId }).select(
          "customId name phoneNumber email address"
        );

        await createSellerNotification({
          sellerId,
          title: "📦 New Return Request",
          message: `A buyer has requested a return for product "${item.name}".`,
          type: "return_request",
          data: { returnId, orderId: data.orderId, productId: data.productId },
          url: `/seller/returns/${returnId}`,
          pubsub,
        });

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
        console.error("❌ Error creating return request:", err);
        throw new Error("Failed to create return request: " + err.message);
      }
    },

    updateReturnRequest: async (_, { returnId, data }, { pubsub }) => {
      try {
        const existing = await ReturnRequest.findOne({ returnId });
        if (!existing) throw new Error("Return request not found");

        // ✅ If a new proof file is uploaded, delete the old one
        if (data.proofFile?.file) {
          if (existing.proofUrl) {
            await deleteFirebaseFile(existing.proofUrl);
          }
          data.proofUrl = await uploadSingleFile(
            data.proofFile.file,
            "return-proofs"
          );
        }

        Object.assign(existing, data);
        const updated = await existing.save();

        const seller = await Seller.findOne({ customId: updated.sellerId });

        await createSellerNotification({
          sellerId: updated.sellerId,
          title: "♻️ Return Updated",
          message: `Return request ${updated.returnId} has been updated.`,
          type: "return_update",
          data: { returnId: updated.returnId },
          url: `/seller/returns/${updated.returnId}`,
          pubsub,
        });

        return {
          ...updated.toObject(),
          seller: seller
            ? {
                sellerId: seller.customId,
                name: seller.name,
                phone: seller.phoneNumber,
                email: seller.email,
                address: seller.address,
              }
            : null,
        };
      } catch (err) {
        console.error("❌ Error updating return request:", err);
        throw new Error("Failed to update return request: " + err.message);
      }
    },

    updateReturnStatus: async (_, { returnId, status }, { pubsub }) => {
      try {
        const validStatuses = ["requested", "approved", "rejected", "completed"];
        if (!validStatuses.includes(status))
          throw new Error(
            `Invalid status. Must be one of: ${validStatuses.join(", ")}`
          );

        const updated = await ReturnRequest.findOneAndUpdate(
          { returnId },
          { status },
          { new: true }
        );
        if (!updated) throw new Error("Return request not found");

        const seller = await Seller.findOne({ customId: updated.sellerId });

        if (seller?.email) {
          await sendSellerStatusMail({
            to: seller.email,
            productType: "Return Request",
            productName: updated.productName || "Product",
            status,
          });
        }

        await createSellerNotification({
          sellerId: updated.sellerId,
          title:
            status === "approved"
              ? "✅ Return Approved"
              : status === "rejected"
              ? "❌ Return Rejected"
              : status === "completed"
              ? "📬 Return Completed"
              : "ℹ️ Return Status Updated",
          message: `Return request ${updated.returnId} is now marked as "${status}".`,
          type: "return_status",
          data: { returnId, status },
          url: `/seller/returns/${returnId}`,
          pubsub,
        });

        return updated;
      } catch (err) {
        console.error("❌ Error updating return status:", err);
        throw new Error("Failed to update return status: " + err.message);
      }
    },

    deleteReturn: async (_, { returnId }, { pubsub }) => {
      try {
        const deleted = await ReturnRequest.findOneAndDelete({ returnId });
        if (!deleted) throw new Error("Return request not found");

        // ✅ Delete proof from Firebase if exists
        if (deleted.proofUrl) {
          await deleteFirebaseFile(deleted.proofUrl);
        }

        await createSellerNotification({
          sellerId: deleted.sellerId,
          title: "🗑️ Return Deleted",
          message: `Return request ${deleted.returnId} has been deleted from the system.`,
          type: "return_deleted",
          data: { returnId },
          url: `/seller/returns`,
          pubsub,
        });

        return deleted;
      } catch (err) {
        console.error("❌ Error deleting return:", err);
        throw new Error("Failed to delete return: " + err.message);
      }
    },
  },
};
