// backend/utils/loginIndex.js
import { firestore } from "../config/firebaseAdmin.js";

/* -------------------------------------------------------------------------- */
/*                               Phone Normalizer                             */
/* -------------------------------------------------------------------------- */

function normalizePhone(p) {
  if (!p) return null;
  const cleaned = p.replace(/\D/g, "");

  // If already +91XXXXXXXXXX
  if (p.startsWith("+") && cleaned.length === 12) return p;

  // If exactly 10 digits → add +91
  if (/^\d{10}$/.test(cleaned)) return `+91${cleaned}`;

  // If starts with 91XXXXXXXXXX → convert
  if (/^91\d{10}$/.test(cleaned)) return `+${cleaned}`;

  return p; // fallback
}

/* -------------------------------------------------------------------------- */
/*                          CREATE / UPDATE LOGIN INDEX                       */
/* -------------------------------------------------------------------------- */

export async function createLoginIndex({
  uid,
  email,
  phone,
  buyerId,
  sellerId,
  customId,
}) {
  if (!uid) throw new Error("❌ UID is required for loginIndex creation");

  const batch = firestore.batch();

  /* ------------------------------- Email Key ------------------------------ */
  if (email) {
    const key = email.toLowerCase();
    batch.set(firestore.doc(`loginIndex/email_${key}`), {
      uid,
      key,
      keyType: "email",
    });
  }

  /* ------------------------------- Phone Key ------------------------------ */
  if (phone) {
    const phoneNorm = normalizePhone(phone);
    if (phoneNorm) {
      batch.set(firestore.doc(`loginIndex/phone_${phoneNorm}`), {
        uid,
        key: phoneNorm,
        keyType: "phone",
      });
    }
  }

  /* ------------------------------ BuyerId Key ----------------------------- */
  if (buyerId) {
    batch.set(firestore.doc(`loginIndex/buyerId_${buyerId}`), {
      uid,
      key: buyerId,
      keyType: "buyerId",
    });
  }

  /* ------------------------------ SellerId Key ---------------------------- */
  if (sellerId) {
    batch.set(firestore.doc(`loginIndex/sellerId_${sellerId}`), {
      uid,
      key: sellerId,
      keyType: "sellerId",
    });
  }

  /* ------------------------------ Custom Key ------------------------------ */
  if (customId) {
    batch.set(firestore.doc(`loginIndex/customId_${customId}`), {
      uid,
      key: customId,
      keyType: "customId",
    });
  }

  await batch.commit();
  console.log(`✅ loginIndex created/updated for UID: ${uid}`);
}

/* -------------------------------------------------------------------------- */
/*                                 DELETE INDEX                               */
/* -------------------------------------------------------------------------- */

export async function deleteLoginIndex({ email, phone, buyerId, sellerId, customId }) {
  const batch = firestore.batch();

  if (email) {
    batch.delete(firestore.doc(`loginIndex/email_${email.toLowerCase()}`));
  }

  if (phone) {
    const phoneNorm = normalizePhone(phone);
    if (phoneNorm) {
      batch.delete(firestore.doc(`loginIndex/phone_${phoneNorm}`));
    }
  }

  if (buyerId) {
    batch.delete(firestore.doc(`loginIndex/buyerId_${buyerId}`));
  }

  if (sellerId) {
    batch.delete(firestore.doc(`loginIndex/sellerId_${sellerId}`));
  }

  if (customId) {
    batch.delete(firestore.doc(`loginIndex/customId_${customId}`));
  }

  await batch.commit();
  console.log(`🗑 loginIndex removed for: ${email || phone || buyerId || sellerId || customId}`);
}

/* -------------------------------------------------------------------------- */
/*                               FIND LOGIN INDEX                             */
/* -------------------------------------------------------------------------- */

export async function findLoginIndex(input) {
  if (!input) return null;

  const cleanedPhone = normalizePhone(input);

  const possibleKeys = [
    `email_${input.toLowerCase()}`,
    `phone_${input}`,
    `phone_${cleanedPhone}`,
    `buyerId_${input}`,
    `sellerId_${input}`,
    `customId_${input}`,
  ];

  for (const key of possibleKeys) {
    const ref = firestore.doc(`loginIndex/${key}`);
    const snap = await ref.get();
    if (snap.exists) return snap.data();
  }

  return null;
}
