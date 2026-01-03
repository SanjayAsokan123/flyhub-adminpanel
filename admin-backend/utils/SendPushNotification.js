import admin from "../config/firebaseAdmin.js";

async function removeInvalidTokensFromDB(tokens) {
  console.log("🧹 Remove invalid FCM tokens:", tokens);
}

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
    if (isTopic) {
      await admin.messaging().send({
        ...message,
        topic: target,
      });
      return;
    }

    const tokens = Array.isArray(target) ? target : [target];
    if (!tokens.length) return;

    if (tokens.length === 1) {
      await admin.messaging().send({
        ...message,
        token: tokens[0],
      });
      return;
    }

    const response = await admin.messaging().sendEachForMulticast({
      ...message,
      tokens,
    });

    const invalidTokens = [];
    response.responses.forEach((res, idx) => {
      if (!res.success) invalidTokens.push(tokens[idx]);
    });

    if (invalidTokens.length) {
      await removeInvalidTokensFromDB(invalidTokens);
    }

  } catch (err) {
    console.error("❌ Push Error:", err.message);
  }
}
