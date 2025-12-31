import React, { useEffect, useState } from "react";
import { gql, useQuery } from "@apollo/client";
import "../styles/DroneBookingStatus.css";

// Updated GraphQL Query (removed drone model)
const GET_DRONE_BOOKINGS = gql`
  query {
    getAllDroneRentals {
      drone_rental_id
      name
      phone
      location
      rentalId
      rentalDate
      sellerId
      status
      createdAt
    }
  }
`;

function DroneBookingStatus() {
  const { data, loading, error, refetch } = useQuery(GET_DRONE_BOOKINGS);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    if (data && data.getAllDroneRentals) {
      const filtered = data.getAllDroneRentals.filter(
        (b) => b.status?.toLowerCase() !== "cancelled"
      );
      setBookings(filtered);
    }
  }, [data]);

  // Parse timestamp OR ISO formats
  const parseDate = (value) => {
    if (!value) return null;

    if (!isNaN(value)) {
      if (value.toString().length === 10) {
        return new Date(value * 1000);
      }
      return new Date(Number(value));
    }

    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatFullDate = (dateValue) => {
    const date = parseDate(dateValue);
    if (!date) return "Invalid Date";

    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) return <div className="dbs-loading">Loading drone bookings...</div>;
  if (error) return <div className="dbs-error">Error: {error.message}</div>;

  return (
    <div className="dbs-root">
      <div className="dbs-header">
        <h1 className="dbs-title">📡 Drone Booking Status</h1>
        <button className="dbs-btn" onClick={() => refetch()}>
          Refresh
        </button>
      </div>

      <div className="dbs-table-wrap">
        <table className="dbs-table">
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Location</th>
              <th>Rental ID</th>
              <th>Rental Date</th>
              <th>Seller ID</th>
              <th>Status</th>
              <th>Booked At</th>
            </tr>
          </thead>

          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan="9" className="dbs-empty">No bookings found.</td>
              </tr>
            ) : (
              bookings.map((b) => (
                <tr key={b.drone_rental_id}>
                  <td>{b.drone_rental_id}</td>
                  <td>{b.name}</td>
                  <td>{b.phone}</td>
                  <td>{b.location}</td>
                  <td>{b.rentalId || "—"}</td>
                  <td>{formatFullDate(b.rentalDate)}</td>
                  <td>{b.sellerId || "—"}</td>

                  <td>
                    <span
                      className={`dbs-badge ${
                        b.status === "pending"
                          ? "dbs-pending"
                          : b.status === "confirmed"
                          ? "dbs-confirmed"
                          : "dbs-other"
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>

                  <td>{formatFullDate(b.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DroneBookingStatus;
