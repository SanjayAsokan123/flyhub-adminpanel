// resolvers/Buyer.resolver.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Buyer } from "../models/Buyer.model.js";
import { BuyerNotification } from "../models/BuyerNotification.model.js";
import { createBuyerNotification } from "../utils/createBuyerNotification.js";
import { BUYER_NOTIFICATION_TOPIC } from "../pubsub.js";
import { sendPushNotification } from "../utils/pushNotification.js";
import { createLoginIndex, deleteLoginIndex, findLoginIndex } from "../utils/loginIndex.js";
import { auth } from "../config/firebaseAdmin.js";
import { withFilter } from "graphql-subscriptions";
import { sendBuyerPasswordChangedEmail, sendOtpEmail } from "../utils/emailService.js";
import { Order }  from "../models/Order.model.js";
import { Address } from "../models/BuyerAddress.model.js";
import  Wishlist  from "../models/Wishlist.model.js";


function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
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

        await createBuyerNotification({
          buyerId: buyer.buyerId,
          title: "New Buyer Registered",
          message: `Buyer "${buyer.name}" created an account.`,
          type: "buyer_signup",
          url: `/admin/buyers/${buyer.buyerId}`,
          data: { buyerId: buyer.buyerId },
        });

        if (buyer.fcmTokens?.length > 0) {
          await sendPushNotification(
            buyer.fcmTokens,
            "Welcome to Flyhub!",
            "Your buyer account has been created successfully.",
            { buyerId: buyer.buyerId }
          );
        }

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

    // ------------ CHANGE BUYER PASSWORD ---------------

    changeBuyerPassword: async (_, { email, newPassword, otp }) => {
      try {
        if (!email) {
          throw new Error("Email is required");
        }
        if (!otp) {
          throw new Error("OTP is required");
        }
        if (!newPassword) {
          throw new Error("New password is required");
        }

        const buyer = await Buyer.findOne({ email });
        if (!buyer) throw new Error("Buyer not found");

        if (!buyer.otp || buyer.otp !== otp) {
          throw new Error("Invalid OTP");
        }

        if (!buyer.otpExpiresAt || buyer.otpExpiresAt < new Date()) {
          throw new Error("OTP has expired");
        }

        if (!isStrongPassword(newPassword)) {
          throw new Error(
            "Password must be at least 6 characters with uppercase, lowercase, and numbers"
          );
        }
        const uid = await resolveFirebaseUid(buyer);
        if (!uid) throw new Error("Buyer Firebase UID not found");
        await auth.updateUser(uid, { password: newPassword });
        await auth.revokeRefreshTokens(uid);
        buyer.otp = null;
        buyer.otpExpiresAt = null;
        await buyer.save();
        await sendBuyerPasswordChangedEmail({
          to: buyer.email,
          buyerName: buyer.name,
        });
        await createBuyerNotification({
          buyerId: buyer.buyerId,
          title: "Password Changed",
          message: "Your password has been changed successfully.",
          type: "password_change",
          data: { 
            action: "password_changed",
            timestamp: new Date().toISOString()
          },
        });
        if (buyer.fcmTokens?.length > 0) {
          await sendPushNotification(
            buyer.fcmTokens,
            "Password Changed",
            "Your password has been updated successfully.",
            { 
              type: "password_change",
              buyerId: buyer.buyerId 
            }
          );
        }

        return {
          success: true,
          message: "Password changed successfully",
          buyerId: buyer.buyerId,
          email: buyer.email,
        };
      } catch (err) {
        console.error("Change password error:", err);
        throw new Error(`Failed to change password: ${err.message}`);
      }
    },

    // ------------ REQUEST PASSWORD RESET OTP ---------------

    requestBuyerPasswordOtp: async (_, { email }) => {
      try {
        if (!email) {
          throw new Error("Email is required");
        }
        const buyer = await Buyer.findOne({ email });
        if (!buyer) throw new Error("Buyer not found");
        const otp = generateOTP();
        buyer.otp = otp;
        buyer.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await buyer.save();
        await sendOtpEmail({
          to: buyer.email,
          otp,
          buyerName: buyer.name,
          purpose: "password_reset",
        });
        await createBuyerNotification({
          buyerId: buyer.buyerId,
          title: "Password Reset Requested",
          message: `OTP sent to your email for password reset.`,
          type: `password_reset_request`,
          data: { 
            otpRequested: true,
            timestamp: new Date().toISOString()
          },
        });
        return {
          success: true,
          message: "OTP sent successfully",
          email: buyer.email,
          expiresIn: "10 minutes",
        };
      } catch (err) {
        console.error("Request OTP error:", err);
        throw new Error(`Failed to send OTP: ${err.message}`);
      }
    },

    // ------------ VERIFY OTP ---------------

verifyBuyerOtp: async (_, { email, otp }) => {
  try {
    const buyer = await Buyer.findOne({ email });
    if (!buyer) throw new Error("Buyer not found");
    if (!buyer.otpExpiresAt) {
      throw new Error("OTP not requested");
    }
    if (buyer.otpExpiresAt.getTime() < Date.now()) {
      throw new Error("OTP expired");
    }
    if (String(buyer.otp) !== String(otp)) {
      throw new Error("Invalid OTP");
    }
    buyer.otpVerified = true;
    await buyer.save();
    return {
      success: true,
      message: "OTP verified successfully",
    };
  } catch (err) {
    console.error("Verify OTP error:", err);
    throw new Error(err.message);
  }
},

deleteBuyerAccount: async (_, { email, password }) => {
  try {
    if (!email || !password) {
      throw new Error("Email and password are required");
    }
    const buyer = await Buyer.findOne({ email });
    if (!buyer) throw new Error("Buyer not found");
    const firebaseUid = buyer.firebaseUid || null;
    let passwordValid = false;
    
    if (firebaseUid) {
      try {
        await auth.getUser(firebaseUid);
        console.log(`Firebase UID found for buyer: ${firebaseUid}`);
      } catch (firebaseErr) {
        console.warn("Firebase verification failed:", firebaseErr.message);
      }
    }
    if (buyer.password) {
      try {
        passwordValid = await bcrypt.compare(password, buyer.password);
        console.log(`Password hash comparison: ${passwordValid}`);
      } catch (hashErr) {
        console.warn("Hash comparison error:", hashErr.message);
      }
    }
    if (!passwordValid && !buyer.password && firebaseUid) {
      throw new Error("No password stored. Please reset your password first.");
    }
    if (!passwordValid) {
      throw new Error("Incorrect password");
    }
    await BuyerNotification.deleteMany({ buyerId: buyer.buyerId });
    if (firebaseUid) {
      try {
        await deleteLoginIndex(firebaseUid);
      } catch (err) {
        console.warn("Login index delete error:", err);
      }
    }
    if (firebaseUid) {
      try {
        await auth.deleteUser(firebaseUid);
      } catch (err) {
        console.warn("Firebase delete error:", err);
      }
    }
    await buyer.deleteOne();
    console.log(`Buyer account deleted: ${email} (${buyer.buyerId})`);
    return {
      success: true,
      message: "Account deleted successfully",
      buyerId: buyer.buyerId,
      email: buyer.email,
      deletedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("Delete account error:", err);
    throw new Error(`Failed to delete account: ${err.message}`);
  }
},

deleteBuyerAccountWithFirebase: async (_, { email, firebaseUid }) => {
  try {
    if (!email || !firebaseUid) {
      throw new Error("Email and Firebase UID are required");
    }
    const buyer = await Buyer.findOne({ 
      email,
      firebaseUid: firebaseUid
    });
    
    if (!buyer) {
      const buyerByUid = await Buyer.findOne({ firebaseUid });
      if (!buyerByUid) {
        throw new Error("Buyer account not found or Firebase UID doesn't match");
      }
      if (buyerByUid.email !== email) {
        throw new Error("Email doesn't match the account associated with this Firebase UID");
      }
      buyer = buyerByUid;
    }
    try {
      await auth.getUser(firebaseUid);
    } catch (firebaseErr) {
      console.warn("Firebase user verification failed:", firebaseErr.message);
    }
    await BuyerNotification.deleteMany({ buyerId: buyer.buyerId });
    try {
      await deleteLoginIndex(firebaseUid);
    } catch (err) {
      console.warn("Login index delete error:", err);
    }

    try {
      await auth.deleteUser(firebaseUid);
    } catch (err) {
      console.warn("Firebase delete error:", err);
    }
    await buyer.deleteOne();
    console.log(`Buyer account deleted: ${email} (${buyer.buyerId}) with Firebase UID: ${firebaseUid}`);
    return {
      success: true,
      message: "Account deleted successfully",
      buyerId: buyer.buyerId,
      email: buyer.email,
      deletedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("Delete account error:", err);
    throw new Error(`Failed to delete account: ${err.message}`);
  }
},

deleteBuyerAccountCompletely: async (_, { email, firebaseUid }) => {
  try {
    console.log(`🗑 Starting complete account deletion for: ${email}, UID: ${firebaseUid}`);
    let buyer = await Buyer.findOne({ 
      $or: [
        { email },
        { firebaseUid }
      ]
    });
    
    if (!buyer) {
      throw new Error("Buyer account not found");
    }
    const buyerId = buyer.buyerId;
    const buyerEmail = buyer.email;
    const buyerFirebaseUid = buyer.firebaseUid || firebaseUid;
    console.log(`📋 Buyer found: ${buyerId}, Email: ${buyerEmail}, Firebase UID: ${buyerFirebaseUid}`);
    const deletedCounts = {
      buyers: 0,
      notifications: 0,
      orders: 0,
      addresses: 0,
      wishlist: 0,
      other: 0
    };
    try {
      const notificationsResult = await BuyerNotification.deleteMany({ 
        buyerId: buyerId 
      });
      deletedCounts.notifications = notificationsResult.deletedCount || 0;
      console.log(`🗑 Deleted ${deletedCounts.notifications} notifications`);
    } catch (err) {
      console.warn("Error deleting notifications:", err.message);
    }
    try {
      const ordersResult = await Order?.deleteMany({ buyerId: buyerId }) || { deletedCount: 0 };
      deletedCounts.orders = ordersResult.deletedCount || 0;
      console.log(`🗑 Deleted ${deletedCounts.orders} orders`);
    } catch (err) {
      console.warn("Error deleting orders:", err.message);
    }

    try {
      const addressesResult = await Address?.deleteMany({ buyerId: buyerId }) || { deletedCount: 0 };
      deletedCounts.addresses = addressesResult.deletedCount || 0;
      console.log(`🗑 Deleted ${deletedCounts.addresses} addresses`);
    } catch (err) {
      console.warn("Error deleting addresses:", err.message);
    }

    try {
      const wishlistResult = await Wishlist?.deleteMany({ buyerId: buyerId }) || { deletedCount: 0 };
      deletedCounts.wishlist = wishlistResult.deletedCount || 0;
      console.log(`🗑 Deleted ${deletedCounts.wishlist} wishlist items`);
    } catch (err) {
      console.warn("Error deleting wishlist:", err.message);
    }

    if (buyerFirebaseUid) {
      try {
        await deleteLoginIndex(buyerFirebaseUid);
        console.log(`🗑 Deleted login index for UID: ${buyerFirebaseUid}`);
      } catch (err) {
        console.warn("Login index delete error:", err.message);
      }
    }

    if (buyerFirebaseUid) {
      try {
        await auth.deleteUser(buyerFirebaseUid);
        console.log(`🔥 Deleted Firebase user: ${buyerFirebaseUid}`);
      } catch (err) {
        console.warn("Firebase delete error:", err.message);
      }
    }

    await buyer.deleteOne();
    deletedCounts.buyers = 1;
    console.log(`🗑 Deleted main buyer document: ${buyerId}`);

    console.log(`✅ Complete deletion successful for: ${buyerEmail} (${buyerId})`);
    console.log(`📊 Deletion summary:`, deletedCounts);
    return {
      success: true,
      message: "Account and all related data deleted successfully",
      buyerId: buyerId,
      email: buyerEmail,
      deletedAt: new Date().toISOString(),
      deletedCounts: deletedCounts
    };
  } catch (err) {
    console.error("❌ Complete account deletion error:", err);
    throw new Error(`Failed to delete account: ${err.message}`);
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
