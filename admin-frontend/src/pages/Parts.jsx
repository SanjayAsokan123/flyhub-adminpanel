                                                                                                                                                                import React, { useEffect, useState } from "react";
import "../styles/Parts.css";
const GRAPHQL_URL = "http://127.0.0.1:5001/graphql";

function Parts() {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [updatingStatus, setUpdatingStatus] = useState({ id: null, status: null });
  const [searchTerm, setSearchTerm] = useState(""); // New state for search term

  // Fetch ALL PARTS (with sellerInfo)
  const fetchParts = async () => {
    setLoading(true);
    setError(null);

    const query = `
      query {
        parts {
          partId
          name
          brand
          price
          description
          image
          quantity
          status
          sellerId
          sellerInfo {
            email
            phoneNumber
          }
        }
      }
    `;

    try {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) throw new Error("HTTP error! " + res.status);

      const result = await res.json();

      if (result.errors) {
        setError(result.errors[0].message);
        setParts([]);
      } else {
        setParts(result.data.parts || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update part status
  const updatePartStatus = async (partId, newStatus) => {
    setUpdatingStatus({ id: partId, status: newStatus });

    const formattedPartId = String(partId);
    const formattedStatus = newStatus.toLowerCase();

    const mutation = `
      mutation UpdatePartStatus($partId: String!, $status: String!) {
        updatePartStatus(partId: $partId, status: $status) {
          partId
          status
        }
      }
    `;

    try {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: mutation,
          variables: {
            partId: formattedPartId,
            status: formattedStatus
          }
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("HTTP Error:", res.status, errorText);
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const result = await res.json();

      if (result.errors) {
        console.error("GraphQL Errors:", result.errors);
        setError(result.errors[0].message);
      } else {
        // Update local state to reflect the change
        setParts(prevParts =>
          prevParts.map(part =>
            part.partId === partId
              ? { ...part, status: formattedStatus }
              : part
          )
        );
      }
    } catch (err) {
      console.error("Update Error:", err);
      setError(err.message);
    }

    setUpdatingStatus({ id: null, status: null });
  };

  useEffect(() => {
    fetchParts();
  }, []);

  // Filter parts based on selected status and search term
  const filteredParts = parts.filter(part => {
    const matchesStatus = selectedStatus === "all" ||
                         part.status.toLowerCase() === selectedStatus;

    const matchesSearch = searchTerm === "" ||
                         part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         part.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         part.description.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const statusColor = (status) => {
    switch (status) {
      case "approved":
        return "status-approved";
      case "pending":
        return "status-pending";
      case "rejected":
        return "status-rejected";
      default:
        return "";
    }
  };

  const isUpdating = (partId, status) => {
    return updatingStatus.id === partId && updatingStatus.status === status;
  };

  if (loading) return <div className="loading">Loading parts…</div>;
  if (error) return <div className="error">❌ {error}</div>;

  return (
    <div className="parts-container">
      <h2 className="parts-title">🚀Parts Dashboard</h2>

      {/* Search Bar */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search parts by name, brand, or description..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="search-button" onClick={() => {}}>
          🔍
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="status-tabs">
        {["all", "approved", "pending", "rejected"].map((status) => (
          <button
            key={status}
            data-status={status}
            className={`status-tab ${selectedStatus === status ? "active" : ""}`}
            onClick={() => setSelectedStatus(status)}
          >
            {status === "all" && "📋 All Parts"}
            {status === "approved" && "✅ Approved"}
            {status === "pending" && "⏳ Pending"}
            {status === "rejected" && "❌ Rejected"}
          </button>
        ))}
      </div>

      {filteredParts.length === 0 ? (
        <p className="no-data">
          {selectedStatus === "all" && searchTerm === ""
            ? "No parts found."
            : searchTerm !== ""
            ? `No parts matching "${searchTerm}" found.`
            : `No ${selectedStatus} parts found.`}
        </p>
      ) : (
        <div className="parts-grid">
          {filteredParts.map((part) => (
            <div key={part.partId} className="part-card">
              <span className={`status-badge ${statusColor(part.status)}`}>
                {part.status.toUpperCase()}
              </span>

              <img
                src={part.image}
                alt={part.name}
                className="part-img"
              />

              <h3>{part.name}</h3>
              <p className="brand">Brand: {part.brand}</p>
              <p className="price">₹ {part.price}</p>
              <p className="desc">{part.description}</p>
              <p><strong>Quantity:</strong> {part.quantity}</p>

              <div className="status-actions">
                {part.status === "approved" && (
                  <>
                    <button
                      className="status-btn reject"
                      onClick={() => updatePartStatus(part.partId, "rejected")}
                      disabled={isUpdating(part.partId, "rejected")}
                    >
                      {isUpdating(part.partId, "rejected") ? "Updating..." : "Reject"}
                    </button>
                    <button
                      className="status-btn pending"
                      onClick={() => updatePartStatus(part.partId, "pending")}
                      disabled={isUpdating(part.partId, "pending")}
                    >
                      {isUpdating(part.partId, "pending") ? "Updating..." : "Move to Pending"}
                    </button>
                  </>
                )}

                {part.status === "pending" && (
                  <>
                    <button
                      className="status-btn approve"
                      onClick={() => updatePartStatus(part.partId, "approved")}
                      disabled={isUpdating(part.partId, "approved")}
                    >
                      {isUpdating(part.partId, "approved") ? "Updating..." : "Approve"}
                    </button>
                    <button
                      className="status-btn reject"
                      onClick={() => updatePartStatus(part.partId, "rejected")}
                      disabled={isUpdating(part.partId, "rejected")}
                    >
                      {isUpdating(part.partId, "rejected") ? "Updating..." : "Reject"}
                    </button>
                  </>
                )}

                {part.status === "rejected" && (
                  <>
                    <button
                      className="status-btn pending"
                      onClick={() => updatePartStatus(part.partId, "pending")}
                      disabled={isUpdating(part.partId, "pending")}
                    >
                      {isUpdating(part.partId, "pending") ? "Updating..." : "Move to Pending"}
                    </button>
                    <button
                      className="status-btn approve"
                      onClick={() => updatePartStatus(part.partId, "approved")}
                      disabled={isUpdating(part.partId, "approved")}
                    >
                      {isUpdating(part.partId, "approved") ? "Updating..." : "Approve"}
                    </button>
                  </>
                )}
              </div>

              <div className="seller-box">
                <p><strong>Seller ID:</strong> {part.sellerId}</p>
                <p><strong>Email:</strong> {part.sellerInfo?.email}</p>
                <p><strong>Phone:</strong> {part.sellerInfo?.phoneNumber}</p>
              </div>

              <p className="part-id">Part ID: {part.partId}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Parts;