
import React, { useState, useEffect } from "react";
import "../styles/Approve.css";

const GRAPHQL_URL = "http://127.0.0.1:5001/graphql";

function Approved() {
  const [activeType, setActiveType] = useState("drone");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Map of id fields for each type
  const idFieldMap = {
    drone: "droneId",
    accessory: "accessoryId",
    part: "partId",
    service: "serviceId",
    rental: "rentalId",
  };

  // Fetch approved items
  const fetchApprovedItems = async (type) => {
    setLoading(true);
    setError(null);

    const queryNameMap = {
      drone: "drones",
      accessory: "accessories",
      part: "parts",
      service: "services",
      rental: "rentals",
    };
    const queryName = queryNameMap[type];
    const idField = idFieldMap[type];

    const queryFields = `
      ${idField}
      name
      ${type === "drone" || type === "rental" ? "brand" : ""}
      ${type === "drone" ? "uin" : ""}
      ${type === "rental" ? "location pricePerHour pricePerDay" : ""}
      ${type === "service" ? "specificDrone experience location price" : ""}
      ${type !== "rental" && type !== "service" ? "price" : ""}
      description
      image
      status
    `;

    const query = `
      query {
        ${queryName} {
          ${queryFields}
        }
      }
    `;

    try {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const result = await res.json();

      if (result.errors) {
        setError(result.errors[0].message);
        setItems([]);
        return;
      }

      const approvedItems = result.data[queryName].filter(
        (item) => item.status && item.status.toLowerCase() === "approved"
      );
      setItems(approvedItems);
    } catch (err) {
      setError("Network error: " + err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovedItems(activeType);
  }, [activeType]);

  // Delete approved item
  const handleDelete = async (item) => {
    const mutationMap = {
      drone: { name: "deleteDrone", idField: "droneId" },
      accessory: { name: "deleteAccessory", idField: "accessoryId" },
      part: { name: "deletePart", idField: "partId" },
      service: { name: "deleteService", idField: "serviceId" },
      rental: { name: "deleteRental", idField: "rentalId" },
    };

    const { name: mutationName, idField } = mutationMap[activeType];

    const mutation = `
      mutation {
        ${mutationName}(${idField}: "${item[idField]}") {
          ${idField}
        }
      }
    `;

    try {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: mutation }),
      });
      const result = await res.json();
      if (!result.errors) {
        setItems((prev) => prev.filter((i) => i[idField] !== item[idField]));
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  if (loading) return <p>Loading approved {activeType}s...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;

  return (
    <div className="page">
      <h2>✅ Approved Items</h2>

      <div className="type-buttons">
        {["drone", "part", "accessory", "service", "rental"].map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={activeType === type ? "active" : ""}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}s
          </button>
        ))}
      </div>

      <div className="cards-container">
        {items.length === 0 && <p>No approved {activeType}s yet.</p>}
        {items.map((item) => {
          const idField = idFieldMap[activeType]; // ✅ define idField here for JSX
          return (
            <div key={item[idField]} className="card">
              {item.image && (
                <img src={item.image} alt={item.name} className="card-image" />
              )}
              <h3>{item.name}</h3>

              {(activeType === "drone" || activeType === "rental") && item.brand && (
                <p><strong>Brand:</strong> {item.brand}</p>
              )}
              {activeType === "drone" && item.uin && (
                <p><strong>UIN:</strong> {item.uin}</p>
              )}

              {activeType === "service" && (
                <>
                  <p><strong>Specific Drone:</strong> {item.specificDrone}</p>
                  <p><strong>Experience:</strong> {item.experience} years</p>
                  <p><strong>Location:</strong> {item.location}</p>
                  <p><strong>Price:</strong> ₹{item.price}</p>
                </>
              )}

              {activeType === "rental" && (
                <>
                  <p><strong>Location:</strong> {item.location}</p>
                  <p>
                    <strong>Price:</strong> ₹{item.pricePerHour}/hr • ₹{item.pricePerDay}/day
                  </p>
                </>
              )}

              {item.description && (
                <p><strong>Description:</strong> {item.description}</p>
              )}

              <p><strong>Status:</strong> ✅ Approved</p>

              <button
                className="delete-btn"
                onClick={() => handleDelete(item)}
              >
                🗑 Delete
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Approved;
