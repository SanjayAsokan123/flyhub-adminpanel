import React, { useState, useEffect } from "react";
import "../styles/Regulatory.css";

const GRAPHQL_URL = "https://flyhub-webadmin-4.onrender.com/graphql";
const UPLOAD_URL = "https://flyhub-webadmin-4.onrender.com/upload";

function RegulatoryPage() {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [editMode, setEditMode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ------------------ Fetch All Records ------------------
  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);

      const query = `
        query {
          regulatoryAll {
            id
            title
            date
            imagePath
            shortDescription
            fullDescription
            createdAt
          }
        }
      `;

      try {
        const res = await fetch(GRAPHQL_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });

        const result = await res.json();

        if (result.errors) {
          setError(result.errors[0].message);
        } else {
          const filtered = result.data.regulatoryAll.filter(
            (entry) => entry && entry.id
          );
          setSubmissions(filtered);
        }
      } catch (err) {
        setError("Network error: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  // ------------------ Image Upload Handler ------------------
 const handleFileUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // 🔒 Frontend validation
  if (!file.type.startsWith("image/")) {
    alert("❌ Only images are allowed");
    return;
  }

  if (file.size > 20 * 1024 * 1024) {
    alert("❌ File too large (max 20MB)");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "regulatory");

  try {
    const res = await fetch(UPLOAD_URL, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Upload failed");
    }

    const data = await res.json();

    if (data.success && data.url) {
      setImagePath(data.url);
      alert("✅ Image uploaded successfully!");
    } else {
      throw new Error("Upload failed");
    }
  } catch (err) {
    console.error(err);
    alert("❌ Upload error");
  }
};

  // Escape GraphQL string safely
  const safe = (str = "") =>
    str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");

  // ------------------ Submit Create / Update ------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return alert("Title is required!");

    const mutation = editMode
      ? `
        mutation {
          updateRegulatory(
            id: "${editMode}",
            input: {
              title: "${safe(title)}",
              date: "${date}",
              imagePath: "${safe(imagePath)}",
              shortDescription: "${safe(shortDescription)}",
              fullDescription: "${safe(fullDescription)}"
            }
          ) {
            id
            title
            date
            imagePath
            shortDescription
            fullDescription
            createdAt
          }
        }
      `
      : `
        mutation {
          createRegulatory(
            input: {
              title: "${safe(title)}",
              date: "${date}",
              imagePath: "${safe(imagePath)}",
              shortDescription: "${safe(shortDescription)}",
              fullDescription: "${safe(fullDescription)}"
            }
          ) {
            id
            title
            date
            imagePath
            shortDescription
            fullDescription
            createdAt
          }
        }
      `;

    try {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: mutation }),
      });

      const result = await res.json();

      if (result.errors) return setError(result.errors[0].message);

      const newEntry = editMode
        ? result.data.updateRegulatory
        : result.data.createRegulatory;

      setSubmissions((prev) =>
        editMode
          ? prev.map((x) => (x.id === editMode ? newEntry : x))
          : [newEntry, ...prev]
      );

      resetForm();
    } catch (err) {
      alert("❌ Network error: " + err.message);
    }
  };

  // ------------------ Reset Form ------------------
  const resetForm = () => {
    setTitle("");
    setDate("");
    setImagePath("");
    setShortDescription("");
    setFullDescription("");
    setEditMode(null);
  };

  // ------------------ Edit Entry ------------------
  const handleEdit = (entry) => {
    setEditMode(entry.id);
    setTitle(entry.title);
    setDate(entry.date);
    setImagePath(entry.imagePath);
    setShortDescription(entry.shortDescription);
    setFullDescription(entry.fullDescription);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ------------------ Delete Entry ------------------
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this regulatory record?")) return;

    const mutation = `
      mutation {
        deleteRegulatory(id: "${id}") {
          id
        }
      }
    `;

    try {
      await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: mutation }),
      });

      setSubmissions(submissions.filter((x) => x.id !== id));
    } catch (err) {
      alert("❌ Delete failed: " + err.message);
    }
  };

  // ------------------ UI ------------------
  if (loading) return <p>Loading regulatory data...</p>;
  if (error) return <p className="error-text">Error: {error}</p>;

  return (
    <div className="regulatory-page">
      <h2>📜 Regulatory Submissions</h2>

      {/* ------------------ FORM ------------------ */}
      <form className="regulatory-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title *</label>
          <input
            type="text"
            placeholder="Enter title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="form-group">
          <label>Upload Image</label>
          <input type="file" accept="image/*" onChange={handleFileUpload} />

          {imagePath && (
            <div className="image-preview">
              <img src={imagePath} alt="preview" />
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Short Description</label>
          <input
            type="text"
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Full Description</label>
          <textarea
            rows="4"
            value={fullDescription}
            onChange={(e) => setFullDescription(e.target.value)}
          />
        </div>

        <button type="submit" className="submit-btn">
          {editMode ? "Update" : "Submit"}
        </button>
      </form>

      {/* ------------------ LIST ------------------ */}
      <div className="submissions-list">
        {submissions.map((entry) => (
          <div key={entry.id} className="submission-card">
            {entry.imagePath && (
              <img src={entry.imagePath} alt={entry.title} />
            )}

            <h3>{entry.title}</h3>
            {entry.date && <span className="submission-date">{entry.date}</span>}

            <p><strong>Short:</strong> {entry.shortDescription}</p>
            <p><strong>Full:</strong> {entry.fullDescription}</p>

            <div className="actions">
              <button className="edit-btn" onClick={() => handleEdit(entry)}>
                ✏ Edit
              </button>
              <button className="delete-btn" onClick={() => handleDelete(entry.id)}>
                🗑 Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RegulatoryPage;
