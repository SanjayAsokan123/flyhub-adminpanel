// config/firebaseAdmin.js
import admin from "firebase-admin";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

let app = null;
let bucket = null;
let auth = null;
let firestore = null;

if (!admin.apps.length) {
  try {
    let credentials = null;

    const serviceAccountPath = process.env.FIREBASE_ADMIN_CREDENTIALS;
    if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
      console.log(`🔑 Using Firebase credentials from file: ${serviceAccountPath}`);
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
      credentials = admin.credential.cert(serviceAccount);
    }

    else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      console.log("🌍 Using Firebase credentials from environment variables");

      credentials = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      });
    }

    if (!credentials) {
      console.warn("⚠️ Firebase credentials missing — Admin SDK not initialized.");
    } else {
      app = admin.initializeApp({
        credential: credentials,
        storageBucket:
          process.env.FIREBASE_STORAGE_BUCKET ||
          `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
      });

      bucket = admin.storage().bucket();
      auth = admin.auth();
      firestore = admin.firestore();

      console.log("🔥 Firebase Admin initialized successfully");
    }
  } catch (error) {
    console.error("❌ Firebase Admin initialization failed:", error);
  }
} else {
  console.log("ℹ️ Firebase Admin already initialized");
  app = admin.app();
  bucket = admin.storage().bucket();
  auth = admin.auth();
  firestore = admin.firestore();
}

export { admin, app, bucket, auth, firestore };
export default admin;
