import {Seller} from "../models/Seller.model.js";
import {Service} from "../models/Service.model.js";
import {Accessory} from "../models/Accessories.model.js";
import {Part} from "../models/Parts.model.js";
import {HireJob} from "../models/Hirejob.model.js";
import {Rental} from "../models/Rental.model.js";
import {Hirepilot} from "../models/Hirepilot.model.js";

export const getSellerProductsUpdateResolver = {
  Mutation: {
    SellerProductsUpdate: async (_, args) => {
      const { customId, drone, part, accessory, service, hirePilot, hireJob } = args;

      const seller = await Seller.findOne({ customId });
      if (!seller) throw new Error("Seller not found");

      // 🔹 Update each product only if data is provided
      if (drone) {
        await Rental.findOneAndUpdate(
          { sellerId: customId, droneId: drone.droneId },
          { $set: drone },
          { new: true }
        );
      }

      if (part) {
        await Part.findOneAndUpdate(
          { sellerId: customId, partId: part.partId },
          { $set: part },
          { new: true }
        );
      }

      if (accessory) {
        await Accessory.findOneAndUpdate(
          { sellerId: customId, accessoryId: accessory.accessoryId },
          { $set: accessory },
          { new: true }
        );
      }

      if (service) {
        await Service.findOneAndUpdate(
          { sellerId: customId },
          { $set: service },
          { new: true }
        );
      }

      if (hirePilot) {
        await Hirepilot.findOneAndUpdate(
          { sellerId: customId, pilotId: hirePilot.pilotId },
          { $set: hirePilot },
          { new: true }
        );
      }

      if (hireJob) {
        await HireJob.findOneAndUpdate(
          { sellerId: customId, jobId: hireJob.jobId },
          { $set: hireJob },
          { new: true }
        );
      }

      // 🔹 Return updated data
       if (updated.length === 0) {
        return {
          success: false,
          message: "No update data provided"
        };
      }

      return {
        success: true,
        message: `${updated.join(", ")} updated successfully`
      };
    },
  },
};
    