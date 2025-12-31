// routes/upload.route.js
import express from "express";
import multer from "multer";
import {
  uploadSingleFile,
  uploadMultipleFiles,
} from "../utils/uploadToFirebase.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/single", upload.single("file"), async (req, res) => {
  try {
    const folder = req.body.folder || "general";
    const fileUrl = await uploadSingleFile(req.file, folder);
    res.json({ success: true, filePath: fileUrl });
  } catch (err) {
    console.error("❌ Upload error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});
router.post("/multiple", upload.array("files"), async (req, res) => {
  try {
    const folder = req.body.folder || "general";
    const fileUrls = await uploadMultipleFiles(req.files, folder);
    res.json({ success: true, files: fileUrls });
  } catch (err) {
    console.error("❌ Multi-upload error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
