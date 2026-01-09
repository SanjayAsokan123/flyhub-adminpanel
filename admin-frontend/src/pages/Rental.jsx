import React, { useState, useEffect, useRef } from "react";
import "../styles/Rental.css";

const GRAPHQL_URL = "http://localhost:5001/graphql";

function Rentals() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [updatingIds, setUpdatingIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
  const [expandedSellers, setExpandedSellers] = useState(new Set());
  const tableRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [viewingRental, setViewingRental] = useState(null);
  const [sortMode, setSortMode] = useState("fifo");

  // ===== Fetch Rentals =====
  useEffect(() => {
    const fetchRentals = async () => {
      setLoading(true);
      setError(null);

      const query = `
        query {
          rentals {
            rentalId
            name
            brand
            location
            pricePerHour
            pricePerDay
            description
            quantity
            image
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

        const text = await res.text();
        let json;
        try {
          json = JSON.parse(text);
        } catch (e) {
          console.error("Fetch rentals: server did not return JSON:", text);
          setError("Server error: response not JSON (check console).");
          setLoading(false);
          return;
        }

        if (json.errors) {
          console.error("Fetch rentals GraphQL errors:", json.errors);
          setError(json.errors[0]?.message || "Unknown GraphQL error");
        } else {
          setRentals(json.data.rentals || []);
        }
      } catch (err) {
        console.error("Fetch rentals network error:", err);
        setError("Network error: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRentals();
  }, []);

  // ===== Update Status =====
  const handleApproval = async (rentalId, newStatus) => {
    const updatingIdsCopy = new Set(updatingIds);
    updatingIdsCopy.add(`${rentalId}-${newStatus}`);
    setUpdatingIds(updatingIdsCopy);

    const mutation = `
      mutation UpdateRentalStatus($rentalId: String!, $status: String!) {
        updateRentalStatus(rentalId: $rentalId, status: $status) {
          rentalId
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
          variables: { rentalId, status: newStatus },
        }),
      });

      const json = await res.json();

      if (json.errors) {
        console.error("Update status errors:", json.errors);
        setError(json.errors[0]?.message || "Error updating status");
      } else {
        const updated = json.data.updateRentalStatus;
        setRentals((prev) =>
          prev.map((r) =>
            r.rentalId === updated.rentalId ? { ...r, status: updated.status } : r
          )
        );
      }
    } catch (err) {
      console.error("Update status network error:", err);
      setError("Network error: " + err.message);
    } finally {
      const updatingIdsCopy = new Set(updatingIds);
      updatingIdsCopy.delete(`${rentalId}-${newStatus}`);
      setUpdatingIds(updatingIdsCopy);
    }
  };

  // ===== Helper: send GraphQL request and return parsed JSON or raw text =====
  const sendGraphQL = async (query, variables = {}) => {
    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });

    const text = await res.text();
    try {
      const json = JSON.parse(text);
      return { ok: true, json };
    } catch (e) {
      return { ok: false, text };
    }
  };

  // ===== Delete Rental (robust, tries multiple shapes) =====
  const handleDelete = async (rentalId) => {
    if (!window.confirm("Are you sure you want to delete this rental?")) return;

    const updatingIdsCopy = new Set(updatingIds);
    updatingIdsCopy.add(`${rentalId}-deleting`);
    setUpdatingIds(updatingIdsCopy);

    // Candidate mutation attempts in order of likelihood
    const attempts = [
      {
        name: "boolean-rentalId",
        query: `
          mutation DeleteRental($rentalId: String!) {
            deleteRental(rentalId: $rentalId)
          }
        `,
        variables: { rentalId },
        parseSuccess: (json) => json.data && json.data.deleteRental === true,
        onSuccessValue: (json) => json.data.deleteRental === true,
      },
      {
        name: "object-rentalId",
        // server might return the deleted object
        query: `
          mutation DeleteRental($rentalId: String!) {
            deleteRental(rentalId: $rentalId) {
              rentalId
            }
          }
        `,
        variables: { rentalId },
        parseSuccess: (json) => json.data && json.data.deleteRental && json.data.deleteRental.rentalId,
        onSuccessValue: (json) => json.data.deleteRental.rentalId,
      },
      {
        name: "boolean-id",
        query: `
          mutation DeleteRental($id: String!) {
            deleteRental(id: $id)
          }
        `,
        variables: { id: rentalId },
        parseSuccess: (json) => json.data && json.data.deleteRental === true,
        onSuccessValue: (json) => json.data.deleteRental === true,
      },
      {
        name: "object-id",
        query: `
          mutation DeleteRental($id: String!) {
            deleteRental(id: $id) {
              rentalId
            }
          }
        `,
        variables: { id: rentalId },
        parseSuccess: (json) => json.data && json.data.deleteRental && json.data.deleteRental.rentalId,
        onSuccessValue: (json) => json.data.deleteRental.rentalId,
      },
    ];

    let lastError = null;
    for (let attempt of attempts) {
      try {
        console.log(`Attempting delete with: ${attempt.name}`, attempt.variables);
        const resp = await sendGraphQL(attempt.query, attempt.variables);

        if (!resp.ok) {
          console.warn(`Attempt ${attempt.name} returned non-JSON response:`, resp.text);
          lastError = `Server returned non-JSON response for attempt ${attempt.name}. Check server logs / CORS.`;
          continue;
        }

        const json = resp.json;
        if (json.errors) {
          console.warn(`Attempt ${attempt.name} GraphQL errors:`, json.errors);
          lastError = `GraphQL error on attempt ${attempt.name}: ${json.errors[0]?.message || JSON.stringify(json.errors)}`;
          // try next attempt
          continue;
        }

        // success condition depends on mutation shape
        if (attempt.parseSuccess(json)) {
          // update frontend list accordingly
          setRentals((prev) => prev.filter((r) => r.rentalId !== rentalId));
          console.log(`Delete succeeded with attempt ${attempt.name}:`, json);
          return;
        } else {
          console.warn(`Attempt ${attempt.name} returned unexpected shape:`, json);
          lastError = `Unexpected return shape for attempt ${attempt.name}. See console.`;
        }
      } catch (err) {
        console.error(`Attempt ${attempt.name} network/error:`, err);
        lastError = `Network/error during attempt ${attempt.name}: ${err.message}`;
      }
    }

    // if we get here, all attempts failed
    console.error("All delete attempts failed. Last error:", lastError);
    setError(`Delete failed. ${lastError || "Unknown error"}`);

    // Helpful tip in console
    console.info(
      "If server expects a different mutation or returns a custom object, test in GraphQL playground with variations such as:\n" +
        "1) mutation { deleteRental(rentalId: \"XYZ\") }\n" +
        "2) mutation { deleteRental(id: \"XYZ\") }\n" +
        "3) mutation { deleteRental(rentalId: \"XYZ\") { rentalId } }\n" +
        "Check server logs and network tab for exact GraphQL error messages."
    );
  };

  // View rental details
  const viewRentalDetails = (rental) => {
    setViewingRental(rental);
  };

  // Close rental details modal
  const closeRentalDetails = () => {
    setViewingRental(null);
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

  // Filter and sort rentals
  const filteredRentals = rentals
    .filter(rental => {
      const matchesStatus = selectedStatus === "all" || rental.status.toLowerCase() === selectedStatus;
      const matchesSearch =
        searchTerm === "" ||
        rental.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rental.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rental.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rental.description && rental.description.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      // Apply LIFO/FIFO sorting first
      if (sortMode === "fifo") {
        return a.rentalId.localeCompare(b.rentalId);
      } else {
        return b.rentalId.localeCompare(a.rentalId);
      }
    });

  const statusStats = {
    all: rentals.length,
    approved: rentals.filter(r => r.status === "approved").length,
    pending: rentals.filter(r => r.status === "pending").length,
    rejected: rentals.filter(r => r.status === "rejected").length,
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

  const RentalRow = ({ rental, isSubRow = false }) => (
    <tr key={rental.rentalId} className={`rental-row ${isSubRow ? 'sub-row' : ''}`}>
      <td className="sticky-col sticky-col-id">
        <div className="rental-id-cell">
          <div className="id-badge">{rental.rentalId}</div>
        </div>
      </td>

      <td className="sticky-col sticky-col-seller-id">
        <div className="seller-id-cell">
          <div className="id-badge seller">{rental.sellerId}</div>
          {rental.sellerInfo && (
            <div className="seller-quick-info">
              <span className="seller-email">{rental.sellerInfo.email}</span>
            </div>
          )}
        </div>
      </td>

      <td className="cell-name">
        <div className="name-cell">
          {rental.image && (
            <img
              src={rental.image}
              alt={rental.name}
              className="rental-thumbnail"
            />
          )}
          <div className="name-info">
            <strong>{rental.name}</strong>
            <div className="rental-details">
              <span className="brand">{rental.brand}</span>
              <span className="location">{rental.location}</span>
            </div>
          </div>
        </div>
      </td>
      
      <td className="cell-quantity">
        <div className="quantity-badge">
          <span className="qty-icon">📦</span>
          <span className={`qty-value ${rental.quantity === 0 ? 'out-of-stock' : ''}`}>
            {rental.quantity}
          </span>
        </div>
      </td>
      
      <td className="cell-price-hour">
        <div className="price-badge">
          <span className="price-icon">₹</span>
          {rental.pricePerHour}/hour
        </div>
      </td>
      
      <td className="cell-price-day">
        <div className="price-badge">
          <span className="price-icon">₹</span>
          {rental.pricePerDay}/day
        </div>
      </td>
      
      <td className="cell-status">
        <span className={`status-badge status-${rental.status}`}>
          {rental.status.toUpperCase()}
        </span>
      </td>
      
      <td className="cell-description">
        <div className="description-text">
          {rental.description || "No description"}
        </div>
      </td>
      
      <td className="cell-actions">
        <div className="action-buttons">
          {rental.status === "pending" && (
            <>
              <button
                className="action-btn approve"
                onClick={() => handleApproval(rental.rentalId, "approved")}
                disabled={updatingIds.has(`${rental.rentalId}-approved`)}
                title="Approve rental"
              >
                {updatingIds.has(`${rental.rentalId}-approved`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✓</span>
                )}
              </button>
              <button
                className="action-btn reject"
                onClick={() => handleApproval(rental.rentalId, "rejected")}
                disabled={updatingIds.has(`${rental.rentalId}-rejected`)}
                title="Reject rental"
              >
                {updatingIds.has(`${rental.rentalId}-rejected`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✗</span>
                )}
              </button>
            </>
          )}

          {rental.status === "approved" && (
            <>
              <button
                className="action-btn pending"
                onClick={() => handleApproval(rental.rentalId, "pending")}
                disabled={updatingIds.has(`${rental.rentalId}-pending`)}
                title="Move to pending"
              >
                {updatingIds.has(`${rental.rentalId}-pending`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>⏳</span>
                )}
              </button>
              <button
                className="action-btn reject"
                onClick={() => handleApproval(rental.rentalId, "rejected")}
                disabled={updatingIds.has(`${rental.rentalId}-rejected`)}
                title="Reject rental"
              >
                {updatingIds.has(`${rental.rentalId}-rejected`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✗</span>
                )}
              </button>
            </>
          )}

          {rental.status === "rejected" && (
            <>
              <button
                className="action-btn pending"
                onClick={() => handleApproval(rental.rentalId, "pending")}
                disabled={updatingIds.has(`${rental.rentalId}-pending`)}
                title="Move to pending"
              >
                {updatingIds.has(`${rental.rentalId}-pending`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>⏳</span>
                )}
              </button>
              <button
                className="action-btn approve"
                onClick={() => handleApproval(rental.rentalId, "approved")}
                disabled={updatingIds.has(`${rental.rentalId}-approved`)}
                title="Approve rental"
              >
                {updatingIds.has(`${rental.rentalId}-approved`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✓</span>
                )}
              </button>
            </>
          )}

          <button
            className="action-btn view"
            onClick={() => viewRentalDetails(rental)}
            title="View details"
          >
            👁
          </button>

          <button
            className="action-btn delete"
            onClick={() => handleDelete(rental.rentalId)}
            disabled={updatingIds.has(`${rental.rentalId}-deleting`)}
            title="Delete rental"
          >
            {updatingIds.has(`${rental.rentalId}-deleting`) ? (
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
    <div className="rentals-container">
      {/* Header */}
      <div className="header-section">
        <div className="header-top">
          <div className="title-section">
            <h1 className="page-title">Rentals Management</h1>
            <p className="page-subtitle">Manage and oversee all rental registrations and listings</p>
          </div>
          <div className="header-controls">
            <div className="stats-summary">
              <div className="summary-item">
                <span className="summary-label">TOTAL</span>
                <span className="summary-value">{rentals.length}</span>
              </div>
              <div className="summary-item active">
                <span className="summary-label">PENDING</span>
                <span className="summary-value">{statusStats.pending}</span>
              </div>
            </div>
            <button
              className="refresh-btn"
              onClick={() => window.location.reload()}
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
            placeholder="Search rentals by name, brand, location, or description..."
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
        {["all", "pending", "approved", "rejected"].map((status) => (
          <button
            key={status}
            className={`status-tab ${selectedStatus === status ? "active" : ""}`}
            onClick={() => setSelectedStatus(status)}
          >
            <div className="tab-content">
              <span className="tab-icon">
                {status === "all" && "🚁"}
                {status === "pending" && "⏳"}
                {status === "approved" && "✅"}
                {status === "rejected" && "❌"}
              </span>
              <span className="tab-text">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
              <span className="tab-count">{statusStats[status]}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Sort Order Buttons */}
      <div className="sort-order-container">
        <div className="sort-order-buttons">
          <button
            className={`sort-order-btn ${sortMode === "fifo" ? "active" : ""}`}
            onClick={() => setSortMode("fifo")}
          >
            <span className="sort-order-icon">📦</span>
            <span className="sort-order-text">FIFO (Oldest First)</span>
          </button>
          <button
            className={`sort-order-btn ${sortMode === "lifo" ? "active" : ""}`}
            onClick={() => setSortMode("lifo")}
          >
            <span className="sort-order-icon">🔄</span>
            <span className="sort-order-text">LIFO (Latest First)</span>
          </button>
        </div>
      </div>

      {/* Data Table with Horizontal Scroll */}
      <div className={`table-wrapper ${scrolled ? "scrolled" : ""}`}>
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading rentals data...</p>
          </div>
        ) : filteredRentals.length === 0 ? (
          <div className="no-data-message">
            <div className="no-data-icon">📭</div>
            <p>No rentals found</p>
            {searchTerm && <p className="no-data-hint">Try adjusting your search criteria</p>}
            <button className="no-data-action" onClick={() => {setSearchTerm(""); setSelectedStatus("all");}}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="table-scroll-container" ref={tableRef} onScroll={handleTableScroll}>
            <table className="rentals-table">
              <thead>
                <tr>
                  <th className="sticky-col sticky-col-id">
                    <div className="th-content">
                      Rental ID
                    </div>
                  </th>

                  <th className="sticky-col sticky-col-seller-id">
                    <div className="th-content">
                      Seller Details
                    </div>
                  </th>

                  <th onClick={() => handleSort("name")}>
                    <div className="th-content">
                      Rental Details <SortIcon column="name" />
                    </div>
                  </th>
                  <th onClick={() => handleSort("quantity")}>
                    <div className="th-content">
                      Quantity <SortIcon column="quantity" />
                    </div>
                  </th>
                  <th onClick={() => handleSort("pricePerHour")}>
                    <div className="th-content">
                      Price/Hour <SortIcon column="pricePerHour" />
                    </div>
                  </th>
                  <th onClick={() => handleSort("pricePerDay")}>
                    <div className="th-content">
                      Price/Day <SortIcon column="pricePerDay" />
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
                  // Group filtered rentals by seller
                  const sellerGroups = filteredRentals.reduce((acc, rental) => {
                    if (!acc[rental.sellerId]) {
                      acc[rental.sellerId] = [];
                    }
                    acc[rental.sellerId].push(rental);
                    return acc;
                  }, {});

                  // Convert to array and render
                  return Object.entries(sellerGroups).flatMap(([sellerId, sellerRentals]) => {
                    if (sellerRentals.length === 0) return [];

                    const isExpanded = expandedSellers.has(sellerId);
                    const hasMultipleRentals = sellerRentals.length > 1;

                    return [
                      hasMultipleRentals ? (
                        <tr
                          key={`header-${sellerId}`}
                          className="seller-header-row"
                          onClick={() => toggleSeller(sellerId)}
                        >
                          <td colSpan="9" className="seller-header-cell">
                            <div className="seller-header-content">
                              <span className="expand-icon">
                                {isExpanded ? "▼" : "▶"}
                              </span>
                              <span className="seller-id">{sellerId}</span>
                              <span className="rental-count">{sellerRentals.length} rentals</span>
                              <div className="seller-info">
                                {sellerRentals[0].sellerInfo?.email && (
                                  <span className="info-item email">📧 {sellerRentals[0].sellerInfo.email}</span>
                                )}
                                {sellerRentals[0].sellerInfo?.phoneNumber && (
                                  <span className="info-item phone">📱 {sellerRentals[0].sellerInfo.phoneNumber}</span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null,
                      ...(!hasMultipleRentals || isExpanded
                        ? sellerRentals.map((rental) => (
                            <RentalRow
                              key={rental.rentalId}
                              rental={rental}
                              isSubRow={hasMultipleRentals}
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
            <div className="stat-label">Total Rentals</div>
            <div className="stat-value">{rentals.length}</div>
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
            <div className="stat-label">Hourly Value</div>
            <div className="stat-value">
              ₹{rentals.reduce((sum, r) => sum + (r.pricePerHour * r.quantity), 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-label">Total Stock</div>
            <div className="stat-value">
              {rentals.reduce((sum, r) => sum + r.quantity, 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Rental Details Modal */}
      {viewingRental && (
        <div className="rental-modal-overlay" onClick={closeRentalDetails}>
          <div className="rental-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Rental Details</h2>
              <button className="modal-close" onClick={closeRentalDetails}>
                ✕
              </button>
            </div>
            <div className="modal-content">
              <div className="modal-profile">
                {viewingRental.image && (
                  <img
                    src={viewingRental.image}
                    alt={viewingRental.name}
                    className="modal-rental-image"
                  />
                )}
                <div className="modal-name">
                  <h3>{viewingRental.name}</h3>
                  <span className={`modal-status status-${viewingRental.status}`}>
                    {viewingRental.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="modal-details-grid">
                <div className="detail-section">
                  <h4>Rental Information</h4>
                  <div className="detail-row">
                    <span className="detail-label">Rental ID:</span>
                    <span className="detail-value">{viewingRental.rentalId}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Brand:</span>
                    <span className="detail-value">{viewingRental.brand}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Location:</span>
                    <span className="detail-value">{viewingRental.location}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Quantity:</span>
                    <span className="detail-value">{viewingRental.quantity}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Price per Hour:</span>
                    <span className="detail-value">₹{viewingRental.pricePerHour.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Price per Day:</span>
                    <span className="detail-value">₹{viewingRental.pricePerDay.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className={`detail-value status-badge status-${viewingRental.status}`}>
                      {viewingRental.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Description</h4>
                  <div className="detail-row full-width">
                    <span className="detail-value description-full">
                      {viewingRental.description || "No description available"}
                    </span>
                  </div>
                </div>

                {viewingRental.sellerInfo && (
                  <div className="detail-section seller-section">
                    <h4>Seller Information</h4>
                    <div className="detail-row">
                      <span className="detail-label">Seller ID:</span>
                      <span className="detail-value">{viewingRental.sellerId}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Seller Email:</span>
                      <span className="detail-value">{viewingRental.sellerInfo.email}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Seller Phone:</span>
                      <span className="detail-value">{viewingRental.sellerInfo.phoneNumber}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-action-btn" onClick={closeRentalDetails}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Rentals;