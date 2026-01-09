import React, { useEffect, useState, useRef } from "react";
import "../styles/Drones.css";

const GRAPHQL_URL = "http://localhost:5001/graphql";

function Drones() {
  const [drones, setDrones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [updatingIds, setUpdatingIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
  const [expandedSellers, setExpandedSellers] = useState(new Set());
  const tableRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [viewingDrone, setViewingDrone] = useState(null);

  // Fetch drones
  const fetchDrones = async () => {
    setLoading(true);
    setError(null);

    const query = `
      query {
        drones {  
          droneId
          name
          brand
          uin
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
        setDrones(getMockDrones());
      } else {
        const data = result.data?.drones || [];
        if (data.length === 0) {
          setDrones(getMockDrones());
        } else {
          setDrones(data);
        }
      }
    } catch (err) {
      setError(err.message);
      setDrones(getMockDrones());
    }

    setLoading(false);
  };

  // Get mock drones data
  const getMockDrones = () => {
    return [
      {
        droneId: "DRONE-001",
        name: "DJI Mavic 3 Pro",
        brand: "DJI",
        uin: "UIN-2023-001",
        price: 159999,
        description: "Professional drone with Hasselblad camera",
        image: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        quantity: 12,
        status: "approved",
        sellerId: "SELLER-001",
        sellerInfo: {
          email: "dji.seller@example.com",
          phoneNumber: "+919876543210"
        }
      },
      {
        droneId: "DRONE-002",
        name: "Autel EVO Lite+",
        brand: "Autel",
        uin: "UIN-2023-002",
        price: 129999,
        description: "Premium drone with 6K camera",
        image: "https://images.unsplash.com/photo-1524143986875-3b098d78b363?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        quantity: 8,
        status: "pending",
        sellerId: "SELLER-002",
        sellerInfo: {
          email: "autel.seller@example.com",
          phoneNumber: "+919876543211"
        }
      },
      {
        droneId: "DRONE-003",
        name: "Parrot Anafi USA",
        brand: "Parrot",
        uin: "UIN-2023-003",
        price: 189999,
        description: "Enterprise-grade drone for professional use",
        image: "https://images.unsplash.com/photo-1517697471339-4aa32003c11a?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        quantity: 5,
        status: "approved",
        sellerId: "SELLER-003",
        sellerInfo: {
          email: "parrot.seller@example.com",
          phoneNumber: "+919876543212"
        }
      },
      {
        droneId: "DRONE-004",
        name: "Skydio 2+",
        brand: "Skydio",
        uin: "UIN-2023-004",
        price: 139999,
        description: "Autonomous drone with obstacle avoidance",
        image: "https://images.unsplash.com/photo-1506947411487-a56738267384?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        quantity: 0,
        status: "rejected",
        sellerId: "SELLER-004",
        sellerInfo: {
          email: "skydio.seller@example.com",
          phoneNumber: "+919876543213"
        }
      },
      {
        droneId: "DRONE-005",
        name: "Yuneec Typhoon H3",
        brand: "Yuneec",
        uin: "UIN-2023-005",
        price: 149999,
        description: "Hexacopter with retractable landing gear",
        image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        quantity: 7,
        status: "pending",
        sellerId: "SELLER-001",
        sellerInfo: {
          email: "dji.seller@example.com",
          phoneNumber: "+919876543210"
        }
      },
      {
        droneId: "DRONE-006",
        name: "DJI Mini 3 Pro",
        brand: "DJI",
        uin: "UIN-2023-006",
        price: 89999,
        description: "Compact drone under 250g",
        image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        quantity: 15,
        status: "approved",
        sellerId: "SELLER-002",
        sellerInfo: {
          email: "autel.seller@example.com",
          phoneNumber: "+919876543211"
        }
      }
    ];
  };

  // Update drone status
  const updateDroneStatus = async (droneId, newStatus) => {
    const updatingIdsCopy = new Set(updatingIds);
    updatingIdsCopy.add(`${droneId}-${newStatus}`);
    setUpdatingIds(updatingIdsCopy);

    const mutation = `
      mutation UpdateDroneStatus($droneId: String!, $status: String!) {
        updateDroneStatus(droneId: $droneId, status: $status) {
          droneId
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
          variables: { droneId, status: newStatus.toLowerCase() },
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
        setDrones(prevDrones =>
          prevDrones.map(drone =>
            drone.droneId === droneId
              ? { ...drone, status: newStatus.toLowerCase() }
              : drone
          )
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      const updatingIdsCopy = new Set(updatingIds);
      updatingIdsCopy.delete(`${droneId}-${newStatus}`);
      setUpdatingIds(updatingIdsCopy);
    }
  };

  // Delete drone
  const deleteDrone = async (droneId) => {
    if (!window.confirm("Are you sure you want to delete this drone?")) return;

    const mutation = `
      mutation DeleteDrone($droneId: String!) {
        deleteDrone(droneId: $droneId) {
          droneId
        }
      }
    `;

    try {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: mutation, variables: { droneId } }),
      });

      const result = await res.json();

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      setDrones(prev => prev.filter(drone => drone.droneId !== droneId));
    } catch (err) {
      setError(err.message);
    }
  };

  // View drone details
  const viewDroneDetails = (drone) => {
    setViewingDrone(drone);
  };

  // Close drone details modal
  const closeDroneDetails = () => {
    setViewingDrone(null);
  };

  // Handle scroll to show shadow on sticky columns
  const handleTableScroll = (e) => {
    const isScrolled = e.target.scrollLeft > 0;
    setScrolled(isScrolled);
  };

  // Initial fetch
  useEffect(() => {
    fetchDrones();
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

  // Filter and sort drones
  const filteredDrones = drones
    .filter(drone => {
      const matchesStatus = selectedStatus === "all" || drone.status.toLowerCase() === selectedStatus;
      const matchesSearch =
        searchTerm === "" ||
        drone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        drone.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        drone.droneId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        drone.uin.toLowerCase().includes(searchTerm.toLowerCase());
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
    all: drones.length,
    approved: drones.filter(d => d.status === "approved").length,
    pending: drones.filter(d => d.status === "pending").length,
    rejected: drones.filter(d => d.status === "rejected").length,
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

  const DroneRow = ({ drone, isSubRow = false }) => (
    <tr key={drone.droneId} className={`drone-row ${isSubRow ? 'sub-row' : ''}`}>
      <td className="sticky-col sticky-col-id">
        <div className="drone-id-cell">
          <div className="id-badge">{drone.droneId}</div>
        </div>
      </td>

      <td className="sticky-col sticky-col-seller-id">
        <div className="seller-id-cell">
          <div className="id-badge seller">{drone.sellerId}</div>
          {drone.sellerInfo && (
            <div className="seller-quick-info">
              <span className="seller-email">{drone.sellerInfo.email}</span>
            </div>
          )}
        </div>
      </td>

      <td className="cell-name">
        <div className="name-cell">
          {drone.image && (
            <img
              src={drone.image}
              alt={drone.name}
              className="drone-thumbnail"
            />
          )}
          <div className="name-info">
            <strong>{drone.name}</strong>
            <div className="drone-details">
              <span className="brand">{drone.brand}</span>
              <span className="uin">{drone.uin}</span>
            </div>
          </div>
        </div>
      </td>
      
      <td className="cell-price">
        <div className="price-badge">
          <span className="price-icon">₹</span>
          {drone.price.toLocaleString('en-IN')}
        </div>
      </td>
      
      <td className="cell-quantity">
        <div className="quantity-badge">
          <span className="qty-icon">📦</span>
          <span className={`qty-value ${drone.quantity === 0 ? 'out-of-stock' : ''}`}>
            {drone.quantity}
          </span>
        </div>
      </td>
      
      <td className="cell-status">
        <span className={`status-badge status-${drone.status}`}>
          {drone.status.toUpperCase()}
        </span>
      </td>
      
      <td className="cell-description">
        <div className="description-text">
          {drone.description}
        </div>
      </td>
      
      <td className="cell-actions">
        <div className="action-buttons">
          {drone.status === "pending" && (
            <>
              <button
                className="action-btn approve"
                onClick={() => updateDroneStatus(drone.droneId, "approved")}
                disabled={updatingIds.has(`${drone.droneId}-approved`)}
                title="Approve drone"
              >
                {updatingIds.has(`${drone.droneId}-approved`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✓</span>
                )}
              </button>
              <button
                className="action-btn reject"
                onClick={() => updateDroneStatus(drone.droneId, "rejected")}
                disabled={updatingIds.has(`${drone.droneId}-rejected`)}
                title="Reject drone"
              >
                {updatingIds.has(`${drone.droneId}-rejected`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✗</span>
                )}
              </button>
            </>
          )}

          {drone.status === "approved" && (
            <>
              <button
                className="action-btn pending"
                onClick={() => updateDroneStatus(drone.droneId, "pending")}
                disabled={updatingIds.has(`${drone.droneId}-pending`)}
                title="Move to pending"
              >
                {updatingIds.has(`${drone.droneId}-pending`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>⏳</span>
                )}
              </button>
              <button
                className="action-btn reject"
                onClick={() => updateDroneStatus(drone.droneId, "rejected")}
                disabled={updatingIds.has(`${drone.droneId}-rejected`)}
                title="Reject drone"
              >
                {updatingIds.has(`${drone.droneId}-rejected`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✗</span>
                )}
              </button>
            </>
          )}

          {drone.status === "rejected" && (
            <>
              <button
                className="action-btn pending"
                onClick={() => updateDroneStatus(drone.droneId, "pending")}
                disabled={updatingIds.has(`${drone.droneId}-pending`)}
                title="Move to pending"
              >
                {updatingIds.has(`${drone.droneId}-pending`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>⏳</span>
                )}
              </button>
              <button
                className="action-btn approve"
                onClick={() => updateDroneStatus(drone.droneId, "approved")}
                disabled={updatingIds.has(`${drone.droneId}-approved`)}
                title="Approve drone"
              >
                {updatingIds.has(`${drone.droneId}-approved`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✓</span>
                )}
              </button>
            </>
          )}

          <button
            className="action-btn view"
            onClick={() => viewDroneDetails(drone)}
            title="View details"
          >
            👁
          </button>

          <button
            className="action-btn delete"
            onClick={() => deleteDrone(drone.droneId)}
            title="Delete drone"
          >
            🗑
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
            <h1 className="page-title">Drones Management</h1>
            <p className="page-subtitle">Manage and oversee all drone registrations and listings</p>
          </div>
          <div className="header-controls">
            <div className="stats-summary">
              <div className="summary-item">
                <span className="summary-label">TOTAL</span>
                <span className="summary-value">{drones.length}</span>
              </div>
              <div className="summary-item active">
                <span className="summary-label">APPROVED</span>
                <span className="summary-value">{statusStats.approved}</span>
              </div>
            </div>
            <button
              className="refresh-btn"
              onClick={fetchDrones}
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
            placeholder="Search drones by name, brand, ID, or UIN..."
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
                {status === "all" && "🚁"}
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
            <p>Loading drone data...</p>
          </div>
        ) : filteredDrones.length === 0 ? (
          <div className="no-data-message">
            <div className="no-data-icon">📭</div>
            <p>No drones found</p>
            {searchTerm && <p className="no-data-hint">Try adjusting your search criteria</p>}
            <button className="no-data-action" onClick={() => {setSearchTerm(""); setSelectedStatus("all");}}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="table-scroll-container" ref={tableRef} onScroll={handleTableScroll}>
            <table className="drones-table">
              <thead>
                <tr>
                  <th className="sticky-col sticky-col-id" onClick={() => handleSort("droneId")}>
                    <div className="th-content">
                      Drone ID <SortIcon column="droneId" />
                    </div>
                  </th>

                  <th className="sticky-col sticky-col-seller-id" onClick={() => handleSort("sellerId")}>
                    <div className="th-content">
                      Seller Details <SortIcon column="sellerId" />
                    </div>
                  </th>

                  <th onClick={() => handleSort("name")}>
                    <div className="th-content">
                      Drone Details <SortIcon column="name" />
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
                  // Group filtered drones by seller
                  const sellerGroups = filteredDrones.reduce((acc, drone) => {
                    if (!acc[drone.sellerId]) {
                      acc[drone.sellerId] = [];
                    }
                    acc[drone.sellerId].push(drone);
                    return acc;
                  }, {});

                  // Convert to array and render
                  return Object.entries(sellerGroups).flatMap(([sellerId, sellerDrones]) => {
                    if (sellerDrones.length === 0) return [];

                    const isExpanded = expandedSellers.has(sellerId);
                    const hasMultipleDrones = sellerDrones.length > 1;

                    return [
                      hasMultipleDrones ? (
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
                              <span className="drone-count">{sellerDrones.length} drones</span>
                              <div className="seller-info">
                                {sellerDrones[0].sellerInfo?.email && (
                                  <span className="info-item email">📧 {sellerDrones[0].sellerInfo.email}</span>
                                )}
                                {sellerDrones[0].sellerInfo?.phoneNumber && (
                                  <span className="info-item phone">📱 {sellerDrones[0].sellerInfo.phoneNumber}</span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null,
                      ...(!hasMultipleDrones || isExpanded
                        ? sellerDrones.map((drone) => (
                            <DroneRow
                              key={drone.droneId}
                              drone={drone}
                              isSubRow={hasMultipleDrones}
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
          <div className="stat-icon">🚁</div>
          <div className="stat-content">
            <div className="stat-label">Total Drones</div>
            <div className="stat-value">{drones.length}</div>
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
              ₹{drones.reduce((sum, d) => sum + (d.price * d.quantity), 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-label">Total Stock</div>
            <div className="stat-value">
              {drones.reduce((sum, d) => sum + d.quantity, 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Drone Details Modal */}
      {viewingDrone && (
        <div className="drone-modal-overlay" onClick={closeDroneDetails}>
          <div className="drone-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Drone Details</h2>
              <button className="modal-close" onClick={closeDroneDetails}>
                ✕
              </button>
            </div>
            <div className="modal-content">
              <div className="modal-profile">
                {viewingDrone.image && (
                  <img
                    src={viewingDrone.image}
                    alt={viewingDrone.name}
                    className="modal-drone-image"
                  />
                )}
                <div className="modal-name">
                  <h3>{viewingDrone.name}</h3>
                  <span className={`modal-status status-${viewingDrone.status}`}>
                    {viewingDrone.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="modal-details-grid">
                <div className="detail-section">
                  <h4>Drone Information</h4>
                  <div className="detail-row">
                    <span className="detail-label">Drone ID:</span>
                    <span className="detail-value">{viewingDrone.droneId}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Brand:</span>
                    <span className="detail-value">{viewingDrone.brand}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">UIN:</span>
                    <span className="detail-value">{viewingDrone.uin}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Price:</span>
                    <span className="detail-value">₹{viewingDrone.price.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Quantity:</span>
                    <span className="detail-value">{viewingDrone.quantity}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className={`detail-value status-badge status-${viewingDrone.status}`}>
                      {viewingDrone.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Description</h4>
                  <div className="detail-row full-width">
                    <span className="detail-value description-full">
                      {viewingDrone.description}
                    </span>
                  </div>
                </div>

                {viewingDrone.sellerInfo && (
                  <div className="detail-section seller-section">
                    <h4>Seller Information</h4>
                    <div className="detail-row">
                      <span className="detail-label">Seller ID:</span>
                      <span className="detail-value">{viewingDrone.sellerId}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Seller Email:</span>
                      <span className="detail-value">{viewingDrone.sellerInfo.email}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Seller Phone:</span>
                      <span className="detail-value">{viewingDrone.sellerInfo.phoneNumber}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-action-btn" onClick={closeDroneDetails}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default Drones;