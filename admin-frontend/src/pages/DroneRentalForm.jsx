import React, { useEffect, useState, useCallback } from "react";
import "../styles/DroneRentalForm.css";

const GRAPHQL_URL = "https://flyhub-webadmin-4.onrender.com/graphql";

export default function DroneRentalForm() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Convert timestamp to Indian Date Format
  const formatDate = (timestamp) => {
    if (!timestamp) return "—";

    const date = new Date(Number(timestamp)); // Convert string → number → Date
    if (isNaN(date)) return "Invalid Date";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const fetchRentals = useCallback(async () => {
    setLoading(true);
    setError(null);

    const query = `
      query GetAllDroneRentals {
        getAllDroneRentals {
          drone_rental_id
          name
          phone
          location
          rentalDate
          rentalId
          sellerEmail
          sellerPhone
        }
      }
    `;

    try {
      const response = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status} - ${text}`);
      }

      const result = await response.json();

      // GraphQL errors handling
      if (result.errors && result.errors.length) {
        throw new Error(result.errors.map((e) => e.message).join(" | "));
      }

      const data = result?.data?.getAllDroneRentals || [];
      setRentals(data);
    } catch (err) {
      console.error("Error fetching rentals:", err);
      setError(err.message ?? String(err));
      setRentals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);

  return (
    <div className="drone-form-container">
      <div className="header-row">
        <h2 className="form-title">Drone Rental Records</h2>
        <div className="controls">
          <button className="refresh-btn" onClick={fetchRentals} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        {loading && !rentals.length ? (
          <p className="loading-text">Loading rental records...</p>
        ) : error ? (
          <div className="error-box">
            <strong>Error:</strong> {error}
            <div>
              <button className="retry-btn" onClick={fetchRentals}>Retry</button>
            </div>
          </div>
        ) : (
          <table className="rental-table">
            <thead>
              <tr>
                <th>Rental ID</th>
                <th>Customer Name</th>
                <th>Phone</th>
                <th>Location</th>
                <th>Rental Date</th>
                <th>Listing ID</th>
                <th>Seller Email</th>
                <th>Seller Phone</th>
              </tr>
            </thead>

            <tbody>
              {rentals.length > 0 ? (
                rentals.map((rental, index) => (
                  <tr key={rental.drone_rental_id || index}>
                    <td>{rental.drone_rental_id || "—"}</td>
                    <td>{rental.name || "—"}</td>
                    <td>{rental.phone || "—"}</td>
                    <td>{rental.location || "—"}</td>

                    {/* ✅ Formatted Indian date */}
                    <td>{formatDate(rental.rentalDate)}</td>

                    <td>{rental.rentalId || "—"}</td>
                    <td>{rental.sellerEmail || "—"}</td>
                    <td>{rental.sellerPhone || "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="no-data">
                    No rental records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}