import React, { useEffect, useState, useRef } from "react";
import "../styles/Service.css";

const GRAPHQL_URL = "http://localhost:5001/graphql";

function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [updatingIds, setUpdatingIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
  const [expandedSellers, setExpandedSellers] = useState(new Set());
  const tableRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [viewingService, setViewingService] = useState(null);
  const [sortOrder, setSortOrder] = useState("lifo");

  const fetchServices = async () => {
    setLoading(true);
    setError(null);

    const query = `
      query {
        services {
          serviceId
          name
          specificDrone
          experience
          location
          description
          price
          image
          status
          sellerId
          sellerInfo {
            email
            phoneNumber
          }
          createdAt
          updatedAt
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
        setServices([]);
      } else {
        setServices(result.data.services || []);
      }
    } catch (err) {
      setError(err.message);
      setServices([]);
    }

    setLoading(false);
  };

  // Delete service
  const deleteService = async (serviceId) => {
    if (!window.confirm("Are you sure you want to delete this service?")) return;

    const updatingIdsCopy = new Set(updatingIds);
    updatingIdsCopy.add(`${serviceId}-deleting`);
    setUpdatingIds(updatingIdsCopy);

    const mutation = `
      mutation DeleteService($serviceId: String!) {
        deleteService(serviceId: $serviceId) {
          serviceId
        }
      }
    `;

    try {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: mutation,
          variables: { serviceId: String(serviceId) },
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const result = await res.json();

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      // Remove from UI immediately
      setServices((prev) => prev.filter((s) => s.serviceId !== serviceId));
    } catch (err) {
      setError(err.message);
    } finally {
      const updatingIdsCopy = new Set(updatingIds);
      updatingIdsCopy.delete(`${serviceId}-deleting`);
      setUpdatingIds(updatingIdsCopy);
    }
  };

  // Update service status
  const updateServiceStatus = async (serviceId, newStatus) => {
    const updatingIdsCopy = new Set(updatingIds);
    updatingIdsCopy.add(`${serviceId}-${newStatus}`);
    setUpdatingIds(updatingIdsCopy);

    const formattedServiceId = String(serviceId);
    const formattedStatus = newStatus.toLowerCase();

    const mutation = `
      mutation UpdateServiceStatus($serviceId: String!, $status: String!) {
        updateServiceStatus(serviceId: $serviceId, status: $status) {
          serviceId
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
            serviceId: formattedServiceId,
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
        setServices(prevServices =>
          prevServices.map(service =>
            service.serviceId === serviceId
              ? { ...service, status: formattedStatus }
              : service
          )
        );
      }
    } catch (err) {
      console.error("Update Error:", err);
      setError(err.message);
    } finally {
      const updatingIdsCopy = new Set(updatingIds);
      updatingIdsCopy.delete(`${serviceId}-${newStatus}`);
      setUpdatingIds(updatingIdsCopy);
    }
  };

  // View service details
  const viewServiceDetails = (service) => {
    setViewingService(service);
  };

  // Close service details modal
  const closeServiceDetails = () => {
    setViewingService(null);
  };

  // Handle scroll to show shadow on sticky columns
  const handleTableScroll = (e) => {
    const isScrolled = e.target.scrollLeft > 0;
    setScrolled(isScrolled);
  };

  useEffect(() => {
    fetchServices();
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

  // Filter and sort services
  const filteredServices = services
    .filter(service => {
      const matchesStatus = selectedStatus === "all" || service.status.toLowerCase() === selectedStatus;
      const matchesSearch =
        searchTerm === "" ||
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.specificDrone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (service.description && service.description.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      if (sortOrder === "lifo") {
        // LIFO (Last In, First Out) - reverse order by serviceId
        return b.serviceId.localeCompare(a.serviceId);
      } else {
        // FIFO (First In, First Out) - normal order by serviceId
        return a.serviceId.localeCompare(b.serviceId);
      }
    });

  const statusStats = {
    all: services.length,
    approved: services.filter(s => s.status === "approved").length,
    pending: services.filter(s => s.status === "pending").length,
    rejected: services.filter(s => s.status === "rejected").length,
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

  const ServiceRow = ({ service, isSubRow = false }) => (
    <tr key={service.serviceId} className={`service-row ${isSubRow ? 'sub-row' : ''}`}>
      <td className="sticky-col sticky-col-id">
        <div className="service-id-cell">
          <div className="id-badge">{service.serviceId}</div>
        </div>
      </td>

      <td className="sticky-col sticky-col-seller-id">
        <div className="seller-id-cell">
          <div className="id-badge seller">{service.sellerId}</div>
          {service.sellerInfo && (
            <div className="seller-quick-info">
              <span className="seller-email">{service.sellerInfo.email}</span>
            </div>
          )}
        </div>
      </td>

      <td className="cell-name">
        <div className="name-cell">
          {service.image && (
            <img
              src={service.image}
              alt={service.name}
              className="service-thumbnail"
            />
          )}
          <div className="name-info">
            <strong>{service.name}</strong>
            <div className="service-details">
              <span className="drone">{service.specificDrone}</span>
              <span className="location">{service.location}</span>
            </div>
          </div>
        </div>
      </td>
      
      <td className="cell-experience">
        <div className="experience-badge">
          <span className="exp-icon">📊</span>
          {service.experience} years
        </div>
      </td>
      
      <td className="cell-price">
        <div className="price-badge">
          <span className="price-icon">₹</span>
          {service.price.toLocaleString('en-IN')}
        </div>
      </td>
      
      <td className="cell-status">
        <span className={`status-badge status-${service.status}`}>
          {service.status.toUpperCase()}
        </span>
      </td>
      
      <td className="cell-description">
        <div className="description-text">
          {service.description || "No description"}
        </div>
      </td>
      
      <td className="cell-actions">
        <div className="action-buttons">
          {service.status === "pending" && (
            <>
              <button
                className="action-btn approve"
                onClick={() => updateServiceStatus(service.serviceId, "approved")}
                disabled={updatingIds.has(`${service.serviceId}-approved`)}
                title="Approve service"
              >
                {updatingIds.has(`${service.serviceId}-approved`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✓</span>
                )}
              </button>
              <button
                className="action-btn reject"
                onClick={() => updateServiceStatus(service.serviceId, "rejected")}
                disabled={updatingIds.has(`${service.serviceId}-rejected`)}
                title="Reject service"
              >
                {updatingIds.has(`${service.serviceId}-rejected`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✗</span>
                )}
              </button>
            </>
          )}

          {service.status === "approved" && (
            <>
              <button
                className="action-btn pending"
                onClick={() => updateServiceStatus(service.serviceId, "pending")}
                disabled={updatingIds.has(`${service.serviceId}-pending`)}
                title="Move to pending"
              >
                {updatingIds.has(`${service.serviceId}-pending`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>⏳</span>
                )}
              </button>
              <button
                className="action-btn reject"
                onClick={() => updateServiceStatus(service.serviceId, "rejected")}
                disabled={updatingIds.has(`${service.serviceId}-rejected`)}
                title="Reject service"
              >
                {updatingIds.has(`${service.serviceId}-rejected`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✗</span>
                )}
              </button>
            </>
          )}

          {service.status === "rejected" && (
            <>
              <button
                className="action-btn pending"
                onClick={() => updateServiceStatus(service.serviceId, "pending")}
                disabled={updatingIds.has(`${service.serviceId}-pending`)}
                title="Move to pending"
              >
                {updatingIds.has(`${service.serviceId}-pending`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>⏳</span>
                )}
              </button>
              <button
                className="action-btn approve"
                onClick={() => updateServiceStatus(service.serviceId, "approved")}
                disabled={updatingIds.has(`${service.serviceId}-approved`)}
                title="Approve service"
              >
                {updatingIds.has(`${service.serviceId}-approved`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✓</span>
                )}
              </button>
            </>
          )}

          <button
            className="action-btn view"
            onClick={() => viewServiceDetails(service)}
            title="View details"
          >
            👁
          </button>

          <button
            className="action-btn delete"
            onClick={() => deleteService(service.serviceId)}
            disabled={updatingIds.has(`${service.serviceId}-deleting`)}
            title="Delete service"
          >
            {updatingIds.has(`${service.serviceId}-deleting`) ? (
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
    <div className="services-container">
      {/* Header */}
      <div className="header-section">
        <div className="header-top">
          <div className="title-section">
            <h1 className="page-title">Services Management</h1>
            <p className="page-subtitle">Manage and oversee all service registrations and listings</p>
          </div>
          <div className="header-controls">
            <div className="stats-summary">
              <div className="summary-item">
                <span className="summary-label">TOTAL</span>
                <span className="summary-value">{services.length}</span>
              </div>
              <div className="summary-item active">
                <span className="summary-label">APPROVED</span>
                <span className="summary-value">{statusStats.approved}</span>
              </div>
            </div>
            <button
              className="refresh-btn"
              onClick={fetchServices}
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
            placeholder="Search services by name, drone, location, or description..."
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
                {status === "all" && "🛠"}
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

      {/* Sort Order Buttons */}
      <div className="sort-order-container">
        <div className="sort-order-buttons">
          <button
            className={`sort-order-btn ${sortOrder === "lifo" ? "active" : ""}`}
            onClick={() => setSortOrder("lifo")}
          >
            <span className="sort-order-icon">📥</span>
            <span className="sort-order-text">LIFO (Latest First)</span>
          </button>
          <button
            className={`sort-order-btn ${sortOrder === "fifo" ? "active" : ""}`}
            onClick={() => setSortOrder("fifo")}
          >
            <span className="sort-order-icon">📤</span>
            <span className="sort-order-text">FIFO (Oldest First)</span>
          </button>
        </div>
      </div>

      {/* Data Table with Horizontal Scroll */}
      <div className={`table-wrapper ${scrolled ? "scrolled" : ""}`}>
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading services data...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="no-data-message">
            <div className="no-data-icon">📭</div>
            <p>No services found</p>
            {searchTerm && <p className="no-data-hint">Try adjusting your search criteria</p>}
            <button className="no-data-action" onClick={() => {setSearchTerm(""); setSelectedStatus("all");}}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="table-scroll-container" ref={tableRef} onScroll={handleTableScroll}>
            <table className="services-table">
              <thead>
                <tr>
                  <th className="sticky-col sticky-col-id">
                    <div className="th-content">
                      Service ID
                    </div>
                  </th>

                  <th className="sticky-col sticky-col-seller-id">
                    <div className="th-content">
                      Seller Details
                    </div>
                  </th>

                  <th onClick={() => handleSort("name")}>
                    <div className="th-content">
                      Service Details <SortIcon column="name" />
                    </div>
                  </th>
                  <th onClick={() => handleSort("experience")}>
                    <div className="th-content">
                      Experience <SortIcon column="experience" />
                    </div>
                  </th>
                  <th onClick={() => handleSort("price")}>
                    <div className="th-content">
                      Price <SortIcon column="price" />
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
                  // Group filtered services by seller
                  const sellerGroups = filteredServices.reduce((acc, service) => {
                    if (!acc[service.sellerId]) {
                      acc[service.sellerId] = [];
                    }
                    acc[service.sellerId].push(service);
                    return acc;
                  }, {});

                  // Convert to array and render
                  return Object.entries(sellerGroups).flatMap(([sellerId, sellerServices]) => {
                    if (sellerServices.length === 0) return [];

                    const isExpanded = expandedSellers.has(sellerId);
                    const hasMultipleServices = sellerServices.length > 1;

                    return [
                      hasMultipleServices ? (
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
                              <span className="service-count">{sellerServices.length} services</span>
                              <div className="seller-info">
                                {sellerServices[0].sellerInfo?.email && (
                                  <span className="info-item email">📧 {sellerServices[0].sellerInfo.email}</span>
                                )}
                                {sellerServices[0].sellerInfo?.phoneNumber && (
                                  <span className="info-item phone">📱 {sellerServices[0].sellerInfo.phoneNumber}</span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null,
                      ...(!hasMultipleServices || isExpanded
                        ? sellerServices.map((service) => (
                            <ServiceRow
                              key={service.serviceId}
                              service={service}
                              isSubRow={hasMultipleServices}
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
          <div className="stat-icon">🛠</div>
          <div className="stat-content">
            <div className="stat-label">Total Services</div>
            <div className="stat-value">{services.length}</div>
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
              ₹{services.reduce((sum, s) => sum + s.price, 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-label">Avg Experience</div>
            <div className="stat-value">
              {services.length > 0 
                ? (services.reduce((sum, s) => sum + s.experience, 0) / services.length).toFixed(1) + " yrs"
                : "0 yrs"}
            </div>
          </div>
        </div>
      </div>

      {/* Service Details Modal */}
      {viewingService && (
        <div className="service-modal-overlay" onClick={closeServiceDetails}>
          <div className="service-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Service Details</h2>
              <button className="modal-close" onClick={closeServiceDetails}>
                ✕
              </button>
            </div>
            <div className="modal-content">
              <div className="modal-profile">
                {viewingService.image && (
                  <img
                    src={viewingService.image}
                    alt={viewingService.name}
                    className="modal-service-image"
                  />
                )}
                <div className="modal-name">
                  <h3>{viewingService.name}</h3>
                  <span className={`modal-status status-${viewingService.status}`}>
                    {viewingService.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="modal-details-grid">
                <div className="detail-section">
                  <h4>Service Information</h4>
                  <div className="detail-row">
                    <span className="detail-label">Service ID:</span>
                    <span className="detail-value">{viewingService.serviceId}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Specific Drone:</span>
                    <span className="detail-value">{viewingService.specificDrone}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Experience:</span>
                    <span className="detail-value">{viewingService.experience} years</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Location:</span>
                    <span className="detail-value">{viewingService.location}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Price:</span>
                    <span className="detail-value">₹{viewingService.price.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className={`detail-value status-badge status-${viewingService.status}`}>
                      {viewingService.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Description</h4>
                  <div className="detail-row full-width">
                    <span className="detail-value description-full">
                      {viewingService.description || "No description available"}
                    </span>
                  </div>
                </div>

                {viewingService.sellerInfo && (
                  <div className="detail-section seller-section">
                    <h4>Seller Information</h4>
                    <div className="detail-row">
                      <span className="detail-label">Seller ID:</span>
                      <span className="detail-value">{viewingService.sellerId}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Seller Email:</span>
                      <span className="detail-value">{viewingService.sellerInfo.email}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Seller Phone:</span>
                      <span className="detail-value">{viewingService.sellerInfo.phoneNumber}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-action-btn" onClick={closeServiceDetails}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Services;