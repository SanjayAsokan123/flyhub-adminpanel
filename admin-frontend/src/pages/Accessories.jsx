import React, { useEffect, useState } from "react";
import "../styles/Accessories.css";

const GRAPHQL_URL = "http://127.0.0.1:5001/graphql";

function Accessories() {
  const [accessories, setAccessories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [updatingStatus, setUpdatingStatus] = useState({ id: null, status: null });
  const [searchTerm, setSearchTerm] = useState(""); // New state for search term

  // Fetch all accessories
  const fetchAccessories = async () => {
    setLoading(true);
    setError(null);

    const query = `
      query {
        accessories {
          accessoryId
          name
          brand
          category
          price
          description
          image
          quantity
          status
          wishlist {
            userId
            addedAt
          }
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

      if (!res.ok) throw new Error("HTTP " + res.status);

      const result = await res.json();

      if (result.errors) {
        setError(result.errors[0].message);
        setAccessories([]);
      } else {
        setAccessories(result.data.accessories);
      }
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  // Update accessory status
  const updateAccessoryStatus = async (accessoryId, newStatus) => {
    setUpdatingStatus({ id: accessoryId, status: newStatus });

    // Ensure accessoryId is a string and newStatus is properly formatted
    const formattedAccessoryId = String(accessoryId);
    const formattedStatus = newStatus.toLowerCase(); // Ensure lowercase

    const mutation = `
      mutation UpdateAccessoryStatus($accessoryId: String!, $status: String!) {
        updateAccessoryStatus(accessoryId: $accessoryId, status: $status) {
          accessoryId
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
            accessoryId: formattedAccessoryId,
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
        setAccessories(prevAccessories =>
          prevAccessories.map(acc =>
            acc.accessoryId === accessoryId
              ? { ...acc, status: formattedStatus }
              : acc
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
    fetchAccessories();
  }, []);

  // Filter accessories based on selected status and search term
  const filteredAccessories = accessories.filter(acc => {
    const matchesStatus = selectedStatus === "all" ||
                         acc.status.toLowerCase() === selectedStatus;

    const matchesSearch = searchTerm === "" ||
                         acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         acc.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         acc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (acc.category && acc.category.toLowerCase().includes(searchTerm.toLowerCase()));

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

  const isUpdating = (accessoryId, status) => {
    return updatingStatus.id === accessoryId && updatingStatus.status === status;
  };

  if (loading) return <div className="loading">Loading accessories...</div>;
  if (error) return <div className="error">❌ {error}</div>;

  return (
    <div className="accessories-container">
      <h2 className="accessories-title">🔌 Accessories Dashboard</h2>

      {/* Search Bar */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search accessories by name, brand, category, or description..."
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
            {status === "all" && "📋 All Accessories"}
            {status === "approved" && "✅ Approved"}
            {status === "pending" && "⏳ Pending"}
            {status === "rejected" && "❌ Rejected"}
          </button>
        ))}
      </div>

      {filteredAccessories.length === 0 ? (
        <p className="no-data">
          {selectedStatus === "all" && searchTerm === ""
            ? "No accessories found."
            : searchTerm !== ""
            ? `No accessories matching "${searchTerm}" found.`
            : `No ${selectedStatus} accessories found.`}
        </p>
      ) : (
        <div className="accessories-grid">
          {filteredAccessories.map((acc) => (
            <div key={acc.accessoryId} className="accessory-card">
              <span className={`status-badge ${statusColor(acc.status)}`}>
                {acc.status.toUpperCase()}
              </span>

              <img
                src={acc.image || "/placeholder-accessory.jpg"}
                alt={acc.name}
                className="accessory-img"
              />

              <h3>{acc.name}</h3>
              <p className="brand">Brand: {acc.brand}</p>
              <p className="price">₹ {acc.price}</p>
              <p className="desc">{acc.description}</p>
              <p><strong>Category:</strong> {acc.category || "N/A"}</p>
              <p><strong>Quantity:</strong> {acc.quantity}</p>
              <p><strong>Wishlist Count:</strong> {acc.wishlist?.length || 0}</p>

              <div className="status-actions">
                {acc.status === "approved" && (
                  <>
                    <button
                      className="status-btn reject"
                      onClick={() => updateAccessoryStatus(acc.accessoryId, "rejected")}
                      disabled={isUpdating(acc.accessoryId, "rejected")}
                    >
                      {isUpdating(acc.accessoryId, "rejected") ? "Updating..." : "Reject"}
                    </button>
                    <button
                      className="status-btn pending"
                      onClick={() => updateAccessoryStatus(acc.accessoryId, "pending")}
                      disabled={isUpdating(acc.accessoryId, "pending")}
                    >
                      {isUpdating(acc.accessoryId, "pending") ? "Updating..." : "Move to Pending"}
                    </button>
                  </>
                )}

                {acc.status === "pending" && (
                  <>
                    <button
                      className="status-btn approve"
                      onClick={() => updateAccessoryStatus(acc.accessoryId, "approved")}
                      disabled={isUpdating(acc.accessoryId, "approved")}
                    >
                      {isUpdating(acc.accessoryId, "approved") ? "Updating..." : "Approve"}
                    </button>
                    <button
                      className="status-btn reject"
                      onClick={() => updateAccessoryStatus(acc.accessoryId, "rejected")}
                      disabled={isUpdating(acc.accessoryId, "rejected")}
                    >
                      {isUpdating(acc.accessoryId, "rejected") ? "Updating..." : "Reject"}
                    </button>
                  </>
                )}

                {acc.status === "rejected" && (
                  <>
                    <button
                      className="status-btn pending"
                      onClick={() => updateAccessoryStatus(acc.accessoryId, "pending")}
                      disabled={isUpdating(acc.accessoryId, "pending")}
                    >
                      {isUpdating(acc.accessoryId, "pending") ? "Updating..." : "Move to Pending"}
                    </button>
                    <button
                      className="status-btn approve"
                      onClick={() => updateAccessoryStatus(acc.accessoryId, "approved")}
                      disabled={isUpdating(acc.accessoryId, "approved")}
                    >
                      {isUpdating(acc.accessoryId, "approved") ? "Updating..." : "Approve"}
                    </button>
                  </>
                )}
              </div>

              <div className="seller-box">
                <p><strong>Seller ID:</strong> {acc.sellerId}</p>
                <p><strong>Email:</strong> {acc.sellerInfo?.email}</p>
                <p><strong>Phone:</strong> {acc.sellerInfo?.phoneNumber}</p>
              </div>

              <p className="accessory-id">Accessory ID: {acc.accessoryId}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Accessories;