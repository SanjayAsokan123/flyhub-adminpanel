import { bucket } from "../config/firebaseAdmin.js";
import { v4 as uuidv4 } from "uuid";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "video/mp4",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];


export async function uploadPdfBuffer(buffer, fileName) {
  const token = uuidv4();
  const filePath = `seller-packing-slips/${fileName}`;

  const file = bucket.file(filePath);

  await file.save(buffer, {
    resumable: false,
    contentType: "application/pdf",
    metadata: {
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  });

  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
    filePath
  )}?alt=media&token=${token}`;
}



export const uploadSingleFile = async (file, folder = "uploads") => {
  try {
    if (!file || !file.buffer) {
      throw new Error("Invalid file: missing buffer");
    }

    if (!bucket) {
      throw new Error("Firebase Storage bucket not initialized");
    }

    // ✅ Correct size check for memoryStorage
    if (file.buffer.length > MAX_FILE_SIZE) {
      throw new Error("File too large (max 20 MB)");
    }

    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new Error(`Invalid file type: ${file.mimetype}`);
    }

    const uniqueId = uuidv4();
    const safeName = file.originalname.replace(/[^\w.\-]+/g, "_");
    const fileName = `${folder}/${uniqueId}_${safeName}`;

    const blob = bucket.file(fileName);

    await blob.save(file.buffer, {
      resumable: false,
      gzip: true,
      metadata: {
        contentType: file.mimetype,
        metadata: {
          firebaseStorageDownloadTokens: uniqueId,
        },
      },
    });

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
      fileName
    )}?alt=media&token=${uniqueId}`;

    console.log(`✅ Uploaded to Firebase: ${fileName}`);

    return publicUrl;
  } catch (err) {
    console.error("❌ Firebase upload failed:", err);
    throw new Error(`Upload to Firebase failed: ${err.message}`);
  }
};

export const uploadMultipleFiles = async (files, folder = "uploads") => {
  try {
    if (!Array.isArray(files) || files.length === 0) {
      throw new Error("No files provided for upload");
    }

    return await Promise.all(
      files.map((file) => uploadSingleFile(file, folder))
    );
  } catch (err) {
    console.error("❌ Multiple upload failed:", err);
    throw new Error(`Failed to upload multiple files: ${err.message}`);
  }
};

export const deleteFirebaseFile = async (filePathOrUrl) => {
  try {
    if (!filePathOrUrl) {
      throw new Error("No file path or URL provided");
    }

    if (!bucket) {
      throw new Error("Firebase Storage bucket not initialized");
    }

    let internalPath = filePathOrUrl;

    // Handle Firebase public URL
    const match = decodeURIComponent(filePathOrUrl).match(/\/o\/(.*?)\?/);
    if (match && match[1]) {
      internalPath = match[1];
    }

    const file = bucket.file(internalPath);
    await file.delete({ ignoreNotFound: true });

    console.log(`🗑️ Deleted from Firebase: ${internalPath}`);
  } catch (err) {
    console.error("⚠️ Firebase delete failed:", err.message);
  }
};

export const uploadToFirebase = uploadSingleFile;
