// scripts/cleanupFcmTokens.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Buyer } from "../models/Buyer.model.js";

dotenv.config();

async function cleanupFcmTokens() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const buyers = await Buyer.find({
      fcmTokens: { $exists: true, $ne: [] }
    });

    for (const buyer of buyers) {
      const unique = [...new Set(buyer.fcmTokens)];

      if (unique.length !== buyer.fcmTokens.length) {
        buyer.fcmTokens = unique;

        buyer.fcmTokenMeta = buyer.fcmTokenMeta.filter(
          (m, i, arr) =>
            arr.findIndex(x => x.token === m.token) === i
        );

        await buyer.save();

        console.log(
          `🧹 ${buyer.buyerId}: ${buyer.fcmTokens.length} → ${unique.length}`
        );
      }
    }

    console.log("✅ FCM cleanup done");
    process.exit(0);

  } catch (err) {
    console.error("❌ Cleanup failed:", err);
    process.exit(1);
  }
}

cleanupFcmTokens();
