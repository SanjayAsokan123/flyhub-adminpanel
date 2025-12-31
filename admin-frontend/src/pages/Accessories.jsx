import React, { useEffect, useState } from "react";
import "../styles/Accessories.css";

const GRAPHQL_URL = "https://flyhub-webadmin-4.onrender.com/graphql";

function Accessories() {
  const [accessories, setAccessories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [updatingStatus, setUpdatingStatus] = useState({ id: null, status: null });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");

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

    const formattedAccessoryId = String(accessoryId);
    const formattedStatus = newStatus.toLowerCase();

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
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const result = await res.json();

      if (result.errors) {
        setError(result.errors[0].message);
      } else {
        setAccessories(prevAccessories =>
          prevAccessories.map(acc =>
            acc.accessoryId === accessoryId
              ? { ...acc, status: formattedStatus }
              : acc
          )
        );
      }
    } catch (err) {
      setError(err.message);
    }

    setUpdatingStatus({ id: null, status: null });
  };

  // Delete accessory (permanently)
  const deleteAccessory = async (accessoryId) => {
    if (!window.confirm("Are you sure you want to permanently delete this accessory?")) return;

    setUpdatingStatus({ id: accessoryId, status: "deleting" });

    const mutation = `
      mutation DeleteAccessory($accessoryId: String!) {
        deleteAccessory(accessoryId: $accessoryId) {
          accessoryId
          name
        }
      }
    `;

    try {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: mutation,
          variables: { accessoryId: String(accessoryId) }
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const result = await res.json();

      if (!result.errors) {
        setAccessories(prev =>
          prev.filter(acc => acc.accessoryId !== accessoryId)
        );
        alert("Accessory permanently deleted!");
      } else {
        alert("Failed: " + result.errors[0].message);
      }
    } catch (err) {
      alert("Delete error: " + err.message);
    }

    setUpdatingStatus({ id: null, status: null });
  };

  useEffect(() => {
    fetchAccessories();
  }, []);

  // ~ FIXED SORT LOGIC  
  const sortedAccessories = [...accessories].sort((a, b) => {
    const aid = Number(a.accessoryId) || 0;
    const bid = Number(b.accessoryId) || 0;

    if (sortBy === "newest") return bid - aid;    // ~ FIXED
    if (sortBy === "oldest") return aid - bid;    // ~ FIXED

    if (sortBy === "price-high") return (b.price || 0) - (a.price || 0);
    if (sortBy === "price-low") return (a.price || 0) - (b.price || 0);

    if (sortBy === "name-asc") return (a.name || "").localeCompare(b.name || "");
    if (sortBy === "name-desc") return (b.name || "").localeCompare(a.name || "");

    return 0;
  });

  // Filter
  const filteredAccessories = sortedAccessories.filter(acc => {
    const matchesStatus =
      selectedStatus === "all" ||
      acc.status.toLowerCase() === selectedStatus;

    const matchesSearch =
      searchTerm === "" ||
      acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (acc.category && acc.category.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  const statusColor = (status) => {
    switch (status) {
      case "approved": return "status-approved";
      case "pending": return "status-pending";
      case "rejected": return "status-rejected";
      default: return "";
    }
  };

  const isUpdating = (accessoryId, status) =>
    updatingStatus.id === accessoryId && updatingStatus.status === status;

  if (loading) return <div className="loading">Loading accessories...</div>;
  if (error) return <div className="error">❌ {error}</div>;

  return (
    <div className="accessories-container">
      <h2 className="accessories-title">🔌 Accessories Dashboard</h2>

      {/* Search */}
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search accessories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="search-button">🔍</button>
      </div>

      {/* Controls */}
      <div className="controls-row">
        <div className="status-tabs">
          {["all", "approved", "pending", "rejected"].map((status) => (
            <button
              key={status}
              data-status={status}
              className={`status-tab ${
                selectedStatus === status ? "active" : ""
              }`}
              onClick={() => setSelectedStatus(status)}
            />
          ))}
        </div>

        <div className="sort-dropdown">
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price-high">Price: High → Low</option>
            <option value="price-low">Price: Low → High</option>
            <option value="name-asc">Name: A → Z</option>
            <option value="name-desc">Name: Z → A</option>
          </select>
        </div>
      </div>

      {/* No Data */}
      {filteredAccessories.length === 0 ? (
        <p className="no-data">
          {selectedStatus === "all" && searchTerm === ""
            ? "No accessories found."
            : searchTerm !== ""
            ? `No accessories matching "${searchTerm}".`
            : `No ${selectedStatus} accessories.`}
        </p>
      ) : (
        <div className="accessories-grid">
          {filteredAccessories.map((acc) => (
            <div key={acc.accessoryId} className="accessory-card">

              {/* Delete button */}
              <button
                className="delete-btn"
                onClick={() => deleteAccessory(acc.accessoryId)}
                disabled={isUpdating(acc.accessoryId, "deleting")}
              >
                {isUpdating(acc.accessoryId, "deleting") ? "..." : "🗑"}
              </button>

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
              <p>Category: {acc.category || "N/A"}</p>
              <p>Quantity: {acc.quantity}</p>
              <p>Wishlist: {acc.wishlist?.length || 0}</p>

              <div className="status-actions">
                {acc.status === "approved" && (
                  <>
                    <button
                      className="status-btn reject"
                      onClick={() => updateAccessoryStatus(acc.accessoryId, "rejected")}
                      disabled={isUpdating(acc.accessoryId, "rejected")}
                    >
                      Reject
                    </button>

                    <button
                      className="status-btn pending"
                      onClick={() => updateAccessoryStatus(acc.accessoryId, "pending")}
                      disabled={isUpdating(acc.accessoryId, "pending")}
                    >
                      Move to Pending
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
                      Approve
                    </button>

                    <button
                      className="status-btn reject"
                      onClick={() => updateAccessoryStatus(acc.accessoryId, "rejected")}
                      disabled={isUpdating(acc.accessoryId, "rejected")}
                    >
                      Reject
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
                      Move to Pending
                    </button>

                    <button
                      className="status-btn approve"
                      onClick={() => updateAccessoryStatus(acc.accessoryId, "approved")}
                      disabled={isUpdating(acc.accessoryId, "approved")}
                    >
                      Approve
                    </button>
                  </>
                )}
              </div>

              <div className="seller-box">
                <p>Seller ID: {acc.sellerId}</p>
                <p>Email: {acc.sellerInfo?.email}</p>
                <p>Phone: {acc.sellerInfo?.phoneNumber}</p>
              </div>

              <p className="accessory-id">ID: {acc.accessoryId}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Accessories;
