import React, { useEffect, useState, useRef } from "react";
import "../styles/BuyerPilot.css";

const GRAPHQL_URL = "http://localhost:5001/graphql";

function BuyerPilots() {
    const [pilots, setPilots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState("all");
    const [updatingIds, setUpdatingIds] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: "pilotName", direction: "asc" });
    const [expandedBuyers, setExpandedBuyers] = useState(new Set());
    const tableRef = useRef(null);
    const [scrolled, setScrolled] = useState(false);

    // Fetch pilots data
    const fetchPilots = async () => {
        setLoading(true);
        setError(null);

        const query = `
            query {
                buyerPilots {
                    buyerPilotId
                    pilotName
                    pilotCompany
                    location
                    availability
                    specification
                    price {
                        perHour
                        perDay
                    }
                    certifications {
                        url
                    }
                    description
                    newemail
                    newphoneNumber
                    adminStatus
                    buyerStatus
                    buyerId
                }
            }
        `;

        try {
            const res = await fetch(GRAPHQL_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`HTTP ${res.status}: ${errorText}`);
            }

            const result = await res.json();

            if (result.errors) {
                setError(result.errors[0].message);
                setPilots([]);
            } else {
                const data = result.data?.buyerPilots || [];
                console.log("Fetched buyer pilots:", data);
                setPilots(data);
            }
        } catch (err) {
            console.error("Error fetching buyer pilots:", err);
            setError(err.message);
            setPilots([]);
        } finally {
            setLoading(false);
        }
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Update pilot status
    const updatePilotStatus = async (buyerPilotId, newStatus) => {
        const updatingIdsCopy = new Set(updatingIds);
        updatingIdsCopy.add(`${buyerPilotId}-${newStatus}`);
        setUpdatingIds(updatingIdsCopy);

    const mutation = `
  mutation AdminUpdateBuyerPilotStatus(
    $buyerPilotId: String!,
    $adminStatus: String!
  ) {
    adminUpdateBuyerPilotStatus(
      buyerPilotId: $buyerPilotId,
      adminStatus: $adminStatus
    ) {
      buyerPilotId
      adminStatus
      buyerStatus
      pilotName
    }
  }
`;


        try {
            const res = await fetch(GRAPHQL_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: mutation,
                    variables: {
                        buyerPilotId,
                        adminStatus: newStatus.toLowerCase()
                    },
                }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`HTTP ${res.status}: ${errorText}`);
            }

            const result = await res.json();

            if (result.errors) {
                setError(result.errors[0].message);
            } else {
                // Update local state
                setPilots(prevPilots =>
                    prevPilots.map(pilot =>
                        pilot.buyerPilotId === buyerPilotId
                            ? { ...pilot, adminStatus: newStatus.toLowerCase() }
                            : pilot
                    )
                );
            }
        } catch (err) {
            console.error("Error updating pilot status:", err);
            setError(err.message);
        } finally {
            const updatingIdsCopy = new Set(updatingIds);
            updatingIdsCopy.delete(`${buyerPilotId}-${newStatus}`);
            setUpdatingIds(updatingIdsCopy);
        }
    };

    // Delete pilot
    const deletePilot = async (buyerPilotId) => {
        const pilot = pilots.find(p => p.buyerPilotId === buyerPilotId);
        if (!pilot) {
            setError("Pilot not found");
            return;
        }

        if (!window.confirm(`Are you sure you want to delete pilot "${pilot.pilotName}"?`)) return;

        const mutation = `
            mutation DeleteBuyerPilot($buyerPilotId: String!) {
                deleteBuyerPilot(buyerPilotId: $buyerPilotId) {
                    buyerPilotId
                    pilotName
                }
            }
        `;

        try {
            const res = await fetch(GRAPHQL_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: mutation,
                    variables: { buyerPilotId }
                }),
            });

            const result = await res.json();

            if (result.errors) {
                throw new Error(result.errors[0].message);
            }

            // Update local state
            setPilots(prev => prev.filter(pilot => pilot.buyerPilotId !== buyerPilotId));
        } catch (err) {
            console.error("Error deleting pilot:", err);
            setError(err.message);
        }
    };

    // Handle scroll to show shadow on sticky columns
    const handleTableScroll = (e) => {
        const isScrolled = e.target.scrollLeft > 0;
        setScrolled(isScrolled);
    };

    // Initial fetch
    useEffect(() => {
        fetchPilots();
    }, []);

    // Toggle buyer expansion
    const toggleBuyer = (buyerId) => {
        const newExpanded = new Set(expandedBuyers);
        if (newExpanded.has(buyerId)) {
            newExpanded.delete(buyerId);
        } else {
            newExpanded.add(buyerId);
        }
        setExpandedBuyers(newExpanded);
    };

    // Filter and sort pilots based on adminStatus
    const filteredPilots = pilots
        .filter(pilot => {
            const matchesStatus = selectedStatus === "all" || pilot.adminStatus === selectedStatus;
            const matchesSearch =
                searchTerm === "" ||
                pilot.pilotName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pilot.newemail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pilot.buyerPilotId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pilot.specification?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesStatus && matchesSearch;
        })
        .sort((a, b) => {
            const key = sortConfig.key;
            let aVal = a[key];
            let bVal = b[key];

            if (typeof aVal === "string") {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (sortConfig.direction === "asc") {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

    // Group pilots by buyer
    const pilotsByBuyer = {};
    pilots.forEach(pilot => {
        if (!pilotsByBuyer[pilot.buyerId]) {
            pilotsByBuyer[pilot.buyerId] = {
                buyerId: pilot.buyerId,
                pilots: []
            };
        }
        pilotsByBuyer[pilot.buyerId].pilots.push(pilot);
    });

    const statusStats = {
        all: pilots.length,
        pending: pilots.filter(p => p.adminStatus === "pending").length,
        approved: pilots.filter(p => p.adminStatus === "approved").length,
        rejected: pilots.filter(p => p.adminStatus === "rejected").length,
    };

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
        }));
    };

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) return <span className="sort-icon">⇅</span>;
        return <span className="sort-icon active">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>;
    };

    const PilotRow = ({ pilot, isSubRow = false }) => (
        <tr key={pilot.buyerPilotId} className={`pilot-row ${isSubRow ? 'sub-row' : ''}`}>
            <td className="sticky-col sticky-col-id">
                <div className="pilot-id-cell">
                    <strong>{pilot.buyerPilotId}</strong>
                    <small>Created: {formatDate(pilot.createdAt)}</small>
                </div>
            </td>

            <td className="sticky-col sticky-col-buyer-id">
                <div className="buyer-id-cell">
                    <span>{pilot.buyerId}</span>
                </div>
            </td>

            <td className="cell-name">
                <div className="name-cell">
                    <div className="avatar">{pilot.pilotName.charAt(0)}</div>
                    <div className="name-info">
                        <strong>{pilot.pilotName}</strong>
                        <small>{pilot.newemail}</small>
                        <small>{pilot.newphoneNumber}</small>
                        {pilot.pilotCompany && <small>Company: {pilot.pilotCompany}</small>}
                    </div>
                </div>
            </td>

            <td className="cell-specialization">
                <span className="specialization">{pilot.specification || "Not specified"}</span>
                {pilot.location && <small>📍 {pilot.location}</small>}
            </td>

            <td className="cell-price">
                <div className="price-cell">
                    <span className="price-hour">₹{pilot.price?.perHour || 0}/hr</span>
                    <span className="price-day">₹{pilot.price?.perDay || 0}/day</span>
                </div>
            </td>

            <td className="cell-certifications">
                <div className="cert-count">
                    {pilot.certifications?.length || 0} certs
                </div>
                {pilot.certifications?.length > 0 && (
                    <button
                        className="view-certs-btn"
                        onClick={() => {
                            const urls = pilot.certifications.map(c => c.url).join('\n');
                            alert(`Certification URLs:\n${urls}`);
                        }}
                    >
                        👁️ View
                    </button>
                )}
            </td>

            <td className="cell-availability">
                <span className={`availability-badge ${pilot.availability ? 'available' : 'unavailable'}`}>
                    {pilot.availability ? '✅ Available' : '⏸️ Unavailable'}
                </span>
            </td>

            <td className="cell-status">
                <span className={`status-badge status-${pilot.adminStatus}`}>
                    {pilot.adminStatus.toUpperCase()}
                </span>
                <br />
                <small className="buyer-status">
                    Buyer: {pilot.buyerStatus}
                </small>
            </td>

            <td className="cell-actions">
                <div className="action-buttons">
                    {pilot.adminStatus === "pending" && (
                        <>
                            <button
                                className="action-btn approve"
                                onClick={() => updatePilotStatus(pilot.buyerPilotId, "approved")}
                                disabled={updatingIds.has(`${pilot.buyerPilotId}-approved`)}
                                title="Approve pilot"
                            >
                                {updatingIds.has(`${pilot.buyerPilotId}-approved`) ? "..." : "✅"}
                            </button>
                            <button
                                className="action-btn reject"
                                onClick={() => updatePilotStatus(pilot.buyerPilotId, "rejected")}
                                disabled={updatingIds.has(`${pilot.buyerPilotId}-rejected`)}
                                title="Reject pilot"
                            >
                                {updatingIds.has(`${pilot.buyerPilotId}-rejected`) ? "..." : "❌"}
                            </button>
                        </>
                    )}

                    {pilot.adminStatus === "approved" && (
                        <>
                            <button
                                className="action-btn pending"
                                onClick={() => updatePilotStatus(pilot.buyerPilotId, "pending")}
                                disabled={updatingIds.has(`${pilot.buyerPilotId}-pending`)}
                                title="Move to pending"
                            >
                                {updatingIds.has(`${pilot.buyerPilotId}-pending`) ? "..." : "⏳"}
                            </button>
                            <button
                                className="action-btn reject"
                                onClick={() => updatePilotStatus(pilot.buyerPilotId, "rejected")}
                                disabled={updatingIds.has(`${pilot.buyerPilotId}-rejected`)}
                                title="Reject pilot"
                            >
                                {updatingIds.has(`${pilot.buyerPilotId}-rejected`) ? "..." : "❌"}
                            </button>
                        </>
                    )}

                    {pilot.adminStatus === "rejected" && (
                        <>
                            <button
                                className="action-btn pending"
                                onClick={() => updatePilotStatus(pilot.buyerPilotId, "pending")}
                                disabled={updatingIds.has(`${pilot.buyerPilotId}-pending`)}
                                title="Move to pending"
                            >
                                {updatingIds.has(`${pilot.buyerPilotId}-pending`) ? "..." : "⏳"}
                            </button>
                            <button
                                className="action-btn approve"
                                onClick={() => updatePilotStatus(pilot.buyerPilotId, "approved")}
                                disabled={updatingIds.has(`${pilot.buyerPilotId}-approved`)}
                                title="Approve pilot"
                            >
                                {updatingIds.has(`${pilot.buyerPilotId}-approved`) ? "..." : "✅"}
                            </button>
                        </>
                    )}

                    <button
                        className="action-btn view"
                        onClick={() => {
                            alert(`Pilot Details:\n
ID: ${pilot.buyerPilotId}\n
Name: ${pilot.pilotName}\n
Email: ${pilot.newemail}\n
Phone: ${pilot.newphoneNumber}\n
Company: ${pilot.pilotCompany || "N/A"}\n
Location: ${pilot.location || "N/A"}\n
Specialization: ${pilot.specification || "N/A"}\n
Availability: ${pilot.availability ? "Available" : "Not Available"}\n
Price: ₹${pilot.price?.perHour || 0}/hour, ₹${pilot.price?.perDay || 0}/day\n
Certifications: ${pilot.certifications?.length || 0}\n
Admin Status: ${pilot.adminStatus}\n
Buyer Status: ${pilot.buyerStatus}\n
Description: ${pilot.description || "No description"}\n
Created: ${formatDate(pilot.createdAt)}\n
Updated: ${formatDate(pilot.updatedAt)}`);
                        }}
                        title="View full details"
                    >
                        👁️
                    </button>

                    <button
                        className="action-btn delete"
                        onClick={() => deletePilot(pilot.buyerPilotId)}
                        title="Delete pilot"
                    >
                        🗑
                    </button>
                </div>
            </td>
        </tr>
    );

    return (
        <div className="buyer-pilots-container">
            {/* Header */}
            <div className="header-section">
                <div className="header-top">
                    <h1 className="page-title">👨‍✈️ Buyer Pilots Management</h1>
                    <div className="header-controls">
                        <button
                            className="refresh-btn"
                            onClick={fetchPilots}
                            disabled={loading}
                        >
                            ↻ Refresh
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Search by name, email, ID, or specialization..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <span className="search-icon">🔍</span>
                </div>

                {/* Error Message */}
                {error && <div className="error-message">❌ {error}</div>}

                {/* Loading State */}
                {loading && <div className="loading-message">⏳ Loading buyer pilots...</div>}
            </div>

            {/* Status Tabs */}
            <div className="status-tabs-container">
                {["all", "pending", "approved", "rejected"].map((status) => (
                    <button
                        key={status}
                        className={`status-tab ${selectedStatus === status ? "active" : ""}`}
                        onClick={() => setSelectedStatus(status)}
                    >
                        <span className="tab-icon">
                            {status === "all" && "👥"}
                            {status === "pending" && "⏳"}
                            {status === "approved" && "✅"}
                            {status === "rejected" && "❌"}
                        </span>
                        <span className="tab-text">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                        <span className="tab-count">{statusStats[status]}</span>
                    </button>
                ))}
            </div>

            {/* Data Table with Horizontal Scroll */}
            <div className={`table-wrapper ${scrolled ? "scrolled" : ""}`}>
                {loading ? (
                    <div className="no-data-message">
                        <p>⏳ Loading buyer pilots data...</p>
                    </div>
                ) : filteredPilots.length === 0 ? (
                    <div className="no-data-message">
                        <p>📭 No pilots found</p>
                        {searchTerm && <p className="no-data-hint">Try adjusting your search</p>}
                        {!searchTerm && pilots.length === 0 && <p className="no-data-hint">No pilot registrations yet</p>}
                    </div>
                ) : (
                    <div className="table-scroll-container" ref={tableRef} onScroll={handleTableScroll}>
                        <table className="pilots-table">
                            <thead>
                                <tr>
                                    <th className="sticky-col sticky-col-id" onClick={() => handleSort("buyerPilotId")}>
                                        Pilot ID <SortIcon column="buyerPilotId" />
                                    </th>

                                    <th className="sticky-col sticky-col-buyer-id" onClick={() => handleSort("buyerId")}>
                                        Buyer ID <SortIcon column="buyerId" />
                                    </th>

                                    <th onClick={() => handleSort("pilotName")}>
                                        Pilot Details <SortIcon column="pilotName" />
                                    </th>
                                    <th onClick={() => handleSort("specification")}>
                                        Specialization <SortIcon column="specification" />
                                    </th>
                                    <th onClick={() => handleSort("price.perHour")}>
                                        Pricing <SortIcon column="price.perHour" />
                                    </th>
                                    <th>Certifications</th>
                                    <th onClick={() => handleSort("availability")}>
                                        Availability <SortIcon column="availability" />
                                    </th>
                                    <th onClick={() => handleSort("adminStatus")}>
                                        Status <SortIcon column="adminStatus" />
                                    </th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.values(pilotsByBuyer).map((buyerGroup) => {
                                    const pilotsForBuyer = buyerGroup.pilots.filter(p => {
                                        const matchesStatus = selectedStatus === "all" || p.adminStatus === selectedStatus;
                                        const matchesSearch =
                                            searchTerm === "" ||
                                            p.pilotName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            p.newemail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            p.buyerPilotId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            p.specification?.toLowerCase().includes(searchTerm.toLowerCase());
                                        return matchesStatus && matchesSearch;
                                    });

                                    if (pilotsForBuyer.length === 0) return null;

                                    const isExpanded = expandedBuyers.has(buyerGroup.buyerId);
                                    const hasMultiplePilots = buyerGroup.pilots.length > 2;

                                    return (
                                        <React.Fragment key={buyerGroup.buyerId}>
                                            {/* Main row - shows first pilot or buyer info if multiple */}
                                            {hasMultiplePilots ? (
                                                <tr
                                                    className="buyer-header-row"
                                                    onClick={() => toggleBuyer(buyerGroup.buyerId)}
                                                    style={{ cursor: "pointer", backgroundColor: "#f0f0f0" }}
                                                >
                                                    <td colSpan="9" className="buyer-header-cell">
                                                        <span className="expand-icon">
                                                            {isExpanded ? "▼" : "▶"} Buyer: {buyerGroup.buyerId}
                                                        </span>
                                                        <span className="pilot-count">({buyerGroup.pilots.length} pilots)</span>
                                                    </td>
                                                </tr>
                                            ) : null}

                                            {/* Show pilots - either all if ≤2, or expanded if >2 */}
                                            {!hasMultiplePilots || isExpanded
                                                ? pilotsForBuyer.sort((a, b) => {
                                                    const key = sortConfig.key;
                                                    let aVal = a[key];
                                                    let bVal = b[key];

                                                    // Handle nested properties
                                                    if (key.includes('.')) {
                                                        const keys = key.split('.');
                                                        aVal = a[keys[0]][keys[1]];
                                                        bVal = b[keys[0]][keys[1]];
                                                    }

                                                    if (typeof aVal === "string") {
                                                        aVal = aVal.toLowerCase();
                                                        bVal = bVal.toLowerCase();
                                                    }
                                                    return sortConfig.direction === "asc"
                                                        ? aVal > bVal
                                                            ? 1
                                                            : -1
                                                        : aVal < bVal
                                                            ? 1
                                                            : -1;
                                                }).map((pilot) => (
                                                    <PilotRow
                                                        key={pilot.buyerPilotId}
                                                        pilot={pilot}
                                                        isSubRow={hasMultiplePilots}
                                                    />
                                                ))
                                                : null}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Footer Stats */}
            <div className="footer-stats">
                <div className="stat-item">
                    <span className="stat-label">Total Pilots:</span>
                    <span className="stat-value">{pilots.length}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Pending:</span>
                    <span className="stat-value pending">{statusStats.pending}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Approved:</span>
                    <span className="stat-value approved">{statusStats.approved}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Rejected:</span>
                    <span className="stat-value rejected">{statusStats.rejected}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Available:</span>
                    <span className="stat-value available">
                        {pilots.filter(p => p.availability).length}
                    </span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Avg Hourly Rate:</span>
                    <span className="stat-value price">
                        ₹{pilots.length > 0
                            ? Math.round(pilots.reduce((sum, p) => sum + (p.price?.perHour || 0), 0) / pilots.length)
                            : 0}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default BuyerPilots;