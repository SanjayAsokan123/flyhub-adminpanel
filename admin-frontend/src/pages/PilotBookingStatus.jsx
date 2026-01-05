import React, { useEffect, useState } from "react";
import "../styles/PilotBookingStatus.css";

const GRAPHQL_URL = "http://localhost:5001/graphql";

export default function PilotRentalBookings() {
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters and pagination
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("newest");
  const [page, setPage] = useState(1);
  const [selectedTab, setSelectedTab] = useState("all"); // "all", "seller", "buyer"
  const PAGE_SIZE = 8;

  // ----------------------------------------------------------
  // 🔥 Fetch All Pilot Bookings (Seller + Buyer)
  // ----------------------------------------------------------
  const fetchAllBookings = async () => {
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
          pilotType  # "seller" or "buyer"
          buyerId
          buyerName
          buyerEmail
          contact
          location
          date
          startTime
          endTime
          status
          sellerId
          sellerName
          sellerEmail
          sellerPhone
          pilotOwnerId
          pilotOwnerType
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

      setAllBookings(json.data.getAllPilotBookings || []);
    } catch (err) {
      setError("Network Error: " + err.message);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAllBookings();
  }, []);

  // ----------------------------------------------------------
  // 📊 Filter bookings by type (Seller/Buyer)
  // ----------------------------------------------------------
  const filterBookingsByType = () => {
    switch (selectedTab) {
      case "seller":
        return allBookings.filter(b => b.pilotType === "seller");
      case "buyer":
        return allBookings.filter(b => b.pilotType === "buyer");
      default:
        return allBookings;
    }
  };

  // ----------------------------------------------------------
  // 🔍 Search, Filter, Sort
  // ----------------------------------------------------------
  const filteredBookings = filterBookingsByType()
    .filter((b) => {
      const q = query.toLowerCase();
      return (
        (b.buyerName || "").toLowerCase().includes(q) ||
        (b.contact || "").toLowerCase().includes(q) ||
        (b.location || "").toLowerCase().includes(q) ||
        (b.status || "").toLowerCase().includes(q) ||
        (b.pilotName || "").toLowerCase().includes(q) ||
        (b.pilotCompany || "").toLowerCase().includes(q) ||
        (b.pilotType || "").toLowerCase().includes(q) ||
        (b.sellerName || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortKey === "newest") return (b.createdAt || "").localeCompare(a.createdAt || "");
      if (sortKey === "oldest") return (a.createdAt || "").localeCompare(b.createdAt || "");
      if (sortKey === "pilot") return (a.pilotName || "").localeCompare(b.pilotName || "");
      if (sortKey === "type") return (a.pilotType || "").localeCompare(b.pilotType || "");
      return 0;
    });

  // ----------------------------------------------------------
  // 📊 Calculate Statistics
  // ----------------------------------------------------------
  const calculateStats = () => {
    const total = allBookings.length;
    const sellerBookings = allBookings.filter(b => b.pilotType === "seller").length;
    const buyerBookings = allBookings.filter(b => b.pilotType === "buyer").length;
    const pending = allBookings.filter(b => b.status === "pending").length;
    const approved = allBookings.filter(b => b.status === "approved").length;
    const rejected = allBookings.filter(b => b.status === "rejected").length;
    const completed = allBookings.filter(b => b.status === "completed").length;

    return {
      total,
      sellerBookings,
      buyerBookings,
      pending,
      approved,
      rejected,
      completed
    };
  };

  const stats = calculateStats();

  // ----------------------------------------------------------
  // 📄 Pagination
  // ----------------------------------------------------------
  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const visible = filteredBookings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ----------------------------------------------------------
  // 🎨 Status Badge Component
  // ----------------------------------------------------------
  const StatusBadge = ({ status, pilotType }) => (
    <div className="status-badge-wrapper">
      <div className={`status-badge ${status}`}>
        {status.toUpperCase()}
      </div>
      <div className={`type-badge ${pilotType}`}>
        {pilotType === "seller" ? "👨‍✈️ Seller Pilot" : "👤 Buyer Pilot"}
      </div>
    </div>
  );

  // ----------------------------------------------------------
  // 📋 Booking Card Component
  // ----------------------------------------------------------
  const BookingCard = ({ booking }) => (
    <article key={booking.bookingId} className="booking-card">
      <div className="booking-header">
        <div className="booking-title">
          <strong>{booking.pilotName || "Unknown Pilot"}</strong>
          <span> — {booking.pilotCompany || "Independent"}</span>
        </div>
        <div className="booking-badges">
          <StatusBadge status={booking.status} pilotType={booking.pilotType} />
        </div>
      </div>

      <div className="booking-body">
        <div className="booking-info-section">
          <div className="info-row">
            <span className="info-label">📞 Buyer:</span>
            <span className="info-value">{booking.buyerName}</span>
          </div>
          <div className="info-row">
            <span className="info-label">📱 Contact:</span>
            <span className="info-value">{booking.contact}</span>
          </div>
          <div className="info-row">
            <span className="info-label">📍 Location:</span>
            <span className="info-value">{booking.location}</span>
          </div>
        </div>

        <div className="booking-info-section">
          <div className="info-row">
            <span className="info-label">📅 Date:</span>
            <span className="info-value">{booking.date}</span>
          </div>
          <div className="info-row">
            <span className="info-label">⏰ Time:</span>
            <span className="info-value">{booking.startTime} - {booking.endTime}</span>
          </div>
        </div>

        {booking.pilotType === "seller" && booking.sellerName && (
          <div className="booking-info-section">
            <div className="info-row">
              <span className="info-label">🏢 Pilot Owner:</span>
              <span className="info-value seller-highlight">{booking.sellerName}</span>
            </div>
            {booking.sellerEmail && (
              <div className="info-row">
                <span className="info-label">📧 Seller Email:</span>
                <span className="info-value">{booking.sellerEmail}</span>
              </div>
            )}
          </div>
        )}

        {booking.pilotType === "buyer" && booking.pilotOwnerId && (
          <div className="booking-info-section">
            <div className="info-row">
              <span className="info-label">👤 Pilot Owner:</span>
              <span className="info-value buyer-highlight">Buyer ID: {booking.pilotOwnerId}</span>
            </div>
          </div>
        )}

        <div className="booking-footer">
          <div className="booking-id">
            <small>Booking ID: {booking.bookingId}</small>
            <small>Created: {booking.createdAt?.slice(0, 10)}</small>
          </div>
        </div>
      </div>
    </article>
  );

  // ----------------------------------------------------------
  // UI Loading / Error States
  // ----------------------------------------------------------
  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Loading all pilot bookings...</p>
    </div>
  );

  if (error) return (
    <div className="error-container">
      <div className="error-icon">❌</div>
      <p className="error-message">Error: {error}</p>
      <button className="retry-btn" onClick={fetchAllBookings}>
        Retry
      </button>
    </div>
  );

  // ----------------------------------------------------------
  // JSX UI
  // ----------------------------------------------------------
  return (
    <div className="pilot-bookings-container">
      {/* HEADER */}
      <header className="bookings-header">
        <div className="header-main">
          <h1 className="page-title">🛩️ Pilot Bookings Dashboard</h1>
          <p className="page-subtitle">Manage all pilot booking requests (Seller & Buyer Pilots)</p>
        </div>

        {/* STATS BAR */}
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-label">Total:</span>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Seller:</span>
            <span className="stat-value seller-stat">{stats.sellerBookings}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Buyer:</span>
            <span className="stat-value buyer-stat">{stats.buyerBookings}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Pending:</span>
            <span className="stat-value pending-stat">{stats.pending}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Approved:</span>
            <span className="stat-value approved-stat">{stats.approved}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Completed:</span>
            <span className="stat-value completed-stat">{stats.completed}</span>
          </div>
        </div>
      </header>

      {/* CONTROLS SECTION */}
      <div className="controls-section">
        {/* TABS */}
        <div className="type-tabs">
          <button
            className={`type-tab ${selectedTab === "all" ? "active" : ""}`}
            onClick={() => {
              setSelectedTab("all");
              setPage(1);
            }}
          >
            👥 All Bookings ({stats.total})
          </button>
          <button
            className={`type-tab ${selectedTab === "seller" ? "active" : ""}`}
            onClick={() => {
              setSelectedTab("seller");
              setPage(1);
            }}
          >
            🏢 Seller Pilots ({stats.sellerBookings})
          </button>
          <button
            className={`type-tab ${selectedTab === "buyer" ? "active" : ""}`}
            onClick={() => {
              setSelectedTab("buyer");
              setPage(1);
            }}
          >
            👤 Buyer Pilots ({stats.buyerBookings})
          </button>
        </div>

        {/* SEARCH & SORT */}
        <div className="filter-controls">
          <div className="search-container">
            <input
              className="search-input"
              placeholder="Search buyer, pilot, phone, location, status..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
            <span className="search-icon">🔍</span>
            {query && (
              <button
                className="clear-search"
                onClick={() => setQuery("")}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="sort-container">
            <select
              className="sort-select"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="pilot">Pilot Name (A-Z)</option>
              <option value="type">Pilot Type</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* BOOKINGS LIST */}
      <main className="bookings-list">
        {visible.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No bookings found</h3>
            <p className="empty-message">
              {query
                ? `No bookings match "${query}"`
                : selectedTab === "all"
                  ? "No bookings available"
                  : `No ${selectedTab} pilot bookings found`}
            </p>
            {(query || selectedTab !== "all") && (
              <button
                className="reset-filters-btn"
                onClick={() => {
                  setQuery("");
                  setSelectedTab("all");
                  setPage(1);
                }}
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="bookings-grid">
            {visible.map((booking) => (
              <BookingCard key={booking.bookingId} booking={booking} />
            ))}
          </div>
        )}
      </main>

      {/* PAGINATION & FOOTER */}
      <footer className="bookings-footer">
        <div className="footer-stats">
          <span>
            Showing <strong>{visible.length}</strong> of{" "}
            <strong>{filteredBookings.length}</strong> bookings
          </span>
          {selectedTab !== "all" && (
            <span className="tab-indicator">
              ({selectedTab} pilots only)
            </span>
          )}
        </div>

        <div className="pagination-controls">
          <button
            className="pagination-btn prev-btn"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            ◀ Previous
          </button>

          <div className="page-info">
            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
          </div>

          <button
            className="pagination-btn next-btn"
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