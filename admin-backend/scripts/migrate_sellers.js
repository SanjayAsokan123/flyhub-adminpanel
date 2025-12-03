// admin-backend/scripts/migrate_sellers.js
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Seller from "../models/Seller.js";
import { auth, firestore } from "../config/firebaseAdmin.js";
import connectDB from "../config/db.js";
import fs from "fs";

async function run() {
  try {
    await connectDB();
    console.log("🔗 Connected to MongoDB");

    // Safety check
    if (process.env.MIGRATE_SELLERS_CONFIRM !== "yes") {
      console.log("⚠️ To run migration, set MIGRATE_SELLERS_CONFIRM=yes in your .env");
      process.exit(1);
    }

    // Helper to detect missing data
    const isMissing = (v) =>
      !v || v === null || v === undefined || String(v).trim() === "";

    const sellersCursor = Seller.find().cursor();
    let processed = 0;
    const batchLimit = 500;
    let batch = firestore.batch();
    let batchOps = 0;

    for (let doc = await sellersCursor.next(); doc != null; doc = await sellersCursor.next()) {
      processed++;
      const seller = doc;

      // 🚨 Skip invalid/empty sellers
      if (
        isMissing(seller.phoneNumber) ||
        isMissing(seller.email) ||
        isMissing(seller.address) ||
        isMissing(seller.PANnumber) ||
        isMissing(seller.companyName)
      ) {
        console.log(`⚠️ Skipping INVALID seller: ${seller._id}`);

        fs.appendFileSync(
          "invalid_sellers.log",
          `${seller._id} -> Missing fields\n`
        );

        continue;
      }
      if ((!seller.passwordHash || seller.passwordHash === "") && seller.plainPassword) {
        const hash = await bcrypt.hash(String(seller.plainPassword).trim(), 10);
        seller.passwordHash = hash;
        seller.plainPassword = undefined;
        await seller.save();
        console.log(`🔐 Hashed password for ${seller.customId || seller._id}`);
      }
      let uid = seller.firebaseUid;

      if (!uid) {
        try {
          const firebaseUserPayload = {};

          if (!isMissing(seller.email)) firebaseUserPayload.email = seller.email.trim();
          if (!isMissing(seller.phoneNumber)) {
            firebaseUserPayload.phoneNumber =
              seller.phoneNumber.startsWith("+")
                ? seller.phoneNumber
                : `+91${seller.phoneNumber}`;
          }
          if (!isMissing(seller.companyName)) firebaseUserPayload.displayName = seller.companyName;
          firebaseUserPayload.emailVerified = !!seller.email;

          const firebaseUser = await auth.createUser(firebaseUserPayload);
          uid = firebaseUser.uid;

          seller.firebaseUid = uid;
          await seller.save();

          console.log(`🆔 Created Firebase user for ${seller.customId || seller._id} -> ${uid}`);
        } catch (err) {
          if (err.code === "auth/email-already-exists" && seller.email) {
            try {
              const existing = await auth.getUserByEmail(seller.email);
              uid = existing.uid;

              seller.firebaseUid = uid;
              await seller.save();

              console.log(`ℹ️ Linked existing Firebase user for ${seller.customId} -> ${uid}`);
            } catch (e) {
              console.error("❌ Linking existing user failed:", e);
            }
          } else {
            console.error("❌ Firebase createUser failed for", seller.customId || seller._id, err);
            continue;
          }
        }
      }
      if (firestore && uid) {
        const setIndex = (prefix, key) => {
          if (isMissing(key)) return;

          const docId = `${prefix}_${String(key).trim()}`;
          const ref = firestore.doc(`loginIndex/${docId}`);

          batch.set(ref, { uid, keyType: prefix, key }, { merge: true });
          batchOps++;

          if (batchOps >= batchLimit) {
            console.log(`🔁 Committing batch of ${batchOps}`);
            batch.commit();
            batch = firestore.batch();
            batchOps = 0;
          }
        };

        setIndex("phone", seller.phoneNumber);
        setIndex("email", seller.email);
        setIndex("sellerId", seller.customId);
      }

      if (processed % 50 === 0) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    if (batchOps > 0) {
      console.log(`🔁 Final commit of ${batchOps}`);
      await batch.commit();
    }

    console.log(`✅ Migration complete. Processed ${processed} sellers.`);
    process.exit(0);

  } catch (err) {
    console.error("❌ Migration error:", err);
    process.exit(1);
  }
}
run();
