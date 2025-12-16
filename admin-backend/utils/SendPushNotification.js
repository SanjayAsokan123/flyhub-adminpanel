import admin from "../middleware/firebaseAdmin.js";

export const sendPushNotification = async (tokens, title, body) => {
  if (!tokens || tokens.length === 0) {
    console.log("❌ No FCM tokens found");
    return;
  }

  const message = {
    notification: { title, body },
    tokens,
  };

  try {
    const res = await admin.messaging().sendEachForMulticast(message);

    console.log(`📩 Notification sent: ${res.successCount} success, ${res.failureCount} failed`);

    res.responses.forEach((r, i) => {
      if (!r.success) {
        console.log("❌ Token failed:", tokens[i]);
        console.log("🔥 FCM Error:", r.error?.message || r.error);
      }
    });

  } catch (err) {
    console.log("❌ Error sending notification:", err.message);
  }
};