import React, { useEffect, useState } from "react";
import "../styles/Drones.css";

const GRAPHQL_URL = "http://127.0.0.1:5001/graphql";

function Drones() {
  const [drones, setDrones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [updatingStatus, setUpdatingStatus] = useState({ id: null, status: null });
  const [searchTerm, setSearchTerm] = useState(""); // New state for search term

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
        setDrones([]);
      } else {
        setDrones(result.data.drones);
      }
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  // Update drone status
  const updateDroneStatus = async (uin, newStatus) => {
    setUpdatingStatus({ id: uin, status: newStatus });

    // Ensure uin is a string and newStatus is properly formatted
    const formattedUin = String(uin);
    const formattedStatus = newStatus.toLowerCase(); // Ensure lowercase

    const mutation = `
      mutation UpdateDroneStatus($uin: String!, $status: String!) {
        updateDroneStatus(uin: $uin, status: $status) {
          uin
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
            uin: formattedUin,
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
        setDrones(prevDrones =>
          prevDrones.map(drone =>
            drone.uin === uin
              ? { ...drone, status: formattedStatus }
              : drone
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
    fetchDrones();
  }, []);

  // Filter drones based on selected status and search term
  const filteredDrones = drones.filter(drone => {
    const matchesStatus = selectedStatus === "all" ||
                         drone.status.toLowerCase() === selectedStatus;

    const matchesSearch = searchTerm === "" ||
                         drone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         drone.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         drone.description.toLowerCase().includes(searchTerm.toLowerCase());

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

  const isUpdating = (uin, status) => {
    return updatingStatus.id === uin && updatingStatus.status === status;
  };

  if (loading) return <div className="loading">Loading drones...</div>;
  if (error) return <div className="error">❌ {error}</div>;

  return (
    <div className="drones-container">
      <h2 className="drones-title">🏛️Drones DashBoard</h2>

      {/* Search Bar */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search drones by name, brand, or description..."
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
            {status === "all" && "📋 All Drones"}
            {status === "approved" && "✅ Approved"}
            {status === "pending" && "⏳ Pending"}
            {status === "rejected" && "❌ Rejected"}
          </button>
        ))}
      </div>

      {filteredDrones.length === 0 ? (
        <p className="no-data">
          {selectedStatus === "all" && searchTerm === ""
            ? "No drones found."
            : searchTerm !== ""
            ? `No drones matching "${searchTerm}" found.`
            : `No ${selectedStatus} drones found.`}
        </p>
      ) : (
        <div className="drones-grid">
          {filteredDrones.map((drone) => (
            <div key={drone.uin} className="drone-card">
              <span className={`status-badge ${statusColor(drone.status)}`}>
                {drone.status.toUpperCase()}
              </span>

              <img
                src={drone.image || "/placeholder-drone.jpg"}
                alt={drone.name}
                className="drone-img"
              />

              <h3>{drone.name}</h3>
              <p className="brand">Brand: {drone.brand}</p>
              <p className="price">₹ {drone.price}</p>
              <p className="desc">{drone.description}</p>

              <div className="status-actions">
                {drone.status === "approved" && (
                  <>
                    <button
                      className="status-btn reject"
                      onClick={() => updateDroneStatus(drone.uin, "rejected")}
                      disabled={isUpdating(drone.uin, "rejected")}
                    >
                      {isUpdating(drone.uin, "rejected") ? "Updating..." : "Reject"}
                    </button>
                    <button
                      className="status-btn pending"
                      onClick={() => updateDroneStatus(drone.uin, "pending")}
                      disabled={isUpdating(drone.uin, "pending")}
                    >
                      {isUpdating(drone.uin, "pending") ? "Updating..." : "Move to Pending"}
                    </button>
                  </>
                )}

                {drone.status === "pending" && (
                  <>
                    <button
                      className="status-btn approve"
                      onClick={() => updateDroneStatus(drone.uin, "approved")}
                      disabled={isUpdating(drone.uin, "approved")}
                    >
                      {isUpdating(drone.uin, "approved") ? "Updating..." : "Approve"}
                    </button>
                    <button
                      className="status-btn reject"
                      onClick={() => updateDroneStatus(drone.uin, "rejected")}
                      disabled={isUpdating(drone.uin, "rejected")}
                    >
                      {isUpdating(drone.uin, "rejected") ? "Updating..." : "Reject"}
                    </button>
                  </>
                )}

                {drone.status === "rejected" && (
                  <>
                    <button
                      className="status-btn pending"
                      onClick={() => updateDroneStatus(drone.uin, "pending")}
                      disabled={isUpdating(drone.uin, "pending")}
                    >
                      {isUpdating(drone.uin, "pending") ? "Updating..." : "Move to Pending"}
                    </button>
                    <button
                      className="status-btn approve"
                      onClick={() => updateDroneStatus(drone.uin, "approved")}
                      disabled={isUpdating(drone.uin, "approved")}
                    >
                      {isUpdating(drone.uin, "approved") ? "Updating..." : "Approve"}
                    </button>
                  </>
                )}
              </div>

              <div className="seller-box">
                <p><strong>Seller ID:</strong> {drone.sellerId}</p>
                <p><strong>Email:</strong> {drone.sellerInfo?.email}</p>
                <p><strong>Phone:</strong> {drone.sellerInfo?.phoneNumber}</p>
              </div>

              <p className="uin">UIN: {drone.uin}</p>
              <p className="drone-id">Drone ID: {drone.droneId}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Drones;