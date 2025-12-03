import React, { useState, useEffect } from "react";
import "../styles/Regulatory.css";

const GRAPHQL_URL = "http://127.0.0.1:5001/graphql";

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

  // Fetch all submissions
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
        const response = await fetch(GRAPHQL_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const result = await response.json();

        if (result.errors) {
          setError(result.errors[0].message);
        } else {
          // Filter out null entries
          const filtered = result.data.regulatoryAll.filter(
            (entry) => entry && entry.id && entry.title
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

  // Add or Update submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return alert("Title is required!");

    const mutation = editMode
      ? `
        mutation {
          updateRegulatory(
            id: "${editMode}",
            input: {
              title: "${title.replace(/"/g, '\\"')}",
              date: "${date}",
              imagePath: "${imagePath.replace(/"/g, '\\"')}",
              shortDescription: "${shortDescription.replace(/"/g, '\\"')}",
              fullDescription: "${fullDescription.replace(/"/g, '\\"')}"
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
              title: "${title.replace(/"/g, '\\"')}",
              date: "${date}",
              imagePath: "${imagePath.replace(/"/g, '\\"')}",
              shortDescription: "${shortDescription.replace(/"/g, '\\"')}",
              fullDescription: "${fullDescription.replace(/"/g, '\\"')}"
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
      const response = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: mutation }),
      });
      const result = await response.json();

      if (result.errors) return setError(result.errors[0].message);

      const newEntry = editMode
        ? result.data.updateRegulatory
        : result.data.createRegulatory;

      if (newEntry && newEntry.id) {
        setSubmissions((prev) =>
          editMode
            ? prev.map((item) => (item.id === editMode ? newEntry : item))
            : [newEntry, ...prev]
        );
      }

      // Reset form
      setTitle("");
      setDate("");
      setImagePath("");
      setShortDescription("");
      setFullDescription("");
      setEditMode(null);
    } catch (err) {
      alert("Network error: " + err.message);
    }
  };

  const handleEdit = (entry) => {
    if (!entry || !entry.id) return;
    setEditMode(entry.id);
    setTitle(entry.title || "");
    setDate(entry.date || "");
    setImagePath(entry.imagePath || "");
    setShortDescription(entry.shortDescription || "");
    setFullDescription(entry.fullDescription || "");
  };

  const handleDelete = async (id) => {
    if (!id) return;
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
      setSubmissions(submissions.filter((entry) => entry && entry.id !== id));
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="error-text">Error: {error}</p>;

  return (
    <div className="regulatory-page">
      <h2>📜 Regulatory Submissions</h2>

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
          <label>Image URL</label>
          <input
            type="text"
            placeholder="Enter image URL"
            value={imagePath}
            onChange={(e) => setImagePath(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Short Description</label>
          <input
            type="text"
            placeholder="Enter short description"
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Full Description</label>
          <textarea
            placeholder="Enter full description..."
            value={fullDescription}
            onChange={(e) => setFullDescription(e.target.value)}
            rows="4"
          />
        </div>

        <button type="submit" className="submit-btn">{editMode ? "Update" : "Submit"}</button>
      </form>

      <div className="submissions-list">
        {submissions.map((entry) =>
          entry && entry.id ? (
            <div key={entry.id} className="submission-card">
              {entry.imagePath && <img src={entry.imagePath} alt={entry.title || "Untitled"} />}
              <h3>{entry.title || "Untitled"}</h3>
              {entry.date && <span className="submission-date">{entry.date}</span>}
              <p><strong>Short:</strong> {entry.shortDescription || "-"}</p>
              <p><strong>Full:</strong> {entry.fullDescription || "-"}</p>
              <div className="actions">
                <button className="edit-btn" onClick={() => handleEdit(entry)}>✏ Edit</button>
                <button className="delete-btn" onClick={() => handleDelete(entry.id)}>🗑 Delete</button>
              </div>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

export default RegulatoryPage;
