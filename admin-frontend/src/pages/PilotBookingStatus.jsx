import React, { useEffect, useState } from "react";
import "../styles/PilotBookingStatus.css";

const GRAPHQL_URL = "https://flyhub-webadmin-4.onrender.com/graphql";

export default function PilotRentalBookings() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("newest");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  // ----------------------------------------------------------
  // 🔥 Fetch Pilot Bookings
  // ----------------------------------------------------------
  const fetchRentals = async () => {
    setLoading(true);
    setError(null);

    const gql = `
      query {
        getAllPilotBookings {
          id
          bookingId
          pilotId
          pilotName
          pilotCompany
          buyerId
          buyerName
          buyerEmail
          contact
          location
          date
          startTime
          endTime
          status
          createdAt
          updatedAt
        }
      }
    `;

    try {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: gql }),
      });

      const json = await res.json();

      if (json.errors) {
        setError(json.errors[0].message);
        return;
      }

      setRentals(json.data.getAllPilotBookings || []);
    } catch (err) {
      setError("Network Error: " + err.message);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchRentals();
  }, []);

  // ----------------------------------------------------------
  // 🔍 Search, Filter, Sort
  // ----------------------------------------------------------
  const processed = rentals
    .filter((r) => {
      const q = query.toLowerCase();
      return (
        (r.buyerName || "").toLowerCase().includes(q) ||
        (r.contact || "").toLowerCase().includes(q) ||
        (r.location || "").toLowerCase().includes(q) ||
        (r.status || "").toLowerCase().includes(q) ||
        (r.pilotName || "").toLowerCase().includes(q) ||
        (r.pilotCompany || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortKey === "newest") return (b.createdAt || "").localeCompare(a.createdAt || "");
      if (sortKey === "oldest") return (a.createdAt || "").localeCompare(b.createdAt || "");
      if (sortKey === "pilot")
        return (a.pilotName || "").localeCompare(b.pilotName || "");
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const visible = processed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ----------------------------------------------------------
  // UI Loading / Error States
  // ----------------------------------------------------------
  if (loading) return <p className="buyer-loading">Loading bookings...</p>;
  if (error) return <p className="buyer-error">Error: {error}</p>;

  // ----------------------------------------------------------
  // JSX UI
  // ----------------------------------------------------------
  return (
    <div className="sold-root">
      {/* HEADER */}
      <header className="sold-header">
        <div>
          <h1 className="sold-title">Pilot Bookings</h1>
          <p className="sold-sub">View all pilot booking requests</p>
        </div>

        <div className="sold-actions">
          <input
            className="sold-search"
            placeholder="Search buyer, pilot, phone, status..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />

          <select
            className="sold-select"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="pilot">Pilot Name</option>
          </select>
        </div>
      </header>

      {/* LIST */}
      <main className="sold-list">
        {visible.length === 0 ? (
          <div className="sold-empty">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginBottom: "16px", opacity: "0.5" }}
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            No bookings found.
          </div>
        ) : (
          visible.map((r) => (
            <article key={r.bookingId} className="sold-item">
              <div className="sold-item-left">
                <div className="sold-item-title">
                  {r.pilotName || "Unknown Pilot"} —{" "}
                  <span>{r.pilotCompany || ""}</span>
                </div>

                <div className="sold-item-meta">
                  <strong>{r.buyerName}</strong> • {r.location}
                </div>

                <div className="sold-item-meta small">📞 {r.contact}</div>

                <div className="sold-item-meta small">
                  📅 {r.date} • ⏰ {r.startTime} → {r.endTime}
                </div>

                <div className="sold-item-meta small">
                  Status: {r.status}
                </div>
              </div>

              <div className="sold-item-right">
                <div className="sold-item-date">
                  {r.createdAt?.slice(0, 10)}
                </div>

                <div
                  className={`sold-item-status ${
                    r.status === "approved"
                      ? "green"
                      : r.status === "rejected"
                      ? "red"
                      : r.status === "completed"
                      ? "blue"
                      : "yellow"
                  }`}
                >
                  {r.status}
                </div>
              </div>
            </article>
          ))
        )}
      </main>

      {/* PAGINATION */}
      <footer className="sold-footer">
        <div>
          Showing <strong>{processed.length}</strong> bookings
        </div>

        <div className="sold-pages">
          <button
            className="sold-page-btn"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            ◀ Prev
          </button>

          <span className="sold-page-ind">
            {page} / {totalPages}
          </span>

          <button
            className="sold-page-btn"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next ▶
          </button>
        </div>
      </footer>
    </div>
  );
}
