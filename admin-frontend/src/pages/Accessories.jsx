import React, { useEffect, useState, useRef } from "react";
import "../styles/Accessories.css";

const GRAPHQL_URL = "http://localhost:5001/graphql";

function Accessories() {
  const [accessories, setAccessories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [updatingIds, setUpdatingIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
  const [expandedSellers, setExpandedSellers] = useState(new Set());
  const tableRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [viewingAccessory, setViewingAccessory] = useState(null);

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
        // Use mock data for demo purposes
        setAccessories(getMockAccessories());
      } else {
        const data = result.data?.accessories || [];
        if (data.length === 0) {
          setAccessories(getMockAccessories());
        } else {
          setAccessories(data);
        }
      }
    } catch (err) {
      setError(err.message);
      setAccessories(getMockAccessories());
    }

    setLoading(false);
  };

  // Get mock accessories data
  const getMockAccessories = () => {
    return [
      {
        accessoryId: "ACC-001",
        name: "DJI Carrying Case",
        brand: "DJI",
        category: "Carrying Case",
        price: 7999,
        description: "Professional carrying case for DJI drones and accessories",
        image: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        quantity: 20,
        status: "approved",
        sellerId: "SELLER-001",
        sellerInfo: {
          email: "dji.seller@example.com",
          phoneNumber: "+919876543210"
        }
      },
      {
        accessoryId: "ACC-002",
        name: "Propeller Guard Set",
        brand: "Autel",
        category: "Safety",
        price: 2999,
        description: "Safety propeller guards for Autel EVO series",
        image: "https://images.unsplash.com/photo-1579829366248-204fe8413f31?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        quantity: 35,
        status: "pending",
        sellerId: "SELLER-002",
        sellerInfo: {
          email: "autel.seller@example.com",
          phoneNumber: "+919876543211"
        }
      },
      {
        accessoryId: "ACC-003",
        name: "ND Filter Set",
        brand: "Freewell",
        category: "Camera",
        price: 4999,
        description: "Professional ND filter set for aerial photography",
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
        accessoryId: "ACC-004",
        name: "Foldable Landing Pad",
        brand: "PGYTECH",
        category: "Takeoff/Landing",
        price: 1999,
        description: "Portable foldable landing pad for drones",
        image: "https://images.unsplash.com/photo-1586769852836-bc069f74e9e6?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        quantity: 0,
        status: "rejected",
        sellerId: "SELLER-004",
        sellerInfo: {
          email: "skydio.seller@example.com",
          phoneNumber: "+919876543213"
        }
      },
      {
        accessoryId: "ACC-005",
        name: "Remote Controller Lanyard",
        brand: "DJI",
        category: "Comfort",
        price: 1299,
        description: "Comfortable lanyard for remote controller",
        image: "https://images.unsplash.com/photo-1586769852044-692ebda0b2dc?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        quantity: 50,
        status: "pending",
        sellerId: "SELLER-001",
        sellerInfo: {
          email: "dji.seller@example.com",
          phoneNumber: "+919876543210"
        }
      },
      {
        accessoryId: "ACC-006",
        name: "Battery Charging Hub",
        brand: "DJI",
        category: "Charging",
        price: 8999,
        description: "4-battery charging hub with fast charging capability",
        image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        quantity: 12,
        status: "approved",
        sellerId: "SELLER-002",
        sellerInfo: {
          email: "autel.seller@example.com",
          phoneNumber: "+919876543211"
        }
      }
    ];
  };

  // Update accessory status
  const updateAccessoryStatus = async (accessoryId, newStatus) => {
    const updatingIdsCopy = new Set(updatingIds);
    updatingIdsCopy.add(`${accessoryId}-${newStatus}`);
    setUpdatingIds(updatingIdsCopy);

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
            accessoryId: String(accessoryId),
            status: newStatus.toLowerCase()
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
              ? { ...acc, status: newStatus.toLowerCase() }
              : acc
          )
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      const updatingIdsCopy = new Set(updatingIds);
      updatingIdsCopy.delete(`${accessoryId}-${newStatus}`);
      setUpdatingIds(updatingIdsCopy);
    }
  };

  // Delete accessory (permanently)
  const deleteAccessory = async (accessoryId) => {
    if (!window.confirm("Are you sure you want to permanently delete this accessory?")) return;

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

      const result = await res.json();

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      setAccessories(prev => prev.filter(acc => acc.accessoryId !== accessoryId));
    } catch (err) {
      setError(err.message);
    }
  };

  // View accessory details
  const viewAccessoryDetails = (accessory) => {
    setViewingAccessory(accessory);
  };

  // Close accessory details modal
  const closeAccessoryDetails = () => {
    setViewingAccessory(null);
  };

  // Handle scroll to show shadow on sticky columns
  const handleTableScroll = (e) => {
    const isScrolled = e.target.scrollLeft > 0;
    setScrolled(isScrolled);
  };

  useEffect(() => {
    fetchAccessories();
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

  // Filter and sort accessories
  const filteredAccessories = accessories
    .filter(accessory => {
      const matchesStatus = selectedStatus === "all" || accessory.status.toLowerCase() === selectedStatus;
      const matchesSearch =
        searchTerm === "" ||
        accessory.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        accessory.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        accessory.accessoryId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        accessory.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (accessory.category && accessory.category.toLowerCase().includes(searchTerm.toLowerCase()));
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
    all: accessories.length,
    approved: accessories.filter(a => a.status === "approved").length,
    pending: accessories.filter(a => a.status === "pending").length,
    rejected: accessories.filter(a => a.status === "rejected").length,
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

  const AccessoryRow = ({ accessory, isSubRow = false }) => (
    <tr key={accessory.accessoryId} className={`accessory-row ${isSubRow ? 'sub-row' : ''}`}>
      <td className="sticky-col sticky-col-id">
        <div className="accessory-id-cell">
          <div className="id-badge">{accessory.accessoryId}</div>
        </div>
      </td>

      <td className="sticky-col sticky-col-seller-id">
        <div className="seller-id-cell">
          <div className="id-badge seller">{accessory.sellerId}</div>
          {accessory.sellerInfo && (
            <div className="seller-quick-info">
              <span className="seller-email">{accessory.sellerInfo.email}</span>
            </div>
          )}
        </div>
      </td>

      <td className="cell-name">
        <div className="name-cell">
          {accessory.image && (
            <img
              src={accessory.image}
              alt={accessory.name}
              className="accessory-thumbnail"
            />
          )}
          <div className="name-info">
            <strong>{accessory.name}</strong>
            <div className="accessory-details">
              <span className="brand">{accessory.brand}</span>
              <span className="category">{accessory.category || "N/A"}</span>
            </div>
          </div>
        </div>
      </td>
      
      <td className="cell-price">
        <div className="price-badge">
          <span className="price-icon">₹</span>
          {accessory.price.toLocaleString('en-IN')}
        </div>
      </td>
      
      <td className="cell-quantity">
        <div className="quantity-badge">
          <span className="qty-icon">📦</span>
          <span className={`qty-value ${accessory.quantity === 0 ? 'out-of-stock' : ''}`}>
            {accessory.quantity}
          </span>
        </div>
      </td>
      
      <td className="cell-status">
        <span className={`status-badge status-${accessory.status}`}>
          {accessory.status.toUpperCase()}
        </span>
      </td>
      
      <td className="cell-description">
        <div className="description-text">
          {accessory.description}
        </div>
      </td>
      
      <td className="cell-actions">
        <div className="action-buttons">
          {accessory.status === "pending" && (
            <>
              <button
                className="action-btn approve"
                onClick={() => updateAccessoryStatus(accessory.accessoryId, "approved")}
                disabled={updatingIds.has(`${accessory.accessoryId}-approved`)}
                title="Approve accessory"
              >
                {updatingIds.has(`${accessory.accessoryId}-approved`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✓</span>
                )}
              </button>
              <button
                className="action-btn reject"
                onClick={() => updateAccessoryStatus(accessory.accessoryId, "rejected")}
                disabled={updatingIds.has(`${accessory.accessoryId}-rejected`)}
                title="Reject accessory"
              >
                {updatingIds.has(`${accessory.accessoryId}-rejected`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✗</span>
                )}
              </button>
            </>
          )}

          {accessory.status === "approved" && (
            <>
              <button
                className="action-btn pending"
                onClick={() => updateAccessoryStatus(accessory.accessoryId, "pending")}
                disabled={updatingIds.has(`${accessory.accessoryId}-pending`)}
                title="Move to pending"
              >
                {updatingIds.has(`${accessory.accessoryId}-pending`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>⏳</span>
                )}
              </button>
              <button
                className="action-btn reject"
                onClick={() => updateAccessoryStatus(accessory.accessoryId, "rejected")}
                disabled={updatingIds.has(`${accessory.accessoryId}-rejected`)}
                title="Reject accessory"
              >
                {updatingIds.has(`${accessory.accessoryId}-rejected`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✗</span>
                )}
              </button>
            </>
          )}

          {accessory.status === "rejected" && (
            <>
              <button
                className="action-btn pending"
                onClick={() => updateAccessoryStatus(accessory.accessoryId, "pending")}
                disabled={updatingIds.has(`${accessory.accessoryId}-pending`)}
                title="Move to pending"
              >
                {updatingIds.has(`${accessory.accessoryId}-pending`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>⏳</span>
                )}
              </button>
              <button
                className="action-btn approve"
                onClick={() => updateAccessoryStatus(accessory.accessoryId, "approved")}
                disabled={updatingIds.has(`${accessory.accessoryId}-approved`)}
                title="Approve accessory"
              >
                {updatingIds.has(`${accessory.accessoryId}-approved`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✓</span>
                )}
              </button>
            </>
          )}

          <button
            className="action-btn view"
            onClick={() => viewAccessoryDetails(accessory)}
            title="View details"
          >
            👁
          </button>

          <button
            className="action-btn delete"
            onClick={() => deleteAccessory(accessory.accessoryId)}
            title="Delete accessory"
          >
            🗑
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="accessories-container">
      {/* Header */}
      <div className="header-section">
        <div className="header-top">
          <div className="title-section">
            <h1 className="page-title">Accessories Management</h1>
            <p className="page-subtitle">Manage and oversee all accessories registrations and listings</p>
          </div>
          <div className="header-controls">
            <div className="stats-summary">
              <div className="summary-item">
                <span className="summary-label">TOTAL</span>
                <span className="summary-value">{accessories.length}</span>
              </div>
              <div className="summary-item active">
                <span className="summary-label">APPROVED</span>
                <span className="summary-value">{statusStats.approved}</span>
              </div>
            </div>
            <button
              className="refresh-btn"
              onClick={fetchAccessories}
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
            placeholder="Search accessories by name, brand, ID, or description..."
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
                {status === "all" && "🔌"}
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
            <p>Loading accessories data...</p>
          </div>
        ) : filteredAccessories.length === 0 ? (
          <div className="no-data-message">
            <div className="no-data-icon">📭</div>
            <p>No accessories found</p>
            {searchTerm && <p className="no-data-hint">Try adjusting your search criteria</p>}
            <button className="no-data-action" onClick={() => {setSearchTerm(""); setSelectedStatus("all");}}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="table-scroll-container" ref={tableRef} onScroll={handleTableScroll}>
            <table className="accessories-table">
              <thead>
                <tr>
                  <th className="sticky-col sticky-col-id" onClick={() => handleSort("accessoryId")}>
                    <div className="th-content">
                      Accessory ID <SortIcon column="accessoryId" />
                    </div>
                  </th>

                  <th className="sticky-col sticky-col-seller-id" onClick={() => handleSort("sellerId")}>
                    <div className="th-content">
                      Seller Details <SortIcon column="sellerId" />
                    </div>
                  </th>

                  <th onClick={() => handleSort("name")}>
                    <div className="th-content">
                      Accessory Details <SortIcon column="name" />
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
                  // Group filtered accessories by seller
                  const sellerGroups = filteredAccessories.reduce((acc, accessory) => {
                    if (!acc[accessory.sellerId]) {
                      acc[accessory.sellerId] = [];
                    }
                    acc[accessory.sellerId].push(accessory);
                    return acc;
                  }, {});

                  // Convert to array and render
                  return Object.entries(sellerGroups).flatMap(([sellerId, sellerAccessories]) => {
                    if (sellerAccessories.length === 0) return [];

                    const isExpanded = expandedSellers.has(sellerId);
                    const hasMultipleAccessories = sellerAccessories.length > 1;

                    return [
                      hasMultipleAccessories ? (
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
                              <span className="accessory-count">{sellerAccessories.length} accessories</span>
                              <div className="seller-info">
                                {sellerAccessories[0].sellerInfo?.email && (
                                  <span className="info-item email">📧 {sellerAccessories[0].sellerInfo.email}</span>
                                )}
                                {sellerAccessories[0].sellerInfo?.phoneNumber && (
                                  <span className="info-item phone">📱 {sellerAccessories[0].sellerInfo.phoneNumber}</span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null,
                      ...(!hasMultipleAccessories || isExpanded
                        ? sellerAccessories.map((accessory) => (
                            <AccessoryRow
                              key={accessory.accessoryId}
                              accessory={accessory}
                              isSubRow={hasMultipleAccessories}
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
          <div className="stat-icon">🔌</div>
          <div className="stat-content">
            <div className="stat-label">Total Accessories</div>
            <div className="stat-value">{accessories.length}</div>
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
              ₹{accessories.reduce((sum, a) => sum + (a.price * a.quantity), 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-label">Total Stock</div>
            <div className="stat-value">
              {accessories.reduce((sum, a) => sum + a.quantity, 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Accessory Details Modal - UPDATED to match Drones.jsx pattern */}
      {viewingAccessory && (
        <div className="accessory-modal-overlay" onClick={closeAccessoryDetails}>
          <div className="accessory-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>ACCESSORY DETAILS</h2>
              <button className="modal-close" onClick={closeAccessoryDetails}>
                ✕
              </button>
            </div>
            <div className="modal-content">
              <div className="modal-profile">
                {viewingAccessory.image && (
                  <img
                    src={viewingAccessory.image}
                    alt={viewingAccessory.name}
                    className="modal-accessory-image"
                  />
                )}
                <div className="modal-name">
                  <h3>{viewingAccessory.name}</h3>
                  <span className={`modal-status status-${viewingAccessory.status}`}>
                    {viewingAccessory.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="modal-details-grid">
                <div className="detail-section">
                  <h4>Accessory Information</h4>
                  <div className="detail-row">
                    <span className="detail-label">Accessory ID:</span>
                    <span className="detail-value">{viewingAccessory.accessoryId}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Brand:</span>
                    <span className="detail-value">{viewingAccessory.brand}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Category:</span>
                    <span className="detail-value">{viewingAccessory.category || "N/A"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Price:</span>
                    <span className="detail-value">₹{viewingAccessory.price.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Quantity:</span>
                    <span className="detail-value">{viewingAccessory.quantity}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className={`detail-value status-badge status-${viewingAccessory.status}`}>
                      {viewingAccessory.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Description</h4>
                  <div className="detail-row full-width">
                    <span className="detail-value description-full">
                      {viewingAccessory.description}
                    </span>
                  </div>
                </div>

                {viewingAccessory.sellerInfo && (
                  <div className="detail-section seller-section">
                    <h4>Seller Information</h4>
                    <div className="detail-row">
                      <span className="detail-label">Seller ID:</span>
                      <span className="detail-value">{viewingAccessory.sellerId}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Seller Email:</span>
                      <span className="detail-value">{viewingAccessory.sellerInfo.email}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Seller Phone:</span>
                      <span className="detail-value">{viewingAccessory.sellerInfo.phoneNumber}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-action-btn" onClick={closeAccessoryDetails}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Accessories;