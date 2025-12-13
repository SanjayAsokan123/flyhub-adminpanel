// config/firebaseAdmin.js
import admin from "firebase-admin";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

let app;
let bucket;
let auth;
let firestore;

function initFirebaseAdmin() {
  if (admin.apps.length) {
    // Already initialized
    app = admin.app();
    auth = admin.auth();
    firestore = admin.firestore();
    bucket = admin.storage().bucket();
    console.log("ℹ️ Firebase Admin already initialized");
    return;
  }

  try {
    let credential;

    // 1️⃣ Load credentials from file (preferred for local / server)
    const serviceAccountPath = process.env.FIREBASE_ADMIN_CREDENTIALS;
    if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
      console.log(`🔑 Firebase credentials loaded from file`);
      const serviceAccount = JSON.parse(
        fs.readFileSync(serviceAccountPath, "utf8")
      );
      credential = admin.credential.cert(serviceAccount);
    }

    // 2️⃣ Load credentials from env (preferred for cloud)
    else if (
      process.env.FIREBASE_PRIVATE_KEY &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PROJECT_ID
    ) {
      console.log("🌍 Firebase credentials loaded from environment variables");

      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      });
    }

    if (!credential) {
      throw new Error("Firebase credentials not found");
    }

    app = admin.initializeApp({
      credential,
      storageBucket:
        process.env.FIREBASE_STORAGE_BUCKET ||
        `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
    });

    auth = admin.auth();
    firestore = admin.firestore();
    bucket = admin.storage().bucket();

    console.log("🔥 Firebase Admin initialized successfully");
  } catch (err) {
    console.error("❌ Firebase Admin initialization failed:", err.message);
  }
}

// Initialize immediately
initFirebaseAdmin();

export { admin, app, auth, firestore, bucket };
export default admin;
