// backend/resolvers/sellerResolvers.js
import { Seller } from "../models/Seller.model.js";
import { sendSellerStatusMail } from "../utils/emailService.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";
import { createLoginIndex, deleteLoginIndex } from "../utils/loginIndex.js";
import admin, { auth, firestore } from "../config/firebaseAdmin.js";
import {sendPushNotification} from "../utils/SendPushNotification.js";
const messaging = admin.messaging();


function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeAddresses(value) {
  // Accept either array or single string. Ensure array-of-strings in DB.
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  // single string -> wrap
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
      // Persist only when changed
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

      // Normalize addresses
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

      // Add FCM token
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
          message: `Seller "${saved.companyName}" awaits approval.`,
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

    updateSellerFcmToken: async (_, { customId, token }) => {
      if (!customId || !token) {
        return { success: false, message: "customId and token are required", seller: null };
      }

      const seller = await Seller.findOne({ customId });
      if (!seller) return { success: false, message: "Seller not found", seller: null };

      if (!seller.fcmTokens) seller.fcmTokens = [];
      if (!seller.fcmTokens.includes(token)) seller.fcmTokens.push(String(token).trim());

      try {
        await seller.save();
        return { success: true, message: "Token updated", seller };
      } catch (err) {
        console.warn("⚠ updateSellerFcmToken failed:", err.message || err);
        return { success: false, message: "Failed to update token", seller: null };
      }
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
     else if(status==="approved")
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
                url: `/admin/sellers`,
                pubsub,
              });

              return seller;
            },
  },
};