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
  const [selectedTab, setSelectedTab] = useState("all");
  const PAGE_SIZE = 10;

  // Fetch All Pilot Bookings
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
          pilotType
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

  // Filter bookings by type
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

  // Search, Filter, Sort
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

  // Calculate Statistics
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

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const visible = filteredBookings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Booking Row Component - SINGLE ROW LAYOUT
  const BookingRow = ({ booking }) => (
    <tr key={booking.bookingId} className="booking-row">
      <td className="cell-booking-id">
        <div className="booking-id-main">{booking.bookingId}</div>
        <div className="booking-date">{formatDate(booking.createdAt)}</div>
      </td>
      
      <td className="cell-pilot">
        <div className="pilot-info">
          <strong>{booking.pilotName || "Unknown Pilot"}</strong>
          <small>{booking.pilotCompany || "Independent"}</small>
        </div>
      </td>
      
      <td className="cell-buyer">
        <div className="buyer-info">
          <strong>{booking.buyerName}</strong>
          <small>📞 {booking.contact}</small>
        </div>
      </td>
      
      <td className="cell-location">
        <span className="location-text">{booking.location}</span>
      </td>
      
      <td className="cell-time">
        <div className="time-info">
          <strong>{booking.date}</strong>
          <small>{booking.startTime} - {booking.endTime}</small>
        </div>
      </td>
      
      <td className="cell-owner">
        {booking.pilotType === "seller" ? (
          <div className="owner-info">
            <strong>{booking.sellerName}</strong>
            <small>📧 {booking.sellerEmail}</small>
          </div>
        ) : (
          <div className="owner-info">
            <strong>Buyer ID: {booking.pilotOwnerId}</strong>
          </div>
        )}
      </td>
      
      <td className="cell-status">
        <div className="status-container">
          <span className={`status-badge ${booking.status}`}>
            {booking.status.toUpperCase()}
          </span>
          {/* <span className={`type-badge ${booking.pilotType}`}>
            {booking.pilotType === "seller" ? "👨‍✈️ Seller" : "👤 Buyer"}
          </span> */}
        </div>
      </td>
    </tr>
  );

  // Loading State
  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Loading pilot bookings...</p>
    </div>
  );

  // Error State
  if (error) return (
    <div className="error-container">
      <div className="error-icon">❌</div>
      <p className="error-message">Error: {error}</p>
      <button className="retry-btn" onClick={fetchAllBookings}>
        Retry
      </button>
    </div>
  );

  return (
    <div className="pilot-bookings-container">
      {/* HEADER */}
      <div className="bookings-header">
        <div className="header-main">
          <h1>🛩️ Pilot Bookings Dashboard</h1>
          <p>Manage all pilot booking requests (Seller & Buyer Pilots)</p>
        </div>

        {/* STATS BAR */}
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-label">Total</span>
            <span className="stat-value total">{stats.total}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Seller</span>
            <span className="stat-value seller">{stats.sellerBookings}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Buyer</span>
            <span className="stat-value buyer">{stats.buyerBookings}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Pending</span>
            <span className="stat-value pending">{stats.pending}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Approved</span>
            <span className="stat-value approved">{stats.approved}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Completed</span>
            <span className="stat-value completed">{stats.completed}</span>
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="controls-section">
        {/* TABS */}
        <div className="type-tabs">
          <button className={`type-tab ${selectedTab === "all" ? "active" : ""}`}
            onClick={() => { setSelectedTab("all"); setPage(1); }}>
            All Bookings ({stats.total})
          </button>
          <button className={`type-tab ${selectedTab === "seller" ? "active" : ""}`}
            onClick={() => { setSelectedTab("seller"); setPage(1); }}>
            Seller Pilots ({stats.sellerBookings})
          </button>
          <button className={`type-tab ${selectedTab === "buyer" ? "active" : ""}`}
            onClick={() => { setSelectedTab("buyer"); setPage(1); }}>
            Buyer Pilots ({stats.buyerBookings})
          </button>
        </div>

        {/* SEARCH & SORT */}
        <div className="filter-controls">
          <div className="search-container">
            <input className="search-input"
              placeholder="Search bookings..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            />
            <span className="search-icon">🔍</span>
            {query && (
              <button className="clear-search" onClick={() => setQuery("")}>✕</button>
            )}
          </div>

          <div className="sort-container">
            <select className="sort-select" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="pilot">Pilot Name</option>
              <option value="type">Pilot Type</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* BOOKINGS TABLE */}
      <div className="bookings-table-container">
        <div className="table-header">
          <div className="header-cell booking-id">Booking ID</div>
          <div className="header-cell pilot">Pilot</div>
          <div className="header-cell buyer">Buyer</div>
          <div className="header-cell location">Location</div>
          <div className="header-cell time">Date & Time</div>
          <div className="header-cell owner">Pilot Owner</div>
          <div className="header-cell status">Status</div>
        </div>

        <div className="table-body">
          {visible.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No bookings found</h3>
              <p>{query ? `No bookings match "${query}"` : "No bookings available"}</p>
              {(query || selectedTab !== "all") && (
                <button className="reset-filters-btn"
                  onClick={() => { setQuery(""); setSelectedTab("all"); setPage(1); }}>
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <table className="bookings-table">
              <tbody>
                {visible.map((booking) => (
                  <BookingRow key={booking.bookingId} booking={booking} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* PAGINATION */}
      <div className="pagination-section">
        <div className="pagination-info">
          Showing <strong>{visible.length}</strong> of <strong>{filteredBookings.length}</strong> bookings
          {selectedTab !== "all" && ` (${selectedTab} pilots only)`}
        </div>
        
        <div className="pagination-controls">
          <button className="pagination-btn prev" 
            disabled={page === 1} onClick={() => setPage(page - 1)}>
            ◀ Previous
          </button>
          
          <div className="page-numbers">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              
              return (
                <button key={pageNum} 
                  className={`page-btn ${page === pageNum ? 'active' : ''}`}
                  onClick={() => setPage(pageNum)}>
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button className="pagination-btn next"
            disabled={page === totalPages} onClick={() => setPage(page + 1)}>
            Next ▶
          </button>
        </div>
      </div>
    </div>
  );
}