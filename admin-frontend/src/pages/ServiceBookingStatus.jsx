import React, { useState } from "react";
import { gql, useQuery } from "@apollo/client";
import "../styles/ServiceBookingStatus.css";

// ---------------------------------------------------------
// GRAPHQL QUERY (in same file)
// ---------------------------------------------------------
const GET_ALL_CONTACTS = gql`
  query GetAllContacts($page: Int, $limit: Int, $sortBy: String) {
    getAllContacts(page: $page, limit: $limit, sortBy: $sortBy) {
      pages
      data {
        name
        email
        phone
        location
        status
        date
        sellerId
      }
    }
  }
`;

// ---------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------
export default function ServiceBookingStatus() {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("-date");
  const [page, setPage] = useState(1);
  const limit = 6;

  // Fetch backend data
  const { data, loading, error } = useQuery(GET_ALL_CONTACTS, {
    variables: { page, limit, sortBy: sortKey },
    fetchPolicy: "network-only",
  });

  if (loading) return <p className="buyer-loading">Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  const bookings = data?.getAllContacts?.data || [];
  const totalPages = data?.getAllContacts?.pages || 1;

  // Local Search
  const processed = bookings.filter((b) => {
    const q = query.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.email.toLowerCase().includes(q) ||
      (b.phone || "").toLowerCase().includes(q) ||
      b.location.toLowerCase().includes(q) ||
      b.status.toLowerCase().includes(q) ||
      (b.sellerId || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="sold-root">

      {/* HEADER */}
      <header className="sold-header">
        <div>
          <h1 className="sold-title">Service Bookings</h1>
          <p className="sold-sub">Live Data from Backend</p>
        </div>

        <div className="sold-actions">
          <input
            className="sold-search"
            placeholder="Search name, phone, email, sellerId..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <select
            className="sold-sort"
            value={sortKey}
            onChange={(e) => {
              setSortKey(e.target.value);
              setPage(1);
            }}
          >
            <option value="-date">Newest First</option>
            <option value="date">Oldest First</option>
            <option value="name">Name A-Z</option>
            <option value="-name">Name Z-A</option>
          </select>
        </div>
      </header>

      {/* TABLE VIEW */}
      <div className="table-container">
        {processed.length > 0 ? (
          <table className="custom-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Location</th>
                <th>Status</th>
                <th>Date</th>
                <th>Seller ID</th>
              </tr>
            </thead>

            <tbody>
              {processed.map((b, index) => (
                <tr key={b.id}>
                  <td>{index + 1}</td>
                  <td>{b.name}</td>
                  <td>{b.email}</td>
                  <td>{b.location}</td>
                  <td>{b.status}</td>
                  <td>{new Date(b.date).toLocaleDateString()}</td>
                  <td>{b.sellerId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No results found.</p>
        )}
      </div>

      {/* PAGINATION */}
      <div className="sold-pagination">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>

        <span>
          Page {page} of {totalPages}
        </span>

        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}