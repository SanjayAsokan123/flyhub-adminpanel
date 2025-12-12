import React, { useState, useEffect } from "react";
import "../styles/Training.css";

const GRAPHQL_URL = "http://127.0.0.1:5001/graphql";
const UPLOAD_URL = "http://127.0.0.1:5001/upload";  // Backend that uploads to Firebase

function TrainingPage() {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [gst, setGst] = useState("");
  const [days, setDays] = useState("");
  const [imagePath, setImagePath] = useState(""); // stores Firebase URL
  const [shortDescription, setShortDescription] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [editMode, setEditMode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [search, setSearch] = useState("");

  // Fetch all trainings on mount
  useEffect(() => {
    fetchTrainings();
  }, []);

  const fetchTrainings = async () => {
    setLoading(true);
    const query = `
      query {
        getTrainings {
          id
          title
          amount
          gst
          days
          totalAmount
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
      if (result.errors) throw new Error(result.errors[0].message);

      setSubmissions(result.data.getTrainings || []);
    } catch (err) {
      setError("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Hide toast automatically
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Firebase Upload Handler
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "training"); // Upload folder in firebase

    try {
      const res = await fetch(UPLOAD_URL, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        setImagePath(data.url); // Firebase download URL
        setToast("✅ Image uploaded successfully!");
      } else {
        setToast("❌ Upload failed!");
      }
    } catch (err) {
      setToast("❌ Upload error: " + err.message);
    }
  };

  // Escape GraphQL strings safely
  const escapeGraphQLString = (str = "") =>
    str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");

  // Submit training (add / update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return alert("Please enter a title!");

    setActionLoading(true);

    const mutation = editMode
      ? `
      mutation {
        updateTraining(
          id: "${editMode}",
          title: "${escapeGraphQLString(title)}",
          amount: ${parseFloat(amount)},
          gst: ${parseFloat(gst)},
          days: ${parseInt(days)},
          imagePath: "${imagePath}",
          shortDescription: "${escapeGraphQLString(shortDescription)}",
          fullDescription: "${escapeGraphQLString(fullDescription)}"
        ) {
          id title amount gst days totalAmount imagePath shortDescription fullDescription
        }
      }
    `
      : `
      mutation {
        addTraining(
          title: "${escapeGraphQLString(title)}",
          amount: ${parseFloat(amount)},
          gst: ${parseFloat(gst)},
          days: ${parseInt(days)},
          imagePath: "${imagePath}",
          shortDescription: "${escapeGraphQLString(shortDescription)}",
          fullDescription: "${escapeGraphQLString(fullDescription)}"
        ) {
          id title amount gst days totalAmount imagePath shortDescription fullDescription
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
      if (result.errors) throw new Error(result.errors[0].message);

      const newEntry = editMode
        ? result.data.updateTraining
        : result.data.addTraining;

      setSubmissions((prev) =>
        editMode
          ? prev.map((t) => (t.id === editMode ? newEntry : t))
          : [newEntry, ...prev]
      );

      setToast(editMode ? "✅ Training updated!" : "✅ Training added!");
      resetForm();
    } catch (err) {
      setError("❌ " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Reset form fields
  const resetForm = () => {
    setTitle("");
    setAmount("");
    setGst("");
    setDays("");
    setImagePath("");
    setShortDescription("");
    setFullDescription("");
    setEditMode(null);
  };

  // Edit selected training
  const handleEdit = (t) => {
    setEditMode(t.id);
    setTitle(t.title);
    setAmount(t.amount);
    setGst(t.gst);
    setDays(t.days);
    setImagePath(t.imagePath);
    setShortDescription(t.shortDescription || "");
    setFullDescription(t.fullDescription || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Delete training
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this training?")) return;

    setActionLoading(true);
    const mutation = `
      mutation {
        deleteTraining(id: "${id}")
      }
    `;

    try {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: mutation }),
      });

      const result = await res.json();
      if (result.errors) throw new Error(result.errors[0].message);

      setSubmissions((prev) => prev.filter((t) => t.id !== id));
      setToast("🗑 Training deleted!");
    } catch (err) {
      setError("❌ " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredList = submissions.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <p>Loading trainings...</p>;
  if (error) return <p className="error-text">Error: {error}</p>;

  return (
    <div className="training-page">
      <h2>🎓 Training Management</h2>

      {toast && <div className="toast">{toast}</div>}

      {/* Search Bar */}
      <div className="search-section">
        <input
          type="text"
          placeholder="Search training..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={() => setShowSummary(!showSummary)}>
          {showSummary ? "Hide Trainings" : "View Trainings"}
        </button>
      </div>

      {showSummary && (
        <div className="training-summary">
          {filteredList.length === 0 ? (
            <p>No trainings found.</p>
          ) : (
            filteredList.map((t) => (
              <div key={t.id} className="summary-card">
                <img src={t.imagePath} alt={t.title} />
                <div className="summary-info">
                  <h4>{t.title}</h4>
                  <p>Days: {t.days}</p>
                  <p>Amount: ₹{t.amount}</p>
                  <p>GST: {t.gst}%</p>
                  <p>Total: ₹{t.totalAmount}</p>
                  <p>{t.shortDescription}</p>

                  <div className="actions">
                    <button className="edit-btn" onClick={() => handleEdit(t)}>
                      ✏ Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(t.id)}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Form */}
      <form className="training-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title *</label>
          <input
            type="text"
            placeholder="Enter training title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>GST (%)</label>
            <input
              type="number"
              value={gst}
              onChange={(e) => setGst(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Days</label>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              required
            />
          </div>
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

        <button className="submit-btn" type="submit" disabled={actionLoading}>
          {actionLoading
            ? "Saving..."
            : editMode
            ? "Update Training"
            : "Add Training"}
        </button>
      </form>
    </div>
  );
}

export default TrainingPage;
