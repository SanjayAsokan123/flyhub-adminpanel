import { bucket } from "../config/firebaseAdmin.js";
import { v4 as uuidv4 } from "uuid";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "video/mp4",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];


export const uploadSingleFile = async (file, folder = "uploads") => {
  try {
    if (!file || !file.buffer) throw new Error("Invalid file: missing buffer");
    if (!bucket) throw new Error("Firebase Storage bucket not initialized");

    if (file.size > MAX_FILE_SIZE)
      throw new Error("File too large (max 20 MB)");
    if (!ALLOWED_TYPES.includes(file.mimetype))
      throw new Error(`Invalid file type: ${file.mimetype}`);

    const uniqueId = uuidv4();
    const safeName = file.originalname.replace(/[^\w.\-]+/g, "_");
    const fileName = `${folder}/${uniqueId}_${safeName}`;
    const blob = bucket.file(fileName);
    await blob.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
        metadata: { firebaseStorageDownloadTokens: uniqueId },
      },
      resumable: false,
      gzip: true,
    });

const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
  fileName
)}?alt=media&token=${uniqueId}`;


    console.log(`✅ Uploaded: ${fileName}`);
    return publicUrl;
  } catch (err) {
    console.error("❌ Firebase upload failed:", err.message);
    throw new Error("Upload to Firebase failed: " + err.message);
  }
};

export const uploadMultipleFiles = async (files, folder = "uploads") => {
  try {
    if (!Array.isArray(files) || files.length === 0)
      throw new Error("No files provided for upload");

    const uploadPromises = files.map((file) => uploadSingleFile(file, folder));
    return await Promise.all(uploadPromises);
  } catch (err) {
    console.error("❌ Error uploading multiple files:", err.message);
    throw new Error("Failed to upload multiple files: " + err.message);
  }
};


export const deleteFirebaseFile = async (filePathOrUrl) => {
  try {
    if (!filePathOrUrl) throw new Error("No file path provided");
    if (!bucket) throw new Error("Firebase Storage bucket not initialized");
    const decodedPath = decodeURIComponent(filePathOrUrl);
    const match = decodedPath.match(/\/o\/(.*?)\?/);
    const internalPath = match ? match[1] : filePathOrUrl;

    const file = bucket.file(internalPath);
    await file.delete({ ignoreNotFound: true });

    console.log(`🗑️ Deleted from Firebase: ${internalPath}`);
  } catch (err) {
    console.error("⚠️ Error deleting Firebase file:", err.message);
  }
};


export const uploadToFirebase = uploadSingleFile;
