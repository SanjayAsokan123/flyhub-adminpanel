import express from "express";
import Cart from "../models/Cart.model.js";

const router = express.Router();

// GET CART
router.get("/", async (req, res) => {
  try {
    const { buyerId } = req.query;

    if (!buyerId) return res.status(400).json({ error: "buyerId required" });

    const cart = await Cart.find({ buyerId });
    res.json(cart);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD TO CART
router.post("/add", async (req, res) => {
  try {
    const { buyerId, productId } = req.body;

    let item = await Cart.findOne({ buyerId, productId });

    if (item) {
      item.quantity += 1;
      await item.save();
      return res.json({ success: true, item });
    }

    item = await Cart.create({ buyerId, productId });
    res.json({ success: true, item });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE QTY
router.post("/updateQty", async (req, res) => {
  try {
    const { buyerId, productId, quantity } = req.body;

    await Cart.updateOne(
      { buyerId, productId },
      { quantity }
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REMOVE FROM CART
router.post("/remove", async (req, res) => {
  try {
    const { buyerId, productId } = req.body;

    await Cart.deleteOne({ buyerId, productId });

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
