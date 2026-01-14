import React, { useEffect, useState, useRef } from "react";
import "../styles/Parts.css";

const GRAPHQL_URL = "http://localhost:5001/graphql"; 

function Parts() {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [updatingIds, setUpdatingIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
  const [expandedSellers, setExpandedSellers] = useState(new Set());
  const tableRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [viewingPart, setViewingPart] = useState(null);

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
        // Use mock data for demo purposes
        setParts(getMockParts());
      } else {
        const data = result.data?.parts || [];
        if (data.length === 0) {
          setParts(getMockParts());
        } else {
          setParts(data);
        }
      }
    } catch (err) {
      setError(err.message);
      setParts(getMockParts());
    } finally {
      setLoading(false);
    }
  };

  // Get mock parts data
  const getMockParts = () => {
    return [
      {
        partId: "PART-001",
        name: "DJI Propeller Set",
        brand: "DJI",
        price: 2999,
        description: "High-quality carbon fiber propellers for DJI drones",
        image: "https://images.unsplash.com/photo-1579829366248-204fe8413f31?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        quantity: 50,
        status: "approved",
        sellerId: "SELLER-001",
        sellerInfo: {
          email: "dji.seller@example.com",
          phoneNumber: "+919876543210"
        }
      },
      {
        partId: "PART-002",
        name: "Autel Battery Pack",
        brand: "Autel",
        price: 8999,
        description: "Long-lasting lithium-ion battery for Autel drones",
        image: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        quantity: 25,
        status: "pending",
        sellerId: "SELLER-002",
        sellerInfo: {
          email: "autel.seller@example.com",
          phoneNumber: "+919876543211"
        }
      },
      {
        partId: "PART-003",
        name: "Parrot Camera Module",
        brand: "Parrot",
        price: 15999,
        description: "4K camera module for Parrot Anafi drones",
        image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        quantity: 15,
        status: "approved",
        sellerId: "SELLER-003",
        sellerInfo: {
          email: "parrot.seller@example.com",
          phoneNumber: "+919876543212"
        }
      },
      {
        partId: "PART-004",
        name: "Skydio Motor Set",
        brand: "Skydio",
        price: 6999,
        description: "Brushless motors for Skydio drones",
        image: "https://images.unsplash.com/photo-1586769852044-692ebda0b2dc?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        quantity: 0,
        status: "rejected",
        sellerId: "SELLER-004",
        sellerInfo: {
          email: "skydio.seller@example.com",
          phoneNumber: "+919876543213"
        }
      },
      {
        partId: "PART-005",
        name: "Yuneec Landing Gear",
        brand: "Yuneec",
        price: 4999,
        description: "Retractable landing gear for Typhoon series",
        image: "https://images.unsplash.com/photo-1586769852836-bc069f74e9e6?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        quantity: 30,
        status: "pending",
        sellerId: "SELLER-001",
        sellerInfo: {
          email: "dji.seller@example.com",
          phoneNumber: "+919876543210"
        }
      },
      {
        partId: "PART-006",
        name: "DJI Remote Controller",
        brand: "DJI",
        price: 12999,
        description: "Professional remote controller with extended range",
        image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        quantity: 18,
        status: "approved",
        sellerId: "SELLER-002",
        sellerInfo: {
          email: "autel.seller@example.com",
          phoneNumber: "+919876543211"
        }
      }
    ];
  };

  // Update part status
  const updatePartStatus = async (partId, newStatus) => {
    const updatingIdsCopy = new Set(updatingIds);
    updatingIdsCopy.add(`${partId}-${newStatus}`);
    setUpdatingIds(updatingIdsCopy);

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
    } finally {
      const newUpdatingIdsCopy = new Set(updatingIds);
      newUpdatingIdsCopy.delete(`${partId}-${newStatus}`);
      setUpdatingIds(newUpdatingIdsCopy);
    }
  };

  // Delete part - PERMANENT deletion
  const deletePart = async (partId) => {
    if (!window.confirm("Are you sure you want to permanently delete this part?")) {
      return;
    }

    const updatingIdsCopy = new Set(updatingIds);
    updatingIdsCopy.add(`${partId}-deleting`);
    setUpdatingIds(updatingIdsCopy);

    const mutation = `
      mutation DeletePart($partId: String!) {
        deletePart(partId: $partId) {
          partId
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
          variables: { partId: String(partId) }
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const result = await res.json();
      console.log("Delete result:", result);

      if (result.errors) {
        console.error("GraphQL Errors:", result.errors);
        setError(result.errors[0].message);
        alert("Failed to delete: " + result.errors[0].message);
      } else {
        // Remove from local state
        setParts(prevParts =>
          prevParts.filter(part => part.partId !== partId)
        );
      }
    } catch (err) {
      console.error("Delete Error:", err);
      setError(err.message);
      alert("Failed to delete part: " + err.message);
    } finally {
      const newUpdatingIdsCopy = new Set(updatingIds);
      newUpdatingIdsCopy.delete(`${partId}-deleting`);
      setUpdatingIds(newUpdatingIdsCopy);
    }
  };

  // View part details
  const viewPartDetails = (part) => {
    setViewingPart(part);
  };

  // Close part details modal
  const closePartDetails = () => {
    setViewingPart(null);
  };

  // Handle scroll to show shadow on sticky columns
  const handleTableScroll = (e) => {
    const isScrolled = e.target.scrollLeft > 0;
    setScrolled(isScrolled);
  };

  useEffect(() => {
    fetchParts();
  }, []);

  // Toggle seller expansion
  const toggleSeller = (sellerId) => {
    const newExpanded = new Set(expandedSellers);
    if (newExpanded.has(sellerId)) {
      newExpanded.delete(sellerId);
    } else {
      newExpanded.add(sellerId);
    }
    setExpandedSellers(newExpanded);
  };

  // Filter and sort parts
  const filteredParts = parts
    .filter(part => {
      const matchesStatus = selectedStatus === "all" || part.status.toLowerCase() === selectedStatus;
      const matchesSearch =
        searchTerm === "" ||
        part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.partId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      const key = sortConfig.key;
      let aVal = a[key];
      let bVal = b[key];

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortConfig.direction === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  const statusStats = {
    all: parts.length,
    approved: parts.filter(d => d.status === "approved").length,
    pending: parts.filter(d => d.status === "pending").length,
    rejected: parts.filter(d => d.status === "rejected").length,
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon active">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>;
  };

  const PartRow = ({ part, isSubRow = false }) => (
    <tr key={part.partId} className={`drone-row ${isSubRow ? 'sub-row' : ''}`}>
      <td className="sticky-col sticky-col-id">
        <div className="drone-id-cell">
          <div className="id-badge">{part.partId}</div>
        </div>
      </td>

      <td className="sticky-col sticky-col-seller-id">
        <div className="seller-id-cell">
          <div className="id-badge seller">{part.sellerId}</div>
          {part.sellerInfo && (
            <div className="seller-quick-info">
              <span className="seller-email">{part.sellerInfo.email}</span>
            </div>
          )}
        </div>
      </td>

      <td className="cell-name">
        <div className="name-cell">
          {part.image && (
            <img
              src={part.image}
              alt={part.name}
              className="drone-thumbnail"
            />
          )}
          <div className="name-info">
            <strong>{part.name}</strong>
            <div className="drone-details">
              <span className="brand">{part.brand}</span>
              <span className="part-type">Part</span>
            </div>
          </div>
        </div>
      </td>

      <td className="cell-price">
        <div className="price-badge">
          <span className="price-icon">₹</span>
          {part.price.toLocaleString('en-IN')}
        </div>
      </td>

      <td className="cell-quantity">
        <div className="quantity-badge">
          <span className="qty-icon">📦</span>
          <span className={`qty-value ${part.quantity === 0 ? 'out-of-stock' : ''}`}>
            {part.quantity}
          </span>
        </div>
      </td>

      <td className="cell-status">
        <span className={`status-badge status-${part.status}`}>
          {part.status.toUpperCase()}
        </span>
      </td>

      <td className="cell-description">
        <div className="description-text">
          {part.description}
        </div>
      </td>

      <td className="cell-actions">
        <div className="action-buttons">
          {part.status === "pending" && (
            <>
              <button
                className="action-btn approve"
                onClick={() => updatePartStatus(part.partId, "approved")}
                disabled={updatingIds.has(`${part.partId}-approved`)}
                title="Approve part"
              >
                {updatingIds.has(`${part.partId}-approved`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✓</span>
                )}
              </button>
              <button
                className="action-btn reject"
                onClick={() => updatePartStatus(part.partId, "rejected")}
                disabled={updatingIds.has(`${part.partId}-rejected`)}
                title="Reject part"
              >
                {updatingIds.has(`${part.partId}-rejected`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✗</span>
                )}
              </button>
            </>
          )}

          {part.status === "approved" && (
            <>
              <button
                className="action-btn pending"
                onClick={() => updatePartStatus(part.partId, "pending")}
                disabled={updatingIds.has(`${part.partId}-pending`)}
                title="Move to pending"
              >
                {updatingIds.has(`${part.partId}-pending`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>⏳</span>
                )}
              </button>
              <button
                className="action-btn reject"
                onClick={() => updatePartStatus(part.partId, "rejected")}
                disabled={updatingIds.has(`${part.partId}-rejected`)}
                title="Reject part"
              >
                {updatingIds.has(`${part.partId}-rejected`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✗</span>
                )}
              </button>
            </>
          )}

          {part.status === "rejected" && (
            <>
              <button
                className="action-btn pending"
                onClick={() => updatePartStatus(part.partId, "pending")}
                disabled={updatingIds.has(`${part.partId}-pending`)}
                title="Move to pending"
              >
                {updatingIds.has(`${part.partId}-pending`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>⏳</span>
                )}
              </button>
              <button
                className="action-btn approve"
                onClick={() => updatePartStatus(part.partId, "approved")}
                disabled={updatingIds.has(`${part.partId}-approved`)}
                title="Approve part"
              >
                {updatingIds.has(`${part.partId}-approved`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✓</span>
                )}
              </button>
            </>
          )}

          <button
            className="action-btn view"
            onClick={() => viewPartDetails(part)}
            title="View details"
          >
            👁
          </button>

          <button
            className="action-btn delete"
            onClick={() => deletePart(part.partId)}
            disabled={updatingIds.has(`${part.partId}-deleting`)}
            title="Delete part"
          >
            {updatingIds.has(`${part.partId}-deleting`) ? (
              <span className="loading-dots"></span>
            ) : (
              <span>🗑</span>
            )}
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="drones-container">
      {/* Header */}
      <div className="header-section">
        <div className="header-top">
          <div className="title-section">
            <h1 className="page-title">Parts Management</h1>
            <p className="page-subtitle">Manage and oversee all parts registrations and listings</p>
          </div>
          <div className="header-controls">
            <div className="stats-summary">
              <div className="summary-item">
                <span className="summary-label">TOTAL</span>
                <span className="summary-value">{parts.length}</span>
              </div>
              <div className="summary-item active">
                <span className="summary-label">APPROVED</span>
                <span className="summary-value">{statusStats.approved}</span>
              </div>
            </div>
            <button
              className="refresh-btn"
              onClick={fetchParts}
              disabled={loading}
            >
              <span className="refresh-icon">↻</span>
              {loading ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search parts by name, brand, ID, or description..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm("")}>
              ✕
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠</span>
            <span>{error}</span>
            <button className="error-dismiss" onClick={() => setError(null)}>
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Status Tabs */}
      <div className="status-tabs-container">
        {["all", "approved", "pending", "rejected"].map((status) => (
          <button
            key={status}
            className={`status-tab ${selectedStatus === status ? "active" : ""}`}
            onClick={() => setSelectedStatus(status)}
          >
            <div className="tab-content">
              <span className="tab-icon">
                {status === "all" && "🔧"}
                {status === "approved" && "✅"}
                {status === "pending" && "⏳"}
                {status === "rejected" && "❌"}
              </span>
              <span className="tab-text">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
              <span className="tab-count">{statusStats[status]}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Data Table with Horizontal Scroll */}
      <div className={`table-wrapper ${scrolled ? "scrolled" : ""}`}>
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading parts data...</p>
          </div>
        ) : filteredParts.length === 0 ? (
          <div className="no-data-message">
            <div className="no-data-icon">📭</div>
            <p>No parts found</p>
            {searchTerm && <p className="no-data-hint">Try adjusting your search criteria</p>}
            <button className="no-data-action" onClick={() => { setSearchTerm(""); setSelectedStatus("all"); }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="table-scroll-container" ref={tableRef} onScroll={handleTableScroll}>
            <table className="drones-table">
              <thead>
                <tr>
                  <th className="sticky-col sticky-col-id" onClick={() => handleSort("partId")}>
                    <div className="th-content">
                      Part ID <SortIcon column="partId" />
                    </div>
                  </th>

                  <th className="sticky-col sticky-col-seller-id" onClick={() => handleSort("sellerId")}>
                    <div className="th-content">
                      Seller Details <SortIcon column="sellerId" />
                    </div>
                  </th>

                  <th onClick={() => handleSort("name")}>
                    <div className="th-content">
                      Part Details <SortIcon column="name" />
                    </div>
                  </th>
                  <th onClick={() => handleSort("price")}>
                    <div className="th-content">
                      Price <SortIcon column="price" />
                    </div>
                  </th>
                  <th onClick={() => handleSort("quantity")}>
                    <div className="th-content">
                      Quantity <SortIcon column="quantity" />
                    </div>
                  </th>
                  <th onClick={() => handleSort("status")}>
                    <div className="th-content">
                      Status <SortIcon column="status" />
                    </div>
                  </th>
                  <th>
                    <div className="th-content">
                      Description
                    </div>
                  </th>
                  <th>
                    <div className="th-content">
                      Actions
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Group filtered parts by seller
                  const sellerGroups = filteredParts.reduce((acc, part) => {
                    if (!acc[part.sellerId]) {
                      acc[part.sellerId] = [];
                    }
                    acc[part.sellerId].push(part);
                    return acc;
                  }, {});

                  // Convert to array and render
                  return Object.entries(sellerGroups).flatMap(([sellerId, sellerParts]) => {
                    if (sellerParts.length === 0) return [];

                    const isExpanded = expandedSellers.has(sellerId);
                    const hasMultipleParts = sellerParts.length > 1;

                    return [
                      hasMultipleParts ? (
                        <tr
                          key={`header-${sellerId}`}
                          className="seller-header-row"
                          onClick={() => toggleSeller(sellerId)}
                        >
                          <td colSpan="8" className="seller-header-cell">
                            <div className="seller-header-content">
                              <span className="expand-icon">
                                {isExpanded ? "▼" : "▶"}
                              </span>
                              <span className="seller-id">{sellerId}</span>
                              <span className="drone-count">{sellerParts.length} parts</span>
                              <div className="seller-info">
                                {sellerParts[0].sellerInfo?.email && (
                                  <span className="info-item email">📧 {sellerParts[0].sellerInfo.email}</span>
                                )}
                                {sellerParts[0].sellerInfo?.phoneNumber && (
                                  <span className="info-item phone">📱 {sellerParts[0].sellerInfo.phoneNumber}</span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null,
                      ...(!hasMultipleParts || isExpanded
                        ? sellerParts.map((part) => (
                          <PartRow
                            key={part.partId}
                            part={part}
                            isSubRow={hasMultipleParts}
                          />
                        ))
                        : [])
                    ];
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="footer-stats">
        <div className="stat-card">
          <div className="stat-icon">🔧</div>
          <div className="stat-content">
            <div className="stat-label">Total Parts</div>
            <div className="stat-value">{parts.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-label">Approved</div>
            <div className="stat-value">{statusStats.approved}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-label">Pending</div>
            <div className="stat-value">{statusStats.pending}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <div className="stat-label">Rejected</div>
            <div className="stat-value">{statusStats.rejected}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">Total Value</div>
            <div className="stat-value">
              ₹{parts.reduce((sum, p) => sum + (p.price * p.quantity), 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-label">Total Stock</div>
            <div className="stat-value">
              {parts.reduce((sum, p) => sum + p.quantity, 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Part Details Modal */}
      {viewingPart && (
        <div className="drone-modal-overlay" onClick={closePartDetails}>
          <div className="drone-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Part Details</h2>
              <button className="modal-close" onClick={closePartDetails}>
                ✕
              </button>
            </div>
            <div className="modal-content">
              <div className="modal-profile">
                {viewingPart.image && (
                  <img
                    src={viewingPart.image}
                    alt={viewingPart.name}
                    className="modal-drone-image"
                  />
                )}
                <div className="modal-name">
                  <h3>{viewingPart.name}</h3>
                  <span className={`modal-status status-${viewingPart.status}`}>
                    {viewingPart.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="modal-details-grid">
                <div className="detail-section">
                  <h4>Part Information</h4>
                  <div className="detail-row">
                    <span className="detail-label">Part ID:</span>
                    <span className="detail-value">{viewingPart.partId}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Brand:</span>
                    <span className="detail-value">{viewingPart.brand}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Type:</span>
                    <span className="detail-value">Drone Part</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Price:</span>
                    <span className="detail-value">₹{viewingPart.price.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Quantity:</span>
                    <span className="detail-value">{viewingPart.quantity}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className={`detail-value status-badge status-${viewingPart.status}`}>
                      {viewingPart.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Description</h4>
                  <div className="detail-row full-width">
                    <span className="detail-value description-full">
                      {viewingPart.description}
                    </span>
                  </div>
                </div>

                {viewingPart.sellerInfo && (
                  <div className="detail-section seller-section">
                    <h4>Seller Information</h4>
                    <div className="detail-row">
                      <span className="detail-label">Seller ID:</span>
                      <span className="detail-value">{viewingPart.sellerId}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Seller Email:</span>
                      <span className="detail-value">{viewingPart.sellerInfo.email}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Seller Phone:</span>
                      <span className="detail-value">{viewingPart.sellerInfo.phoneNumber}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <div className="modal-actions">
                {viewingPart.status === "pending" && (
                  <>
                    <button
                      className="modal-action-btn approve"
                      onClick={() => {
                        updatePartStatus(viewingPart.partId, "approved");
                        closePartDetails();
                      }}
                      disabled={updatingIds.has(`${viewingPart.partId}-approved`)}
                    >
                      {updatingIds.has(`${viewingPart.partId}-approved`) ? "Processing..." : "Approve"}
                    </button>
                    <button
                      className="modal-action-btn reject"
                      onClick={() => {
                        updatePartStatus(viewingPart.partId, "rejected");
                        closePartDetails();
                      }}
                      disabled={updatingIds.has(`${viewingPart.partId}-rejected`)}
                    >
                      {updatingIds.has(`${viewingPart.partId}-rejected`) ? "Processing..." : "Reject"}
                    </button>
                  </>
                )}

                {viewingPart.status === "approved" && (
                  <>
                    <button
                      className="modal-action-btn pending"
                      onClick={() => {
                        updatePartStatus(viewingPart.partId, "pending");
                        closePartDetails();
                      }}
                      disabled={updatingIds.has(`${viewingPart.partId}-pending`)}
                    >
                      {updatingIds.has(`${viewingPart.partId}-pending`) ? "Processing..." : "Move to Pending"}
                    </button>
                    <button
                      className="modal-action-btn reject"
                      onClick={() => {
                        updatePartStatus(viewingPart.partId, "rejected");
                        closePartDetails();
                      }}
                      disabled={updatingIds.has(`${viewingPart.partId}-rejected`)}
                    >
                      {updatingIds.has(`${viewingPart.partId}-rejected`) ? "Processing..." : "Reject"}
                    </button>
                  </>
                )}

                {viewingPart.status === "rejected" && (
                  <>
                    <button
                      className="modal-action-btn pending"
                      onClick={() => {
                        updatePartStatus(viewingPart.partId, "pending");
                        closePartDetails();
                      }}
                      disabled={updatingIds.has(`${viewingPart.partId}-pending`)}
                    >
                      {updatingIds.has(`${viewingPart.partId}-pending`) ? "Processing..." : "Move to Pending"}
                    </button>
                    <button
                      className="modal-action-btn approve"
                      onClick={() => {
                        updatePartStatus(viewingPart.partId, "approved");
                        closePartDetails();
                      }}
                      disabled={updatingIds.has(`${viewingPart.partId}-approved`)}
                    >
                      {updatingIds.has(`${viewingPart.partId}-approved`) ? "Processing..." : "Approve"}
                    </button>
                  </>
                )}

                <button
                  className="modal-action-btn delete"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to permanently delete this part?")) {
                      deletePart(viewingPart.partId);
                      closePartDetails();
                    }
                  }}
                  disabled={updatingIds.has(`${viewingPart.partId}-deleting`)}
                >
                  {updatingIds.has(`${viewingPart.partId}-deleting`) ? "Deleting..." : "Delete"}
                </button>

                <button
                  className="modal-action-btn close"
                  onClick={closePartDetails}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Parts;