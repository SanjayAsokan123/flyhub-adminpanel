import React, { useEffect, useState, useCallback } from "react";
import "../styles/PilotRentalForm.css";

const GRAPHQL_URL = "http://192.168.1.110:5001/graphql";

export default function PilotRentalForm() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Convert timestamp to Indian Date Format
  const formatDate = (timestamp) => {
    if (!timestamp) return "—";

    const date = new Date(Number(timestamp));
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
      query GetAllPilotRentals {
        getAllPilotRentals {
          pilot_booking_id
          BuyerName
          BuyerEmail
          BuyerPhoneNumber
          BuyerLocation
          BuyerStartDate
          BuyerBookingStatus
          pilot {
            pilotId
            pilotName
            phoneNumber
            email
            pilotCompany
            sellerId
          }
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

      if (result.errors && result.errors.length) {
        throw new Error(result.errors.map((e) => e.message).join(" | "));
      }

      const data = result?.data?.getAllPilotRentals || [];
      setRentals(data);
    } catch (err) {
      console.error("Error fetching pilot rentals:", err);
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
    <div className="pilot-form-container">
      <div className="header-row">
        <h2 className="form-title">Pilot Rental Records</h2>
        <div className="controls">
          <button className="refresh-btn" onClick={fetchRentals} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        {loading && !rentals.length ? (
          <p className="loading-text">Loading pilot rental records...</p>
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
                <th>Booking ID</th>
                <th>Buyer Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Location</th>
                <th>Start Date</th>
                <th>Status</th>
                <th>Pilot ID</th>
                <th>Seller ID</th>
                <th>Pilot Name</th>
                <th>Pilot Phone</th>
                <th>Pilot Email</th>
                <th>Pilot Company</th>
              </tr>
            </thead>

            <tbody>
              {rentals.filter(r => r?.pilot_booking_id).length > 0 ? (
                rentals
                  .filter(r => r?.pilot_booking_id)
                  .map((rental, index) => (
                    <tr key={rental.pilot_booking_id || index}>
                      <td>{rental.pilot_booking_id}</td>
                      <td>{rental.BuyerName || ""}</td>
                      <td>{rental.BuyerEmail || ""}</td>
                      <td>{rental.BuyerPhoneNumber || ""}</td>
                      <td>{rental.BuyerLocation || ""}</td>
                      <td>{formatDate(rental.BuyerStartDate)}</td>
                      <td>{rental.BuyerBookingStatus || ""}</td>

                      <td>{rental?.pilot?.pilotId || ""}</td>
                      <td>{rental?.pilot?.sellerId || ""}</td>
                      <td>{rental?.pilot?.pilotName || ""}</td>
                      <td>{rental?.pilot?.phoneNumber || ""}</td>
                      <td>{rental?.pilot?.email || ""}</td>
                      <td>{rental?.pilot?.pilotCompany || ""}</td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan="12" className="no-data">
                    No pilot rental records found.
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
