import React, { useState, useEffect } from "react";
import "../styles/Approve.css"; // Create similar CSS as Rejected.css

const GRAPHQL_URL = "http://127.0.0.1:5001/graphql";

function Approval() {
  const [activeType, setActiveType] = useState("drone"); // drone / accessory / part
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch pending items
  const fetchPendingItems = async (type) => {
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
      default:
        queryName = "drones";
    }

    const queryFields = `
      id
      name
      brand
      ${type === "drone" ? "uin" : ""}
      price
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
      if (result.errors) {
        setError(result.errors[0].message);
      } else {
        const pendingItems = result.data[queryName].filter(
          (item) => item.status.toLowerCase() === "pending"
        );
        setItems(pendingItems);
      }
    } catch (err) {
      setError("Network error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingItems(activeType);
  }, [activeType]);

  // Approve item
  const handleApprove = async (id) => {
    const mutationName =
      activeType === "drone"
        ? "approveDrone"
        : activeType === "accessory"
        ? "approveAccessory"
        : "approvePart";

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
      console.error("Approve error:", err);
    }
  };

  // Reject item
  const handleReject = async (id) => {
    const reason = window.prompt("Enter rejection reason (optional):");
    const mutationName =
      activeType === "drone"
        ? "rejectDrone"
        : activeType === "accessory"
        ? "rejectAccessory"
        : "rejectPart";

    const mutation = `
      mutation {
        ${mutationName}(id: "${id}", reason: "${reason || ""}") {
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
      console.error("Reject error:", err);
    }
  };

  if (loading) return <p>Loading pending {activeType}s...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;

  return (
    <div className="approve">
      <h2>⏳ Pending Approvals</h2>

      <div className="type-buttons">
        <button
          onClick={() => setActiveType("drone")}
          className={activeType === "drone" ? "active" : ""}
        >
          Drones
        </button>
        <button
          onClick={() => setActiveType("part")}
          className={activeType === "part" ? "active" : ""}
        >
          Parts
        </button>
        <button
          onClick={() => setActiveType("accessory")}
          className={activeType === "accessory" ? "active" : ""}
        >
          Accessories
        </button>
      </div>

      <div className="cards-container">
        {items.length === 0 && <p>No pending {activeType}s yet.</p>}
        {items.map((item) => (
          <div key={item.id} className="card">
            <img src={item.image} alt={item.name} className="card-image" />
            <h3>{item.name}</h3>
            <p>
              <strong>Brand:</strong> {item.brand}
            </p>
            {activeType === "drone" && item?.uin && (
              <p>
                <strong>UIN:</strong> {item.uin}
              </p>
            )}
            <p>
              <strong>Price:</strong> ${item.price}
            </p>
            <p>
              <strong>Description:</strong> {item.description}
            </p>
            <p>
              <strong>Status:</strong> ⏳ Pending
            </p>
            <div className="action-buttons">
              <button className="approve-btn" onClick={() => handleApprove(item.id)}>
                ✓ Approve
              </button>
              <button className="reject-btn" onClick={() => handleReject(item.id)}>
                ✗ Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Approval;
