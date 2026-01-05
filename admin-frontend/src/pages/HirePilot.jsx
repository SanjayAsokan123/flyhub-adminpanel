import React, { useState, useEffect } from "react";
import "../styles/HirePilot.css";

const GRAPHQL_URL = "http://localhost:5001/graphql";

export default function HirePilotsDashboard() {
  const [pilots, setPilots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updating, setUpdating] = useState({ id: null, status: null });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("lifo");

  // Fetch pilots
  const fetchPilots = async () => {
    setLoading(true);
    setError(null);

    let query = `
      query {
        hirePilots {
          pilotId
          pilotName
          pilotCompany
          location
          availability
          specification
          description
          adminStatus
          newemail
          newphoneNumber
          price { perHour perDay }
          certifications { url }
          resume { url }
          sellerId
          seller { name email phoneNumber }
        }
      }
    `;

    try {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);

      setPilots(json.data.hirePilots || []);
    } catch (err) {
      setError(err.message || "Failed to fetch pilots");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPilots();
  }, []);

  // Delete pilot - FIXED MUTATION NAME
  const deletePilot = async (pilotId) => {
    if (!window.confirm("Are you sure you want to delete this pilot?")) return;

    setUpdating({ id: pilotId, status: "deleting" });

    const mutation = `
      mutation DeletePilot($pilotId: String!) {
        deleteHirePilot(pilotId: $pilotId) {
          pilotId
        }
      }
    `;

    try {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: mutation,
          variables: { pilotId },
        }),
      });

      const json = await res.json();
      
      // Check for GraphQL errors
      if (json.errors) {
        throw new Error(json.errors[0].message);
      }

      // Remove from UI immediately
      setPilots((prev) => prev.filter((p) => p.pilotId !== pilotId));
      alert("✅ Pilot deleted successfully!");
      
      // REFRESH from database to ensure deletion persisted
      setTimeout(() => {
        fetchPilots();
      }, 500);
    } catch (err) {
      alert("❌ Failed to delete pilot: " + err.message);
      // Refresh to show current database state
      fetchPilots();
    } finally {
      setUpdating({ id: null, status: null });
    }
  };

  // Update pilot status
  const updatePilotStatus = async (pilotId, newStatus) => {
    setUpdating({ id: pilotId, status: newStatus });

    const mutation = `
      mutation UpdatePilotStatus($pilotId: String!, $status: String!) {
        adminUpdateHirePilotStatus(pilotId: $pilotId, adminStatus: $status) {
          pilotId
          adminStatus
        }
      }
    `;

    try {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: mutation,
          variables: { pilotId, status: newStatus },
        }),
      });

      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);

      // Update UI
      setPilots((prev) =>
        prev.map((p) =>
          p.pilotId === pilotId ? { ...p, adminStatus: newStatus } : p
        )
      );
    } catch (err) {
      alert("Failed to update status: " + err.message);
    } finally {
      setUpdating({ id: null, status: null });
    }
  };

  // Filter pilots based on status and search term
  const filteredPilots = pilots.filter((p) => {
    const statusMatch = statusFilter === "all" ||
                       (p.adminStatus || "").toLowerCase() === statusFilter;

    const searchMatch = searchTerm === "" ||
                       p.pilotName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (p.pilotCompany && p.pilotCompany.toLowerCase().includes(searchTerm.toLowerCase())) ||
                       (p.location && p.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
                       (p.specification && p.specification.toLowerCase().includes(searchTerm.toLowerCase())) ||
                       (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));

    return statusMatch && searchMatch;
  });

  // Apply LIFO/FIFO sorting
  const sortedPilots = [...filteredPilots].sort((a, b) => {
    if (sortOrder === "lifo") {
      return b.pilotId.localeCompare(a.pilotId);
    } else {
      return a.pilotId.localeCompare(b.pilotId);
    }
  });

  const isUpdating = (pid, status) =>
    updating.id === pid && updating.status === status;

  const statusClass = (s) => {
    if (!s) return "badge-unknown";
    switch (s.toLowerCase()) {
      case "approved":
        return "badge-approved";
      case "pending":
        return "badge-pending";
      case "rejected":
        return "badge-rejected";
      default:
        return "badge-unknown";
    }
  };

  if (loading) return <div className="loading">Loading hire pilots...</div>;
  if (error) return <div className="error">❌ {error}</div>;

  return (
    <div className="rental-container">
      <h2 className="rental-title">🧑‍✈ Hire Pilots Dashboard</h2>

      {/* Search Bar */}
      <div className="rental-search-container">
        <input
          type="text"
          placeholder="Search by name, company, location, or description..."
          className="rental-search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="rental-search-button" onClick={() => {}}>
          🔍
        </button>
      </div>

      {/* Tabs */}
      <div className="rental-tabs">
        {["all", "approved", "pending", "rejected"].map((s) => (
          <button
            key={s}
            className={`rental-tab ${statusFilter === s ? "active" : ""}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === "all" && "📋 All Pilots"}
            {s === "approved" && "✅ Approved"}
            {s === "pending" && "⏳ Pending"}
            {s === "rejected" && "❌ Rejected"}
          </button>
        ))}
      </div>

      {/* LIFO/FIFO Sort Buttons */}
      <div className="rental-sort-container" style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
        <button
          className={`rental-sort-btn ${sortOrder === "lifo" ? "active" : ""}`}
          onClick={() => setSortOrder("lifo")}
          style={{
            padding: "8px 16px",
            borderRadius: "4px",
            border: "1px solid #ddd",
            backgroundColor: sortOrder === "lifo" ? "#007bff" : "#f9f9f9",
            color: sortOrder === "lifo" ? "white" : "#333",
            cursor: "pointer",
            fontWeight: sortOrder === "lifo" ? "600" : "400",
          }}
        >
          📥 LIFO (Latest First)
        </button>
        <button
          className={`rental-sort-btn ${sortOrder === "fifo" ? "active" : ""}`}
          onClick={() => setSortOrder("fifo")}
          style={{
            padding: "8px 16px",
            borderRadius: "4px",
            border: "1px solid #ddd",
            backgroundColor: sortOrder === "fifo" ? "#007bff" : "#f9f9f9",
            color: sortOrder === "fifo" ? "white" : "#333",
            cursor: "pointer",
            fontWeight: sortOrder === "fifo" ? "600" : "400",
          }}
        >
          📤 FIFO (Oldest First)
        </button>
      </div>

      {/* No pilots */}
      {sortedPilots.length === 0 ? (
        <div className="rental-empty">
          {searchTerm
            ? `No pilots matching "${searchTerm}" found.`
            : statusFilter === "all"
            ? "No pilots found."
            : `No ${statusFilter} pilots found.`}
        </div>
      ) : (
        <div className="rental-grid">
          {sortedPilots.map((p) => (
            <div key={p.pilotId} className="rental-card">
              {/* Badge */}
              <span className={`rental-badge ${statusClass(p.adminStatus)}`}>
                {p.adminStatus?.toUpperCase() || "UNKNOWN"}
              </span>

              <img
                src={"/pilot-placeholder.jpg"}
                alt={p.pilotName}
                className="rental-img"
              />

              <div className="rental-body">
                <h3 className="rental-name">{p.pilotName}</h3>

                <p className="rental-meta">
                  <span className="muted">{p.pilotCompany || "Independent"}</span>
                  <span className="dot">•</span>
                  <span className="mono">ID: {p.pilotId}</span>
                </p>

                <div className="rental-prices">
                  <div>
                    <strong>Per hour:</strong>{" "}
                    {p.price?.perHour ? `₹${p.price.perHour}` : "—"}
                  </div>
                  <div>
                    <strong>Per day:</strong>{" "}
                    {p.price?.perDay ? `₹${p.price.perDay}` : "—"}
                  </div>
                </div>

                <p className="rental-desc">
                  {p.description || "No description provided."}
                </p>

                <ul className="rental-attributes">
                  <li>
                    <strong>Location:</strong> {p.location || "—"}
                  </li>
                  <li>
                    <strong>Available:</strong> {p.availability ? "Yes" : "No"}
                  </li>
                  <li>
                    <strong>Specification:</strong> {p.specification || "—"}
                  </li>
                </ul>

                {/* Certifications */}
                {p.certifications?.length > 0 && (
                  <div className="documents-section">
                    <p><strong>Certifications:</strong></p>
                    <ul className="document-links">
                      {p.certifications.map((c, i) => (
                        <li key={i}>
                          <a
                            href={c.url}
                            target="_blank"
                            rel="noreferrer"
                            className="pdf-link"
                          >
                            📄 Certificate {i + 1}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Resume */}
                {p.resume?.url && (
                  <div className="documents-section">
                    <p><strong>Resume:</strong></p>
                    <a
                      href={p.resume.url}
                      target="_blank"
                      rel="noreferrer"
                      className="pdf-link"
                    >
                      📄 View Resume
                    </a>
                  </div>
                )}

                {/* Seller Info */}
                {p.seller && (
                  <div className="seller-section">
                    <p><strong>Seller Name:</strong> {p.seller.name}</p>
                    <p><strong>Email:</strong> {p.seller.email}</p>
                    <p><strong>Phone:</strong> {p.seller.phoneNumber}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="rental-actions">
                  {p.adminStatus === "pending" && (
                    <>
                      <button
                        className="btn approve"
                        disabled={isUpdating(p.pilotId, "approved")}
                        onClick={() => updatePilotStatus(p.pilotId, "approved")}
                      >
                        {isUpdating(p.pilotId, "approved")
                          ? "Updating..."
                          : "Approve"}
                      </button>

                      <button
                        className="btn reject"
                        disabled={isUpdating(p.pilotId, "rejected")}
                        onClick={() => updatePilotStatus(p.pilotId, "rejected")}
                      >
                        {isUpdating(p.pilotId, "rejected")
                          ? "Updating..."
                          : "Reject"}
                      </button>

                      <button
                        className="btn delete"
                        disabled={isUpdating(p.pilotId, "deleting")}
                        onClick={() => deletePilot(p.pilotId)}
                        style={{ backgroundColor: "#dc3545", color: "white" }}
                      >
                        {isUpdating(p.pilotId, "deleting") ? "Deleting..." : "🗑 Delete"}
                      </button>
                    </>
                  )}

                  {p.adminStatus === "approved" && (
                    <>
                      <button
                        className="btn reject"
                        disabled={isUpdating(p.pilotId, "rejected")}
                        onClick={() => updatePilotStatus(p.pilotId, "rejected")}
                      >
                        {isUpdating(p.pilotId, "rejected")
                          ? "Updating..."
                          : "Reject"}
                      </button>

                      <button
                        className="btn pending"
                        disabled={isUpdating(p.pilotId, "pending")}
                        onClick={() => updatePilotStatus(p.pilotId, "pending")}
                      >
                        {isUpdating(p.pilotId, "pending")
                          ? "Updating..."
                          : "Move to Pending"}
                      </button>

                      <button
                        className="btn delete"
                        disabled={isUpdating(p.pilotId, "deleting")}
                        onClick={() => deletePilot(p.pilotId)}
                        style={{ backgroundColor: "#dc3545", color: "white" }}
                      >
                        {isUpdating(p.pilotId, "deleting") ? "Deleting..." : "🗑 Delete"}
                      </button>
                    </>
                  )}

                  {p.adminStatus === "rejected" && (
                    <>
                      <button
                        className="btn pending"
                        disabled={isUpdating(p.pilotId, "pending")}
                        onClick={() => updatePilotStatus(p.pilotId, "pending")}
                      >
                        {isUpdating(p.pilotId, "pending")
                          ? "Updating..."
                          : "Move to Pending"}
                      </button>

                      <button
                        className="btn approve"
                        disabled={isUpdating(p.pilotId, "approved")}
                        onClick={() => updatePilotStatus(p.pilotId, "approved")}
                      >
                        {isUpdating(p.pilotId, "approved")
                          ? "Updating..."
                          : "Approve"}
                      </button>

                      <button
                        className="btn delete"
                        disabled={isUpdating(p.pilotId, "deleting")}
                        onClick={() => deletePilot(p.pilotId)}
                        style={{ backgroundColor: "#dc3545", color: "white" }}
                      >
                        {isUpdating(p.pilotId, "deleting") ? "Deleting..." : "🗑 Delete"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}