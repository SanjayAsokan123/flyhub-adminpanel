import { Service } from "../models/Service.model.js";
import { Seller } from "../models/Seller.model.js";
import { sendSellerStatusMail } from "../utils/emailService.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";
import { sendPushNotification } from "../utils/SendPushNotification.js";
import {
  uploadSingleFile,
  deleteFirebaseFile,
} from "../utils/uploadToFirebase.js";

export const serviceResolvers = {
  Query: {

    services: async () => {
      try {
        const services = await Service.find().sort({ createdAt: -1 });
        return Promise.all(
          services.map(async (s) => {
            const seller = await Seller.findOne({ customId: s.sellerId });
            return {
              ...s.toObject(),
              sellerInfo: seller
                ? { email: seller.email, phoneNumber: seller.phoneNumber }
                : null,
            };
          })
        );
      } catch (error) {
        console.error("❌ Error fetching services:", error);
        throw new Error("Failed to fetch services: " + error.message);
      }
    },

    service: async (_, { serviceId }) => {
      try {
        const s = await Service.findOne({ serviceId });
        if (!s) throw new Error("Service not found");

        const seller = await Seller.findOne({ customId: s.sellerId });
        return {
          ...s.toObject(),
          sellerInfo: seller
            ? { email: seller.email, phoneNumber: seller.phoneNumber }
            : null,
        };
      } catch (error) {
        console.error("❌ Error fetching service:", error);
        throw new Error("Failed to fetch service: " + error.message);
      }
    },

    approvedServices: async (_, { sellerId }) =>
      Service.find({ sellerId, status: "approved" }),
    pendingServices: async (_, { sellerId }) =>
      Service.find({ sellerId, status: "pending" }),
    rejectedServices: async (_, { sellerId }) =>
      Service.find({ sellerId, status: "rejected" }),
  },

  Mutation: {
    createService: async (_, { input }, { pubsub }) => {
      try {
        const allowedFields = [
          "name",
          "specificDrone",
          "experience",
          "location",
          "description",
          "price",
          "image",
          "sellerId",
        ];

        const data = Object.fromEntries(
          Object.entries(input).filter(([key]) => allowedFields.includes(key))
        );

        if (input.imageFile?.file) {
          data.image = await uploadSingleFile(input.imageFile.file, "services");
        }

        const count = await Service.countDocuments();
        data.serviceId = count + 1;
        data.status = "pending";

        const seller = await Seller.findOne({ customId: data.sellerId });
        if (!seller) throw new Error("Seller not found");

        const saved = await new Service(data).save();

        await createSellerNotification({
          sellerId: seller.customId,
          title: "🛠️ New Service Added",
          message: `Your service "${saved.name}" has been submitted for review.`,
          type: "service_submission",
          data: { serviceId: saved.serviceId },
          url: `/seller/services/${saved.serviceId}`,
          pubsub,
        });

        await createSellerNotification({
          sellerId: "ADMIN",
          title: "🆕 New Service Pending Review",
          message: `A new service "${saved.name}" was added by seller "${seller.name}".`,
          type: "service_pending",
          data: { serviceId: saved.serviceId },
          url: `/admin/services/${saved.serviceId}`,
          pubsub,
        });

        return {
          ...saved.toObject(),
          sellerInfo: {
            email: seller.email,
            phoneNumber: seller.phoneNumber,
          },
        };
      } catch (error) {
        console.error("❌ Create Service Error:", error);
        throw new Error("Failed to add service: " + error.message);
      }
    },

    updateService: async (_, { serviceId, input }) => {
      try {
        const allowedFields = [
          "name",
          "specificDrone",
          "experience",
          "location",
          "description",
          "price",
          "image",
          "sellerId",
          "status",
        ];

        const updateData = Object.fromEntries(
          Object.entries(input).filter(([key]) => allowedFields.includes(key))
        );

        const existing = await Service.findOne({ serviceId });
        if (!existing) throw new Error("Service not found");

        if (input.imageFile?.file) {
          if (existing.image) {
            await deleteFirebaseFile(existing.image);
          }
          updateData.image = await uploadSingleFile(
            input.imageFile.file,
            "services"
          );
        }

        const updated = await Service.findOneAndUpdate(
          { serviceId },
          updateData,
          { new: true, runValidators: true }
        );
        if (!updated) throw new Error("Service not found");

        const seller = await Seller.findOne({ customId: updated.sellerId });

        return {
          ...updated.toObject(),
          sellerInfo: seller
            ? { email: seller.email, phoneNumber: seller.phoneNumber }
            : null,
        };
      } catch (error) {
        console.error("❌ Error updating service:", error);
        throw new Error("Failed to update service: " + error.message);
      }
    },

    updateServiceStatus: async (_, { serviceId, status }, { pubsub }) => {
      try {
        const validStatuses = ["pending", "approved", "rejected"];
        if (!validStatuses.includes(status.toLowerCase())) {
          throw new Error(
            "Invalid status. Must be pending, approved, or rejected."
          );
        }

        const updated = await Service.findOneAndUpdate(
          { serviceId },
          { status },
          { new: true }
        );
        if (!updated) throw new Error("Service not found");

        const seller = await Seller.findOne({ customId: updated.sellerId });

        if (seller?.email) {
          await sendSellerStatusMail({
            to: seller.email,
            productType: "Service",
            productName: updated.name,
            status,
          });
        }

        if(status==="approved")
             {
             await sendPushNotification(
             seller.fcmTokens,
             "Seller approved",
             "Explore your profile page and Thank you"
             );
             }
             else if(status==="approved")
                  {
                  await sendPushNotification(
                  seller.fcmTokens,
                  "Seller rejected",
                  "Please contact admin for more info"
                  );
                  }

        return {
          ...updated.toObject(),
          sellerInfo: seller
            ? { email: seller.email, phoneNumber: seller.phoneNumber }
            : null,
        };
      } catch (err) {
        console.error("❌ Error updating service status:", err);
        throw new Error("Failed to update service status: " + err.message);
      }
    },

    deleteService: async (_, { serviceId }, { pubsub }) => {
      try {
        const deleted = await Service.findOneAndDelete({ serviceId });
        if (!deleted) throw new Error("Service not found");

        if (deleted.image) {
          await deleteFirebaseFile(deleted.image);
        }

        const seller = await Seller.findOne({ customId: deleted.sellerId });

        await createSellerNotification({
          sellerId: deleted.sellerId,
          title: "🗑️ Service Deleted",
          message: `Your service "${deleted.name}" has been removed from the system.`,
          type: "service_deleted",
          data: { serviceId },
          url: `/seller/services`,
          pubsub,
        });

        return {
          ...deleted.toObject(),
          sellerInfo: seller
            ? { email: seller.email, phoneNumber: seller.phoneNumber }
            : null,
        };
      } catch (error) {
        console.error("❌ Error deleting service:", error);
        throw new Error("Failed to delete service: " + error.message);
      }
    },
  },
};