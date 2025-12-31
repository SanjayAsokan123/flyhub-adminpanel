
import { admin } from "../config/firebaseAdmin.js";

export const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }
  const token = authHeader.split(" ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.firebaseUser = decodedToken;
    console.log(`✅ Firebase user verified: ${decodedToken.uid}`);
  } catch (error) {
    console.warn("⚠️ Firebase token verification failed:", error.message);
  }
  next();
};
