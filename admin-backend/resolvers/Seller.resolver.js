// backend/resolvers/sellerResolvers.js
import { Seller } from "../models/Seller.model.js";
import { sendSellerStatusMail } from "../utils/emailService.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";
import { createLoginIndex, deleteLoginIndex } from "../utils/loginIndex.js";
import admin, { auth, firestore } from "../middleware/firebaseAdmin.js";
import {sendPushNotification} from "../utils/SendPushNotification.js";
import { Rental } from "../models/Rental.model.js";
import { HirePilot } from "../models/Hirepilot.model.js";
import {HireJob} from "../models/Hirejob.model.js";
import { Service } from "../models/Service.model.js";
import {Part} from "../models/Parts.model.js";
import {Accessory} from "../models/Accessories.model.js";
import {Drone} from "../models/Drone.model.js";
const messaging = admin.messaging();


function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeAddresses(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return [String(value).trim()];
}
async function sendPushToSeller(tokens, status, customId) {
  if (!tokens || tokens.length === 0) return;

  const isApproved = status === "approved";
  const title = isApproved ? "✅ Account Approved!" : "❌ Account Update";
  const body = isApproved
    ? "Your seller account is now live. Tap to start selling."
    : "Your seller account application was rejected.";

  const message = {
    notification: {
      title,
      body,
    },
    data: {
      type: "seller_status",
      customId,
      status,
      click_action: "FLUTTER_NOTIFICATION_CLICK",
    },
    tokens,
  };

  try {
    const response = await messaging.sendEachForMulticast(message);
    console.log(
      `📩 FCM sent: ${response.successCount} successes, ${response.failureCount} failures.`
    );

    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) failedTokens.push(tokens[idx]);
      });
      console.log("⚠ Failed tokens:", failedTokens);
    }
  } catch (error) {
    console.error("❌ Error sending FCM:", error);
  }
}

async function resolveAndPersistFirebaseUid(seller) {
  try {
    if (!seller) return null;

    if (seller.firebaseUid) return seller.firebaseUid;

    if (seller.email && isValidEmail(seller.email)) {
      try {
        const userRecord = await auth.getUserByEmail(seller.email);
        if (userRecord?.uid) seller.firebaseUid = userRecord.uid;
      } catch (err) {
      }
    }

    if (!seller.firebaseUid && seller.phoneNumber) {
      try {
        const userRecord = await auth.getUserByPhoneNumber(seller.phoneNumber);
        if (userRecord?.uid) seller.firebaseUid = userRecord.uid;
      } catch (err) {
      }
    }

    if (seller.firebaseUid) {
      if (seller.isModified && typeof seller.save === "function") {
        try {
          await seller.save();
        } catch (err) {
          console.warn("⚠ Could not save seller after resolving firebaseUid:", err.message);
        }
      }

      try {
        await createLoginIndex({
          uid: seller.firebaseUid,
          email: seller.email,
          phone: seller.phoneNumber,
          sellerId: seller.customId,
        });
      } catch (err) {
        console.warn("⚠ loginIndex error:", err.message);
      }

      return seller.firebaseUid;
    }

    return null;
  } catch (err) {
    console.warn("⚠ resolveAndPersistFirebaseUid failed:", err?.message || err);
    return null;
  }
}

export const sellerResolvers = {
  Query: {
    getSellers: async () => {
      return await Seller.find().sort({ createdAt: -1 });
    },

    getSeller: async (_, { customId }) => {
      if (!customId) throw new Error("customId is required");
      const seller =
        (await Seller.findOne({ customId })) || (await Seller.findById(customId));
      if (!seller) throw new Error("Seller not found");
      return seller;
    },

    getSellersByStatus: async (_, { status = "pending" }) => {
      const valid = ["pending", "approved", "rejected"];
      const normalized = String(status || "").trim().toLowerCase();
      if (!valid.includes(normalized))
        throw new Error(`Status must be one of: ${valid.join(", ")}`);
      return await Seller.find({ status: normalized }).sort({ createdAt: -1 });
    },

    sellerByEmail: async (_, { email, username, phone, customId }) => {
      if (!email && !username && !phone && !customId)
        throw new Error("Provide email OR username OR phone OR customId");

      const query = {
        $or: [
          email ? { email } : null,
          username ? { name: username } : null,
          phone ? { phoneNumber: phone } : null,
          customId ? { customId } : null,
        ].filter(Boolean),
      };

      let seller = await Seller.findOne(query);

      if (!seller) {
        const autoEmail =
          (email && isValidEmail(email)) ||
          (username ? `${username}@autogen.flyhub` : null) ||
          (phone ? `${phone}@autogen.flyhub` : `autogen_${Date.now()}@flyhub`);
        seller = new Seller({
          email: autoEmail,
          name: username || "New Seller",
          companyName: "Pending Store",
          PANnumber: "PENDING",
          address: "Pending Address",
          phoneNumber: phone || "",
          gstNumber: "",
          shippingAddresses: [],
          pickupAddresses: [],
          status: "pending",
        });

        await seller.save();
        await resolveAndPersistFirebaseUid(seller);
      }

      return seller;
    },
  },

  Mutation: {
    createSeller: async (_, { input }, { pubsub }) => {
      if (!input.name?.trim()) throw new Error("Name required");
      if (!input.companyName?.trim()) throw new Error("companyName required");

      const name = (input.name || "").trim();
      const companyName = (input.companyName || "").trim();
      const phoneNumber = (input.phoneNumber || "").trim();
      const email = (input.email || "").trim();

      if (!phoneNumber && !email)
        throw new Error("Either phoneNumber or email is required");

      if (email && !isValidEmail(email))
        throw new Error("Invalid email format");

      const shippingAddresses = normalizeAddresses(input.shippingAddresses);
      const pickupAddresses = normalizeAddresses(input.pickupAddresses);

      const sellerDoc = {
        name,
        companyName,
        firebaseUid: (input.firebaseUid || "").trim(),
        PANnumber: (input.PANnumber || "").trim(),
        gstNumber: (input.gstNumber || "").trim(),
        address: (input.address || "").trim(),
        bankIFCnumber: (input.bankIFCnumber || "").trim(),
        bankAccountNumber: (input.bankAccountNumber || "").trim(),
        authorized: (input.authorized || "").trim(),
        email,
        phoneNumber,
        shippingAddresses,
        pickupAddresses,
        companyPan: (input.companyPan || "").trim(),
        bankName: (input.bankName || "").trim(),
        status: "pending",
        fcmTokens: [],
      };

      if (input.fcmToken) {
        sellerDoc.fcmTokens.push(String(input.fcmToken).trim());
      }

      try {
        const seller = new Seller(sellerDoc);
        const saved = await seller.save();

        await resolveAndPersistFirebaseUid(saved);

        await createSellerNotification({
          sellerId: "ADMIN",
          title: "New Seller Registered",
          message: `Seller "${saved.companyNameName}" awaits approval.`,
          type: "seller_created",
          data: { customId: saved.customId },
          url: `/admin/sellers/${saved.customId}`,
          pubsub,
        });

        return saved;
      } catch (err) {
        throw new Error("Failed to create seller: " + err.message);
      }
    },

    updateSellerFcmToken: async (_, { customId, fcmToken }) => {
  if (!customId || !fcmToken) {
    return { success: false, message: "customId and fcmToken are required", seller: null };
  }

  const seller = await Seller.findOne({ customId });
  if (!seller) return { success: false, message: "Seller not found", seller: null };

  if (!seller.fcmTokens) seller.fcmTokens = [];

  const tokenStr = String(fcmToken).trim();
  if (!seller.fcmTokens.includes(tokenStr)) {
    seller.fcmTokens.push(tokenStr);
  }

  await seller.save();

  return {
    success: true,
    message: "Token updated",
    seller,
  };
    },


    removeSellerFcmToken: async (_, { customId, fcmToken }) => {
        if (!customId || !fcmToken) {
          return { success: false, message: "customId and fcmToken are required", seller: null };
        }

        const seller = await Seller.findOne({ customId });
        if (!seller) return { success: false, message: "Seller not found", seller: null };

        const tokenStr = String(fcmToken).trim();
        seller.fcmTokens = (seller.fcmTokens || []).filter(
          (t) => String(t).trim() !== tokenStr
        );

        await seller.save();

        return {
          success: true,
          message: "Token removed",
          seller,
        };
    },


    changeSellerStatus: async (_, { customId, status }, { pubsub }) => {
      const valid = ["pending", "approved", "rejected"];
      status = status.trim().toLowerCase();

      if (!valid.includes(status))
        throw new Error(`Status must be: ${valid.join(", ")}`);

      const seller = await Seller.findOne({ customId });
      if (!seller) throw new Error("Seller not found");

      seller.status = status;
      await seller.save();
     if(!seller || !seller.fcmTokens)
     {
     console.log("Seller as no token");
     return seller;
     }
     if(status==="approved")
     {
     await sendPushNotification(
     seller.fcmTokens,
     "Seller approved",
     "Explore your profile page and Thank you"
     );
     }
     else if(status==="rejected")
          {
          await sendPushNotification(
          seller.fcmTokens,
          "Seller rejected",
          "Please contact admin for more info"
          );
          }
      const uid = await resolveAndPersistFirebaseUid(seller);

      if (uid) {
        await firestore.collection("sellers").doc(uid).set(
          {
            status,
            sellerStatus: status,
            updatedFromAdmin: true,
          },
          { merge: true }
        );
      }

      try {
        await sendSellerStatusMail({
          to: seller.email,
          productType: "Seller Account",
          productName: seller.companyName,
          status,
        });
      } catch {}


      return seller;
    },
    // updateSeller: async (_, { customId, input }, { pubsub }) => {
    //   if (!customId) throw new Error("customId is required");

    //   const seller = await Seller.findOne({ customId });
    //   if (!seller) throw new Error("Seller not found");

    //   const shippingAddresses = normalizeAddresses(input.shippingAddresses);
    //   const pickupAddresses = normalizeAddresses(input.pickupAddresses);

    //   const updatableFields = [
    //     "name",
    //     "companyName",
    //     "PANnumber",
    //     "gstNumber",
    //     "address",
    //     "bankIFCnumber",
    //     "bankAccountNumber",
    //     "authorized",
    //     "email",
    //     "phoneNumber",
    //     "companyPan",
    //     "bankName",
    //     "firebaseUid",
    //     "status",
    //   ];

    //   updatableFields.forEach((field) => {
    //     if (input[field] !== undefined && input[field] !== null) {
    //       seller[field] = String(input[field]).trim();
    //     }
    //   });

    //   if (input.shippingAddresses !== undefined)
    //     seller.shippingAddresses = shippingAddresses;

    //   if (input.pickupAddresses !== undefined)
    //     seller.pickupAddresses = pickupAddresses;

    //   if (input.fcmToken) {
    //     if (!seller.fcmTokens) seller.fcmTokens = [];
    //     if (!seller.fcmTokens.includes(input.fcmToken)) {
    //       seller.fcmTokens.push(String(input.fcmToken).trim());
    //     }
    //   }

    //   await seller.save();
    //   await resolveAndPersistFirebaseUid(seller);

    //   try {
    //     if (seller.firebaseUid) {
    //       await firestore.collection("sellers").doc(seller.firebaseUid).set(
    //         {
    //           name: seller.name,
    //           companyName: seller.companyName,
    //           status: seller.status,
    //           updatedAt: new Date().toISOString(),
    //         },
    //         { merge: true }
    //       );
    //     }
    //   } catch (e) {
    //     console.warn("Firestore sync failed:", e.message);
    //   }

    //   if (input.status && seller.fcmTokens?.length) {
    //     await sendPushNotification(
    //       seller.fcmTokens,
    //       "Seller Profile Updated",
    //       "Your seller account details were updated."
    //     );
    //   }

    //   return seller;
    // },

    updateSellerProfile: async (_, { customId, input }) => {
  if (!customId) throw new Error("customId is required");

  const seller = await Seller.findOne({ customId });
  if (!seller) throw new Error("Seller not found");

  const allowedFields = [
    "name",
    "companyName",
    "PANnumber",
    "gstNumber",
    "address",
    "bankIFCnumber",
    "bankAccountNumber",
    "companyPan",
    "bankName",
  ];

  // Update simple fields
  allowedFields.forEach((field) => {
    if (input[field] !== undefined && input[field] !== null) {
      seller[field] = String(input[field]).trim();
    }
  });

  // Update address arrays safely
  if (input.pickupAddresses !== undefined) {
    seller.pickupAddresses = normalizeAddresses(input.pickupAddresses);
  }

  if (input.shippingAddresses !== undefined) {
    seller.shippingAddresses = normalizeAddresses(input.shippingAddresses);
  }

  await seller.save();

  return seller;
},


        deleteSeller: async (_, { customId }, { pubsub }) => {
              const seller =
                (await Seller.findOne({ customId })) ||
                (await Seller.findById(customId));

              if (!seller) throw new Error("Seller not found");

              try {
                await deleteLoginIndex(
                  seller.email,
                  seller.phoneNumber,
                  seller.customId
                );
              } catch {}

              if (seller.firebaseUid) {
                try {
                  await auth.deleteUser(seller.firebaseUid);
                } catch {}
              }

              await seller.deleteOne();

              await createSellerNotification({
                sellerId: "ADMIN",
                title: "Seller Deleted",
                message: `Seller ${customId} deleted.`,
                type: "seller_deleted",
                data: { customId },
                url: `/admin/sellers/${customId}`,
                pubsub,
              });

              return seller;
            },

      //----------- DEACTIVARE A SELLER AND SUSPEND ALL RELATED ENTITIES------
   deactivateSeller: async (_, { customId, reason }, { pubsub }) => {
          const seller = await Seller.findOne({ customId });

          if (!seller) throw new Error("Seller not found");

          seller.status = "deactivated";
          seller.deactivatedAt = new Date();
          seller.deactivatedReason = reason || "Admin deactivated account";
          await seller.save();

          // Suspend all related entities
          await Promise.all([
            Rental.updateMany(
              { sellerId: seller.customId },
              { $set: { status: "suspended" } }
            ),
            HirePilot.updateMany(
              { sellerId: seller.customId },
              { $set: { adminStatus: "suspended" } }
            ),
            Service.updateMany(
              { sellerId: seller.customId },
              { $set: { status: "suspended" } }
            ),
            HireJob.updateMany(
              { sellerId: seller.customId },
              { $set: { status: "suspended" } }
            ),
            Part.updateMany(
              { sellerId: seller.customId },
              { $set: { status: "suspended" } }
            ),
            Accessory.updateMany(
              { sellerId: seller.customId },
              { $set: { status: "suspended" } }
            ),
            Drone.updateMany(
              { sellerId: seller.customId },
              { $set: { status: "suspended" } }
            ),
          ]);

          // Notify seller
          try {
            await sendSellerStatusMail({
              to: seller.email,
              productType: "Seller Account",
              productName: seller.companyName,
              status: "deactivated",
            });
          } catch (err) {
            console.error("Email failed:", err.message);
          }

          return seller;
        },

  // -------------  Re-activate a deactivated seller ----------------

    activateSeller: async (_, { customId }, { pubsub }) => {
      const seller = await Seller.findOne({ customId });

      if (!seller) throw new Error("Seller not found");

      seller.status = "approved";
      seller.deactivatedAt = null;
      seller.deactivatedReason = null;
      await seller.save();

      // Reactivate all related entities
      await Promise.all([
        Rental.updateMany(
          { sellerId: seller.customId, status: "suspended" },
          { $set: { status: "approved" } }
        ),
        HirePilot.updateMany(
          { sellerId: seller.customId, adminStatus: "suspended" },
          { $set: { adminStatus: "approved" } }
        ),
        Service.updateMany(
          { sellerId: seller.customId, status: "suspended" },
          { $set: { status: "approved" } }
        ),
        HireJob.updateMany(
          { sellerId: seller.customId, status: "suspended" },
          { $set: { status: "approved" } }
        ),
        Part.updateMany(
          { sellerId: seller.customId, status: "suspended" },
          { $set: { status: "approved" } }
        ),
        Accessory.updateMany(
          { sellerId: seller.customId, status: "suspended" },
          { $set: { status: "approved" } }
        ),
        Drone.updateMany(
          { sellerId: seller.customId, status: "suspended" },
          { $set: { status: "approved" } }
        ),
      ]);


      // Notify seller

      try {
        await sendSellerStatusMail({
          to: seller.email,
          productType: "Seller Account",
          productName: seller.companyName,
          status: "approved",
        });
      } catch {}

      return seller;
    },

    // ------------------------------- CHANGE SELLER PASSWORDS -------------

    changeSellerPassword: async (_, { customId, newPassword }) => {
      if (!customId || !newPassword) {
        throw new Error("customId and newPassword are required");
      }

      if (newPassword.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }

      const seller = await Seller.findOne({ customId });
      if (!seller) throw new Error("Seller not found");

      if (seller.status === "deactivated") {
        throw new Error("Deactivated seller cannot change password");
      }

      const uid = await resolveAndPersistFirebaseUid(seller);
      if (!uid) throw new Error("Seller Firebase UID not found");

      try {
        await auth.updateUser(uid, { password: newPassword });

        // 🔒 Logout all existing sessions
        await auth.revokeRefreshTokens(uid);

        // 📩 Notify seller
        await sendSellerStatusMail({
          to: seller.email,
          productType: "Security",
          productName: seller.companyName,
          status: "password_changed",
        });

        return true;
      } catch (err) {
        throw new Error("Failed to update password: " + err.message);
      }
      },
      
  },
};