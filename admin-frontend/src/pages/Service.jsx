import React, { useEffect, useState } from "react";
import "../styles/Service.css";

const GRAPHQL_URL = "http://127.0.0.1:5001/graphql";

function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [updatingStatus, setUpdatingStatus] = useState({ id: null, status: null });
  const [searchTerm, setSearchTerm] = useState(""); // New state for search term

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

  // Update service status
  const updateServiceStatus = async (serviceId, newStatus) => {
    setUpdatingStatus({ id: serviceId, status: newStatus });

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
    }

    setUpdatingStatus({ id: null, status: null });
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // Filter services based on selected status and search term
  const filteredServices = services.filter(service => {
    const matchesStatus = selectedStatus === "all" ||
                         service.status.toLowerCase() === selectedStatus;

    const matchesSearch = searchTerm === "" ||
                         service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.specificDrone.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (service.description && service.description.toLowerCase().includes(searchTerm.toLowerCase()));

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

  const isUpdating = (serviceId, status) => {
    return updatingStatus.id === serviceId && updatingStatus.status === status;
  };

  if (loading) return <div className="loading">Loading services...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="service-container">
      <h2>🛠️ Services Dashboard</h2>

      {/* Search Bar */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search services by name, drone, location, or description..."
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
            {status === "all" && "📋 All Services"}
            {status === "approved" && "✅ Approved"}
            {status === "pending" && "⏳ Pending"}
            {status === "rejected" && "❌ Rejected"}
          </button>
        ))}
      </div>

      {filteredServices.length === 0 ? (
        <p className="no-data">
          {selectedStatus === "all" && searchTerm === ""
            ? "No services found."
            : searchTerm !== ""
            ? `No services matching "${searchTerm}" found.`
            : `No ${selectedStatus} services found.`}
        </p>
      ) : (
        <div className="service-grid">
          {filteredServices.map((s) => (
            <div key={s.serviceId} className="service-card">
              {/* Status badge */}
              <span className={`service-status-badge ${statusColor(s.status)}`}>
                {s.status.toUpperCase()}
              </span>

              {/* Image */}
              <img
                src={s.image || "https://via.placeholder.com/300x200?text=No+Image"}
                alt={s.name}
                className="service-img"
              />

              <h3>{s.name}</h3>
              <p className="specific-drone"><strong>Specific Drone:</strong> {s.specificDrone}</p>
              <p className="experience"><strong>Experience:</strong> {s.experience} years</p>
              <p className="location"><strong>Location:</strong> {s.location}</p>
              <p className="price"><strong>Price:</strong> ₹{s.price}</p>

              {s.description && (
                <p className="desc"><strong>Description:</strong> {s.description}</p>
              )}

              <div className="status-actions">
                {s.status === "approved" && (
                  <>
                    <button
                      className="status-btn reject"
                      onClick={() => updateServiceStatus(s.serviceId, "rejected")}
                      disabled={isUpdating(s.serviceId, "rejected")}
                    >
                      {isUpdating(s.serviceId, "rejected") ? "Updating..." : "Reject"}
                    </button>
                    <button
                      className="status-btn pending"
                      onClick={() => updateServiceStatus(s.serviceId, "pending")}
                      disabled={isUpdating(s.serviceId, "pending")}
                    >
                      {isUpdating(s.serviceId, "pending") ? "Updating..." : "Move to Pending"}
                    </button>
                  </>
                )}

                {s.status === "pending" && (
                  <>
                    <button
                      className="status-btn approve"
                      onClick={() => updateServiceStatus(s.serviceId, "approved")}
                      disabled={isUpdating(s.serviceId, "approved")}
                    >
                      {isUpdating(s.serviceId, "approved") ? "Updating..." : "Approve"}
                    </button>
                    <button
                      className="status-btn reject"
                      onClick={() => updateServiceStatus(s.serviceId, "rejected")}
                      disabled={isUpdating(s.serviceId, "rejected")}
                    >
                      {isUpdating(s.serviceId, "rejected") ? "Updating..." : "Reject"}
                    </button>
                  </>
                )}

                {s.status === "rejected" && (
                  <>
                    <button
                      className="status-btn pending"
                      onClick={() => updateServiceStatus(s.serviceId, "pending")}
                      disabled={isUpdating(s.serviceId, "pending")}
                    >
                      {isUpdating(s.serviceId, "pending") ? "Updating..." : "Move to Pending"}
                    </button>
                    <button
                      className="status-btn approve"
                      onClick={() => updateServiceStatus(s.serviceId, "approved")}
                      disabled={isUpdating(s.serviceId, "approved")}
                    >
                      {isUpdating(s.serviceId, "approved") ? "Updating..." : "Approve"}
                    </button>
                  </>
                )}
              </div>

              <div className="seller-box">
                <h4>Seller Info</h4>
                {s.sellerInfo ? (
                  <>
                    <p><strong>Seller ID:</strong> {s.sellerId}</p>
                    <p><strong>Email:</strong> {s.sellerInfo.email}</p>
                    <p><strong>Phone:</strong> {s.sellerInfo.phoneNumber}</p>
                  </>
                ) : (
                  <p className="no-seller">Seller not found</p>
                )}
              </div>

              <div className="meta-box">
                <h4>Meta</h4>
                <p className="service-id"><strong>Service ID:</strong> {s.serviceId}</p>
                <p><strong>Created:</strong> {new Date(s.createdAt).toLocaleString()}</p>
                <p><strong>Updated:</strong> {new Date(s.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Services;