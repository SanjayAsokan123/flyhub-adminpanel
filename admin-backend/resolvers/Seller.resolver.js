// backend/resolvers/sellerResolvers.js
import { Seller } from "../models/Seller.model.js";
import { sendSellerStatusMail, sendOtpEmail } from "../utils/emailService.js";
import { createSellerNotification } from "../utils/createSellerNotification.js";
import { createLoginIndex, deleteLoginIndex } from "../utils/loginIndex.js";
import { auth, firestore } from "../config/firebaseAdmin.js";
import {sendPushNotification} from "../utils/SendPushNotification.js";
import { SellerNotification } from "../models/SellerNotification.model.js";
import { Rental } from "../models/Rental.model.js";
import { HirePilot } from "../models/Hirepilot.model.js";
import {HireJob} from "../models/Hirejob.model.js";
import { Service } from "../models/Service.model.js";
import {Part} from "../models/Parts.model.js";
import {Accessory} from "../models/Accessories.model.js";
import {Drone} from "../models/Drone.model.js";




function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeAddresses(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return [String(value).trim()];
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

async function getSellerIdFromFirebaseUid(firebaseUid) {
  try {
    if (!firebaseUid) return null;
    console.log(`🔍 Looking for seller with firebaseUid: ${firebaseUid}`);
    const seller = await Seller.findOne({ firebaseUid });
    if (seller) {
      console.log(`✅ Found seller by firebaseUid: ${seller.customId}`);
      return seller.customId;
    }
    try {
      const userRecord = await auth.getUser(firebaseUid);
      console.log(`📧 Firebase user email: ${userRecord.email}`);
      
      if (userRecord.email) {
        const sellerByEmail = await Seller.findOne({ email: userRecord.email });
        if (sellerByEmail) {
          console.log(`✅ Found seller by email: ${sellerByEmail.customId}`);
          sellerByEmail.firebaseUid = firebaseUid;
          await sellerByEmail.save();
          return sellerByEmail.customId;
        }
      }
    } catch (error) {
      console.warn("⚠ Could not get Firebase user record:", error.message);
    }
    console.log("❌ Could not find seller ID from Firebase UID");
    return null;
  } catch (error) {
    console.error("❌ Error getting seller ID from Firebase UID:", error);
    return null;
  }
}
async function verifyFirebaseTokenFromRequest(req) {
  try {
    if (!req || !req.headers) {
      console.log("❌ No request or headers found");
      return null;
    }
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    console.log(`🔑 Authorization header: ${authHeader.substring(0, 50)}...`);

    if (!authHeader.startsWith('Bearer ')) {
      console.log("❌ No Bearer token found in header");
      return null;
    }
    const token = authHeader.substring(7);
    console.log(`✅ Token extracted (length: ${token.length})`);

    if (!token || token.length < 10) {
      console.log("❌ Token is too short or empty");
      return null;
    }

    try {
      const decodedToken = await auth.verifyIdToken(token);
      console.log(`✅ Firebase token verified for UID: ${decodedToken.uid}`);
      console.log(`📧 Token email: ${decodedToken.email}`);
      console.log(`⏰ Token issued at: ${new Date(decodedToken.iat * 1000)}`);
      
      return decodedToken;
    } catch (firebaseError) {
      console.error("❌ Firebase token verification failed:", firebaseError.message);
      if (firebaseError.message.includes('invalid algorithm')) {
        console.log("⚠ Trying alternative token verification...");
        try {
          const user = await auth.verifyIdToken(token, true);
          console.log(`✅ Alternative verification successful: ${user.uid}`);
          return user;
        } catch (altError) {
          console.error("❌ Alternative verification also failed:", altError.message);
        }
      }
      return null;
    }
  } catch (error) {
    console.error("❌ Error in verifyFirebaseTokenFromRequest:", error);
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
    },sellerNotifications: async (_, { sellerId }) => {
          try {
            if (!sellerId) {
              throw new Error("sellerId is required");
            }
    
            const notifications = await SellerNotification.find({ sellerId })
              .sort({ createdAt: -1 })
              .limit(50);
    
            return notifications;
          } catch (error) {
            console.error("❌ Error fetching seller notifications:", error);
            throw new Error("Failed to fetch notifications");
          }
        },
    
        verifySellerOtp: async (_, { email, otp }, { pubsub }) => {
          try {
            if (!email || !isValidEmail(email)) {
              throw new Error("Valid email is required");
            }
    
            if (!otp || otp.length !== 6) {
              throw new Error("Valid 6-digit OTP is required");
            }
    
            const seller = await Seller.findOne({ email });
            if (!seller) {
              throw new Error("Seller not found");
            }
    
            if (!seller.otp || !seller.otpExpiresAt) {
              throw new Error("No OTP requested or OTP expired");
            }
            if (seller.otpExpiresAt < new Date()) {
              seller.otp = null;
              seller.otpExpiresAt = null;
              seller.otpVerified = false;
              await seller.save();
    
              await createSellerNotification({
                sellerId: seller.customId,
                title: "OTP Expired",
                message: "Your OTP has expired. Please request a new one.",
                type: "otp_expired",
                data: { email: seller.email },
                url: "/seller/reset-password",
                pubsub,
              });
    
              return {
                success: false,
                message: "OTP has expired. Please request a new one",
                email: seller.email,
                expiresAt: null,
              };
            }
    
            if (seller.otp !== otp) {
              await createSellerNotification({
                sellerId: seller.customId,
                title: "Failed OTP Attempt",
                message: "Someone tried to verify OTP with wrong code.",
                type: "security_alert",
                data: { 
                  email: seller.email, 
                  attempt: "otp_verification",
                  timestamp: new Date().toISOString() 
                },
                url: "/seller/security",
                pubsub,
              });
    
              throw new Error("Invalid OTP. Please try again");
            }
            seller.otpVerified = true;
            seller.otp = null;
            await seller.save();
    
            await createSellerNotification({
              sellerId: seller.customId,
              title: "OTP Verified Successfully",
              message: "Your OTP has been verified. You can now reset your password.",
              type: "otp_verified",
              data: { 
                email: seller.email,
                expiresAt: seller.otpExpiresAt 
              },
              url: "/seller/reset-password",
              pubsub,
            });
    
            console.log(`✅ OTP verified for ${seller.email}`);
    
            return {
              success: true,
              message: "OTP verified successfully",
              email: seller.email,
              expiresAt: seller.otpExpiresAt.toISOString(),
            };
          } catch (error) {
            console.error("❌ Error in verifySellerOtp:", error);
            throw new Error(error.message);
          }
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

  allowedFields.forEach((field) => {
    if (input[field] !== undefined && input[field] !== null) {
      seller[field] = String(input[field]).trim();
    }
  });

  if (input.pickupAddresses !== undefined) {
    seller.pickupAddresses = normalizeAddresses(input.pickupAddresses);
  }

  if (input.shippingAddresses !== undefined) {
    seller.shippingAddresses = normalizeAddresses(input.shippingAddresses);
  }

  await seller.save();

  return seller;
},


       deleteSeller: async (_, { customId }) => {
    
      const seller =
        (await Seller.findOne({ customId })) ||
        (await Seller.findById(customId));

      if (!seller) throw new Error("Seller not found");

     
      await Promise.all([
        Drone.deleteMany({ sellerId: seller.customId }),
        Part.deleteMany({ sellerId: seller.customId }),
        Accessory.deleteMany({ sellerId: seller.customId }),
        Service.deleteMany({ sellerId: seller.customId }),
        Rental.deleteMany({ sellerId: seller.customId }),
        HireJob.deleteMany({ sellerId: seller.customId }),
        HirePilot.deleteMany({ sellerId: seller.customId }),
      ]);

     
      try {
        await deleteLoginIndex(seller.email, seller.phoneNumber, seller.customId);
      } catch (err) {
        console.error("LoginIndex delete failed:", err);
      }

    
      let firebaseUid = seller.firebaseUid;

      if (!firebaseUid) {
        try {
          const userRecord = await auth.getUserByEmail(seller.email);
          firebaseUid = userRecord.uid;
        } catch { }

        if (!firebaseUid) {
          try {
            const userRecord = await auth.getUserByPhoneNumber(seller.phoneNumber);
            firebaseUid = userRecord.uid;
          } catch { }
        }
      }

      
      try {
       
        await firestore.collection("sellers").doc(seller.customId).delete();
        console.log("🗑 Deleted Firestore sellers/" + seller.customId);
      } catch (err) {
        console.warn("⚠ Can't delete Firestore sellers doc:", err.message);
      }

      try {
       
        const usersSnapshot = await firestore
          .collection("users")
          .where("customId", "==", seller.customId)
          .get();

        if (!usersSnapshot.empty) {
          for (const doc of usersSnapshot.docs) {
            await doc.ref.delete();
            console.log("🗑 Deleted Firestore users doc:", doc.id);
          }
        } else {
          console.warn("⚠ No Firestore users doc found for:", seller.customId);
        }
      } catch (err) {
        console.error("❌ Firestore users delete failed:", err.message);
      }

    
      if (firebaseUid) {
        try {
          await auth.deleteUser(firebaseUid);
          console.log("🔥 Firebase Auth user deleted:", firebaseUid);
        } catch (err) {
          console.error("❌ Firebase deleteUser failed:", err.message);
        }
      } else {
        console.warn("⚠ No Firebase UID found. Firebase Auth user not deleted.");
      }

     
      await seller.deleteOne();

      return seller;
    },

 deactivateSeller: async (_, { customId, reason }, { pubsub }) => {
      const seller = await Seller.findOne({ customId });

      if (!seller) throw new Error("Seller not found");

      seller.status = "deactivated";
      seller.deactivatedAt = new Date();
      seller.deactivatedReason = reason || "Admin deactivated account";
      await seller.save();

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

      try {
        if (seller.firebaseUid) {
          await firestore.collection("sellers").doc(seller.firebaseUid).set(
            {
              status: "deactivated",
              deactivatedAt: seller.deactivatedAt.toISOString(),
              deactivatedReason: seller.deactivatedReason,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      } catch (firestoreError) {
        console.warn("⚠ Firestore update failed:", firestoreError.message);
      }

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

      activateSeller: async (_, { email , customId , otp }, { pubsub }) => {
      if (!email || !customId || !otp) {
        throw new Error("Email, customId, and OTP are required");
      }

      const seller = await Seller.findOne({ email });
      if (!seller) throw new Error("Seller not found");

      if (seller.customId !== customId) {
        throw new Error("Invalid seller ID");
      }


      if (!seller.otp || seller.otp !== otp) {
        throw new Error("Invalid OTP");
      }

      if (!seller.otpExpiresAt || seller.otpExpiresAt < new Date()) {
        throw new Error("OTP has expired");
      }

      seller.otp = null;
      seller.otpExpiresAt = null;

      seller.status = "approved";
      seller.deactivatedAt = null;
      seller.deactivatedReason = null;
      await seller.save();

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

      deactivateSellerAccount: async (_, { reason }, { req, pubsub }) => {
          try {
            console.log("🚀 Starting deactivateSellerAccount mutation");
            console.log("📝 Reason:", reason);
            console.log("📦 Request object exists:", !!req);
            
            if (!req) {
              console.error("❌ Request object is missing from context!");
              throw new Error("Server configuration error: Request object not available");
            }
            console.log("📦 Request headers keys:", Object.keys(req.headers || {}));
            console.log("🔍 Checking for authorization header...");
    
            const isTestMode = process.env.NODE_ENV === 'test' || process.env.SKIP_AUTH === 'true';
            
            if (isTestMode) {
              console.log("⚠️ Running in test mode - bypassing authentication");
              const mockUser = {
                uid: 'test-user-123',
                email: 'test@example.com'
              };
              
              const testSeller = await Seller.findOne({ email: mockUser.email });
              if (!testSeller) {
                throw new Error("Test seller not found");
              }
              
              return await processDeactivation(testSeller, reason, pubsub);
            }
    
            console.log("🔑 Attempting Firebase token verification...");
            const decodedToken = await verifyFirebaseTokenFromRequest(req);
            
            if (!decodedToken) {
              console.error("❌ Firebase token verification failed");
              throw new Error("Authentication required. Please login.");
            }
    
            const firebaseUid = decodedToken.uid;
            const userEmail = decodedToken.email;
            console.log(`✅ Firebase user verified: ${firebaseUid}`);
            console.log(`📧 User email from token: ${userEmail}`);
    
            let sellerId = await getSellerIdFromFirebaseUid(firebaseUid);
            
            if (!sellerId) {
              if (userEmail) {
                console.log(`🔍 Searching for seller by email: ${userEmail}`);
                const seller = await Seller.findOne({ email: userEmail });
                if (seller) {
                  sellerId = seller.customId;
                  console.log(`✅ Found seller by email: ${sellerId}`);
                  if (!seller.firebaseUid) {
                    seller.firebaseUid = firebaseUid;
                    await seller.save();
                    console.log(`✅ Updated seller with firebaseUid: ${firebaseUid}`);
                  }
                }
              }
            }
    
            if (!sellerId) {
              console.error(`❌ Could not find seller for Firebase UID: ${firebaseUid}`);
              const allSellers = await Seller.find({});
              console.log(`🔍 Total sellers in DB: ${allSellers.length}`);
              
              throw new Error("Seller account not found. Please contact support.");
            }
    
            console.log(`✅ Resolved seller ID: ${sellerId}`);
    
            const seller = await Seller.findOne({ customId: sellerId });
            if (!seller) {
              console.error(`❌ Seller not found in database: ${sellerId}`);
              throw new Error("Seller not found");
            }
    
            console.log(`✅ Seller found: ${seller.companyName} (${seller.email})`);
    
            return await processDeactivation(seller, reason, pubsub);
          } catch (error) {
            console.error("❌ Error in deactivateSellerAccount:", error);
            console.error("Stack trace:", error.stack);
            return {
              success: false,
              message: error.message,
              seller: null,
            };
          }
        },


    markSellerNotificationRead: async (_, { notificationId }) => {
          try {
            if (!notificationId) {
              return { success: false, message: "notificationId is required" };
            }
    
            const notification = await SellerNotification.findById(notificationId);
            if (!notification) {
              return { success: false, message: "Notification not found" };
            }
    
            notification.read = true;
            await notification.save();
    
            return {
              success: true,
              message: "Notification marked as read",
            };
          } catch (error) {
            console.error("❌ Error marking notification as read:", error);
            return {
              success: false,
              message: error.message,
            };
          }
        },
  
      requestSellerPasswordOtp: async (_, { email }) => {
  try {
    if (!email || !isValidEmail(email)) {
      throw new Error("Valid email is required");
    }

    const seller = await Seller.findOne({ email });
    if (!seller) {
      throw new Error("Seller not found");
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    seller.otp = otp;
    seller.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    seller.otpVerified = false;
    await seller.save();
    await sendOtpEmail({
      to: seller.email,
      otp: otp,
      buyerName: seller.name,
      purpose: "password_reset",
    });

    return {
      success: true,
      message: "OTP sent successfully",
      seller: {
        email: seller.email,
      },
    };
  } catch (error) {
    console.error("❌ Error in requestSellerPasswordOtp:", error);
    return {
      success: false,
      message: error.message,
      seller: null,
    };
  }
},

       verifySellerPasswordOtp: async (_, { email, otp }, { pubsub }) => {
  try {
    if (!email || !isValidEmail(email)) {
      throw new Error("Valid email is required");
    }

    if (!otp || otp.length !== 6) {
      throw new Error("Valid 6-digit OTP is required");
    }

    const seller = await Seller.findOne({ email });
    if (!seller) {
      throw new Error("Seller not found");
    }

    if (!seller.otp || !seller.otpExpiresAt) {
      return {
        success: false,
        message: "OTP not found or already used. Please request a new one.",
        seller: null,
      };
    }
    if (new Date() > new Date(seller.otpExpiresAt)) {
      seller.otpVerified = false;
      seller.otp = null;
      seller.otpExpiresAt = null;
      await seller.save();

      await createSellerNotification({
        sellerId: seller.customId,
        title: "OTP Expired",
        message: "Your OTP has expired. Please request a new one.",
        type: "otp_expired",
        data: { email: seller.email },
        url: "/seller/reset-password",
        pubsub,
      });

      return {
        success: false,
        message: "OTP has expired. Please request a new one",
        seller: null,
      };
    }

    if (seller.otp !== otp) {
      await createSellerNotification({
        sellerId: seller.customId,
        title: "Failed OTP Attempt",
        message: "Someone tried to verify OTP with an incorrect code.",
        type: "security_alert",
        data: {
          email: seller.email,
          timestamp: new Date().toISOString(),
        },
        url: "/seller/security",
        pubsub,
      });

      return {
        success: false,
        message: "Invalid OTP. Please try again",
        seller: null,
      };
    }

    seller.otpVerified = true;
    seller.otp = null;
    seller.otpExpiresAt = null;
    await seller.save();

    await createSellerNotification({
      sellerId: seller.customId,
      title: "OTP Verified Successfully",
      message: "Your OTP has been verified. You can now reset your password.",
      type: "otp_verified",
      data: { email: seller.email },
      url: "/seller/reset-password",
      pubsub,
    });

    return {
      success: true,
      message: "OTP verified successfully",
      seller: {
        customId: seller.customId,
        email: seller.email,
        name: seller.name,
      },
    };
  } catch (error) {
    console.error("❌ Error in verifySellerPasswordOtp:", error);
    return {
      success: false,
      message: error.message,
      seller: null,
    };
  }
},

changeSellerPassword: async (_, { email, newPassword }, { pubsub }) => {
  try {
    if (!email || !isValidEmail(email)) {
      throw new Error("Valid email is required");
    }

    if (!newPassword) {
      throw new Error("New password is required");
    }

    const seller = await Seller.findOne({ email });
    if (!seller) {
      throw new Error("Seller not found");
    }

    if (seller.status === "deactivated") {
      throw new Error("Deactivated seller cannot change password");
    }

    if (!seller.otpVerified) {
      throw new Error("OTP not verified. Please verify OTP first");
    }

    if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(newPassword)
    ) {
      throw new Error(
        "Password must be at least 8 characters long and contain uppercase, lowercase, number & special character"
      );
    }

    const uid = await resolveAndPersistFirebaseUid(seller);
    if (!uid) {
      throw new Error("Seller Firebase UID not found. Contact support");
    }

    await auth.updateUser(uid, { password: newPassword });
    await auth.revokeRefreshTokens(uid);

    seller.otpVerified = false;
    seller.otp = null;
    seller.otpExpiresAt = null;
    await seller.save();

    await createSellerNotification({
      sellerId: seller.customId,
      title: "Password Changed Successfully",
      message:
        "Your password has been changed successfully. You've been logged out from all devices.",
      type: "password_changed",
      url: "/seller/login",
      pubsub,
    });

    return {
      success: true,
      message: "Password changed successfully. Please login again.",
      seller: {
        customId: seller.customId,
        email: seller.email,
        name: seller.name,
      },
    };
  } catch (error) {
    console.error("❌ Error in changeSellerPassword:", error);
    return {
      success: false,
      message: error.message,
      seller: null,
    };
  }
},

    },
    Subscription: {
    sellerNotificationAdded: {
      subscribe: async (_, { sellerId }, { pubsub }) => {
        if (!sellerId) {
          throw new Error("sellerId is required for subscription");
        }
        
        return pubsub.asyncIterator(`SELLER_NOTIFICATION_ADDED_${sellerId}`);
      },
    },
  },
  };
  
  async function processDeactivation(seller, reason, pubsub) {
    try {
      console.log(`🔄 Processing deactivation for seller: ${seller.customId}`);
  
      if (seller.status === "deactivated") {
        console.log(`ℹ️ Seller ${seller.customId} is already deactivated`);
        return {
          success: false,
          message: "Account is already deactivated",
          seller,
        };
      }
  
      console.log(`🔄 Deactivating seller: ${seller.customId}`);
  
      seller.status = "deactivated";
      seller.deactivatedAt = new Date();
      seller.deactivatedReason = reason || "Seller deactivated their own account";
      await seller.save();
  
      console.log(`✅ Seller status updated to deactivated`);
  
      try {
        if (seller.firebaseUid) {
          await firestore.collection("sellers").doc(seller.firebaseUid).set(
            {
              status: "deactivated",
              deactivatedAt: seller.deactivatedAt.toISOString(),
              deactivatedReason: seller.deactivatedReason,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
          console.log(`✅ Firestore status updated`);
        }
      } catch (firestoreError) {
        console.warn("⚠ Firestore update failed:", firestoreError.message);
      }
  
      console.log(`⏸️ Suspending related entities...`);
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
  
      console.log(`✅ All related entities suspended`);
  
      try {
        await sendSellerStatusMail({
          to: seller.email,
          productType: "Seller Account",
          productName: seller.companyName,
          status: "deactivated",
          reason: reason || "You have deactivated your account",
        });
        console.log(`📧 Deactivation email sent to ${seller.email}`);
      } catch (err) {
        console.error("Email failed:", err.message);
      }
  
      await createSellerNotification({
        sellerId: seller.customId,
        title: "Account Deactivated",
        message: "Your account has been deactivated successfully. You can reactivate anytime by logging in.",
        type: "account_deactivated",
        data: { 
          deactivatedAt: seller.deactivatedAt,
          reason: seller.deactivatedReason,
          email: seller.email 
        },
        url: "/seller/login",
        pubsub,
      });
  
      console.log(`✅ Seller notification created`);
  
      await createSellerNotification({
        sellerId: "ADMIN",
        title: "Seller Account Deactivated",
        message: `Seller "${seller.companyName}" has deactivated their account.`,
        type: "seller_deactivated",
        data: { 
          sellerId: seller.customId,
          companyName: seller.companyName,
          email: seller.email,
          reason: seller.deactivatedReason,
          deactivatedAt: seller.deactivatedAt 
        },
        url: `/admin/sellers/${seller.customId}`,
        pubsub,
      });
  
      console.log(`🎉 Seller ${seller.customId} (${seller.email}) deactivated their account`);
  
      return {
        success: true,
        message: "Account deactivated successfully. You will be logged out.",
        seller,
      };
    } catch (error) {
      console.error("❌ Error in processDeactivation:", error);
      throw error;
    }
  }
