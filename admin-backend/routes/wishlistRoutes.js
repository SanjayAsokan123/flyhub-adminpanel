import express from "express";
import Wishlist from "../models/Wishlist.model.js";

const router = express.Router();

// GET WISHLIST
router.get("/", async (req, res) => {
  try {
    const { buyerId } = req.query;

    if (!buyerId) return res.status(400).json({ error: "buyerId required" });

    const list = await Wishlist.find({ buyerId });
    res.json(list);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD TO WISHLIST
router.post("/add", async (req, res) => {
  try {
    const { buyerId, productId } = req.body;

    const exists = await Wishlist.findOne({ buyerId, productId });
    if (exists) return res.json({ exists: true, item: exists });

    const item = await Wishlist.create({ buyerId, productId });

    res.json({ success: true, item });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REMOVE FROM WISHLIST
router.post("/remove", async (req, res) => {
  try {
    const { buyerId, productId } = req.body;

    await Wishlist.deleteOne({ buyerId, productId });

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
