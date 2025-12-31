import admin from "../config/firebaseAdmin.js";
import { Buyer } from "../models/Buyer.model.js";

/**
 * Remove invalid FCM tokens from DB
 */
async function removeInvalidTokensFromDB(tokens) {
  if (!tokens.length) return;

  try {
    console.log("🧹 Remove invalid FCM tokens:", tokens);

    await Buyer.updateMany(
      { fcmTokens: { $in: tokens } },
      { $pull: { fcmTokens: { $in: tokens } } }
    );

    console.log(`✅ Cleaned ${tokens.length} invalid FCM tokens`);
  } catch (err) {
    console.error("❌ Failed to remove invalid tokens:", err.message);
  }
}

/**
 * Send push notification (token / array / topic)
 */
export async function sendPushNotification(
  target,
  title,
  body,
  data = {},
  options = {}
) {
  const { isTopic = false } = options;
  if (!target) return;

  const message = {
    data: {
      title,
      body,
      ...Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
    },
  };

  try {
    /* ---------------- TOPIC ---------------- */
    if (isTopic) {
      await admin.messaging().send({
        ...message,
        topic: target,
      });
      return;
    }

    /* ---------------- TOKENS ---------------- */
    const tokens = Array.isArray(target) ? target : [target];
    if (!tokens.length) return;

    // Single token
    if (tokens.length === 1) {
      await admin.messaging().send({
        ...message,
        token: tokens[0],
      });
      return;
    }

    // Multiple tokens
    const response = await admin.messaging().sendEachForMulticast({
      ...message,
      tokens,
    });

    const invalidTokens = [];

    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const code = res.error?.code;

        // 🔥 ONLY remove permanent failures
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token" ||
          code === "messaging/invalid-argument" ||
          code === "messaging/mismatched-credential"
        ) {
          invalidTokens.push(tokens[idx]);
        }
      }
    });

    if (invalidTokens.length) {
      await removeInvalidTokensFromDB(invalidTokens);
    }

  } catch (err) {
    console.error("❌ Push Error:", err.message);
  }
}
