// // import React, { useEffect, useState, useRef } from "react";
// // import "../styles/BuyerPilot.css";

// // const GRAPHQL_URL = "http://localhost:5001/graphql";

// // function BuyerPilots() {
// //     const [pilots, setPilots] = useState([]);
// //     const [loading, setLoading] = useState(true);
// //     const [error, setError] = useState(null);
// //     const [selectedStatus, setSelectedStatus] = useState("all");
// //     const [updatingIds, setUpdatingIds] = useState(new Set());
// //     const [searchTerm, setSearchTerm] = useState("");
// //     const [sortConfig, setSortConfig] = useState({ key: "pilotName", direction: "asc" });
// //     const [expandedBuyers, setExpandedBuyers] = useState(new Set());
// //     const tableRef = useRef(null);
// //     const [scrolled, setScrolled] = useState(false);

// //     // Fetch pilots data
// //     const fetchPilots = async () => {
// //         setLoading(true);
// //         setError(null);

// //         const query = `
// //             query {
// //                 buyerPilots {
// //                     _id
// //                     buyerPilotId
// //                     pilotName
// //                     pilotCompany
// //                     location
// //                     availability
// //                     specification
// //                     price {
// //                         perHour
// //                         perDay
// //                     }
// //                     certifications {
// //                         url
// //                     }
// //                     profilePhoto {
// //                         url
// //                     }
// //                     description
// //                     newemail
// //                     newphoneNumber
// //                     adminStatus
// //                     buyerStatus
// //                     buyerId
// //                     createdAt
// //                     updatedAt
// //                     buyer {
// //                         name
// //                         email
// //                         phoneNumber
// //                     }
// //                 }
// //             }
// //         `;

// //         try {
// //             const res = await fetch(GRAPHQL_URL, {
// //                 method: "POST",
// //                 headers: { "Content-Type": "application/json" },
// //                 body: JSON.stringify({ query }),
// //             });

// //             if (!res.ok) {
// //                 const errorText = await res.text();
// //                 throw new Error(`HTTP ${res.status}: ${errorText}`);
// //             }

// //             const result = await res.json();

// //             if (result.errors) {
// //                 setError(result.errors[0].message);
// //                 setPilots([]);
// //             } else {
// //                 const data = result.data?.buyerPilots || [];
// //                 console.log("Fetched buyer pilots:", data);
// //                 setPilots(data);
// //             }
// //         } catch (err) {
// //             console.error("Error fetching buyer pilots:", err);
// //             setError(err.message);
// //             setPilots([]);
// //         } finally {
// //             setLoading(false);
// //         }
// //     };

// //     // Format date
// //     const formatDate = (dateString) => {
// //         if (!dateString) return "N/A";
// //         const date = new Date(dateString);
// //         return date.toLocaleDateString('en-US', {
// //             year: 'numeric',
// //             month: 'short',
// //             day: 'numeric'
// //         });
// //     };

// //     // Update pilot status
// //     const updatePilotStatus = async (buyerPilotId, newStatus) => {
// //         const updatingIdsCopy = new Set(updatingIds);
// //         updatingIdsCopy.add(`${buyerPilotId}-${newStatus}`);
// //         setUpdatingIds(updatingIdsCopy);

// //         const mutation = `
// //             mutation AdminUpdateBuyerPilotStatus(
// //                 $buyerPilotId: String!,
// //                 $adminStatus: String!
// //             ) {
// //                 adminUpdateBuyerPilotStatus(
// //                     buyerPilotId: $buyerPilotId,
// //                     adminStatus: $adminStatus
// //                 ) {
// //                     buyerPilotId
// //                     adminStatus
// //                     buyerStatus
// //                     pilotName
// //                 }
// //             }
// //         `;

// //         try {
// //             const res = await fetch(GRAPHQL_URL, {
// //                 method: "POST",
// //                 headers: { "Content-Type": "application/json" },
// //                 body: JSON.stringify({
// //                     query: mutation,
// //                     variables: {
// //                         buyerPilotId,
// //                         adminStatus: newStatus.toLowerCase()
// //                     },
// //                 }),
// //             });

// //             if (!res.ok) {
// //                 const errorText = await res.text();
// //                 throw new Error(`HTTP ${res.status}: ${errorText}`);
// //             }

// //             const result = await res.json();

// //             if (result.errors) {
// //                 throw new Error(result.errors[0].message);
// //             }

// //             // Update local state immediately for better UX
// //             setPilots(prevPilots =>
// //                 prevPilots.map(pilot =>
// //                     pilot.buyerPilotId === buyerPilotId
// //                         ? { ...pilot, adminStatus: newStatus.toLowerCase() }
// //                         : pilot
// //                 )
// //             );

// //             // Show success message
// //             alert(`✅ Pilot "${result.data?.adminUpdateBuyerPilotStatus?.pilotName || buyerPilotId}" status updated to ${newStatus}`);

// //             // Refresh the data to ensure consistency
// //             setTimeout(() => {
// //                 fetchPilots();
// //             }, 500);

// //         } catch (err) {
// //             console.error("Error updating pilot status:", err);
// //             setError(err.message);
// //             alert(`❌ Failed to update status: ${err.message}`);
// //         } finally {
// //             const updatingIdsCopy = new Set(updatingIds);
// //             updatingIdsCopy.delete(`${buyerPilotId}-${newStatus}`);
// //             setUpdatingIds(updatingIdsCopy);
// //         }
// //     };

// //     // Delete pilot
// //     const deletePilot = async (buyerPilotId) => {
// //         const pilot = pilots.find(p => p.buyerPilotId === buyerPilotId);
// //         if (!pilot) {
// //             setError("Pilot not found");
// //             return;
// //         }

// //         if (!window.confirm(`Are you sure you want to delete pilot "${pilot.pilotName}"?\n\nThis action cannot be undone.`)) return;

// //         const mutation = `
// //             mutation DeleteBuyerPilot($buyerPilotId: String!) {
// //                 deleteBuyerPilot(buyerPilotId: $buyerPilotId)
// //             }
// //         `;

// //         try {
// //             const res = await fetch(GRAPHQL_URL, {
// //                 method: "POST",
// //                 headers: { "Content-Type": "application/json" },
// //                 body: JSON.stringify({
// //                     query: mutation,
// //                     variables: { buyerPilotId }
// //                 }),
// //             });

// //             const result = await res.json();

// //             if (result.errors) {
// //                 throw new Error(result.errors[0].message);
// //             }

// //             // Update local state immediately
// //             setPilots(prev => prev.filter(pilot => pilot.buyerPilotId !== buyerPilotId));

// //             alert(`✅ Pilot "${pilot.pilotName}" deleted successfully!`);

// //             // Refresh the data
// //             setTimeout(() => {
// //                 fetchPilots();
// //             }, 500);

// //         } catch (err) {
// //             console.error("Error deleting pilot:", err);
// //             setError(err.message);
// //             alert(`❌ Failed to delete pilot: ${err.message}`);
// //         }
// //     };

// //     // Handle scroll to show shadow on sticky columns
// //     const handleTableScroll = (e) => {
// //         const isScrolled = e.target.scrollLeft > 0;
// //         setScrolled(isScrolled);
// //     };

// //     // Initial fetch
// //     useEffect(() => {
// //         fetchPilots();
// //     }, []);

// //     // Toggle buyer expansion
// //     const toggleBuyer = (buyerId) => {
// //         const newExpanded = new Set(expandedBuyers);
// //         if (newExpanded.has(buyerId)) {
// //             newExpanded.delete(buyerId);
// //         } else {
// //             newExpanded.add(buyerId);
// //         }
// //         setExpandedBuyers(newExpanded);
// //     };

// //     // Filter pilots based on adminStatus and search
// //     const filteredPilots = pilots
// //         .filter(pilot => {
// //             const matchesStatus = selectedStatus === "all" || pilot.adminStatus === selectedStatus;
// //             const matchesSearch =
// //                 searchTerm === "" ||
// //                 pilot.pilotName.toLowerCase().includes(searchTerm.toLowerCase()) ||
// //                 pilot.newemail.toLowerCase().includes(searchTerm.toLowerCase()) ||
// //                 pilot.buyerPilotId.toLowerCase().includes(searchTerm.toLowerCase()) ||
// //                 pilot.specification?.toLowerCase().includes(searchTerm.toLowerCase()) ||
// //                 pilot.buyer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
// //                 pilot.location?.toLowerCase().includes(searchTerm.toLowerCase());
// //             return matchesStatus && matchesSearch;
// //         });

// //     // Sort filtered pilots
// //     const sortedPilots = [...filteredPilots].sort((a, b) => {
// //         const key = sortConfig.key;
// //         let aVal, bVal;

// //         // Handle nested properties
// //         if (key.includes('.')) {
// //             const keys = key.split('.');
// //             aVal = keys.reduce((obj, k) => obj && obj[k], a);
// //             bVal = keys.reduce((obj, k) => obj && obj[k], b);
// //         } else {
// //             aVal = a[key];
// //             bVal = b[key];
// //         }

// //         // Handle undefined/null values
// //         if (aVal == null) aVal = '';
// //         if (bVal == null) bVal = '';

// //         // Convert to string for comparison
// //         if (typeof aVal === 'string') {
// //             aVal = aVal.toLowerCase();
// //             bVal = bVal.toLowerCase();
// //         }

// //         if (sortConfig.direction === "asc") {
// //             return aVal > bVal ? 1 : -1;
// //         } else {
// //             return aVal < bVal ? 1 : -1;
// //         }
// //     });

// //     // Group pilots by buyer
// //     const pilotsByBuyer = {};
// //     sortedPilots.forEach(pilot => {
// //         if (!pilotsByBuyer[pilot.buyerId]) {
// //             pilotsByBuyer[pilot.buyerId] = {
// //                 buyerId: pilot.buyerId,
// //                 buyerName: pilot.buyer?.name || "Unknown Buyer",
// //                 pilots: []
// //             };
// //         }
// //         pilotsByBuyer[pilot.buyerId].pilots.push(pilot);
// //     });

// //     const statusStats = {
// //         all: pilots.length,
// //         pending: pilots.filter(p => p.adminStatus === "pending").length,
// //         approved: pilots.filter(p => p.adminStatus === "approved").length,
// //         rejected: pilots.filter(p => p.adminStatus === "rejected").length,
// //     };

// //     const handleSort = (key) => {
// //         setSortConfig(prev => ({
// //             key,
// //             direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
// //         }));
// //     };

// //     const SortIcon = ({ column }) => {
// //         if (sortConfig.key !== column) return <span className="sort-icon">⇅</span>;
// //         return <span className="sort-icon active">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>;
// //     };

// //     const PilotRow = ({ pilot, isSubRow = false }) => (
// //         <tr key={pilot.buyerPilotId} className={`pilot-row ${isSubRow ? 'sub-row' : ''}`}>
// //             <td className="sticky-col sticky-col-id">
// //                 <div className="pilot-id-cell">
// //                     <strong>{pilot.buyerPilotId}</strong>
// //                     <small>Created: {formatDate(pilot.createdAt)}</small>
// //                     <small>Updated: {formatDate(pilot.updatedAt)}</small>
// //                 </div>
// //             </td>

// //             <td className="sticky-col sticky-col-buyer-id">
// //                 <div className="buyer-id-cell">
// //                     <span>{pilot.buyerId}</span>
// //                     {pilot.buyer?.name && <small>{pilot.buyer.name}</small>}
// //                 </div>
// //             </td>

// //             <td className="cell-name">
// //                 <div className="name-cell">
// //                     {pilot.profilePhoto?.url ? (
// //                         <img
// //                             src={pilot.profilePhoto.url}
// //                             alt={pilot.pilotName}
// //                             className="avatar-img"
// //                             onError={(e) => {
// //                                 e.target.onerror = null;
// //                                 e.target.style.display = 'none';
// //                                 const parent = e.target.parentElement;
// //                                 const fallback = document.createElement('div');
// //                                 fallback.className = 'avatar';
// //                                 fallback.textContent = pilot.pilotName.charAt(0);
// //                                 parent.appendChild(fallback);
// //                             }}
// //                         />
// //                     ) : (
// //                         <div className="avatar">{pilot.pilotName.charAt(0)}</div>
// //                     )}
// //                     <div className="name-info">
// //                         <strong>{pilot.pilotName}</strong>
// //                         <small>📧 {pilot.newemail}</small>
// //                         <small>📞 {pilot.newphoneNumber}</small>
// //                         {pilot.pilotCompany && <small>🏢 {pilot.pilotCompany}</small>}
// //                     </div>
// //                 </div>
// //             </td>

// //             <td className="cell-specialization">
// //                 <span className="specialization">{pilot.specification || "Not specified"}</span>
// //                 {pilot.location && <small>📍 {pilot.location}</small>}
// //                 {pilot.description && (
// //                     <small className="description-truncate" title={pilot.description}>
// //                         {pilot.description.length > 50
// //                             ? `${pilot.description.substring(0, 50)}...`
// //                             : pilot.description}
// //                     </small>
// //                 )}
// //             </td>

// //             <td className="cell-price">
// //                 <div className="price-cell">
// //                     <span className="price-hour">₹{pilot.price?.perHour || 0}/hr</span>
// //                     <span className="price-day">₹{pilot.price?.perDay || 0}/day</span>
// //                 </div>
// //             </td>

// //             <td className="cell-certifications">
// //                 <div className="cert-count">
// //                     {pilot.certifications?.length || 0} certs
// //                 </div>
// //                 {pilot.certifications?.length > 0 && (
// //                     <button
// //                         className="view-certs-btn"
// //                         onClick={() => {
// //                             const certLinks = pilot.certifications.map((c, i) =>
// //                                 `${i + 1}. ${c.url}`
// //                             ).join('\n');
// //                             alert(`Certification URLs:\n${certLinks}`);
// //                         }}
// //                     >
// //                         👁️ View
// //                     </button>
// //                 )}
// //             </td>

// //             <td className="cell-availability">
// //                 <span className={`availability-badge ${pilot.availability ? 'available' : 'unavailable'}`}>
// //                     {pilot.availability ? '✅ Available' : '⏸️ Unavailable'}
// //                 </span>
// //             </td>

// //             <td className="cell-status">
// //                 <span className={`status-badge status-${pilot.adminStatus}`}>
// //                     {pilot.adminStatus?.toUpperCase() || "UNKNOWN"}
// //                 </span>
// //                 <br />
// //                 <small className="buyer-status">
// //                     Buyer Status: {pilot.buyerStatus || "N/A"}
// //                 </small>
// //             </td>

// //             <td className="cell-actions">
// //                 <div className="action-buttons">
// //                     {pilot.adminStatus === "pending" && (
// //                         <>
// //                             <button
// //                                 className="action-btn approve"
// //                                 onClick={() => updatePilotStatus(pilot.buyerPilotId, "approved")}
// //                                 disabled={updatingIds.has(`${pilot.buyerPilotId}-approved`)}
// //                                 title="Approve pilot"
// //                             >
// //                                 {updatingIds.has(`${pilot.buyerPilotId}-approved`) ? "⏳" : "✅"}
// //                             </button>
// //                             <button
// //                                 className="action-btn reject"
// //                                 onClick={() => updatePilotStatus(pilot.buyerPilotId, "rejected")}
// //                                 disabled={updatingIds.has(`${pilot.buyerPilotId}-rejected`)}
// //                                 title="Reject pilot"
// //                             >
// //                                 {updatingIds.has(`${pilot.buyerPilotId}-rejected`) ? "⏳" : "❌"}
// //                             </button>
// //                         </>
// //                     )}

// //                     {pilot.adminStatus === "approved" && (
// //                         <>
// //                             <button
// //                                 className="action-btn pending"
// //                                 onClick={() => updatePilotStatus(pilot.buyerPilotId, "pending")}
// //                                 disabled={updatingIds.has(`${pilot.buyerPilotId}-pending`)}
// //                                 title="Move to pending"
// //                             >
// //                                 {updatingIds.has(`${pilot.buyerPilotId}-pending`) ? "⏳" : "⏳"}
// //                             </button>
// //                             <button
// //                                 className="action-btn reject"
// //                                 onClick={() => updatePilotStatus(pilot.buyerPilotId, "rejected")}
// //                                 disabled={updatingIds.has(`${pilot.buyerPilotId}-rejected`)}
// //                                 title="Reject pilot"
// //                             >
// //                                 {updatingIds.has(`${pilot.buyerPilotId}-rejected`) ? "⏳" : "❌"}
// //                             </button>
// //                         </>
// //                     )}

// //                     {pilot.adminStatus === "rejected" && (
// //                         <>
// //                             <button
// //                                 className="action-btn pending"
// //                                 onClick={() => updatePilotStatus(pilot.buyerPilotId, "pending")}
// //                                 disabled={updatingIds.has(`${pilot.buyerPilotId}-pending`)}
// //                                 title="Move to pending"
// //                             >
// //                                 {updatingIds.has(`${pilot.buyerPilotId}-pending`) ? "⏳" : "⏳"}
// //                             </button>
// //                             <button
// //                                 className="action-btn approve"
// //                                 onClick={() => updatePilotStatus(pilot.buyerPilotId, "approved")}
// //                                 disabled={updatingIds.has(`${pilot.buyerPilotId}-approved`)}
// //                                 title="Approve pilot"
// //                             >
// //                                 {updatingIds.has(`${pilot.buyerPilotId}-approved`) ? "⏳" : "✅"}
// //                             </button>
// //                         </>
// //                     )}

// //                     <button
// //                         className="action-btn view"
// //                         onClick={() => {
// //                             const details = `
// // Pilot Details:
// // ────────────────────
// // ID: ${pilot.buyerPilotId}
// // Name: ${pilot.pilotName}
// // Email: ${pilot.newemail}
// // Phone: ${pilot.newphoneNumber}
// // Buyer ID: ${pilot.buyerId}
// // Buyer Name: ${pilot.buyer?.name || "N/A"}
// // Company: ${pilot.pilotCompany || "N/A"}
// // Location: ${pilot.location || "N/A"}
// // Specialization: ${pilot.specification || "N/A"}
// // Availability: ${pilot.availability ? "Available" : "Not Available"}
// // Price: ₹${pilot.price?.perHour || 0}/hour, ₹${pilot.price?.perDay || 0}/day
// // Certifications: ${pilot.certifications?.length || 0}
// // Admin Status: ${pilot.adminStatus}
// // Buyer Status: ${pilot.buyerStatus}
// // Description: ${pilot.description || "No description"}
// // Created: ${formatDate(pilot.createdAt)}
// // Updated: ${formatDate(pilot.updatedAt)}
// // ────────────────────
// // `;
// //                             alert(details);
// //                         }}
// //                         title="View full details"
// //                     >
// //                         👁️
// //                     </button>

// //                     <button
// //                         className="action-btn delete"
// //                         onClick={() => deletePilot(pilot.buyerPilotId)}
// //                         title="Delete pilot"
// //                         disabled={updatingIds.has(`${pilot.buyerPilotId}-deleting`)}
// //                     >
// //                         {updatingIds.has(`${pilot.buyerPilotId}-deleting`) ? "⏳" : "🗑"}
// //                     </button>
// //                 </div>
// //             </td>
// //         </tr>
// //     );

// //     return (
// //         <div className="buyer-pilots-container">
// //             {/* Header */}
// //             <div className="header-section">
// //                 <div className="header-top">
// //                     <h1 className="page-title">👨‍✈️ Buyer Pilots Management</h1>
// //                     <div className="header-controls">
// //                         <button
// //                             className="refresh-btn"
// //                             onClick={fetchPilots}
// //                             disabled={loading}
// //                         >
// //                             {loading ? "⏳ Loading..." : "↻ Refresh"}
// //                         </button>
// //                         <div className="total-count">
// //                             Total: {pilots.length} pilots
// //                         </div>
// //                     </div>
// //                 </div>

// //                 {/* Search Bar */}
// //                 <div className="search-container">
// //                     <input
// //                         type="text"
// //                         placeholder="Search by name, email, ID, buyer name, or location..."
// //                         className="search-input"
// //                         value={searchTerm}
// //                         onChange={(e) => setSearchTerm(e.target.value)}
// //                     />
// //                     <span className="search-icon">🔍</span>
// //                     {searchTerm && (
// //                         <button
// //                             className="clear-search"
// //                             onClick={() => setSearchTerm("")}
// //                             title="Clear search"
// //                         >
// //                             ✕
// //                         </button>
// //                     )}
// //                 </div>

// //                 {/* Error Message */}
// //                 {error && (
// //                     <div className="error-message">
// //                         ❌ {error}
// //                         <button
// //                             className="error-retry"
// //                             onClick={fetchPilots}
// //                         >
// //                             Retry
// //                         </button>
// //                     </div>
// //                 )}
// //             </div>

// //             {/* Status Tabs */}
// //             <div className="status-tabs-container">
// //                 {["all", "pending", "approved", "rejected"].map((status) => (
// //                     <button
// //                         key={status}
// //                         className={`status-tab ${selectedStatus === status ? "active" : ""}`}
// //                         onClick={() => setSelectedStatus(status)}
// //                         disabled={loading}
// //                     >
// //                         <span className="tab-icon">
// //                             {status === "all" && "👥"}
// //                             {status === "pending" && "⏳"}
// //                             {status === "approved" && "✅"}
// //                             {status === "rejected" && "❌"}
// //                         </span>
// //                         <span className="tab-text">
// //                             {status === "all" ? "All Pilots" : status.charAt(0).toUpperCase() + status.slice(1)}
// //                         </span>
// //                         <span className={`tab-count ${status}`}>
// //                             {statusStats[status]}
// //                         </span>
// //                     </button>
// //                 ))}
// //             </div>

// //             {/* Data Table with Horizontal Scroll */}
// //             <div className={`table-wrapper ${scrolled ? "scrolled" : ""}`}>
// //                 {loading ? (
// //                     <div className="no-data-message">
// //                         <div className="loading-spinner"></div>
// //                         <p>⏳ Loading buyer pilots data...</p>
// //                     </div>
// //                 ) : sortedPilots.length === 0 ? (
// //                     <div className="no-data-message">
// //                         <p>📭 No pilots found</p>
// //                         {searchTerm && (
// //                             <p className="no-data-hint">
// //                                 No results for "{searchTerm}". Try different keywords.
// //                             </p>
// //                         )}
// //                         {!searchTerm && pilots.length === 0 && (
// //                             <p className="no-data-hint">No buyer pilot registrations yet.</p>
// //                         )}
// //                         {!searchTerm && pilots.length > 0 && (
// //                             <p className="no-data-hint">
// //                                 No {selectedStatus !== "all" ? selectedStatus : ""} pilots found.
// //                                 {selectedStatus !== "all" && (
// //                                     <button
// //                                         className="show-all-link"
// //                                         onClick={() => setSelectedStatus("all")}
// //                                     >
// //                                         Show all pilots
// //                                     </button>
// //                                 )}
// //                             </p>
// //                         )}
// //                     </div>
// //                 ) : (
// //                     <div className="table-scroll-container" ref={tableRef} onScroll={handleTableScroll}>
// //                         <table className="pilots-table">
// //                             <thead>
// //                                 <tr>
// //                                     <th className="sticky-col sticky-col-id" onClick={() => handleSort("buyerPilotId")}>
// //                                         Pilot ID <SortIcon column="buyerPilotId" />
// //                                     </th>

// //                                     <th className="sticky-col sticky-col-buyer-id" onClick={() => handleSort("buyerId")}>
// //                                         Buyer ID <SortIcon column="buyerId" />
// //                                     </th>

// //                                     <th onClick={() => handleSort("pilotName")}>
// //                                         Pilot Details <SortIcon column="pilotName" />
// //                                     </th>
// //                                     <th onClick={() => handleSort("specification")}>
// //                                         Specialization <SortIcon column="specification" />
// //                                     </th>
// //                                     <th onClick={() => handleSort("price.perHour")}>
// //                                         Pricing <SortIcon column="price.perHour" />
// //                                     </th>
// //                                     <th>Certifications</th>
// //                                     <th onClick={() => handleSort("availability")}>
// //                                         Availability <SortIcon column="availability" />
// //                                     </th>
// //                                     <th onClick={() => handleSort("adminStatus")}>
// //                                         Status <SortIcon column="adminStatus" />
// //                                     </th>
// //                                     <th>Actions</th>
// //                                 </tr>
// //                             </thead>
// //                             <tbody>
// //                                 {Object.values(pilotsByBuyer).map((buyerGroup) => {
// //                                     const pilotsForBuyer = buyerGroup.pilots;

// //                                     if (pilotsForBuyer.length === 0) return null;

// //                                     const isExpanded = expandedBuyers.has(buyerGroup.buyerId);
// //                                     const hasMultiplePilots = buyerGroup.pilots.length > 2;

// //                                     return (
// //                                         <React.Fragment key={buyerGroup.buyerId}>
// //                                             {/* Main row - shows first pilot or buyer info if multiple */}
// //                                             {hasMultiplePilots ? (
// //                                                 <tr
// //                                                     className="buyer-header-row"
// //                                                     onClick={() => toggleBuyer(buyerGroup.buyerId)}
// //                                                     style={{ cursor: "pointer", backgroundColor: "#f0f0f0" }}
// //                                                 >
// //                                                     <td colSpan="9" className="buyer-header-cell">
// //                                                         <span className="expand-icon">
// //                                                             {isExpanded ? "▼" : "▶"}
// //                                                         </span>
// //                                                         <span className="buyer-info">
// //                                                             Buyer: {buyerGroup.buyerName} ({buyerGroup.buyerId})
// //                                                         </span>
// //                                                         <span className="pilot-count">
// //                                                             {buyerGroup.pilots.length} pilot{buyerGroup.pilots.length > 1 ? 's' : ''}
// //                                                         </span>
// //                                                         <span className="status-summary">
// //                                                             Approved: {buyerGroup.pilots.filter(p => p.adminStatus === 'approved').length} |
// //                                                             Pending: {buyerGroup.pilots.filter(p => p.adminStatus === 'pending').length} |
// //                                                             Rejected: {buyerGroup.pilots.filter(p => p.adminStatus === 'rejected').length}
// //                                                         </span>
// //                                                     </td>
// //                                                 </tr>
// //                                             ) : null}

// //                                             {/* Show pilots - either all if ≤2, or expanded if >2 */}
// //                                             {(!hasMultiplePilots || isExpanded) && pilotsForBuyer.map((pilot) => (
// //                                                 <PilotRow
// //                                                     key={pilot.buyerPilotId}
// //                                                     pilot={pilot}
// //                                                     isSubRow={hasMultiplePilots}
// //                                                 />
// //                                             ))}
// //                                         </React.Fragment>
// //                                     );
// //                                 })}
// //                             </tbody>
// //                         </table>
// //                     </div>
// //                 )}
// //             </div>

// //             {/* Footer Stats */}
// //             <div className="footer-stats">
// //                 <div className="stat-item">
// //                     <span className="stat-label">Total Pilots:</span>
// //                     <span className="stat-value">{pilots.length}</span>
// //                 </div>
// //                 <div className="stat-item">
// //                     <span className="stat-label">Pending:</span>
// //                     <span className="stat-value pending">{statusStats.pending}</span>
// //                 </div>
// //                 <div className="stat-item">
// //                     <span className="stat-label">Approved:</span>
// //                     <span className="stat-value approved">{statusStats.approved}</span>
// //                 </div>
// //                 <div className="stat-item">
// //                     <span className="stat-label">Rejected:</span>
// //                     <span className="stat-value rejected">{statusStats.rejected}</span>
// //                 </div>
// //                 <div className="stat-item">
// //                     <span className="stat-label">Available:</span>
// //                     <span className="stat-value available">
// //                         {pilots.filter(p => p.availability).length}
// //                     </span>
// //                 </div>
// //                 <div className="stat-item">
// //                     <span className="stat-label">Avg Hourly Rate:</span>
// //                     <span className="stat-value price">
// //                         ₹{pilots.length > 0
// //                             ? Math.round(pilots.reduce((sum, p) => sum + (p.price?.perHour || 0), 0) / pilots.length)
// //                             : 0}
// //                     </span>
// //                 </div>
// //                 <div className="stat-item">
// //                     <span className="stat-label">Showing:</span>
// //                     <span className="stat-value showing">
// //                         {sortedPilots.length} of {pilots.length}
// //                     </span>
// //                 </div>
// //             </div>
// //         </div>
// //     );
// // }

// // export default BuyerPilots;

// import React, { useEffect, useState, useRef } from "react";
// import "../styles/BuyerPilot.css";

// const GRAPHQL_URL = "http://localhost:5001/graphql";

// function BuyerPilots() {
//     const [pilots, setPilots] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [selectedStatus, setSelectedStatus] = useState("all");
//     const [updatingIds, setUpdatingIds] = useState(new Set());
//     const [searchTerm, setSearchTerm] = useState("");
//     const [sortConfig, setSortConfig] = useState({ key: "pilotName", direction: "asc" });
//     const [expandedBuyers, setExpandedBuyers] = useState(new Set());
//     const tableRef = useRef(null);
//     const [scrolled, setScrolled] = useState(false);
//     const [viewingCertificates, setViewingCertificates] = useState(null);
//     const [viewingDetails, setViewingDetails] = useState(null);

//     // Fetch pilots data
//     const fetchPilots = async () => {
//         setLoading(true);
//         setError(null);

//         const query = `
//             query {
//                 buyerPilots {
//                     _id
//                     buyerPilotId
//                     pilotName
//                     pilotCompany
//                     location
//                     availability
//                     specification
//                     price {
//                         perHour
//                         perDay
//                     }
//                     certifications {
//                         url
//                     }
//                     profilePhoto {
//                         url
//                     }
//                     description
//                     newemail
//                     newphoneNumber
//                     adminStatus
//                     buyerStatus
//                     buyerId
//                     createdAt
//                     updatedAt
//                     buyer {
//                         name
//                         email
//                         phoneNumber
//                     }
//                 }
//             }
//         `;

//         try {
//             const res = await fetch(GRAPHQL_URL, {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({ query }),
//             });

//             if (!res.ok) {
//                 const errorText = await res.text();
//                 throw new Error(`HTTP ${res.status}: ${errorText}`);
//             }

//             const result = await res.json();

//             if (result.errors) {
//                 setError(result.errors[0].message);
//                 setPilots([]);
//             } else {
//                 const data = result.data?.buyerPilots || [];
//                 setPilots(data);
//             }
//         } catch (err) {
//             console.error("Error fetching buyer pilots:", err);
//             setError(err.message);
//             setPilots([]);
//         } finally {
//             setLoading(false);
//         }
//     };

//     // Format date
//     const formatDate = (dateString) => {
//         if (!dateString) return "N/A";
//         const date = new Date(dateString);
//         return date.toLocaleDateString('en-US', {
//             year: 'numeric',
//             month: 'short',
//             day: 'numeric',
//             hour: '2-digit',
//             minute: '2-digit'
//         });
//     };

//     // Update pilot status
//     const updatePilotStatus = async (buyerPilotId, newStatus) => {
//         const updatingIdsCopy = new Set(updatingIds);
//         updatingIdsCopy.add(`${buyerPilotId}-${newStatus}`);
//         setUpdatingIds(updatingIdsCopy);

//         const mutation = `
//             mutation AdminUpdateBuyerPilotStatus(
//                 $buyerPilotId: String!,
//                 $adminStatus: String!
//             ) {
//                 adminUpdateBuyerPilotStatus(
//                     buyerPilotId: $buyerPilotId,
//                     adminStatus: $adminStatus
//                 ) {
//                     buyerPilotId
//                     adminStatus
//                     buyerStatus
//                     pilotName
//                 }
//             }
//         `;

//         try {
//             const res = await fetch(GRAPHQL_URL, {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({
//                     query: mutation,
//                     variables: {
//                         buyerPilotId,
//                         adminStatus: newStatus.toLowerCase()
//                     },
//                 }),
//             });

//             if (!res.ok) {
//                 const errorText = await res.text();
//                 throw new Error(`HTTP ${res.status}: ${errorText}`);
//             }

//             const result = await res.json();

//             if (result.errors) {
//                 throw new Error(result.errors[0].message);
//             }

//             // Update local state immediately for better UX
//             setPilots(prevPilots =>
//                 prevPilots.map(pilot =>
//                     pilot.buyerPilotId === buyerPilotId
//                         ? { ...pilot, adminStatus: newStatus.toLowerCase() }
//                         : pilot
//                 )
//             );

//             // Show success message
//             alert(`✅ Pilot "${result.data?.adminUpdateBuyerPilotStatus?.pilotName || buyerPilotId}" status updated to ${newStatus}`);

//             // Refresh the data to ensure consistency
//             setTimeout(() => {
//                 fetchPilots();
//             }, 500);

//         } catch (err) {
//             console.error("Error updating pilot status:", err);
//             setError(err.message);
//             alert(`❌ Failed to update status: ${err.message}`);
//         } finally {
//             const updatingIdsCopy = new Set(updatingIds);
//             updatingIdsCopy.delete(`${buyerPilotId}-${newStatus}`);
//             setUpdatingIds(updatingIdsCopy);
//         }
//     };

//     // Delete pilot
//     const deletePilot = async (buyerPilotId) => {
//         const pilot = pilots.find(p => p.buyerPilotId === buyerPilotId);
//         if (!pilot) {
//             setError("Pilot not found");
//             return;
//         }

//         if (!window.confirm(`Are you sure you want to delete pilot "${pilot.pilotName}"?\n\nThis action cannot be undone.`)) return;

//         const mutation = `
//             mutation DeleteBuyerPilot($buyerPilotId: String!) {
//                 deleteBuyerPilot(buyerPilotId: $buyerPilotId)
//             }
//         `;

//         try {
//             const res = await fetch(GRAPHQL_URL, {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({
//                     query: mutation,
//                     variables: { buyerPilotId }
//                 }),
//             });

//             const result = await res.json();

//             if (result.errors) {
//                 throw new Error(result.errors[0].message);
//             }

//             // Update local state immediately
//             setPilots(prev => prev.filter(pilot => pilot.buyerPilotId !== buyerPilotId));

//             alert(`✅ Pilot "${pilot.pilotName}" deleted successfully!`);

//             // Refresh the data
//             setTimeout(() => {
//                 fetchPilots();
//             }, 500);

//         } catch (err) {
//             console.error("Error deleting pilot:", err);
//             setError(err.message);
//             alert(`❌ Failed to delete pilot: ${err.message}`);
//         }
//     };

//     // View certificates in modal
//     const viewCertificates = (pilot) => {
//         setViewingCertificates(pilot);
//     };

//     // View full pilot details
//     const viewFullDetails = (pilot) => {
//         setViewingDetails(pilot);
//     };

//     // Open certificate URL in new tab
//     const openCertificateUrl = (url) => {
//         window.open(url, '_blank', 'noopener,noreferrer');
//     };

//     // Handle scroll to show shadow on sticky columns
//     const handleTableScroll = (e) => {
//         const isScrolled = e.target.scrollLeft > 0;
//         setScrolled(isScrolled);
//     };

//     // Initial fetch
//     useEffect(() => {
//         fetchPilots();
//     }, []);

//     // Toggle buyer expansion
//     const toggleBuyer = (buyerId) => {
//         const newExpanded = new Set(expandedBuyers);
//         if (newExpanded.has(buyerId)) {
//             newExpanded.delete(buyerId);
//         } else {
//             newExpanded.add(buyerId);
//         }
//         setExpandedBuyers(newExpanded);
//     };

//     // Filter pilots based on adminStatus and search
//     const filteredPilots = pilots
//         .filter(pilot => {
//             const matchesStatus = selectedStatus === "all" || pilot.adminStatus === selectedStatus;
//             const matchesSearch =
//                 searchTerm === "" ||
//                 pilot.pilotName.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                 pilot.newemail.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                 pilot.buyerPilotId.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                 pilot.specification?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                 pilot.buyer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                 pilot.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                 pilot.description?.toLowerCase().includes(searchTerm.toLowerCase());
//             return matchesStatus && matchesSearch;
//         });

//     // Sort filtered pilots
//     const sortedPilots = [...filteredPilots].sort((a, b) => {
//         const key = sortConfig.key;
//         let aVal, bVal;

//         // Handle nested properties
//         if (key.includes('.')) {
//             const keys = key.split('.');
//             aVal = keys.reduce((obj, k) => obj && obj[k], a);
//             bVal = keys.reduce((obj, k) => obj && obj[k], b);
//         } else {
//             aVal = a[key];
//             bVal = b[key];
//         }

//         // Handle undefined/null values
//         if (aVal == null) aVal = '';
//         if (bVal == null) bVal = '';

//         // Convert to string for comparison
//         if (typeof aVal === 'string') {
//             aVal = aVal.toLowerCase();
//             bVal = bVal.toLowerCase();
//         }

//         if (sortConfig.direction === "asc") {
//             return aVal > bVal ? 1 : -1;
//         } else {
//             return aVal < bVal ? 1 : -1;
//         }
//     });

//     // Group pilots by buyer
//     const pilotsByBuyer = {};
//     sortedPilots.forEach(pilot => {
//         if (!pilotsByBuyer[pilot.buyerId]) {
//             pilotsByBuyer[pilot.buyerId] = {
//                 buyerId: pilot.buyerId,
//                 buyerName: pilot.buyer?.name || "Unknown Buyer",
//                 pilots: []
//             };
//         }
//         pilotsByBuyer[pilot.buyerId].pilots.push(pilot);
//     });

//     const statusStats = {
//         all: pilots.length,
//         pending: pilots.filter(p => p.adminStatus === "pending").length,
//         approved: pilots.filter(p => p.adminStatus === "approved").length,
//         rejected: pilots.filter(p => p.adminStatus === "rejected").length,
//     };

//     const handleSort = (key) => {
//         setSortConfig(prev => ({
//             key,
//             direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
//         }));
//     };

//     const SortIcon = ({ column }) => {
//         if (sortConfig.key !== column) return <span className="sort-icon">⇅</span>;
//         return <span className="sort-icon active">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>;
//     };

//     const PilotRow = ({ pilot, isSubRow = false }) => (
//         <tr key={pilot.buyerPilotId} className={`pilot-row ${isSubRow ? 'sub-row' : ''}`}>
//             <td className="sticky-col sticky-col-id">
//                 <div className="pilot-id-cell">
//                     <strong>{pilot.buyerPilotId}</strong>
//                     <small>Created: {formatDate(pilot.createdAt)}</small>
//                     <small>Updated: {formatDate(pilot.updatedAt)}</small>
//                 </div>
//             </td>

//             <td className="sticky-col sticky-col-buyer-id">
//                 <div className="buyer-id-cell">
//                     <span>{pilot.buyerId}</span>
//                     {pilot.buyer?.name && <small>{pilot.buyer.name}</small>}
//                 </div>
//             </td>

//             <td className="cell-name">
//                 <div className="name-cell">
//                     {pilot.profilePhoto?.url ? (
//                         <img
//                             src={pilot.profilePhoto.url}
//                             alt={pilot.pilotName}
//                             className="avatar-img"
//                             onError={(e) => {
//                                 e.target.onerror = null;
//                                 e.target.style.display = 'none';
//                                 const parent = e.target.parentElement;
//                                 const fallback = document.createElement('div');
//                                 fallback.className = 'avatar';
//                                 fallback.textContent = pilot.pilotName.charAt(0);
//                                 parent.appendChild(fallback);
//                             }}
//                         />
//                     ) : (
//                         <div className="avatar">{pilot.pilotName.charAt(0)}</div>
//                     )}
//                     <div className="name-info">
//                         <strong>{pilot.pilotName}</strong>
//                         <small>📧 {pilot.newemail}</small>
//                         <small>📞 {pilot.newphoneNumber}</small>
//                         {pilot.pilotCompany && <small>🏢 {pilot.pilotCompany}</small>}
//                     </div>
//                 </div>
//             </td>

//             <td className="cell-specialization">
//                 <span className="specialization">{pilot.specification || "Not specified"}</span>
//                 {pilot.location && <small>📍 {pilot.location}</small>}
//             </td>

//             <td className="cell-price">
//                 <div className="price-cell">
//                     <span className="price-hour">₹{pilot.price?.perHour || 0}/hr</span>
//                     <span className="price-day">₹{pilot.price?.perDay || 0}/day</span>
//                 </div>
//             </td>

//             <td className="cell-certifications">
//                 <div className="cert-count">
//                     {pilot.certifications?.length || 0} certs
//                 </div>
//                 {pilot.certifications?.length > 0 && (
//                     <button
//                         className="view-certs-btn"
//                         onClick={() => viewCertificates(pilot)}
//                         title="View Certificates"
//                     >
//                         👁️ View
//                     </button>
//                 )}
//             </td>

//             <td className="cell-availability">
//                 <span className={`availability-badge ${pilot.availability ? 'available' : 'unavailable'}`}>
//                     {pilot.availability ? '✅ Available' : '⏸️ Unavailable'}
//                 </span>
//             </td>

//             <td className="cell-status">
//                 <span className={`status-badge status-${pilot.adminStatus}`}>
//                     {pilot.adminStatus?.toUpperCase() || "UNKNOWN"}
//                 </span>
//                 <br />
//                 <small className="buyer-status">
//                     Buyer Status: {pilot.buyerStatus || "N/A"}
//                 </small>
//             </td>

//             <td className="cell-actions">
//                 <div className="action-buttons">
//                     {pilot.adminStatus === "pending" && (
//                         <>
//                             <button
//                                 className="action-btn approve"
//                                 onClick={() => updatePilotStatus(pilot.buyerPilotId, "approved")}
//                                 disabled={updatingIds.has(`${pilot.buyerPilotId}-approved`)}
//                                 title="Approve pilot"
//                             >
//                                 {updatingIds.has(`${pilot.buyerPilotId}-approved`) ? "⏳" : "✅"}
//                             </button>
//                             <button
//                                 className="action-btn reject"
//                                 onClick={() => updatePilotStatus(pilot.buyerPilotId, "rejected")}
//                                 disabled={updatingIds.has(`${pilot.buyerPilotId}-rejected`)}
//                                 title="Reject pilot"
//                             >
//                                 {updatingIds.has(`${pilot.buyerPilotId}-rejected`) ? "⏳" : "❌"}
//                             </button>
//                         </>
//                     )}

//                     {pilot.adminStatus === "approved" && (
//                         <>
//                             <button
//                                 className="action-btn pending"
//                                 onClick={() => updatePilotStatus(pilot.buyerPilotId, "pending")}
//                                 disabled={updatingIds.has(`${pilot.buyerPilotId}-pending`)}
//                                 title="Move to pending"
//                             >
//                                 {updatingIds.has(`${pilot.buyerPilotId}-pending`) ? "⏳" : "⏳"}
//                             </button>
//                             <button
//                                 className="action-btn reject"
//                                 onClick={() => updatePilotStatus(pilot.buyerPilotId, "rejected")}
//                                 disabled={updatingIds.has(`${pilot.buyerPilotId}-rejected`)}
//                                 title="Reject pilot"
//                             >
//                                 {updatingIds.has(`${pilot.buyerPilotId}-rejected`) ? "⏳" : "❌"}
//                             </button>
//                         </>
//                     )}

//                     {pilot.adminStatus === "rejected" && (
//                         <>
//                             <button
//                                 className="action-btn pending"
//                                 onClick={() => updatePilotStatus(pilot.buyerPilotId, "pending")}
//                                 disabled={updatingIds.has(`${pilot.buyerPilotId}-pending`)}
//                                 title="Move to pending"
//                             >
//                                 {updatingIds.has(`${pilot.buyerPilotId}-pending`) ? "⏳" : "⏳"}
//                             </button>
//                             <button
//                                 className="action-btn approve"
//                                 onClick={() => updatePilotStatus(pilot.buyerPilotId, "approved")}
//                                 disabled={updatingIds.has(`${pilot.buyerPilotId}-approved`)}
//                                 title="Approve pilot"
//                             >
//                                 {updatingIds.has(`${pilot.buyerPilotId}-approved`) ? "⏳" : "✅"}
//                             </button>
//                         </>
//                     )}

//                     <button
//                         className="action-btn view"
//                         onClick={() => viewFullDetails(pilot)}
//                         title="View full details"
//                     >
//                         👁️
//                     </button>

//                     <button
//                         className="action-btn delete"
//                         onClick={() => deletePilot(pilot.buyerPilotId)}
//                         title="Delete pilot"
//                         disabled={updatingIds.has(`${pilot.buyerPilotId}-deleting`)}
//                     >
//                         {updatingIds.has(`${pilot.buyerPilotId}-deleting`) ? "⏳" : "🗑"}
//                     </button>
//                 </div>
//             </td>
//         </tr>
//     );

//     // Certificate Modal Component
//     const CertificateModal = () => {
//         if (!viewingCertificates) return null;

//         return (
//             <div className="certificate-modal-overlay">
//                 <div className="certificate-modal">
//                     <div className="certificate-modal-header">
//                         <h3>Certificates for {viewingCertificates.pilotName}</h3>
//                         <button className="close-modal" onClick={() => setViewingCertificates(null)}>✕</button>
//                     </div>
//                     <div className="certificate-modal-body">
//                         {viewingCertificates.certifications?.length === 0 ? (
//                             <div className="no-certificates">No certificates uploaded</div>
//                         ) : (
//                             <div className="certificate-list">
//                                 {viewingCertificates.certifications?.map((cert, index) => (
//                                     <div key={index} className="certificate-item">
//                                         <div className="certificate-header">
//                                             <span className="certificate-number">Certificate #{index + 1}</span>
//                                             <button
//                                                 className="open-certificate-btn"
//                                                 onClick={() => openCertificateUrl(cert.url)}
//                                             >
//                                                 🔗 Open in New Tab
//                                             </button>
//                                         </div>
//                                         <div className="certificate-url">
//                                             <span className="url-label">URL:</span>
//                                             <a
//                                                 href={cert.url}
//                                                 target="_blank"
//                                                 rel="noopener noreferrer"
//                                                 className="certificate-link"
//                                             >
//                                                 {cert.url.length > 60 ? cert.url.substring(0, 60) + "..." : cert.url}
//                                             </a>
//                                         </div>
//                                         <div className="certificate-preview">
//                                             <img
//                                                 src={cert.url}
//                                                 alt={`Certificate ${index + 1}`}
//                                                 className="certificate-image"
//                                                 onError={(e) => {
//                                                     e.target.onerror = null;
//                                                     e.target.parentElement.innerHTML = `
//                                                         <div class="certificate-fallback">
//                                                             <div class="fallback-icon">📄</div>
//                                                             <div class="fallback-text">Certificate Preview Not Available</div>
//                                                             <button class="open-certificate-btn" onclick="window.open('${cert.url}', '_blank')">
//                                                                 🔗 Open Certificate
//                                                             </button>
//                                                         </div>
//                                                     `;
//                                                 }}
//                                             />
//                                         </div>
//                                     </div>
//                                 ))}
//                             </div>
//                         )}
//                     </div>
//                 </div>
//             </div>
//         );
//     };

//     // Details Modal Component
//     const DetailsModal = () => {
//         if (!viewingDetails) return null;

//         const pilot = viewingDetails;

//         return (
//             <div className="details-modal-overlay">
//                 <div className="details-modal">
//                     <div className="details-modal-header">
//                         <h3>Pilot Details: {pilot.pilotName}</h3>
//                         <button className="close-modal" onClick={() => setViewingDetails(null)}>✕</button>
//                     </div>
//                     <div className="details-modal-body">
//                         <div className="details-grid">
//                             <div className="detail-section">
//                                 <h4>Basic Information</h4>
//                                 <div className="detail-item">
//                                     <span className="detail-label">Pilot ID:</span>
//                                     <span className="detail-value">{pilot.buyerPilotId}</span>
//                                 </div>
//                                 <div className="detail-item">
//                                     <span className="detail-label">Full Name:</span>
//                                     <span className="detail-value">{pilot.pilotName}</span>
//                                 </div>
//                                 <div className="detail-item">
//                                     <span className="detail-label">Company:</span>
//                                     <span className="detail-value">{pilot.pilotCompany || "N/A"}</span>
//                                 </div>
//                                 <div className="detail-item">
//                                     <span className="detail-label">Location:</span>
//                                     <span className="detail-value">{pilot.location || "N/A"}</span>
//                                 </div>
//                                 <div className="detail-item">
//                                     <span className="detail-label">Specialization:</span>
//                                     <span className="detail-value">{pilot.specification || "N/A"}</span>
//                                 </div>
//                             </div>

//                             <div className="detail-section">
//                                 <h4>Contact Information</h4>
//                                 <div className="detail-item">
//                                     <span className="detail-label">Email:</span>
//                                     <span className="detail-value">{pilot.newemail}</span>
//                                 </div>
//                                 <div className="detail-item">
//                                     <span className="detail-label">Phone:</span>
//                                     <span className="detail-value">{pilot.newphoneNumber}</span>
//                                 </div>
//                                 <div className="detail-item">
//                                     <span className="detail-label">Buyer Name:</span>
//                                     <span className="detail-value">{pilot.buyer?.name || "N/A"}</span>
//                                 </div>
//                                 <div className="detail-item">
//                                     <span className="detail-label">Buyer Email:</span>
//                                     <span className="detail-value">{pilot.buyer?.email || "N/A"}</span>
//                                 </div>
//                                 <div className="detail-item">
//                                     <span className="detail-label">Buyer Phone:</span>
//                                     <span className="detail-value">{pilot.buyer?.phoneNumber || "N/A"}</span>
//                                 </div>
//                             </div>

//                             <div className="detail-section">
//                                 <h4>Pricing & Status</h4>
//                                 <div className="detail-item">
//                                     <span className="detail-label">Hourly Rate:</span>
//                                     <span className="detail-value">₹{pilot.price?.perHour || 0}/hour</span>
//                                 </div>
//                                 <div className="detail-item">
//                                     <span className="detail-label">Daily Rate:</span>
//                                     <span className="detail-value">₹{pilot.price?.perDay || 0}/day</span>
//                                 </div>
//                                 <div className="detail-item">
//                                     <span className="detail-label">Availability:</span>
//                                     <span className="detail-value">
//                                         <span className={`availability-badge ${pilot.availability ? 'available' : 'unavailable'}`}>
//                                             {pilot.availability ? 'Available' : 'Not Available'}
//                                         </span>
//                                     </span>
//                                 </div>
//                                 <div className="detail-item">
//                                     <span className="detail-label">Admin Status:</span>
//                                     <span className="detail-value">
//                                         <span className={`status-badge status-${pilot.adminStatus}`}>
//                                             {pilot.adminStatus?.toUpperCase() || "UNKNOWN"}
//                                         </span>
//                                     </span>
//                                 </div>
//                                 <div className="detail-item">
//                                     <span className="detail-label">Buyer Status:</span>
//                                     <span className="detail-value">{pilot.buyerStatus || "N/A"}</span>
//                                 </div>
//                             </div>

//                             <div className="detail-section full-width">
//                                 <h4>Description</h4>
//                                 <div className="detail-item full-width">
//                                     <span className="detail-label">Professional Summary:</span>
//                                     <div className="detail-value description-text">
//                                         {pilot.description || "No description provided"}
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="detail-section full-width">
//                                 <h4>Timestamps</h4>
//                                 <div className="detail-item">
//                                     <span className="detail-label">Created:</span>
//                                     <span className="detail-value">{formatDate(pilot.createdAt)}</span>
//                                 </div>
//                                 <div className="detail-item">
//                                     <span className="detail-label">Last Updated:</span>
//                                     <span className="detail-value">{formatDate(pilot.updatedAt)}</span>
//                                 </div>
//                             </div>

//                             <div className="detail-section full-width">
//                                 <h4>Certifications</h4>
//                                 <div className="certification-list">
//                                     {pilot.certifications?.length === 0 ? (
//                                         <div className="no-certificates">No certifications uploaded</div>
//                                     ) : (
//                                         pilot.certifications?.map((cert, index) => (
//                                             <div key={index} className="certification-item">
//                                                 <span className="cert-number">Certificate #{index + 1}</span>
//                                                 <a
//                                                     href={cert.url}
//                                                     target="_blank"
//                                                     rel="noopener noreferrer"
//                                                     className="cert-link"
//                                                 >
//                                                     🔗 View Certificate
//                                                 </a>
//                                             </div>
//                                         ))
//                                     )}
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                     <div className="details-modal-footer">
//                         <button className="close-btn" onClick={() => setViewingDetails(null)}>Close</button>
//                     </div>
//                 </div>
//             </div>
//         );
//     };

//     return (
//         <div className="buyer-pilots-container">
//             {/* Header */}
//             <div className="header-section">
//                 <div className="header-top">
//                     <h1 className="page-title">👨‍✈️ Buyer Pilots Management</h1>
//                     <div className="header-controls">
//                         <button
//                             className="refresh-btn"
//                             onClick={fetchPilots}
//                             disabled={loading}
//                         >
//                             {loading ? "⏳ Loading..." : "↻ Refresh"}
//                         </button>
//                         <div className="total-count">
//                             Total: {pilots.length} pilots
//                         </div>
//                     </div>
//                 </div>

//                 {/* Search Bar */}
//                 <div className="search-container">
//                     <input
//                         type="text"
//                         placeholder="Search by name, email, ID, buyer name, location, or description..."
//                         className="search-input"
//                         value={searchTerm}
//                         onChange={(e) => setSearchTerm(e.target.value)}
//                     />
//                     <span className="search-icon">🔍</span>
//                     {searchTerm && (
//                         <button
//                             className="clear-search"
//                             onClick={() => setSearchTerm("")}
//                             title="Clear search"
//                         >
//                             ✕
//                         </button>
//                     )}
//                 </div>

//                 {/* Error Message */}
//                 {error && (
//                     <div className="error-message">
//                         ❌ {error}
//                         <button
//                             className="error-retry"
//                             onClick={fetchPilots}
//                         >
//                             Retry
//                         </button>
//                     </div>
//                 )}
//             </div>

//             {/* Status Tabs */}
//             <div className="status-tabs-container">
//                 {["all", "pending", "approved", "rejected"].map((status) => (
//                     <button
//                         key={status}
//                         className={`status-tab ${selectedStatus === status ? "active" : ""}`}
//                         onClick={() => setSelectedStatus(status)}
//                         disabled={loading}
//                     >
//                         <span className="tab-icon">
//                             {status === "all" && "👥"}
//                             {status === "pending" && "⏳"}
//                             {status === "approved" && "✅"}
//                             {status === "rejected" && "❌"}
//                         </span>
//                         <span className="tab-text">
//                             {status === "all" ? "All Pilots" : status.charAt(0).toUpperCase() + status.slice(1)}
//                         </span>
//                         <span className={`tab-count ${status}`}>
//                             {statusStats[status]}
//                         </span>
//                     </button>
//                 ))}
//             </div>

//             {/* Data Table with Horizontal Scroll */}
//             <div className={`table-wrapper ${scrolled ? "scrolled" : ""}`}>
//                 {loading ? (
//                     <div className="no-data-message">
//                         <div className="loading-spinner"></div>
//                         <p>⏳ Loading buyer pilots data...</p>
//                     </div>
//                 ) : sortedPilots.length === 0 ? (
//                     <div className="no-data-message">
//                         <p>📭 No pilots found</p>
//                         {searchTerm && (
//                             <p className="no-data-hint">
//                                 No results for "{searchTerm}". Try different keywords.
//                             </p>
//                         )}
//                         {!searchTerm && pilots.length === 0 && (
//                             <p className="no-data-hint">No buyer pilot registrations yet.</p>
//                         )}
//                         {!searchTerm && pilots.length > 0 && (
//                             <p className="no-data-hint">
//                                 No {selectedStatus !== "all" ? selectedStatus : ""} pilots found.
//                                 {selectedStatus !== "all" && (
//                                     <button
//                                         className="show-all-link"
//                                         onClick={() => setSelectedStatus("all")}
//                                     >
//                                         Show all pilots
//                                     </button>
//                                 )}
//                             </p>
//                         )}
//                     </div>
//                 ) : (
//                     <div className="table-scroll-container" ref={tableRef} onScroll={handleTableScroll}>
//                         <table className="pilots-table">
//                             <thead>
//                                 <tr>
//                                     <th className="sticky-col sticky-col-id" onClick={() => handleSort("buyerPilotId")}>
//                                         Pilot ID <SortIcon column="buyerPilotId" />
//                                     </th>

//                                     <th className="sticky-col sticky-col-buyer-id" onClick={() => handleSort("buyerId")}>
//                                         Buyer ID <SortIcon column="buyerId" />
//                                     </th>

//                                     <th onClick={() => handleSort("pilotName")}>
//                                         Pilot Details <SortIcon column="pilotName" />
//                                     </th>
//                                     <th onClick={() => handleSort("specification")}>
//                                         Specialization <SortIcon column="specification" />
//                                     </th>
//                                     <th onClick={() => handleSort("price.perHour")}>
//                                         Pricing <SortIcon column="price.perHour" />
//                                     </th>
//                                     <th>Certifications</th>
//                                     <th onClick={() => handleSort("availability")}>
//                                         Availability <SortIcon column="availability" />
//                                     </th>
//                                     <th onClick={() => handleSort("adminStatus")}>
//                                         Status <SortIcon column="adminStatus" />
//                                     </th>
//                                     <th>Actions</th>
//                                 </tr>
//                             </thead>
//                             <tbody>
//                                 {Object.values(pilotsByBuyer).map((buyerGroup) => {
//                                     const pilotsForBuyer = buyerGroup.pilots;

//                                     if (pilotsForBuyer.length === 0) return null;

//                                     const isExpanded = expandedBuyers.has(buyerGroup.buyerId);
//                                     const hasMultiplePilots = buyerGroup.pilots.length > 2;

//                                     return (
//                                         <React.Fragment key={buyerGroup.buyerId}>
//                                             {/* Main row - shows first pilot or buyer info if multiple */}
//                                             {hasMultiplePilots ? (
//                                                 <tr
//                                                     className="buyer-header-row"
//                                                     onClick={() => toggleBuyer(buyerGroup.buyerId)}
//                                                     style={{ cursor: "pointer", backgroundColor: "#f0f0f0" }}
//                                                 >
//                                                     <td colSpan="9" className="buyer-header-cell">
//                                                         <span className="expand-icon">
//                                                             {isExpanded ? "▼" : "▶"}
//                                                         </span>
//                                                         <span className="buyer-info">
//                                                             Buyer: {buyerGroup.buyerName} ({buyerGroup.buyerId})
//                                                         </span>
//                                                         <span className="pilot-count">
//                                                             {buyerGroup.pilots.length} pilot{buyerGroup.pilots.length > 1 ? 's' : ''}
//                                                         </span>
//                                                         <span className="status-summary">
//                                                             Approved: {buyerGroup.pilots.filter(p => p.adminStatus === 'approved').length} |
//                                                             Pending: {buyerGroup.pilots.filter(p => p.adminStatus === 'pending').length} |
//                                                             Rejected: {buyerGroup.pilots.filter(p => p.adminStatus === 'rejected').length}
//                                                         </span>
//                                                     </td>
//                                                 </tr>
//                                             ) : null}

//                                             {/* Show pilots - either all if ≤2, or expanded if >2 */}
//                                             {(!hasMultiplePilots || isExpanded) && pilotsForBuyer.map((pilot) => (
//                                                 <PilotRow
//                                                     key={pilot.buyerPilotId}
//                                                     pilot={pilot}
//                                                     isSubRow={hasMultiplePilots}
//                                                 />
//                                             ))}
//                                         </React.Fragment>
//                                     );
//                                 })}
//                             </tbody>
//                         </table>
//                     </div>
//                 )}
//             </div>



//             {/* Certificate Modal */}
//             <CertificateModal />

//             {/* Details Modal */}
//             <DetailsModal />
//         </div>
//     );
// }

// export default BuyerPilots;

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
    const [viewingCertificates, setViewingCertificates] = useState(null);
    const [viewingDetails, setViewingDetails] = useState(null);

    // Fetch pilots data
    const fetchPilots = async () => {
        setLoading(true);
        setError(null);

        const query = `
            query {
                buyerPilots {
                    _id
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
                    profilePhoto {
                        url
                    }
                    description
                    newemail
                    newphoneNumber
                    adminStatus
                    buyerStatus
                    buyerId
                    createdAt
                    updatedAt
                    buyer {
                        name
                        email
                        phoneNumber
                    }
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
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
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
                throw new Error(result.errors[0].message);
            }

            // Update local state immediately for better UX
            setPilots(prevPilots =>
                prevPilots.map(pilot =>
                    pilot.buyerPilotId === buyerPilotId
                        ? { ...pilot, adminStatus: newStatus.toLowerCase() }
                        : pilot
                )
            );

            // Show success message
            alert(`✅ Pilot "${result.data?.adminUpdateBuyerPilotStatus?.pilotName || buyerPilotId}" status updated to ${newStatus}`);

            // Refresh the data to ensure consistency
            setTimeout(() => {
                fetchPilots();
            }, 500);

        } catch (err) {
            console.error("Error updating pilot status:", err);
            setError(err.message);
            alert(`❌ Failed to update status: ${err.message}`);
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

        if (!window.confirm(`Are you sure you want to delete pilot "${pilot.pilotName}"?\n\nThis action cannot be undone.`)) return;

        const mutation = `
            mutation DeleteBuyerPilot($buyerPilotId: String!) {
                deleteBuyerPilot(buyerPilotId: $buyerPilotId)
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

            // Update local state immediately
            setPilots(prev => prev.filter(pilot => pilot.buyerPilotId !== buyerPilotId));

            alert(`✅ Pilot "${pilot.pilotName}" deleted successfully!`);

            // Refresh the data
            setTimeout(() => {
                fetchPilots();
            }, 500);

        } catch (err) {
            console.error("Error deleting pilot:", err);
            setError(err.message);
            alert(`❌ Failed to delete pilot: ${err.message}`);
        }
    };

    // View certificates in modal
    const viewCertificates = (pilot) => {
        setViewingCertificates(pilot);
    };

    // View full pilot details
    const viewFullDetails = (pilot) => {
        setViewingDetails(pilot);
    };

    // Open certificate URL in new tab
    const openCertificateUrl = (url) => {
        window.open(url, '_blank', 'noopener,noreferrer');
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

    // Filter pilots based on adminStatus and search
    const filteredPilots = pilots
        .filter(pilot => {
            const matchesStatus = selectedStatus === "all" || pilot.adminStatus === selectedStatus;
            const matchesSearch =
                searchTerm === "" ||
                pilot.pilotName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pilot.newemail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pilot.buyerPilotId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pilot.specification?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pilot.buyer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pilot.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pilot.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pilot.pilotCompany?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesStatus && matchesSearch;
        });

    // Sort filtered pilots
    const sortedPilots = [...filteredPilots].sort((a, b) => {
        const key = sortConfig.key;
        let aVal, bVal;

        // Handle nested properties
        if (key.includes('.')) {
            const keys = key.split('.');
            aVal = keys.reduce((obj, k) => obj && obj[k], a);
            bVal = keys.reduce((obj, k) => obj && obj[k], b);
        } else {
            aVal = a[key];
            bVal = b[key];
        }

        // Handle undefined/null values
        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';

        // Convert to string for comparison
        if (typeof aVal === 'string') {
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
    sortedPilots.forEach(pilot => {
        if (!pilotsByBuyer[pilot.buyerId]) {
            pilotsByBuyer[pilot.buyerId] = {
                buyerId: pilot.buyerId,
                buyerName: pilot.buyer?.name || "Unknown Buyer",
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
                    <small>Updated: {formatDate(pilot.updatedAt)}</small>
                </div>
            </td>

            <td className="sticky-col sticky-col-buyer-id">
                <div className="buyer-id-cell">
                    <span>{pilot.buyerId}</span>
                    {pilot.buyer?.name && <small>{pilot.buyer.name}</small>}
                </div>
            </td>

            <td className="cell-name">
                <div className="name-cell">
                    {pilot.profilePhoto?.url ? (
                        <img
                            src={pilot.profilePhoto.url}
                            alt={pilot.pilotName}
                            className="avatar-img"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                const parent = e.target.parentElement;
                                const fallback = document.createElement('div');
                                fallback.className = 'avatar';
                                fallback.textContent = pilot.pilotName.charAt(0);
                                parent.appendChild(fallback);
                            }}
                        />
                    ) : (
                        <div className="avatar">{pilot.pilotName.charAt(0)}</div>
                    )}
                    <div className="name-info">
                        <strong>{pilot.pilotName}</strong>
                        <small>📧 {pilot.newemail}</small>
                        <small>📞 {pilot.newphoneNumber}</small>
                        {pilot.pilotCompany && <small>🏢 {pilot.pilotCompany}</small>}
                        {pilot.location && <small>📍 {pilot.location}</small>}
                    </div>
                </div>
            </td>

            <td className="cell-specialization">
                <span className="specialization">{pilot.specification || "Not specified"}</span>
                {pilot.description && (
                    <div className="description-preview">
                        {pilot.description.length > 50
                            ? `${pilot.description.substring(0, 50)}...`
                            : pilot.description}
                    </div>
                )}
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
                        onClick={() => viewCertificates(pilot)}
                        title="View Certificates"
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
                    {pilot.adminStatus?.toUpperCase() || "UNKNOWN"}
                </span>
                <br />
                <small className="buyer-status">
                    Buyer Status: {pilot.buyerStatus || "N/A"}
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
                                {updatingIds.has(`${pilot.buyerPilotId}-approved`) ? "⏳" : "✅"}
                            </button>
                            <button
                                className="action-btn reject"
                                onClick={() => updatePilotStatus(pilot.buyerPilotId, "rejected")}
                                disabled={updatingIds.has(`${pilot.buyerPilotId}-rejected`)}
                                title="Reject pilot"
                            >
                                {updatingIds.has(`${pilot.buyerPilotId}-rejected`) ? "⏳" : "❌"}
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
                                {updatingIds.has(`${pilot.buyerPilotId}-pending`) ? "⏳" : "⏳"}
                            </button>
                            <button
                                className="action-btn reject"
                                onClick={() => updatePilotStatus(pilot.buyerPilotId, "rejected")}
                                disabled={updatingIds.has(`${pilot.buyerPilotId}-rejected`)}
                                title="Reject pilot"
                            >
                                {updatingIds.has(`${pilot.buyerPilotId}-rejected`) ? "⏳" : "❌"}
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
                                {updatingIds.has(`${pilot.buyerPilotId}-pending`) ? "⏳" : "⏳"}
                            </button>
                            <button
                                className="action-btn approve"
                                onClick={() => updatePilotStatus(pilot.buyerPilotId, "approved")}
                                disabled={updatingIds.has(`${pilot.buyerPilotId}-approved`)}
                                title="Approve pilot"
                            >
                                {updatingIds.has(`${pilot.buyerPilotId}-approved`) ? "⏳" : "✅"}
                            </button>
                        </>
                    )}

                    <button
                        className="action-btn view"
                        onClick={() => viewFullDetails(pilot)}
                        title="View full details"
                    >
                        👁️
                    </button>

                    <button
                        className="action-btn delete"
                        onClick={() => deletePilot(pilot.buyerPilotId)}
                        title="Delete pilot"
                        disabled={updatingIds.has(`${pilot.buyerPilotId}-deleting`)}
                    >
                        {updatingIds.has(`${pilot.buyerPilotId}-deleting`) ? "⏳" : "🗑"}
                    </button>
                </div>
            </td>
        </tr>
    );

    // Certificate Modal Component
    const CertificateModal = () => {
        if (!viewingCertificates) return null;

        return (
            <div className="certificate-modal-overlay">
                <div className="certificate-modal">
                    <div className="certificate-modal-header">
                        <h3>Certificates for {viewingCertificates.pilotName}</h3>
                        <button className="close-modal" onClick={() => setViewingCertificates(null)}>✕</button>
                    </div>
                    <div className="certificate-modal-body">
                        {viewingCertificates.certifications?.length === 0 ? (
                            <div className="no-certificates">No certificates uploaded</div>
                        ) : (
                            <div className="certificate-list">
                                {viewingCertificates.certifications?.map((cert, index) => (
                                    <div key={index} className="certificate-item">
                                        <div className="certificate-header">
                                            <span className="certificate-number">Certificate #{index + 1}</span>
                                            <button
                                                className="open-certificate-btn"
                                                onClick={() => openCertificateUrl(cert.url)}
                                            >
                                                🔗 Open in New Tab
                                            </button>
                                        </div>
                                        <div className="certificate-url">
                                            <span className="url-label">URL:</span>
                                            <a
                                                href={cert.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="certificate-link"
                                            >
                                                {cert.url.length > 60 ? cert.url.substring(0, 60) + "..." : cert.url}
                                            </a>
                                        </div>
                                        <div className="certificate-preview">
                                            <img
                                                src={cert.url}
                                                alt={`Certificate ${index + 1}`}
                                                className="certificate-image"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.parentElement.innerHTML = `
                                                        <div class="certificate-fallback">
                                                            <div class="fallback-icon">📄</div>
                                                            <div class="fallback-text">Certificate Preview Not Available</div>
                                                            <button class="open-certificate-btn" onclick="window.open('${cert.url}', '_blank')">
                                                                🔗 Open Certificate
                                                            </button>
                                                        </div>
                                                    `;
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Details Modal Component
    const DetailsModal = () => {
        if (!viewingDetails) return null;

        const pilot = viewingDetails;

        return (
            <div className="details-modal-overlay">
                <div className="details-modal">
                    <div className="details-modal-header">
                        <h3>Pilot Details: {pilot.pilotName}</h3>
                        <button className="close-modal" onClick={() => setViewingDetails(null)}>✕</button>
                    </div>
                    <div className="details-modal-body">
                        <div className="details-grid">
                            <div className="detail-section">
                                <h4>Basic Information</h4>
                                <div className="detail-item">
                                    <span className="detail-label">Pilot ID:</span>
                                    <span className="detail-value">{pilot.buyerPilotId}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Full Name:</span>
                                    <span className="detail-value">{pilot.pilotName}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Company:</span>
                                    <span className="detail-value">{pilot.pilotCompany || "N/A"}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Location:</span>
                                    <span className="detail-value">{pilot.location || "N/A"}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Specialization:</span>
                                    <span className="detail-value">{pilot.specification || "N/A"}</span>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h4>Contact Information</h4>
                                <div className="detail-item">
                                    <span className="detail-label">Email:</span>
                                    <span className="detail-value">{pilot.newemail}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Phone:</span>
                                    <span className="detail-value">{pilot.newphoneNumber}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Buyer Name:</span>
                                    <span className="detail-value">{pilot.buyer?.name || "N/A"}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Buyer Email:</span>
                                    <span className="detail-value">{pilot.buyer?.email || "N/A"}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Buyer Phone:</span>
                                    <span className="detail-value">{pilot.buyer?.phoneNumber || "N/A"}</span>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h4>Pricing & Status</h4>
                                <div className="detail-item">
                                    <span className="detail-label">Hourly Rate:</span>
                                    <span className="detail-value">₹{pilot.price?.perHour || 0}/hour</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Daily Rate:</span>
                                    <span className="detail-value">₹{pilot.price?.perDay || 0}/day</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Availability:</span>
                                    <span className="detail-value">
                                        <span className={`availability-badge ${pilot.availability ? 'available' : 'unavailable'}`}>
                                            {pilot.availability ? 'Available' : 'Not Available'}
                                        </span>
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Admin Status:</span>
                                    <span className="detail-value">
                                        <span className={`status-badge status-${pilot.adminStatus}`}>
                                            {pilot.adminStatus?.toUpperCase() || "UNKNOWN"}
                                        </span>
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Buyer Status:</span>
                                    <span className="detail-value">{pilot.buyerStatus || "N/A"}</span>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h4>Professional Details</h4>
                                <div className="detail-item">
                                    <span className="detail-label">Certifications:</span>
                                    <span className="detail-value">
                                        {pilot.certifications?.length || 0} uploaded
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Profile Photo:</span>
                                    <span className="detail-value">
                                        {pilot.profilePhoto?.url ? (
                                            <a href={pilot.profilePhoto.url} target="_blank" rel="noopener noreferrer">
                                                🔗 View Photo
                                            </a>
                                        ) : "Not uploaded"}
                                    </span>
                                </div>
                            </div>

                            <div className="detail-section full-width">
                                <h4>Professional Summary</h4>
                                <div className="detail-item full-width">
                                    <span className="detail-label">Description:</span>
                                    <div className="detail-value description-text">
                                        {pilot.description || "No description provided"}
                                    </div>
                                </div>
                            </div>

                            <div className="detail-section full-width">
                                <h4>Timestamps</h4>
                                <div className="detail-item">
                                    <span className="detail-label">Created:</span>
                                    <span className="detail-value">{formatDate(pilot.createdAt)}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Last Updated:</span>
                                    <span className="detail-value">{formatDate(pilot.updatedAt)}</span>
                                </div>
                            </div>

                            <div className="detail-section full-width">
                                <h4>Certifications</h4>
                                <div className="certification-list">
                                    {pilot.certifications?.length === 0 ? (
                                        <div className="no-certificates">No certifications uploaded</div>
                                    ) : (
                                        pilot.certifications?.map((cert, index) => (
                                            <div key={index} className="certification-item">
                                                <span className="cert-number">Certificate #{index + 1}</span>
                                                <a
                                                    href={cert.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="cert-link"
                                                >
                                                    🔗 View Certificate
                                                </a>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="details-modal-footer">
                        <button className="close-btn" onClick={() => setViewingDetails(null)}>Close</button>
                    </div>
                </div>
            </div>
        );
    };

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
                            {loading ? "⏳ Loading..." : "↻ Refresh"}
                        </button>
                        <div className="total-count">
                            Total: {pilots.length} pilots
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Search by name, email, ID, company, location, or description..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <span className="search-icon">🔍</span>
                    {searchTerm && (
                        <button
                            className="clear-search"
                            onClick={() => setSearchTerm("")}
                            title="Clear search"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="error-message">
                        ❌ {error}
                        <button
                            className="error-retry"
                            onClick={fetchPilots}
                        >
                            Retry
                        </button>
                    </div>
                )}
            </div>

            {/* Status Tabs */}
            <div className="status-tabs-container">
                {["all", "pending", "approved", "rejected"].map((status) => (
                    <button
                        key={status}
                        className={`status-tab ${selectedStatus === status ? "active" : ""}`}
                        onClick={() => setSelectedStatus(status)}
                        disabled={loading}
                    >
                        <span className="tab-icon">
                            {status === "all" && "👥"}
                            {status === "pending" && "⏳"}
                            {status === "approved" && "✅"}
                            {status === "rejected" && "❌"}
                        </span>
                        <span className="tab-text">
                            {status === "all" ? "All Pilots" : status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                        <span className={`tab-count ${status}`}>
                            {statusStats[status]}
                        </span>
                    </button>
                ))}
            </div>

            {/* Data Table with Horizontal Scroll */}
            <div className={`table-wrapper ${scrolled ? "scrolled" : ""}`}>
                {loading ? (
                    <div className="no-data-message">
                        <div className="loading-spinner"></div>
                        <p>⏳ Loading buyer pilots data...</p>
                    </div>
                ) : sortedPilots.length === 0 ? (
                    <div className="no-data-message">
                        <p>📭 No pilots found</p>
                        {searchTerm && (
                            <p className="no-data-hint">
                                No results for "{searchTerm}". Try different keywords.
                            </p>
                        )}
                        {!searchTerm && pilots.length === 0 && (
                            <p className="no-data-hint">No buyer pilot registrations yet.</p>
                        )}
                        {!searchTerm && pilots.length > 0 && (
                            <p className="no-data-hint">
                                No {selectedStatus !== "all" ? selectedStatus : ""} pilots found.
                                {selectedStatus !== "all" && (
                                    <button
                                        className="show-all-link"
                                        onClick={() => setSelectedStatus("all")}
                                    >
                                        Show all pilots
                                    </button>
                                )}
                            </p>
                        )}
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
                                        Specialization & Description <SortIcon column="specification" />
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
                                    const pilotsForBuyer = buyerGroup.pilots;

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
                                                            {isExpanded ? "▼" : "▶"}
                                                        </span>
                                                        <span className="buyer-info">
                                                            Buyer: {buyerGroup.buyerName} ({buyerGroup.buyerId})
                                                        </span>
                                                        <span className="pilot-count">
                                                            {buyerGroup.pilots.length} pilot{buyerGroup.pilots.length > 1 ? 's' : ''}
                                                        </span>
                                                        <span className="status-summary">
                                                            Approved: {buyerGroup.pilots.filter(p => p.adminStatus === 'approved').length} |
                                                            Pending: {buyerGroup.pilots.filter(p => p.adminStatus === 'pending').length} |
                                                            Rejected: {buyerGroup.pilots.filter(p => p.adminStatus === 'rejected').length}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ) : null}

                                            {/* Show pilots - either all if ≤2, or expanded if >2 */}
                                            {(!hasMultiplePilots || isExpanded) && pilotsForBuyer.map((pilot) => (
                                                <PilotRow
                                                    key={pilot.buyerPilotId}
                                                    pilot={pilot}
                                                    isSubRow={hasMultiplePilots}
                                                />
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>


            {/* Certificate Modal */}
            <CertificateModal />

            {/* Details Modal */}
            <DetailsModal />
        </div>
    );
}

export default BuyerPilots;