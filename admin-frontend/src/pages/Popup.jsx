import React, { useState, useRef } from "react";
import "../styles/Popup.css";

function UploadImagePage({ onBack }) {
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [imageTitle, setImageTitle] = useState("");
  const [imageDescription, setImageDescription] = useState("");
  const [imageTags, setImageTags] = useState("");
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState("");
  const fileInputRef = useRef(null);

  const handleOnBack = onBack || (() => window.history.back());

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    if (!validTypes.includes(file.type)) {
      alert("Please select a valid image file (JPG, PNG, GIF, WebP)!");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size should be less than 5MB!");
      return;
    }

    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    setError("");
  };

  const openFileManager = () => {
    fileInputRef.current.click();
  };

  // ------------------------------
  // METHOD 1 — REST UPLOAD
  // ------------------------------
  const uploadViaFormData = async (file, inputData) => {
    const formData = new FormData();
    formData.append("file", file);

    const metadata = {
      title: inputData.title || null,
      description: inputData.description || null,
      tags: inputData.tags || [],
    };

    Object.keys(metadata).forEach((key) => {
      if (
        metadata[key] === null ||
        (Array.isArray(metadata[key]) && metadata[key].length === 0)
      ) {
        delete metadata[key];
      }
    });

    formData.append("metadata", JSON.stringify(metadata));

    const response = await fetch("http://localhost:5001/upload", {
      method: "POST",
      body: formData,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Server responded with ${response.status}: ${err}`);
    }

    return await response.json();
  };

  // ------------------------------
  // METHOD 2 — GRAPHQL UPLOAD
  // ------------------------------
  const uploadViaGraphQL = async (file, inputData) => {
    const operations = JSON.stringify({
      query: `
        mutation UploadImage($file: Upload!, $input: ImageInput) {
          uploadImage(file: $file, input: $input) {
            id
            title
            description
            tags
            filename
            originalName
            mimeType
            size
            uploadedAt
          }
        }
      `,
      variables: {
        file: null,
        input:
          inputData.title ||
          inputData.description ||
          inputData.tags?.length > 0
            ? inputData
            : null,
      },
    });

    const map = JSON.stringify({
      0: ["variables.file"],
    });

    const formData = new FormData();
    formData.append("operations", operations);
    formData.append("map", map);
    formData.append("0", file);

    const response = await fetch("http://localhost:5000/graphql", {
      method: "POST",
      body: formData,
      headers: {
        Accept: "application/json",
        "apollo-require-preflight": "true",
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        `GraphQL error: ${response.status} - ${JSON.stringify(result)}`
      );
    }

    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data;
  };

  // ------------------------------
  // FORM SUBMIT HANDLER
  // ------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!imageFile) {
      alert("Please select an image!");
      return;
    }

    setIsUploading(true);
    setError("");
    setDebugInfo("");

    try {
      const inputData = {};

      if (imageTitle.trim()) inputData.title = imageTitle;
      if (imageDescription.trim()) inputData.description = imageDescription;

      const tagArr = imageTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);

      if (tagArr.length > 0) inputData.tags = tagArr;

      let result;

      try {
        result = await uploadViaFormData(imageFile, inputData);
        alert("Image uploaded successfully via REST!");
      } catch (restError) {
        try {
          result = await uploadViaGraphQL(imageFile, inputData);
          alert("Image uploaded successfully via GraphQL!");
        } catch (graphqlError) {
          throw new Error(
            `Upload failed: ${restError.message}. GraphQL also failed: ${graphqlError.message}`
          );
        }
      }

      resetForm();
      setTimeout(() => handleOnBack(), 1000);
    } catch (err) {
      setError(err.message);
      setDebugInfo(
        `
File: ${imageFile?.name}
Type: ${imageFile?.type}
Size: ${imageFile?.size}
Error: ${err.message}
      `
      );
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setImageFile(null);
    setPreview("");
    setImageTitle("");
    setImageDescription("");
    setImageTags("");
    setError("");
    setDebugInfo("");

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearImage = () => {
    setImageFile(null);
    setPreview("");

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${
      ["Bytes", "KB", "MB", "GB"][i]
    }`;
  };

  return (
    <div className="upload-image-page">
      {/* ---------------- HEADER ---------------- */}
      <header className="upload-image-header">
        <button
          className="back-button"
          onClick={handleOnBack}
          disabled={isUploading}
        >
          ← Back
        </button>

        <div className="header-content">
          <h1 className="page-title">
            <span className="title-icon">📤</span> Upload Image
          </h1>
          <p className="page-subtitle">Upload images for your content</p>
        </div>

        <div className="header-actions">
          {imageFile && !isUploading && (
            <button className="clear-all-btn" onClick={clearImage}>
              Clear
            </button>
          )}
        </div>
      </header>

      {/* ---------------- MAIN BODY ---------------- */}
      <main className="upload-image-content">
        <div className="upload-container">
          {/* LEFT PANEL */}
          <div className="upload-left-panel">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              style={{ display: "none" }}
              disabled={isUploading}
            />

            {/* ERROR BOX */}
            {error && (
              <div className="error-message">
                <span className="error-icon">❌</span>

                <div className="error-details">
                  <strong>Upload Failed</strong>
                  <div className="error-text">{error}</div>

                  {debugInfo && (
                    <details className="debug-info">
                      <summary>Debug Info</summary>
                      <pre>{debugInfo}</pre>
                    </details>
                  )}
                </div>
              </div>
            )}

            {/* IMAGE PREVIEW */}
            <div className="image-preview-section">
              <div className="section-header">
                <h2>Image Preview</h2>
                {preview && !isUploading && (
                  <span className="selected-badge">✓ Selected</span>
                )}
              </div>

              <div
                className={`image-preview-area ${
                  preview ? "has-image" : "empty"
                } ${isUploading ? "uploading" : ""}`}
                onClick={
                  preview && !isUploading ? null : () => openFileManager()
                }
              >
                {preview ? (
                  <div className="preview-wrapper">
                    <img
                      src={preview}
                      alt="preview"
                      className="image-preview"
                    />

                    {!isUploading && (
                      <div className="preview-overlay">
                        <button
                          className="change-image-btn"
                          type="button"
                          onClick={openFileManager}
                        >
                          Change Image
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-preview">
                    <div className="empty-icon">📁</div>
                    <h3>No Image Selected</h3>
                    <p>Select an image from your device</p>
                    <span>Supports: JPG, PNG, GIF, WebP (Max 5MB)</span>
                  </div>
                )}
              </div>

              <div className="quick-actions">
                <button
                  className="quick-action-btn primary"
                  type="button"
                  disabled={isUploading}
                  onClick={openFileManager}
                >
                  📁 Browse Files
                </button>
              </div>
            </div>

            {/* UPLOAD FORM */}
            <form className="upload-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Image Title (Optional)</label>
                <input
                  className="form-input"
                  type="text"
                  disabled={isUploading}
                  value={imageTitle}
                  onChange={(e) => setImageTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  disabled={isUploading}
                  value={imageDescription}
                  onChange={(e) => setImageDescription(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Tags (Optional)</label>
                <input
                  className="form-input"
                  disabled={isUploading}
                  value={imageTags}
                  onChange={(e) => setImageTags(e.target.value)}
                  placeholder="e.g., drone, product, design"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={handleOnBack}
                  disabled={isUploading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={!imageFile || isUploading}
                >
                  {isUploading ? (
                    <>
                      <span className="spinner"></span> Uploading…
                    </>
                  ) : (
                    "Upload Image"
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT PANEL */}
          <div className="upload-right-panel">
            <div className="summary-section">
              <h2 className="summary-title">📄 Image Details</h2>

              {imageFile ? (
                <div className="image-details">
                  <div className="detail-row">
                    <span className="detail-label">File Name:</span>
                    <span className="detail-value">{imageFile.name}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Type:</span>
                    <span className="detail-value">{imageFile.type}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Size:</span>
                    <span className="detail-value">
                      {formatFileSize(imageFile.size)}
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Last Modified:</span>
                    <span className="detail-value">
                      {new Date(imageFile.lastModified).toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="empty-summary">
                  <div className="empty-summary-icon">📋</div>
                  <p>No image selected</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default UploadImagePage;
