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
      notification: {
        sound: "default",
        vibrateTimingsMillis: [0, 500, 250, 500],  // vibration pattern
        visibility: "public",
      },
    },

    apns: {
      headers: { "apns-priority": "10" },
      payload: {
        aps: {
          sound: "default", // Vibrates on iOS if sound is enabled
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
    // SINGLE token
    if (tokenList.length === 1) {
      const response = await admin.messaging().send({
        ...message,
        token: tokenList[0],
      });
      return { successCount: 1, failureCount: 0, results: [response] };
    }

    // MULTIPLE tokens
    const response = await admin.messaging().sendEachForMulticast({
      tokens: tokenList,
      ...message,
    });

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
