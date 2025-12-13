// resolvers/Buyer.resolver.js

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Buyer } from "../models/Buyer.model.js";
import { BuyerNotification } from "../models/BuyerNotification.model.js";
import { createBuyerNotification } from "../utils/createBuyerNotification.js";
import { BUYER_NOTIFICATION_TOPIC } from "../pubsub.js";
import { sendPushNotification } from "../utils/pushNotification.js";
import { createLoginIndex,deleteLoginIndex,findLoginIndex } from "../utils/loginIndex.js";
import { auth } from "../config/firebaseAdmin.js";
import { withFilter } from "graphql-subscriptions";
import { sendBuyerPasswordChangedEmail } from "../utils/emailService.js";


function normalizePhone(phone) {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("91") && cleaned.length === 12)
    return cleaned.substring(2);
  return cleaned.length === 10 ? cleaned : "";
}

async function resolveFirebaseUid(buyer) {
  try {
    if (buyer.firebaseUid) return buyer.firebaseUid;

    if (buyer.email) {
      try {
        const u = await auth.getUserByEmail(buyer.email);
        if (u?.uid) buyer.firebaseUid = u.uid;
      } catch {}
    }

    if (!buyer.firebaseUid && buyer.phoneNumber) {
      try {
        const u = await auth.getUserByPhoneNumber("+91" + buyer.phoneNumber);
        if (u?.uid) buyer.firebaseUid = u.uid;
      } catch {}
    }

    if (buyer.firebaseUid) {
      await buyer.save();

      await createLoginIndex({
        uid: buyer.firebaseUid,
        email: buyer.email,
        phoneNumber: buyer.phoneNumber,
        buyerId: buyer.buyerId,
      });
    }

    return buyer.firebaseUid;
  } catch (err) {
    console.error("Firebase UID resolve error:", err);
    return null;
  }
}
function isStrongPassword(password) {
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  return regex.test(password);
}


export const buyerResolvers = {
  Query: {
    buyers: async () => Buyer.find().sort({ createdAt: -1 }),

    buyer: async (_, { buyerId }) =>
      (await Buyer.findOne({ buyerId })) ||
      (await Buyer.findById(buyerId)),

    buyerNotifications: async (_, { buyerId }) =>
      BuyerNotification.find({ buyerId }).sort({ createdAt: -1 }),

    buyerByEmail: async (_, { email, username, phoneNumber, buyerId }) => {
      const normalized = normalizePhone(phoneNumber);

      const query = {
        $or: [
          email ? { email } : null,
          username ? { name: username } : null,
          phoneNumber ? { phoneNumber: normalized } : null,
          buyerId ? { buyerId } : null,
        ].filter(Boolean),
      };
      return Buyer.findOne(query);
    },

    getBuyerByLoginKey: async (_, { key }) => {
      const normalized = normalizePhone(key);

      return (
        (await Buyer.findOne({ email: key })) ||
        (await Buyer.findOne({ phoneNumber: normalized })) ||
        (await Buyer.findOne({ buyerId: key }))
      );
    },
  },

  Mutation: {
   signupBuyer: async (
        _,
        { name, email, phoneNumber, password, firebaseUid }
          ) => {
        try {
          const hashed = await bcrypt.hash(password, 10);

          const buyer = await Buyer.create({
            name,
            email,
            phoneNumber: normalizePhone(phoneNumber),
            password: hashed,
            firebaseUid,
          });

          await resolveFirebaseUid(buyer);

          // 1️⃣ Create Admin Dashboard Notification
          await createBuyerNotification({
            buyerId: buyer.buyerId,
            title: "New Buyer Registered",
            message: `Buyer "${buyer.name}" created an account.`,
            type: "buyer_signup",
            url: `/admin/buyers/${buyer.buyerId}`,
            data: { buyerId: buyer.buyerId },
          });

          // 2️⃣ Send Push Notification To Buyer (welcome message)
          if (buyer.fcmTokens?.length > 0) {
            await sendPushNotification(
              buyer.fcmTokens,
              "Welcome to Flyhub!",
              "Your buyer account has been created successfully.",
              { buyerId: buyer.buyerId }
            );
          }

          // 3️⃣ Generate JWT Token
          const token = jwt.sign(
            { buyerId: buyer.buyerId, email: buyer.email },
            process.env.JWT_SECRET,
            { expiresIn: "365d" }
          );

          return {
            ...buyer.toObject(),
            token,
          };
        } catch (err) {
          console.error("Signup error:", err);
          throw new Error(err.message);
        }
      },


    loginBuyer: async (_, { input, password }) => {
      const normalized = normalizePhone(input);
      let buyer = null;
      const match = await findLoginIndex(
        input.includes("@") ? input : normalized
      );

      if (match?.uid) {
        buyer = await Buyer.findOne({ firebaseUid: match.uid });
      }

      if (!buyer) {
        buyer =
          (await Buyer.findOne({ email: input })) ||
          (await Buyer.findOne({ phoneNumber: normalized })) ||
          (await Buyer.findOne({ buyerId: input }));
      }

      if (!buyer) throw new Error("Buyer not found");

      const valid = await bcrypt.compare(password, buyer.password || "");
      if (!valid) throw new Error("Incorrect password");

      const token = jwt.sign(
        { buyerId: buyer.buyerId, email: buyer.email },
        process.env.JWT_SECRET,
        { expiresIn: "365d" }
      );

      return { ...buyer.toObject(), token };
    },

    loginBuyerGoogle: async (_, { firebaseUid }) => {
      const buyer = await Buyer.findOne({ firebaseUid });

      if (!buyer)
        throw new Error("Buyer account not found. Please register first.");

      const token = jwt.sign(
        { buyerId: buyer.buyerId, email: buyer.email },
        process.env.JWT_SECRET,
        { expiresIn: "365d" }
      );

      return { ...buyer.toObject(), token };
    },

    updateBuyer: async (_, { buyerId, input }) => {
      const data = {};

      if (input.name) data.name = input.name;
      if (input.email) data.email = input.email;
      if (input.phoneNumber)
        data.phoneNumber = normalizePhone(input.phoneNumber);
      if (input.password)
        data.password = await bcrypt.hash(input.password, 10);

      const updated = await Buyer.findOneAndUpdate({ buyerId }, data, {
        new: true,
      });

      if (!updated) throw new Error("Buyer not found");

      await resolveFirebaseUid(updated);

      return updated;
    },

    deleteBuyer: async (_, { buyerId }) => {
      const buyer = await Buyer.findOne({ buyerId });
      if (!buyer) throw new Error("Buyer not found");

      if (buyer.firebaseUid) {
        try {
          await auth.deleteUser(buyer.firebaseUid);
          await deleteLoginIndex(buyer.firebaseUid);
        } catch (err) {
          console.warn("Firebase delete error:", err);
        }
      }

      await buyer.deleteOne();
      return "Buyer deleted successfully.";
    },

    markBuyerNotificationRead: async (_, { notificationId }) => {
      await BuyerNotification.findOneAndUpdate(
        { notificationId },
        { read: true }
      );
      return { success: true, message: "Notification marked as read" };
    },

    updateBuyerFcmToken: async (_, { buyerId, token }) => {
      const buyer = await Buyer.findOne({ buyerId });
      if (!buyer) throw new Error("Buyer not found");

      await buyer.addFcmToken(token);

      return { success: true, message: "Token updated", buyer };
    },

    // ------------CHANGE BUYER PASSWORD---------------- 

    changeBuyerPassword: async (_, { email, newPassword }) => {
        // 1️⃣ Validate password strength
        if (!isStrongPassword(newPassword)) {
          throw new Error(
            "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character"
          );
        }

        // 2️⃣ Find buyer
        const buyer = await Buyer.findOne({ email });
        if (!buyer) throw new Error("Buyer not found");

        // 3️⃣ Update MongoDB password
        const hashed = await bcrypt.hash(newPassword, 10);
        buyer.password = hashed;
        await buyer.save();

        // 4️⃣ Update Firebase password (if linked)
        if (buyer.firebaseUid) {
          try {
            await auth.updateUser(buyer.firebaseUid, {
              password: newPassword,
            });

            // 5️⃣ Force logout from all devices
            await auth.revokeRefreshTokens(buyer.firebaseUid);
          } catch (err) {
            console.error("Firebase password update failed:", err);
            throw new Error("Password updated locally, but Firebase sync failed");
          }
        }

        // 6️⃣ Send Email Notification (non-blocking)
        try {
          await sendBuyerPasswordChangedEmail({
            to: buyer.email,
            name: buyer.name,
          });
        } catch (err) {
          console.warn("⚠ Password change email failed:", err.message);
        }
     },

  },
  Subscription: {
    buyerNotificationAdded: {
      subscribe: withFilter(
        (_, __, { pubsub }) =>
          pubsub.asyncIterator([BUYER_NOTIFICATION_TOPIC]),
        (payload, variables) =>
          payload.buyerNotificationAdded.buyerId === variables.buyerId
      ),
    },
  },
};
