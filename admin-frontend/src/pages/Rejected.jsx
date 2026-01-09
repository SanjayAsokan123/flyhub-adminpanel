import React, { useState, useEffect } from "react";
import "../styles/Rejected.css";

const GRAPHQL_URL = "https://flyhub-webadmin-4.onrender.com/graphql";

function Rejected() {
  const [activeType, setActiveType] = useState("drone");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRejectedItems = async (type) => {
    setLoading(true);
    setError(null);

    let queryName;
    switch (type) {
      case "drone":
        queryName = "drones";
        break;
      case "accessory":
        queryName = "accessories";
        break;
      case "part":
        queryName = "parts";
        break;
      case "service":
        queryName = "services";
        break;
      case "rental":
        queryName = "rentals";
        break;
      default:
        queryName = "drones";
    }

    const queryFields = `
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
      const response = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const result = await response.json();
      console.log("GraphQL response:", result);

      if (result.errors) {
        setError(result.errors[0].message);
        setItems([]);
        return;
      }

      // ✅ Safe check before filtering
      if (result.data && Array.isArray(result.data[queryName])) {
        const rejectedItems = result.data[queryName].filter(
          (item) =>
            item.status &&
            item.status.toLowerCase() === "rejected"
        );
        setItems(rejectedItems);
      } else {
        // No data found
        setItems([]);
      }
    } catch (err) {
      setError("Network error: " + err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRejectedItems(activeType);
  }, [activeType]);

  const handleDelete = async (id) => {
    const mutationMap = {
      drone: "deleteDrone",
      accessory: "deleteAccessory",
      part: "deletePart",
      service: "deleteService",
      rental: "deleteRental",
    };
    const mutationName = mutationMap[activeType];

    const mutation = `
      mutation {
        ${mutationName}(id: "${id}") {
          id
        }
      }
    `;

    try {
      const response = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: mutation }),
      });
      const result = await response.json();
      if (!result.errors) {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  if (loading) return <p>Loading rejected {activeType}s...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;

  return (
    <div className="page">
      <h2>🚫 Rejected Items</h2>

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
        {items.length === 0 && <p>No rejected {activeType}s yet.</p>}
        {items.map((item, index) => (
          <div key={index} className="card">
            {item.image && (
              <img src={item.image} alt={item.name} className="card-image" />
            )}
            <h3>{item.name}</h3>

            {(activeType === "drone" || activeType === "rental") &&
              item.brand && <p><strong>Brand:</strong> {item.brand}</p>}
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
            <p><strong>Status:</strong> ❌ Rejected</p>

            <button className="delete-btn" onClick={() => handleDelete(item.id)}>🗑</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Rejected;