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

    /* ===============================
       🌍 ENV (Render / Production)
       =============================== */
    if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      console.log("🌍 Using Firebase credentials from environment variables");

      credentials = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      });
    }

    /* ===============================
       🖥 Local JSON fallback
       =============================== */
    else if (
      process.env.FIREBASE_ADMIN_CREDENTIALS &&
      fs.existsSync(process.env.FIREBASE_ADMIN_CREDENTIALS)
    ) {
      console.log("🔑 Using Firebase credentials from file");

      const serviceAccount = JSON.parse(
        fs.readFileSync(process.env.FIREBASE_ADMIN_CREDENTIALS, "utf8")
      );

      credentials = admin.credential.cert(serviceAccount);
    }

    /* ===============================
       🚨 No credentials → skip init
       =============================== */
    if (!credentials) {
      console.warn("⚠ Firebase credentials missing — Admin SDK not initialized.");
    } else {
      app = admin.initializeApp({
        credential: credentials,
        storageBucket:
          process.env.FIREBASE_STORAGE_BUCKET ||
          `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
      });

      auth = admin.auth();
      firestore = admin.firestore();
      bucket = admin.storage().bucket();

      firestore.settings({ ignoreUndefinedProperties: true });

      console.log("🔥 Firebase Admin initialized successfully");
    }
  } catch (error) {
    console.error("❌ Firebase Admin initialization failed:", error);
  }
} else {
  // Already initialized
  app = admin.app();
  auth = admin.auth();
  firestore = admin.firestore();
  bucket = admin.storage().bucket();

  console.log("ℹ Firebase Admin already initialized");
}

export { admin, app, auth, firestore, bucket };
export default admin;
