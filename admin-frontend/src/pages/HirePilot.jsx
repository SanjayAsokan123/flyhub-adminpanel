import React, { useEffect, useState, useRef } from "react";
import "../styles/HirePilot.css";

const GRAPHQL_URL = "http://localhost:5001/graphql";

function HirePilotsDashboard() {
  const [pilots, setPilots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [updatingIds, setUpdatingIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "pilotId", direction: "desc" });
  const [expandedSellers, setExpandedSellers] = useState(new Set());
  const tableRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [viewingPilot, setViewingPilot] = useState(null);

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

    const updatingIdsCopy = new Set(updatingIds);
    updatingIdsCopy.add(`${pilotId}-deleting`);
    setUpdatingIds(updatingIdsCopy);

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
      const updatingIdsCopy = new Set(updatingIds);
      updatingIdsCopy.delete(`${pilotId}-deleting`);
      setUpdatingIds(updatingIdsCopy);
    }
  };

  // Update pilot status
  const updatePilotStatus = async (pilotId, newStatus) => {
    const updatingIdsCopy = new Set(updatingIds);
    updatingIdsCopy.add(`${pilotId}-${newStatus}`);
    setUpdatingIds(updatingIdsCopy);

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
      const updatingIdsCopy = new Set(updatingIds);
      updatingIdsCopy.delete(`${pilotId}-${newStatus}`);
      setUpdatingIds(updatingIdsCopy);
    }
  };

  // View pilot details
  const viewPilotDetails = (pilot) => {
    setViewingPilot(pilot);
  };

  // Close pilot details modal
  const closePilotDetails = () => {
    setViewingPilot(null);
  };

  // Handle scroll to show shadow on sticky columns
  const handleTableScroll = (e) => {
    const isScrolled = e.target.scrollLeft > 0;
    setScrolled(isScrolled);
  };

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

  // Filter and sort pilots
  const filteredPilots = pilots
    .filter(pilot => {
      const matchesStatus = selectedStatus === "all" || (pilot.adminStatus || "").toLowerCase() === selectedStatus;
      const matchesSearch =
        searchTerm === "" ||
        pilot.pilotName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pilot.pilotCompany && pilot.pilotCompany.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (pilot.location && pilot.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (pilot.specification && pilot.specification.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (pilot.description && pilot.description.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      const key = sortConfig.key;
      let aVal = a[key];
      let bVal = b[key];

      if (key === "price") {
        aVal = a.price?.perHour || 0;
        bVal = b.price?.perHour || 0;
      }

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
    all: pilots.length,
    approved: pilots.filter(p => p.adminStatus === "approved").length,
    pending: pilots.filter(p => p.adminStatus === "pending").length,
    rejected: pilots.filter(p => p.adminStatus === "rejected").length,
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

  const PilotRow = ({ pilot, isSubRow = false }) => (
    <tr key={pilot.pilotId} className={`pilot-row ${isSubRow ? 'sub-row' : ''}`}>
      <td className="sticky-col sticky-col-id">
        <div className="pilot-id-cell">
          <div className="id-badge">{pilot.pilotId}</div>
        </div>
      </td>

      <td className="sticky-col sticky-col-seller-id">
        <div className="seller-id-cell">
          <div className="id-badge seller">{pilot.sellerId}</div>
          {pilot.seller && (
            <div className="seller-quick-info">
              <span className="seller-name">{pilot.seller.name}</span>
            </div>
          )}
        </div>
      </td>

      <td className="cell-name">
        <div className="name-cell">
          <img
            src={"/pilot-placeholder.jpg"}
            alt={pilot.pilotName}
            className="pilot-thumbnail"
          />
          <div className="name-info">
            <strong>{pilot.pilotName}</strong>
            <div className="pilot-details">
              <span className="company">{pilot.pilotCompany || "Independent"}</span>
              <span className="location">{pilot.location || "N/A"}</span>
            </div>
          </div>
        </div>
      </td>
      
      <td className="cell-price">
        <div className="price-grid">
          <div className="price-item">
            <span className="price-label">Hour</span>
            <div className="price-value">
              <span className="price-icon">₹</span>
              {pilot.price?.perHour ? pilot.price.perHour.toLocaleString('en-IN') : "—"}
            </div>
          </div>
          <div className="price-item">
            <span className="price-label">Day</span>
            <div className="price-value">
              <span className="price-icon">₹</span>
              {pilot.price?.perDay ? pilot.price.perDay.toLocaleString('en-IN') : "—"}
            </div>
          </div>
        </div>
      </td>
      
      <td className="cell-availability">
        <div className="availability-badge">
          <span className={`availability-icon ${pilot.availability ? 'available' : 'unavailable'}`}>
            {pilot.availability ? "✓" : "✗"}
          </span>
          <span className={`availability-text ${pilot.availability ? 'available' : 'unavailable'}`}>
            {pilot.availability ? "Available" : "Unavailable"}
          </span>
        </div>
      </td>
      
      <td className="cell-status">
        <span className={`status-badge status-${pilot.adminStatus || 'pending'}`}>
          {(pilot.adminStatus || "pending").toUpperCase()}
        </span>
      </td>
      
      <td className="cell-specification">
        <div className="specification-text">
          {pilot.specification || "Not specified"}
        </div>
      </td>
      
      <td className="cell-actions">
        <div className="action-buttons">
          {pilot.adminStatus === "pending" && (
            <>
              <button
                className="action-btn approve"
                onClick={() => updatePilotStatus(pilot.pilotId, "approved")}
                disabled={updatingIds.has(`${pilot.pilotId}-approved`)}
                title="Approve pilot"
              >
                {updatingIds.has(`${pilot.pilotId}-approved`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✓</span>
                )}
              </button>
              <button
                className="action-btn reject"
                onClick={() => updatePilotStatus(pilot.pilotId, "rejected")}
                disabled={updatingIds.has(`${pilot.pilotId}-rejected`)}
                title="Reject pilot"
              >
                {updatingIds.has(`${pilot.pilotId}-rejected`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✗</span>
                )}
              </button>
            </>
          )}

          {pilot.adminStatus === "approved" && (
            <>
              <button
                className="action-btn pending"
                onClick={() => updatePilotStatus(pilot.pilotId, "pending")}
                disabled={updatingIds.has(`${pilot.pilotId}-pending`)}
                title="Move to pending"
              >
                {updatingIds.has(`${pilot.pilotId}-pending`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>⏳</span>
                )}
              </button>
              <button
                className="action-btn reject"
                onClick={() => updatePilotStatus(pilot.pilotId, "rejected")}
                disabled={updatingIds.has(`${pilot.pilotId}-rejected`)}
                title="Reject pilot"
              >
                {updatingIds.has(`${pilot.pilotId}-rejected`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✗</span>
                )}
              </button>
            </>
          )}

          {pilot.adminStatus === "rejected" && (
            <>
              <button
                className="action-btn pending"
                onClick={() => updatePilotStatus(pilot.pilotId, "pending")}
                disabled={updatingIds.has(`${pilot.pilotId}-pending`)}
                title="Move to pending"
              >
                {updatingIds.has(`${pilot.pilotId}-pending`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>⏳</span>
                )}
              </button>
              <button
                className="action-btn approve"
                onClick={() => updatePilotStatus(pilot.pilotId, "approved")}
                disabled={updatingIds.has(`${pilot.pilotId}-approved`)}
                title="Approve pilot"
              >
                {updatingIds.has(`${pilot.pilotId}-approved`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✓</span>
                )}
              </button>
            </>
          )}

          <button
            className="action-btn view"
            onClick={() => viewPilotDetails(pilot)}
            title="View details"
          >
            👁
          </button>

          <button
            className="action-btn delete"
            onClick={() => deletePilot(pilot.pilotId)}
            disabled={updatingIds.has(`${pilot.pilotId}-deleting`)}
            title="Delete pilot"
          >
            {updatingIds.has(`${pilot.pilotId}-deleting`) ? (
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
    <div className="hire-pilots-container">
      {/* Header */}
      <div className="header-section">
        <div className="header-top">
          <div className="title-section">
            <h1 className="page-title">Hire Pilots Management</h1>
            <p className="page-subtitle">Manage and oversee all pilot registrations and listings</p>
          </div>
          <div className="header-controls">
            <div className="stats-summary">
              <div className="summary-item">
                <span className="summary-label">TOTAL</span>
                <span className="summary-value">{pilots.length}</span>
              </div>
              <div className="summary-item active">
                <span className="summary-label">APPROVED</span>
                <span className="summary-value">{statusStats.approved}</span>
              </div>
            </div>
            <button
              className="refresh-btn"
              onClick={fetchPilots}
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
            placeholder="Search pilots by name, company, location, or specification..."
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
                {status === "all" && "🧑‍✈️"}
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
            <p>Loading pilot data...</p>
          </div>
        ) : filteredPilots.length === 0 ? (
          <div className="no-data-message">
            <div className="no-data-icon">📭</div>
            <p>No pilots found</p>
            {searchTerm && <p className="no-data-hint">Try adjusting your search criteria</p>}
            <button className="no-data-action" onClick={() => {setSearchTerm(""); setSelectedStatus("all");}}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="table-scroll-container" ref={tableRef} onScroll={handleTableScroll}>
            <table className="hire-pilots-table">
              <thead>
                <tr>
                  <th className="sticky-col sticky-col-id" onClick={() => handleSort("pilotId")}>
                    <div className="th-content">
                      Pilot ID <SortIcon column="pilotId" />
                    </div>
                  </th>

                  <th className="sticky-col sticky-col-seller-id" onClick={() => handleSort("sellerId")}>
                    <div className="th-content">
                      Seller Details <SortIcon column="sellerId" />
                    </div>
                  </th>

                  <th onClick={() => handleSort("pilotName")}>
                    <div className="th-content">
                      Pilot Details <SortIcon column="pilotName" />
                    </div>
                  </th>
                  <th onClick={() => handleSort("price")}>
                    <div className="th-content">
                      Pricing <SortIcon column="price" />
                    </div>
                  </th>
                  <th onClick={() => handleSort("availability")}>
                    <div className="th-content">
                      Availability <SortIcon column="availability" />
                    </div>
                  </th>
                  <th onClick={() => handleSort("adminStatus")}>
                    <div className="th-content">
                      Status <SortIcon column="adminStatus" />
                    </div>
                  </th>
                  <th>
                    <div className="th-content">
                      Specification
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
                  // Group filtered pilots by seller
                  const sellerGroups = filteredPilots.reduce((acc, pilot) => {
                    if (!acc[pilot.sellerId]) {
                      acc[pilot.sellerId] = [];
                    }
                    acc[pilot.sellerId].push(pilot);
                    return acc;
                  }, {});

                  // Convert to array and render
                  return Object.entries(sellerGroups).flatMap(([sellerId, sellerPilots]) => {
                    if (sellerPilots.length === 0) return [];

                    const isExpanded = expandedSellers.has(sellerId);
                    const hasMultiplePilots = sellerPilots.length > 1;

                    return [
                      hasMultiplePilots ? (
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
                              <span className="pilot-count">{sellerPilots.length} pilots</span>
                              <div className="seller-info">
                                {sellerPilots[0].seller?.email && (
                                  <span className="info-item email">📧 {sellerPilots[0].seller.email}</span>
                                )}
                                {sellerPilots[0].seller?.phoneNumber && (
                                  <span className="info-item phone">📱 {sellerPilots[0].seller.phoneNumber}</span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null,
                      ...(!hasMultiplePilots || isExpanded
                        ? sellerPilots.map((pilot) => (
                            <PilotRow
                              key={pilot.pilotId}
                              pilot={pilot}
                              isSubRow={hasMultiplePilots}
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
          <div className="stat-icon">🧑‍✈️</div>
          <div className="stat-content">
            <div className="stat-label">Total Pilots</div>
            <div className="stat-value">{pilots.length}</div>
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
            <div className="stat-label">Avg. Hour Rate</div>
            <div className="stat-value">
              ₹{pilots.length > 0 
                ? Math.round(pilots.reduce((sum, p) => sum + (p.price?.perHour || 0), 0) / pilots.length).toLocaleString('en-IN')
                : "0"}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✓</div>
          <div className="stat-content">
            <div className="stat-label">Available</div>
            <div className="stat-value">
              {pilots.filter(p => p.availability).length}
            </div>
          </div>
        </div>
      </div>

      {/* Pilot Details Modal */}
      {viewingPilot && (
        <div className="pilot-modal-overlay" onClick={closePilotDetails}>
          <div className="pilot-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Pilot Details</h2>
              <button className="modal-close" onClick={closePilotDetails}>
                ✕
              </button>
            </div>
            <div className="modal-content">
              <div className="modal-profile">
                <img
                  src={"/pilot-placeholder.jpg"}
                  alt={viewingPilot.pilotName}
                  className="modal-pilot-image"
                />
                <div className="modal-name">
                  <h3>{viewingPilot.pilotName}</h3>
                  <span className={`modal-status status-${viewingPilot.adminStatus || 'pending'}`}>
                    {(viewingPilot.adminStatus || "pending").toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="modal-details-grid">
                <div className="detail-section">
                  <h4>Pilot Information</h4>
                  <div className="detail-row">
                    <span className="detail-label">Pilot ID:</span>
                    <span className="detail-value">{viewingPilot.pilotId}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Company:</span>
                    <span className="detail-value">{viewingPilot.pilotCompany || "Independent"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Location:</span>
                    <span className="detail-value">{viewingPilot.location || "Not specified"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Availability:</span>
                    <span className={`detail-value ${viewingPilot.availability ? 'available' : 'unavailable'}`}>
                      {viewingPilot.availability ? "Available" : "Not Available"}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Specification:</span>
                    <span className="detail-value">{viewingPilot.specification || "Not specified"}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Pricing</h4>
                  <div className="pricing-details">
                    <div className="price-detail-row">
                      <span className="detail-label">Per Hour:</span>
                      <span className="detail-value price-value">
                        ₹{viewingPilot.price?.perHour ? viewingPilot.price.perHour.toLocaleString('en-IN') : "—"}
                      </span>
                    </div>
                    <div className="price-detail-row">
                      <span className="detail-label">Per Day:</span>
                      <span className="detail-value price-value">
                        ₹{viewingPilot.price?.perDay ? viewingPilot.price.perDay.toLocaleString('en-IN') : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Description</h4>
                  <div className="detail-row full-width">
                    <span className="detail-value description-full">
                      {viewingPilot.description || "No description provided."}
                    </span>
                  </div>
                </div>

                {/* Certifications */}
                {viewingPilot.certifications?.length > 0 && (
                  <div className="detail-section">
                    <h4>Certifications</h4>
                    <div className="certifications-list">
                      {viewingPilot.certifications.map((cert, index) => (
                        <a
                          key={index}
                          href={cert.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="certification-link"
                        >
                          📄 Certification {index + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resume */}
                {viewingPilot.resume?.url && (
                  <div className="detail-section">
                    <h4>Resume</h4>
                    <a
                      href={viewingPilot.resume.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="resume-link"
                    >
                      📄 View Resume
                    </a>
                  </div>
                )}

                {/* Seller Information */}
                {viewingPilot.seller && (
                  <div className="detail-section seller-section">
                    <h4>Seller Information</h4>
                    <div className="detail-row">
                      <span className="detail-label">Seller ID:</span>
                      <span className="detail-value">{viewingPilot.sellerId}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Seller Name:</span>
                      <span className="detail-value">{viewingPilot.seller.name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Seller Email:</span>
                      <span className="detail-value">{viewingPilot.seller.email}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Seller Phone:</span>
                      <span className="detail-value">{viewingPilot.seller.phoneNumber}</span>
                    </div>
                  </div>
                )}

                {/* Contact Information */}
                <div className="detail-section contact-section">
                  <h4>Contact Information</h4>
                  <div className="detail-row">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{viewingPilot.newemail || "Not provided"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Phone:</span>
                    <span className="detail-value">{viewingPilot.newphoneNumber || "Not provided"}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <div className="modal-actions">
                {viewingPilot.adminStatus === "pending" && (
                  <>
                    <button
                      className="modal-action-btn approve"
                      onClick={() => {
                        updatePilotStatus(viewingPilot.pilotId, "approved");
                        closePilotDetails();
                      }}
                      disabled={updatingIds.has(`${viewingPilot.pilotId}-approved`)}
                    >
                      {updatingIds.has(`${viewingPilot.pilotId}-approved`) ? "Processing..." : "Approve"}
                    </button>
                    <button
                      className="modal-action-btn reject"
                      onClick={() => {
                        updatePilotStatus(viewingPilot.pilotId, "rejected");
                        closePilotDetails();
                      }}
                      disabled={updatingIds.has(`${viewingPilot.pilotId}-rejected`)}
                    >
                      {updatingIds.has(`${viewingPilot.pilotId}-rejected`) ? "Processing..." : "Reject"}
                    </button>
                  </>
                )}

                {viewingPilot.adminStatus === "approved" && (
                  <>
                    <button
                      className="modal-action-btn pending"
                      onClick={() => {
                        updatePilotStatus(viewingPilot.pilotId, "pending");
                        closePilotDetails();
                      }}
                      disabled={updatingIds.has(`${viewingPilot.pilotId}-pending`)}
                    >
                      {updatingIds.has(`${viewingPilot.pilotId}-pending`) ? "Processing..." : "Move to Pending"}
                    </button>
                    <button
                      className="modal-action-btn reject"
                      onClick={() => {
                        updatePilotStatus(viewingPilot.pilotId, "rejected");
                        closePilotDetails();
                      }}
                      disabled={updatingIds.has(`${viewingPilot.pilotId}-rejected`)}
                    >
                      {updatingIds.has(`${viewingPilot.pilotId}-rejected`) ? "Processing..." : "Reject"}
                    </button>
                  </>
                )}

                {viewingPilot.adminStatus === "rejected" && (
                  <>
                    <button
                      className="modal-action-btn pending"
                      onClick={() => {
                        updatePilotStatus(viewingPilot.pilotId, "pending");
                        closePilotDetails();
                      }}
                      disabled={updatingIds.has(`${viewingPilot.pilotId}-pending`)}
                    >
                      {updatingIds.has(`${viewingPilot.pilotId}-pending`) ? "Processing..." : "Move to Pending"}
                    </button>
                    <button
                      className="modal-action-btn approve"
                      onClick={() => {
                        updatePilotStatus(viewingPilot.pilotId, "approved");
                        closePilotDetails();
                      }}
                      disabled={updatingIds.has(`${viewingPilot.pilotId}-approved`)}
                    >
                      {updatingIds.has(`${viewingPilot.pilotId}-approved`) ? "Processing..." : "Approve"}
                    </button>
                  </>
                )}

                <button
                  className="modal-action-btn delete"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete this pilot?")) {
                      deletePilot(viewingPilot.pilotId);
                      closePilotDetails();
                    }
                  }}
                  disabled={updatingIds.has(`${viewingPilot.pilotId}-deleting`)}
                >
                  {updatingIds.has(`${viewingPilot.pilotId}-deleting`) ? "Deleting..." : "Delete"}
                </button>

                <button
                  className="modal-action-btn close"
                  onClick={closePilotDetails}
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

export default HirePilotsDashboard;