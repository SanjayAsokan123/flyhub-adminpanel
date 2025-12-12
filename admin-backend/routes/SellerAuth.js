// admin-backend/routes/sellerAuth.js
import express from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import Seller from "../models/Seller.model.js";
import { auth } from "../config/firebaseAdmin.js";

const router = express.Router();
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many attempts, please wait and try again." }
});

router.post("/sellerid", limiter, async (req, res) => {
  try {
    const { sellerId, password } = req.body;

    if (!sellerId || !password) {
      return res.status(400).json({ error: "Seller ID & password required." });
    }
    const seller = await Seller.findOne({ customId: sellerId });
    if (!seller) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!seller.passwordHash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, seller.passwordHash);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    let uid = seller.firebaseUid;
    if (!uid) {
      const firebaseUser = await auth.createUser({
        email: seller.email || undefined,
        displayName: seller.companyName || seller.customId,
        disabled: false,
      });
      uid = firebaseUser.uid;
      seller.firebaseUid = uid;
      await seller.save();
    }
    const token = await auth.createCustomToken(uid, {
      role: "seller",
      sellerId: seller.customId,
    });

    return res.json({ success: true, token });

  } catch (err) {
    console.error("🔥 SellerID Login Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
