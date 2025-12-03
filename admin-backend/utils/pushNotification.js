// utils/pushNotification.js
import admin from "../config/firebaseAdmin.js";

// ⚠️ Implement this later
async function removeInvalidTokensFromDB(tokens) {
  console.log("🧹 Remove invalid FCM tokens from DB:", tokens);
}

export async function sendPushNotification(tokens, title, body, data = {}) {
  if (!tokens || (Array.isArray(tokens) && tokens.length === 0)) {
    console.warn("⚠️ No FCM tokens provided");
    return { successCount: 0, failureCount: 0, results: [] };
  }

  const tokenList = Array.isArray(tokens) ? tokens : [tokens];

  const message = {
    notification: { title, body },

    android: {
      priority: "high",
      notification: { sound: "default" },
    },

    apns: {
      headers: { "apns-priority": "10" },
      payload: {
        aps: {
          sound: "default",
          alert: { title, body },
          contentAvailable: true,
        },
      },
    },

    data: Object.fromEntries(
      Object.entries(data || {}).map(([k, v]) => [k, String(v)])
    ),
  };

  try {
    let response;

    // 1️⃣ Single token
    if (tokenList.length === 1) {
      response = await admin.messaging().send({
        ...message,
        token: tokenList[0],
      });

      console.log(`📲 Push sent → ${tokenList[0]}`);
      return { successCount: 1, failureCount: 0, results: [response] };
    }

    // 2️⃣ Multiple tokens
    response = await admin.messaging().sendEachForMulticast({
      tokens: tokenList,
      ...message,
    });

    console.log(
      `📡 Push batch: ${response.successCount} success / ${response.failureCount} failed`
    );

    // 🚨 Remove invalid tokens
    if (response.failureCount > 0) {
      const invalidTokens = [];

      response.responses.forEach((r, idx) => {
        if (!r.success) {
          if (
            r.error?.code === "messaging/registration-token-not-registered" ||
            r.error?.code?.includes("registration-token")
          ) {
            invalidTokens.push(tokenList[idx]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        console.warn("🧹 Invalid FCM Tokens:", invalidTokens);
        await removeInvalidTokensFromDB(invalidTokens);
      }
    }

    return response;

  } catch (err) {
    console.error("❌ Push Notification Error:", err.message);
    return {
      successCount: 0,
      failureCount: tokenList.length,
      results: [],
    };
  }
}
