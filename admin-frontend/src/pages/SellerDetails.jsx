// import React, { useEffect, useState } from "react";
// import {
//   FaSearch, FaEdit, FaTrash, FaEye, FaUserCircle, FaBuilding,
//   FaMapMarkerAlt, FaCalendarAlt, FaFilter, FaUserCheck, FaDownload,
//   FaPlus, FaHelicopter, FaCog, FaWrench, FaUserTie, FaBriefcase, FaTimes
// } from "react-icons/fa";

// const GRAPHQL_URL = "http://127.0.0.1:5001/graphql";

// export default function SellerManagement() {
//   const [sellers, setSellers] = useState([]);
//   const [filteredSellers, setFilteredSellers] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [statusFilter, setStatusFilter] = useState("All");
//   const [cityFilter, setCityFilter] = useState("All");
//   const [sortBy, setSortBy] = useState("customId");
//   const [selectedSeller, setSelectedSeller] = useState(null);
//   const [showModal, setShowModal] = useState(false);
//   const [showProductsModal, setShowProductsModal] = useState(false);
//   const [productViewType, setProductViewType] = useState(null);
//   const [productData, setProductData] = useState([]);
//   const [productLoading, setProductLoading] = useState(false);
//   const [productSearchTerm, setProductSearchTerm] = useState("");
//   const [productCounts, setProductCounts] = useState({});

//   const callGraphQL = async (query, variables = {}) => {
//     const res = await fetch(GRAPHQL_URL, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ query, variables }),
//     });
//     const json = await res.json();
//     if (json.errors?.length) throw new Error(json.errors[0].message);
//     return json.data;
//   };

//   const fetchSellers = async () => {
//     setLoading(true);
//     setError(null);
//     const query = `query { getSellers { customId name companyName address email phoneNumber status } }`;
//     try {
//       const data = await callGraphQL(query);
//       const mapped = (data.getSellers || []).map((s, i) => ({
//         id: i + 1,
//         sellerId: s.customId,
//         name: s.name || s.companyName || "Unknown",
//         address: s.address || "",
//         city: "", state: "", zipCode: "", country: "India",
//         registrationDate: s.createdAt?.slice(0, 10) || "",
//         status: s.status === "approved" ? "Active" : s.status === "pending" ? "Pending" : "Suspended",
//         raw: s,
//       }));
//       setSellers(mapped);
//       setFilteredSellers(mapped);

//       mapped.forEach(seller => fetchProductCounts(seller.sellerId));
//     } catch (err) {
//       setError(err.message);
//     }
//     setLoading(false);
//   };

//   const fetchProductCounts = async (sellerId) => {
//     const query = `
//       query {
//         getSellerView(sellerId: "${sellerId}") {
//           parts { partId }
//           accessories { accessoryId }
//           rentals { rentalId }
//           services { serviceId }
//           drones { droneId }
//           hirepilots { pilotId }
//           hirejobs { jobId }
//         }
//       }
//     `;

//     try {
//       const data = await callGraphQL(query);
//       const view = data.getSellerView || {};

//       setProductCounts(prev => ({
//         ...prev,
//         [sellerId]: {
//           drones: (view.drones || []).length,
//           parts: (view.parts || []).length,
//           accessories: (view.accessories || []).length,
//           rentals: (view.rentals || []).length,
//           services: (view.services || []).length,
//           pilots: (view.hirepilots || []).length,
//           jobs: (view.hirejobs || []).length,
//         }
//       }));
//     } catch (err) {
//       console.error(`Failed to fetch counts for ${sellerId}:`, err);
//     }
//   };

//   const fetchProductsByType = async (sellerId, type) => {
//     setProductLoading(true);
//     const queries = {
//       drones: `query { getDronesBySeller(sellerId: "${sellerId}") { droneId name brand price description status quantity } }`,
//       parts: `query { getPartsBySeller(sellerId: "${sellerId}") { partId name brand price description status quantity } }`,
//       accessories: `query { getAccessoriesBySeller(sellerId: "${sellerId}") { accessoryId name brand price description status quantity } }`,
//       rentals: `query { getRentalsBySeller(sellerId: "${sellerId}") { rentalId name brand location pricePerHour pricePerDay description status } }`,
//       services: `query { getServicesBySeller(sellerId: "${sellerId}") { serviceId name description price location status } }`,
//       pilots: `query { getSellerView(sellerId: "${sellerId}") { hirepilots { pilotId pilotName pilotCompany location pricePerHour pricePerDay description adminStatus } } }`,
//       jobs: `query { getSellerView(sellerId: "${sellerId}") { hirejobs { jobId jobName companyName jobType location salary description status } } }`
//     };

//     try {
//       const data = await callGraphQL(queries[type] || "");
//       let products = [];
//       if (type === "pilots") products = data.getSellerView?.hirepilots || [];
//       else if (type === "jobs") products = data.getSellerView?.hirejobs || [];
//       else products = data[`get${type.charAt(0).toUpperCase() + type.slice(1)}BySeller`] || [];
//       setProductData(products);
//     } catch (err) {
//       console.error(err);
//       setProductData([]);
//     }
//     setProductLoading(false);
//   };

//   useEffect(() => { fetchSellers(); }, []);

//   useEffect(() => {
//     let result = [...sellers];
//     if (searchTerm) {
//       const q = searchTerm.toLowerCase();
//       result = result.filter(s =>
//         s.name.toLowerCase().includes(q) ||
//         s.sellerId.toLowerCase().includes(q) ||
//         (s.address || "").toLowerCase().includes(q)
//       );
//     }
//     if (statusFilter !== "All") result = result.filter(s => s.status === statusFilter);
//     if (cityFilter !== "All") result = result.filter(s => s.city === cityFilter);
//     result.sort((a, b) => {
//       if (sortBy === "sellerId") return a.sellerId.localeCompare(b.sellerId);
//       if (sortBy === "name") return a.name.localeCompare(b.name);
//       if (sortBy === "date") return new Date(b.registrationDate) - new Date(a.registrationDate);
//       return 0;
//     });
//     setFilteredSellers(result);
//   }, [searchTerm, statusFilter, cityFilter, sortBy, sellers]);

//   const handleViewDetails = (seller) => {
//     setSelectedSeller(seller);
//     setShowModal(true);
//   };

//   const handleViewProducts = (seller, type) => {
//     setSelectedSeller(seller);
//     setProductViewType(type);
//     setShowProductsModal(true);
//     setProductSearchTerm("");
//     fetchProductsByType(seller.sellerId, type);
//   };

//   const handleDelete = async (id) => {
//     const seller = sellers.find(s => s.id === id);
//     if (!seller || !window.confirm(`Delete ${seller.sellerId}?`)) return;
//     try {
//       await callGraphQL(`mutation { deleteSeller(customId: "${seller.sellerId}") { customId } }`);
//       setSellers(prev => prev.filter(s => s.id !== id));
//     } catch (err) {
//       alert("Delete failed: " + err.message);
//     }
//   };

//   const renderProductCard = (item) => {
//     const configs = {
//       drones: { id: item.droneId, icon: FaHelicopter, title: item.name, subtitle: item.brand, price: item.price, status: item.status, qty: item.quantity },
//       parts: { id: item.partId, icon: FaCog, title: item.name, subtitle: item.brand, price: item.price, status: item.status, qty: item.quantity },
//       accessories: { id: item.accessoryId, icon: FaCog, title: item.name, subtitle: item.brand, price: item.price, status: item.status, qty: item.quantity },
//       rentals: { id: item.rentalId, icon: FaHelicopter, title: item.name, subtitle: item.brand, rental: `₹${item.pricePerHour}/hr • ₹${item.pricePerDay}/day`, location: item.location, status: item.status },
//       services: { id: item.serviceId, icon: FaWrench, title: item.name, price: item.price, location: item.location, status: item.status },
//       pilots: { id: item.pilotId, icon: FaUserTie, title: item.pilotName, subtitle: item.pilotCompany, rental: `₹${item.pricePerHour}/hr • ₹${item.pricePerDay}/day`, location: item.location, status: item.adminStatus },
//       jobs: { id: item.jobId, icon: FaBriefcase, title: item.jobName, subtitle: item.companyName, type: item.jobType, location: item.location, salary: item.salary, status: item.status }
//     };
//     const info = configs[productViewType];
//     const IconComponent = info.icon;

//     return (
//       <div key={info.id} className="product-card">
//         <div className="product-header">
//           <IconComponent className="product-icon" />
//           <span className="product-id">{info.id}</span>
//         </div>
//         <h4>{info.title}</h4>
//         {info.subtitle && <p className="product-brand">{info.subtitle}</p>}
//         {info.type && <p className="product-type">{info.type}</p>}
//         {info.price && <p className="product-price">₹{info.price.toLocaleString()}</p>}
//         {info.rental && <div className="rental-pricing">{info.rental}</div>}
//         {info.salary && <p className="product-price">₹{info.salary}</p>}
//         {info.location && <p className="product-location"><FaMapMarkerAlt /> {info.location}</p>}
//         {item.description && <p className="product-desc">{item.description}</p>}
//         <div className="product-footer">
//           <span className={`status-badge status-${info.status?.toLowerCase()}`}>{info.status}</span>
//           {info.qty && <span className="product-qty">Qty: {info.qty}</span>}
//         </div>
//       </div>
//     );
//   };

//   const filteredProducts = productData.filter(item =>
//     !productSearchTerm || JSON.stringify(item).toLowerCase().includes(productSearchTerm.toLowerCase())
//   );

//   const renderProductCountItem = (productType, IconComponent, labelText, seller) => {
//     const count = productCounts[seller.sellerId]?.[productType] || 0;
//     return (
//       <div
//         key={productType}
//         className="product-count-item"
//         onClick={() => handleViewProducts(seller, productType)}
//         title={`View ${labelText}`}
//       >
//         <IconComponent className="product-count-icon" />
//         <span className="product-count-label">{labelText}</span>
//         <div className="product-count-number">{count}</div>
//       </div>
//     );
//   };

//   if (loading) return <div className="seller-details-container">Loading...</div>;
//   if (error) return <div className="seller-details-container"><p style={{ color: "red" }}>Error: {error}</p><button onClick={fetchSellers}>Retry</button></div>;

//   const productLabels = { drones: "Drones", parts: "Parts", accessories: "Accessories", rentals: "Rentals", services: "Services", pilots: "Pilots", jobs: "Jobs" };

//   return (
//     <div className="seller-details-container">
//       <style>{`
//         * { box-sizing: border-box; }
//         .seller-details-container { padding: 24px; background: #f5f7fa; min-height: 100vh; font-family: system-ui, -apple-system, sans-serif; }
//         .seller-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
//         .header-content h1 { font-size: 28px; margin: 0 0 8px 0; color: #1a202c; display: flex; align-items: center; gap: 12px; }
//         .header-content p { color: #718096; margin: 0; }
//         .header-actions { display: flex; gap: 12px; }
//         .stats-overview { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 32px; }
//         .stat-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); display: flex; gap: 16px; transition: transform 0.2s; }
//         .stat-card:hover { transform: translateY(-4px); box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
//         .stat-icon { font-size: 32px; color: #4299e1; }
//         .stat-info h3 { margin: 0 0 8px 0; font-size: 14px; color: #718096; font-weight: 600; }
//         .stat-number { font-size: 24px; font-weight: bold; color: #1a202c; margin: 0; }
//         .stat-change { font-size: 12px; color: #a0aec0; }
//         .filters-section { background: white; padding: 20px; border-radius: 12px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
//         .search-container { display: flex; flex-direction: column; gap: 16px; }
//         .search-box { position: relative; }
//         .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #a0aec0; }
//         .search-input { width: 100%; padding: 12px 12px 12px 40px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px; }
//         .search-input:focus { outline: none; border-color: #4299e1; background: #f0f7ff; }
//         .filter-controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
//         .filter-group { display: flex; flex-direction: column; gap: 8px; }
//         .filter-group label { font-size: 13px; font-weight: 600; color: #4a5568; display: flex; align-items: center; gap: 6px; }
//         .filter-select { padding: 10px 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px; background: white; cursor: pointer; }
//         .sellers-table-section { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden; }
//         .table-header { padding: 20px; border-bottom: 2px solid #e2e8f0; }
//         .table-header h3 { margin: 0 0 8px 0; font-size: 18px; color: #1a202c; }
//         .count-badge { background: #edf2f7; color: #2d3748; padding: 4px 8px; border-radius: 6px; font-size: 13px; font-weight: 600; }
//         .table-summary { font-size: 13px; color: #718096; }
//         .table-wrapper { overflow-x: auto; max-height: calc(100vh - 400px); position: relative; }
//         .sellers-table { width: 100%; border-collapse: collapse; }
//         .sellers-table thead { background: #f7fafc; position: sticky; top: 0; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
//         .sellers-table th { padding: 16px; text-align: left; font-size: 12px; font-weight: 700; color: #4a5568; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; background: #f7fafc; }
//         .sellers-table td { padding: 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #2d3748; }
//         .seller-row:hover { background: #f7fafc; }
//         .seller-id-badge { display: flex; align-items: center; gap: 8px; font-weight: 600; }
//         .seller-info { display: flex; align-items: center; gap: 12px; }
//         .seller-avatar { width: 40px; height: 40px; border-radius: 50%; background: #edf2f7; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #4299e1; }
//         .seller-details h4 { margin: 0 0 4px 0; font-size: 14px; }
//         .seller-details p { margin: 0; font-size: 12px; color: #718096; }
//         .product-counts { display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 8px; }
//         .product-count-item { background: #f7fafc; padding: 8px; border-radius: 6px; text-align: center; cursor: pointer; transition: all 0.2s; border: 2px solid transparent; }
//         .product-count-item:hover { background: #e6f7ff; border-color: #4299e1; transform: translateY(-2px); }
//         .product-count-icon { font-size: 18px; color: #4299e1; margin-bottom: 4px; }
//         .product-count-label { font-size: 10px; color: #718096; display: block; margin-bottom: 2px; }
//         .product-count-number { font-size: 14px; font-weight: bold; color: #1a202c; }
//         .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: capitalize; }
//         .status-pending { background: #fef5e7; color: #d68910; }
//         .status-approved, .status-active { background: #d4edda; color: #155724; }
//         .status-rejected, .status-suspended { background: #f8d7da; color: #721c24; }
//         .action-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
//         .action-btn { width: 36px; height: 36px; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; transition: all 0.2s; }
//         .view-btn { background: #e6f7ff; color: #0050b3; }
//         .view-btn:hover { background: #0050b3; color: white; }
//         .edit-btn { background: #f6f8fb; color: #4299e1; }
//         .edit-btn:hover { background: #4299e1; color: white; }
//         .delete-btn { background: #fff1f0; color: #ff4d4f; }
//         .delete-btn:hover { background: #ff4d4f; color: white; }
//         .btn { padding: 10px 16px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; }
//         .btn-export { background: #48bb78; color: white; }
//         .btn-export:hover { background: #38a169; }
//         .btn-add { background: #4299e1; color: white; }
//         .btn-add:hover { background: #3182ce; }
//         .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
//         .modal-content { background: white; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 1200px; width: 100%; max-height: 90vh; overflow-y: auto; animation: slideIn 0.3s; }
//         @keyframes slideIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
//         .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 2px solid #e2e8f0; position: sticky; top: 0; background: white; z-index: 10; }
//         .modal-header h2 { margin: 0; font-size: 20px; color: #1a202c; display: flex; align-items: center; gap: 12px; }
//         .modal-close { background: none; border: none; font-size: 28px; cursor: pointer; color: #718096; transition: all 0.2s; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 6px; }
//         .modal-close:hover { background: #f7fafc; color: #2d3748; }
//         .modal-body { padding: 20px; }
//         .modal-search { margin-bottom: 20px; }
//         .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
//         .product-card { background: #f7fafc; padding: 16px; border-radius: 8px; border: 2px solid #e2e8f0; transition: all 0.2s; }
//         .product-card:hover { border-color: #4299e1; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
//         .product-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
//         .product-icon { font-size: 24px; color: #4299e1; }
//         .product-id { font-size: 11px; color: #718096; font-weight: 600; }
//         .product-card h4 { margin: 0 0 8px 0; font-size: 16px; color: #1a202c; }
//         .product-brand, .product-type { font-size: 13px; color: #718096; margin: 0 0 8px 0; }
//         .product-price { font-size: 18px; font-weight: bold; color: #2d3748; margin: 8px 0; }
//         .rental-pricing { font-size: 14px; color: #4299e1; font-weight: 600; margin: 8px 0; }
//         .product-location { font-size: 12px; color: #718096; margin: 4px 0; display: flex; align-items: center; gap: 4px; }
//         .product-desc { font-size: 13px; color: #4a5568; margin: 8px 0; line-height: 1.5; max-height: 60px; overflow: hidden; text-overflow: ellipsis; }
//         .product-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; }
//         .product-qty { font-size: 12px; color: #718096; font-weight: 600; }
//         .no-products { text-align: center; padding: 40px; color: #718096; }
//         @media (max-width: 768px) {
//           .seller-header { flex-direction: column; gap: 16px; align-items: flex-start; }
//           .stats-overview, .filter-controls { grid-template-columns: 1fr; }
//           .product-counts { grid-template-columns: repeat(2, 1fr); }
//         }
//       `}</style>

//       <div className="seller-header">
//         <div className="header-content">
//           <h1><FaMapMarkerAlt /> Seller Management</h1>
//           <p>Manage sellers and view their products</p>
//         </div>
//         <div className="header-actions">
//           <button className="btn btn-export" onClick={() => alert("Export feature")}>
//             <FaDownload /> Export
//           </button>
//           <button className="btn btn-add" onClick={() => alert("Add seller")}>
//             <FaPlus /> Add Seller
//           </button>
//         </div>
//       </div>

//       <div className="stats-overview">
//         <div className="stat-card">
//           <div className="stat-icon"><FaMapMarkerAlt /></div>
//           <div className="stat-info">
//             <h3>Total Sellers</h3>
//             <p className="stat-number">{sellers.length}</p>
//             <span className="stat-change">All registered</span>
//           </div>
//         </div>
//         <div className="stat-card">
//           <div className="stat-icon"><FaUserCheck /></div>
//           <div className="stat-info">
//             <h3>Active Sellers</h3>
//             <p className="stat-number">{sellers.filter(s => s.status === "Active").length}</p>
//             <span className="stat-change">
//               {sellers.length ? Math.round((sellers.filter(s => s.status === "Active").length / sellers.length) * 100) : 0}% active
//             </span>
//           </div>
//         </div>
//         <div className="stat-card">
//           <div className="stat-icon"><FaCalendarAlt /></div>
//           <div className="stat-info">
//             <h3>Pending</h3>
//             <p className="stat-number">{sellers.filter(s => s.status === "Pending").length}</p>
//             <span className="stat-change">Awaiting approval</span>
//           </div>
//         </div>
//         <div className="stat-card">
//           <div className="stat-icon"><FaBuilding /></div>
//           <div className="stat-info">
//             <h3>Cities</h3>
//             <p className="stat-number">{new Set(sellers.map(s => s.city).filter(Boolean)).size}</p>
//             <span className="stat-change">Locations</span>
//           </div>
//         </div>
//       </div>

//       <div className="filters-section">
//         <div className="search-container">
//           <div className="search-box">
//             <FaSearch className="search-icon" />
//             <input
//               type="text"
//               placeholder="Search by ID, name, or address..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="search-input"
//             />
//           </div>
//           <div className="filter-controls">
//             <div className="filter-group">
//               <label><FaFilter /> Status:</label>
//               <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
//                 {["All", "Active", "Pending", "Suspended"].map(s => <option key={s} value={s}>{s}</option>)}
//               </select>
//             </div>
//             <div className="filter-group">
//               <label>Sort by:</label>
//               <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
//                 <option value="sellerId">Seller ID</option>
//                 <option value="name">Name</option>
//                 <option value="date">Date</option>
//               </select>
//             </div>
//           </div>
//         </div>
//       </div>

//       <div className="sellers-table-section">
//         <div className="table-header">
//           <h3>Seller Directory <span className="count-badge">{filteredSellers.length}</span></h3>
//           <div className="table-summary">Showing {filteredSellers.length} of {sellers.length} sellers</div>
//         </div>

//         <div className="table-wrapper">
//           <table className="sellers-table">
//             <thead>
//               <tr>
//                 <th>Seller ID</th>
//                 <th>Seller Info</th>
//                 <th>Address</th>
//                 <th>Products</th>
//                 <th>Status</th>
//                 <th>Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {filteredSellers.map((seller) => (
//                 <tr key={seller.id} className="seller-row">
//                   <td>
//                     <div className="seller-id-badge">
//                       <FaUserCircle />
//                       <strong>{seller.sellerId}</strong>
//                     </div>
//                   </td>
//                   <td>
//                     <div className="seller-info">
//                       <div className="seller-avatar"><FaUserCircle /></div>
//                       <div className="seller-details">
//                         <h4>{seller.name}</h4>
//                         <p>{seller.sellerId}</p>
//                       </div>
//                     </div>
//                   </td>
//                   <td>
//                     <div><FaMapMarkerAlt style={{ fontSize: 12, color: '#718096' }} /> {seller.address || "N/A"}</div>
//                   </td>
//                   <td>
//                     <div className="product-counts">
//                       {renderProductCountItem("drones", FaHelicopter, "Drones", seller)}
//                       {renderProductCountItem("parts", FaCog, "Parts", seller)}
//                       {renderProductCountItem("accessories", FaCog, "Access", seller)}
//                       {renderProductCountItem("rentals", FaHelicopter, "Rentals", seller)}
//                       {renderProductCountItem("services", FaWrench, "Services", seller)}
//                       {renderProductCountItem("pilots", FaUserTie, "Pilots", seller)}
//                       {renderProductCountItem("jobs", FaBriefcase, "Jobs", seller)}
//                     </div>
//                   </td>
//                   <td>
//                     <span className={`status-badge status-${seller.status.toLowerCase()}`}>
//                       {seller.status}
//                     </span>
//                   </td>
//                   <td>
//                     <div className="action-buttons">
//                       <button className="action-btn view-btn" onClick={() => handleViewDetails(seller)} title="View">
//                         <FaEye />
//                       </button>
//                       <button className="action-btn edit-btn" onClick={() => alert("Edit")} title="Edit">
//                         <FaEdit />
//                       </button>
//                       <button className="action-btn delete-btn" onClick={() => handleDelete(seller.id)} title="Delete">
//                         <FaTrash />
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {showProductsModal && selectedSeller && (
//         <div className="modal-overlay" onClick={() => setShowProductsModal(false)}>
//           <div className="modal-content" onClick={(e) => e.stopPropagation()}>
//             <div className="modal-header">
//               <h2>
//                 {productViewType === "drones" && <FaHelicopter />}
//                 {productViewType === "parts" && <FaCog />}
//                 {productViewType === "accessories" && <FaCog />}
//                 {productViewType === "rentals" && <FaHelicopter />}
//                 {productViewType === "services" && <FaWrench />}
//                 {productViewType === "pilots" && <FaUserTie />}
//                 {productViewType === "jobs" && <FaBriefcase />}
//                 {productLabels[productViewType]} - {selectedSeller.name}
//               </h2>
//               <button className="modal-close" onClick={() => setShowProductsModal(false)}>
//                 <FaTimes />
//               </button>
//             </div>
//             <div className="modal-body">
//               <div className="modal-search">
//                 <div className="search-box">
//                   <FaSearch className="search-icon" />
//                   <input
//                     type="text"
//                     placeholder={`Search ${productLabels[productViewType]}...`}
//                     value={productSearchTerm}
//                     onChange={(e) => setProductSearchTerm(e.target.value)}
//                     className="search-input"
//                   />
//                 </div>
//               </div>
//               {productLoading ? (
//                 <div className="no-products">Loading {productLabels[productViewType]}...</div>
//               ) : filteredProducts.length === 0 ? (
//                 <div className="no-products">
//                   <p>No {productLabels[productViewType]} found for this seller</p>
//                 </div>
//               ) : (
//                 <div className="products-grid">
//                   {filteredProducts.map(item => renderProductCard(item))}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       {showModal && selectedSeller && (
//         <div className="modal-overlay" onClick={() => setShowModal(false)}>
//           <div className="modal-content" onClick={(e) => e.stopPropagation()}>
//             <div className="modal-header">
//               <h2><FaUserCircle /> Seller Details</h2>
//               <button className="modal-close" onClick={() => setShowModal(false)}>
//                 <FaTimes />
//               </button>
//             </div>
//             <div className="modal-body">
//               <div style={{ padding: '20px' }}>
//                 <div style={{ marginBottom: '20px' }}>
//                   <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>{selectedSeller.name}</h3>
//                   <p style={{ color: '#718096', fontSize: '14px' }}>Seller ID: {selectedSeller.sellerId}</p>
//                 </div>
//                 <div style={{ display: 'grid', gap: '16px' }}>
//                   <div>
//                     <strong style={{ display: 'block', fontSize: '13px', color: '#4a5568', marginBottom: '4px' }}>Address:</strong>
//                     <p style={{ margin: 0, color: '#2d3748' }}>{selectedSeller.address || "N/A"}</p>
//                   </div>
//                   <div>
//                     <strong style={{ display: 'block', fontSize: '13px', color: '#4a5568', marginBottom: '4px' }}>Status:</strong>
//                     <span className={`status-badge status-${selectedSeller.status.toLowerCase()}`}>
//                       {selectedSeller.status}
//                     </span>
//                   </div>
//                   <div>
//                     <strong style={{ display: 'block', fontSize: '13px', color: '#4a5568', marginBottom: '4px' }}>Registration Date:</strong>
//                     <p style={{ margin: 0, color: '#2d3748' }}>{selectedSeller.registrationDate || "N/A"}</p>
//                   </div>
//                   <div>
//                     <strong style={{ display: 'block', fontSize: '13px', color: '#4a5568', marginBottom: '4px' }}>Email:</strong>
//                     <p style={{ margin: 0, color: '#2d3748' }}>{selectedSeller.raw?.email || "N/A"}</p>
//                   </div>
//                   <div>
//                     <strong style={{ display: 'block', fontSize: '13px', color: '#4a5568', marginBottom: '4px' }}>Phone:</strong>
//                     <p style={{ margin: 0, color: '#2d3748' }}>{selectedSeller.raw?.phoneNumber || "N/A"}</p>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

import React, { useEffect, useState } from "react";
import {
  FaSearch, FaEdit, FaTrash, FaEye, FaUserCircle, FaBuilding,
  FaMapMarkerAlt, FaCalendarAlt, FaFilter, FaUserCheck, FaDownload,
  FaPlus, FaHelicopter, FaCog, FaWrench, FaUserTie, FaBriefcase, FaTimes,
  FaPhone, FaEnvelope, FaSave, FaBan, FaCheck, FaTimesCircle
} from "react-icons/fa";

const GRAPHQL_URL = "http://127.0.0.1:5001/graphql";

export default function SellerManagement() {
  const [sellers, setSellers] = useState([]);
  const [filteredSellers, setFilteredSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("sellerId");
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [productViewType, setProductViewType] = useState(null);
  const [productData, setProductData] = useState([]);
  const [productLoading, setProductLoading] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [productCounts, setProductCounts] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRowId, setEditingRowId] = useState(null);

  const callGraphQL = async (query, variables = {}) => {
    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors?.length) throw new Error(json.errors[0].message);
    return json.data;
  };

  const fetchSellers = async () => {
    setLoading(true);
    setError(null);
    const query = `query { 
      getSellers { 
        customId 
        name 
        companyName 
        address 
        email 
        phoneNumber 
        status 
      } 
    }`;
    try {
      const data = await callGraphQL(query);
      const mapped = (data.getSellers || []).map((s, i) => ({
        id: i + 1,
        sellerId: s.customId,
        name: s.name || s.companyName || "Unknown",
        companyName: s.companyName || "",
        address: s.address || "",
        email: s.email || "",
        phoneNumber: s.phoneNumber || "",
        registrationDate: s.createdAt?.slice(0, 10) || "",
        status: s.status === "approved" ? "Active" : s.status === "pending" ? "Pending" : "Suspended",
        raw: s,
      }));
      setSellers(mapped);
      setFilteredSellers(mapped);

      mapped.forEach(seller => fetchProductCounts(seller.sellerId));
    } catch (err) {
      setError(err.message);
      console.error("Error fetching sellers:", err);
    }
    setLoading(false);
  };

  const fetchProductCounts = async (sellerId) => {
    const query = `
      query {
        getSellerView(sellerId: "${sellerId}") {
          parts { partId }
          accessories { accessoryId }
          rentals { rentalId }
          services { serviceId }
          drones { droneId }
          hirepilots { pilotId }
          hirejobs { jobId }
        }
      }
    `;

    try {
      const data = await callGraphQL(query);
      const view = data.getSellerView || {};

      setProductCounts(prev => ({
        ...prev,
        [sellerId]: {
          drones: (view.drones || []).length,
          parts: (view.parts || []).length,
          accessories: (view.accessories || []).length,
          rentals: (view.rentals || []).length,
          services: (view.services || []).length,
          pilots: (view.hirepilots || []).length,
          jobs: (view.hirejobs || []).length,
        }
      }));
    } catch (err) {
      console.error(`Failed to fetch counts for ${sellerId}:`, err);
    }
  };

  const fetchProductsByType = async (sellerId, type) => {
    setProductLoading(true);

    const query = `
      query GetSellerProducts($sellerId: String!) {
        getSellerView(sellerId: $sellerId) {
          parts {
            partId
            name
            brand
            price
            description
            status
            quantity
          }
          accessories {
            accessoryId
            name
            brand
            price
            description
            status
            quantity
          }
          rentals {
            rentalId
            name
            brand
            location
            pricePerHour
            pricePerDay
            description
            status
          }
          services {
            serviceId
            name
            description
            price
            location
            status
          }
          hirepilots {
            pilotId
            pilotName
            pilotCompany
            location
            pricePerHour
            pricePerDay
            description
            adminStatus
          }
          hirejobs {
            jobId
            jobName
            companyName
            jobType
            location
            salary
            description
            status
          }
          drones {
            droneId
            name
            brand
            price
            description
            quantity
            status
          }
        }
      }
    `;

    try {
      const data = await callGraphQL(query, { sellerId });
      const view = data.getSellerView || {};

      const map = {
        parts: view.parts || [],
        accessories: view.accessories || [],
        rentals: view.rentals || [],
        services: view.services || [],
        pilots: view.hirepilots || [],
        jobs: view.hirejobs || [],
        drones: view.drones || [],
      };

      setProductData(map[type] || []);
    } catch (err) {
      console.error("Error fetching products:", err);
      setProductData([]);
    }

    setProductLoading(false);
  };

  useEffect(() => {
    fetchSellers();
  }, []);

  useEffect(() => {
    let result = [...sellers];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.sellerId.toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q) ||
        (s.address || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "All") result = result.filter(s => s.status === statusFilter);
    result.sort((a, b) => {
      if (sortBy === "sellerId") return a.sellerId.localeCompare(b.sellerId);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "date") return new Date(b.registrationDate) - new Date(a.registrationDate);
      return 0;
    });
    setFilteredSellers(result);
  }, [searchTerm, statusFilter, sortBy, sellers]);

  const handleViewDetails = (seller) => {
    setSelectedSeller(seller);
    setShowModal(true);
  };

  const handleViewProducts = (seller, type) => {
    setSelectedSeller(seller);
    setProductViewType(type);
    setShowProductsModal(true);
    setProductSearchTerm("");
    setEditingRowId(null);
    fetchProductsByType(seller.sellerId, type);
  };

  const handleEditRow = (product) => {
    setEditingRowId(getProductId(product));
    setEditingProduct({ ...product });
  };

  const handleSaveRow = async () => {
    if (!editingProduct || !selectedSeller) return;
    
    try {
      // Based on product type, call appropriate GraphQL mutation
      let mutation = "";
      let variables = {};
      
      switch (productViewType) {
        case "drones":
          mutation = `
            mutation UpdateDrone($droneId: String!, $input: UpdateDroneInput!) {
              updateDrone(droneId: $droneId, input: $input) {
                droneId
                name
                brand
                price
                status
              }
            }
          `;
          variables = {
            droneId: editingProduct.droneId || editingProduct.id,
            input: {
              name: editingProduct.name,
              brand: editingProduct.brand,
              price: parseFloat(editingProduct.price),
              description: editingProduct.description,
              status: editingProduct.status,
              quantity: parseInt(editingProduct.quantity)
            }
          };
          break;
        case "parts":
          mutation = `
            mutation UpdatePart($partId: String!, $input: UpdatePartInput!) {
              updatePart(partId: $partId, input: $input) {
                partId
                name
                brand
                price
                status
              }
            }
          `;
          variables = {
            partId: editingProduct.partId || editingProduct.id,
            input: {
              name: editingProduct.name,
              brand: editingProduct.brand,
              price: parseFloat(editingProduct.price),
              description: editingProduct.description,
              status: editingProduct.status,
              quantity: parseInt(editingProduct.quantity)
            }
          };
          break;
          case "accessories":
  mutation = `
    mutation UpdateAccessory($accessoryId: String!, $input: UpdateAccessoryInput!) {
      updateAccessory(accessoryId: $accessoryId, input: $input) {
        accessoryId
        name
        brand
        price
        status
      }
    }
  `;
  variables = {
    accessoryId: editingProduct.accessoryId || editingProduct.id,
    input: {
      name: editingProduct.name,
      brand: editingProduct.brand,
      category: editingProduct.category,
      price: parseFloat(editingProduct.price),
      description: editingProduct.description,
      status: editingProduct.status,
      quantity: editingProduct.quantity
        ? parseInt(editingProduct.quantity)
        : null
    }
  };
  break;
case "services":
  mutation = `
    mutation UpdateService($serviceId: String!, $input: UpdateServiceInput!) {
      updateService(serviceId: $serviceId, input: $input) {
        serviceId
        name
        price
        status
      }
    }
  `;
  variables = {
    serviceId: editingProduct.serviceId || editingProduct.id,
    input: {
      name: editingProduct.name,
      specificDrone: editingProduct.specificDrone,
      experience: editingProduct.experience
        ? parseInt(editingProduct.experience)
        : null,
      location: editingProduct.location,
      description: editingProduct.description,
      price: parseFloat(editingProduct.price),
      status: editingProduct.status
    }
  };
  break;
        default:
          alert(`Update functionality for ${productViewType} coming soon!`);
          return;
      }
      
      await callGraphQL(mutation, variables);
      
      // Update local state
      setProductData(prev => 
        prev.map(p => 
          getProductId(p) === editingRowId ? editingProduct : p
        )
      );
      
      setEditingRowId(null);
      alert("Product updated successfully!");
    } catch (err) {
      console.error("Error updating product:", err);
      alert("Failed to update product: " + err.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditingProduct(null);
  };

  const handleDeleteProduct = async (product) => {
    if (!product || !selectedSeller || !window.confirm(`Are you sure you want to delete this ${productViewType.slice(0, -1)}?`)) return;
    
    try {
      let mutation = "";
      
      switch (productViewType) {
        case "drones":
          mutation = `mutation { deleteDrone(droneId: "${product.droneId || product.id}") { droneId } }`;
          break;
        case "parts":
          mutation = `mutation { deletePart(partId: "${product.partId || product.id}") { partId } }`;
          break;
        default:
          alert(`Delete functionality for ${productViewType} coming soon!`);
          return;
      }
      
      await callGraphQL(mutation);
      
      // Update local state
      setProductData(prev => 
        prev.filter(p => getProductId(p) !== getProductId(product))
      );
      
      // Update counts
      setProductCounts(prev => ({
        ...prev,
        [selectedSeller.sellerId]: {
          ...prev[selectedSeller.sellerId],
          [productViewType]: prev[selectedSeller.sellerId][productViewType] - 1
        }
      }));
      
      alert("Product deleted successfully!");
    } catch (err) {
      console.error("Error deleting product:", err);
      alert("Failed to delete product: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    const seller = sellers.find(s => s.id === id);
    if (!seller || !window.confirm(`Delete ${seller.sellerId}?`)) return;
    try {
      await callGraphQL(`mutation { deleteSeller(customId: "${seller.sellerId}") { customId } }`);
      setSellers(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  const getProductId = (product) => {
    switch (productViewType) {
      case "drones": return product.droneId;
      case "parts": return product.partId;
      case "accessories": return product.accessoryId;
      case "rentals": return product.rentalId;
      case "services": return product.serviceId;
      case "pilots": return product.pilotId;
      case "jobs": return product.jobId;
      default: return product.id;
    }
  };

  const getProductName = (product) => {
    switch (productViewType) {
      case "drones": return product.name;
      case "parts": return product.name;
      case "accessories": return product.name;
      case "rentals": return product.name;
      case "services": return product.name;
      case "pilots": return product.pilotName;
      case "jobs": return product.jobName;
      default: return product.name;
    }
  };

  const getProductBrand = (product) => {
    switch (productViewType) {
      case "drones": return product.brand;
      case "parts": return product.brand;
      case "accessories": return product.brand;
      case "rentals": return product.brand;
      case "pilots": return product.pilotCompany;
      case "jobs": return product.companyName;
      default: return product.brand || "N/A";
    }
  };

  const getProductPrice = (product) => {
    switch (productViewType) {
      case "drones": return product.price;
      case "parts": return product.price;
      case "accessories": return product.price;
      case "rentals": return `${product.pricePerHour}/${product.pricePerDay}`;
      case "services": return product.price;
      case "pilots": return `${product.pricePerHour}/${product.pricePerDay}`;
      case "jobs": return product.salary;
      default: return "N/A";
    }
  };

  const getProductStatus = (product) => {
    switch (productViewType) {
      case "pilots": return product.adminStatus;
      default: return product.status;
    }
  };

  const getProductLocation = (product) => {
    switch (productViewType) {
      case "rentals": return product.location;
      case "services": return product.location;
      case "pilots": return product.location;
      case "jobs": return product.location;
      default: return "N/A";
    }
  };

  const getProductQuantity = (product) => {
    switch (productViewType) {
      case "drones": return product.quantity;
      case "parts": return product.quantity;
      case "accessories": return product.quantity;
      default: return "N/A";
    }
  };

  const handleInputChange = (field, value) => {
    setEditingProduct(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const filteredProducts = productData.filter(item =>
    !productSearchTerm || JSON.stringify(item).toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  const productLabels = { 
    drones: "Drones", 
    parts: "Parts", 
    accessories: "Accessories", 
    rentals: "Rentals", 
    services: "Services", 
    pilots: "Pilots", 
    jobs: "Jobs" 
  };
  const productTypes = ["drones", "parts", "accessories", "rentals", "services", "pilots", "jobs"];
  const productIcons = {
    drones: FaHelicopter,
    parts: FaCog,
    accessories: FaCog,
    rentals: FaHelicopter,
    services: FaWrench,
    pilots: FaUserTie,
    jobs: FaBriefcase
  };

  const totalProducts = Object.values(productCounts).reduce((sum, counts) => 
    sum + Object.values(counts).reduce((a, b) => a + b, 0), 0
  );

  const renderProductCell = (seller, type) => {
    const count = productCounts[seller.sellerId]?.[type] || 0;
    const IconComponent = productIcons[type];

    return (
      <td key={type} className="product-cell">
        <button
          className="product-count-btn"
          onClick={() => handleViewProducts(seller, type)}
          title={`View ${productLabels[type]} (${count})`}
          disabled={count === 0}
        >
          <IconComponent className="product-icon-cell" />
          <span className="product-count-value">{count}</span>
        </button>
      </td>
    );
  };

  if (loading) return (
    <div className="seller-details-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'spin 1s linear infinite' }}>⚙️</div>
        <p style={{ fontSize: '16px', color: '#718096' }}>Loading sellers...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="seller-details-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <p style={{ fontSize: '18px', color: '#ff4d4f', marginBottom: '16px' }}>❌ Error: {error}</p>
        <button onClick={fetchSellers} className="btn btn-add">Retry</button>
      </div>
    </div>
  );

  return (
    <div className="seller-details-container">
      <style>{`
         @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes slideIn {
    from { 
      opacity: 0; 
      transform: translateY(-20px); 
    }
    to { 
      opacity: 1; 
      transform: translateY(0); 
    }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  * { 
    box-sizing: border-box; 
  }
  
  .seller-details-container {
    padding: 24px;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }

  /* ... (keep all your existing styles up to line 450) ... */

  /* Full Screen Modal Styles */
  .fullscreen-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.95);
    display: flex;
    flex-direction: column;
    z-index: 2000;
    animation: fadeIn 0.3s ease-out;
  }

  .modal-top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    background: #1a202c;
    color: white;
    border-bottom: 1px solid #2d3748;
  }

  .modal-title {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 20px;
    font-weight: 600;
  }

  .modal-close-btn {
    background: #4a5568;
    border: none;
    color: white;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 20px;
  }

  .modal-close-btn:hover {
    background: #718096;
    transform: rotate(90deg);
  }

  .modal-content-wrapper {
    flex: 1;
    padding: 24px;
    overflow: auto;
    background: #f7fafc;
  }

  .google-sheets-table {
    width: 100%;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    border-collapse: collapse;
    min-width: 1200px;
  }

  .google-sheets-table thead {
    background: #f8f9fa;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .google-sheets-table th {
    padding: 16px;
    text-align: left;
    font-size: 12px;
    font-weight: 600;
    color: #4a5568;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 2px solid #e2e8f0;
    background: #f8f9fa;
    white-space: nowrap;
    min-width: 120px;
  }

  .google-sheets-table td {
    padding: 14px 16px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 13px;
    color: #2d3748;
    vertical-align: middle;
    transition: all 0.2s;
  }

  .google-sheets-table tr {
    transition: all 0.2s;
  }

  .google-sheets-table tr:hover {
    background: #f0f7ff;
  }

  .google-sheets-table tr.editing {
    background: #f0fff4;
  }

  .action-cell {
    min-width: 140px;
    white-space: nowrap;
  }

  .action-buttons {
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  .action-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    transition: all 0.2s;
  }

  .edit-btn {
    background: #e6f7ff;
    color: #0050b3;
  }

  .edit-btn:hover {
    background: #0050b3;
    color: white;
    transform: scale(1.05);
  }

  .save-btn {
    background: #d4edda;
    color: #155724;
  }

  .save-btn:hover {
    background: #155724;
    color: white;
    transform: scale(1.05);
  }

  .cancel-btn {
    background: #fef5e7;
    color: #d68910;
  }

  .cancel-btn:hover {
    background: #d68910;
    color: white;
    transform: scale(1.05);
  }

  .delete-btn {
    background: #fff1f0;
    color: #ff4d4f;
  }

  .delete-btn:hover {
    background: #ff4d4f;
    color: white;
    transform: scale(1.05);
  }

  .sheet-input {
    width: 100%;
    padding: 8px 12px;
    border: 2px solid #4299e1;
    border-radius: 4px;
    font-size: 13px;
    background: white;
    transition: all 0.2s;
    font-family: inherit;
  }

  .sheet-input:focus {
    outline: none;
    border-color: #0050b3;
    box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
  }

  .sheet-select {
    width: 100%;
    padding: 8px 12px;
    border: 2px solid #4299e1;
    border-radius: 4px;
    font-size: 13px;
    background: white;
    cursor: pointer;
    font-family: inherit;
  }

  .sheet-textarea {
    width: 100%;
    padding: 8px 12px;
    border: 2px solid #4299e1;
    border-radius: 4px;
    font-size: 13px;
    background: white;
    resize: vertical;
    min-height: 60px;
    font-family: inherit;
  }

  .search-controls {
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }

  .search-controls .search-box {
    flex: 1;
  }

  .stats-summary {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #e6f7ff;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    color: #0050b3;
    font-weight: 600;
  }

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 100;
    border-radius: 8px;
  }

  .loading-spinner {
    font-size: 48px;
    margin-bottom: 16px;
    animation: spin 1s linear infinite;
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #718096;
  }

  .empty-state p {
    font-size: 16px;
    margin: 0;
  }

  .status-select {
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    width: 100%;
  }

  .status-active {
    background: #d4edda;
    color: #155724;
  }

  .status-pending {
    background: #fef5e7;
    color: #d68910;
  }

  .status-suspended {
    background: #f8d7da;
    color: #721c24;
  }

  .status-approved {
    background: #d4edda;
    color: #155724;
  }

  .status-rejected {
    background: #f8d7da;
    color: #721c24;
  }

  /* Scrollbar Styling */
  .modal-content-wrapper::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .modal-content-wrapper::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  .modal-content-wrapper::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
  }

  .modal-content-wrapper::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
 
 .table-wrapper { overflow-x: auto; border-radius: 8px; border: 1px solid #e2e8f0; background: white; } .sellers-table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 1200px; } .sellers-table th, .sellers-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e2e8f0; } .sellers-table th { background-color: #f8f9fa; font-weight: 600; color: #2d3748; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em; white-space: nowrap; } .sellers-table tr:hover { background-color: #f7fafc; } .product-header { text-align: center; } .product-cell { text-align: center; } .product-count-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 12px; border-radius: 20px; background-color: #e6f7ff; color: #0050b3; border: none; cursor: pointer; font-weight: 600; transition: all 0.2s; font-size: 12px; } .product-count-btn:hover:not(:disabled) { background-color: #0050b3; color: white; } .product-count-btn:disabled { background-color: #f1f1f1; color: #a0a0a0; cursor: not-allowed; } .seller-info { display: flex; align-items: center; gap: 12px; } .seller-avatar { width: 40px; height: 40px; border-radius: 50%; background-color: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #718096; } .seller-details h4 { margin: 0; font-size: 14px; font-weight: 600; color: #2d3748; } .seller-details p { margin: 0; font-size: 12px; color: #718096; } .seller-id-badge { display: flex; align-items: center; gap: 6px; font-family: monospace; font-weight: 600; font-size: 12px; color: #2d3748; } .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; } .status-active { background-color: #d4edda; color: #155724; } .status-pending { background-color: #fef5e7; color: #d68910; } .status-suspended { background-color: #f8d7da; color: #721c24; } .action-buttons { display: flex; gap: 8px; } .action-btn { width: 32px; height: 32px; border-radius: 6px; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; font-size: 14px; } .view-btn { background-color: #e6f7ff; color: #0050b3; } .edit-btn { background-color: #fef5e7; color: #d68910; } .delete-btn { background-color: #fff1f0; color: #ff4d4f; } .action-btn:hover { opacity: 0.8; } 
      .stats-overview {
display: grid;
grid-template-columns: repeat(4, 1fr);
gap: 20px;
margin-bottom: 30px;
}

.stat-card {
background: white;
border-radius: 10px;
padding: 20px;
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
display: flex;
align-items: center;
gap: 15px;
transition: transform 0.3s ease;
}

.stat-card:hover {
transform: translateY(-5px);
}

.stat-icon {
font-size: 30px;
color: #4299e1;
}

.stat-info {
flex: 1;
}

.stat-info h3 {
margin: 0;
font-size: 14px;
color: #718096;
text-transform: uppercase;
letter-spacing: 0.5px;
}

.stat-number {
margin: 5px 0;
font-size: 24px;
font-weight: 700;
color: #2d3748;
}

.stat-change {
font-size: 12px;
color: #a0aec0;
}

@media (max-width: 1024px) {
.stats-overview {
grid-template-columns: repeat(2, 1fr);
}
}

@media (max-width: 640px) {
.stats-overview {
grid-template-columns: 1fr;
}
}

Step 2: CSS for filters-section:

.filters-section {
background: white;
border-radius: 10px;
padding: 20px;
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
margin-bottom: 30px;
}

.search-container {
display: flex;
align-items: center;
gap: 20px;
}

.search-box {
flex: 1;
display: flex;
align-items: center;
background: #f7fafc;
border-radius: 8px;
padding: 10px 15px;
border: 1px solid #e2e8f0;
}

.search-icon {
color: #a0aec0;
margin-right: 10px;
}

.search-input {
flex: 1;
border: none;
background: transparent;
outline: none;
font-size: 14px;
color: #2d3748;
}

.filter-controls {
display: flex;
align-items: center;
gap: 20px;
}

.filter-group {
display: flex;
align-items: center;
gap: 10px;
}

.filter-group label {
font-size: 14px;
color: #4a5568;
display: flex;
align-items: center;
gap: 5px;
}

.filter-select {
padding: 8px 12px;
border-radius: 6px;
border: 1px solid #e2e8f0;
background: white;
color: #4a5568;
font-size: 14px;
outline: none;
cursor: pointer;
}

@media (max-width: 768px) {
.search-container {
flex-direction: column;
align-items: stretch;
}
      `}</style>

      {/* Header */}
      <div className="seller-header">
        <div className="header-content">
          <h1><FaMapMarkerAlt /> Seller Management</h1>
          <p>Manage sellers and view their products</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-export" onClick={() => alert("Export feature coming soon!")}>
            <FaDownload /> Export
          </button>
          <button className="btn btn-add" onClick={() => alert("Add seller form coming soon!")}>
            <FaPlus /> Add Seller
          </button>
        </div>
      </div>

       {/* Stats Overview */}
  <div className="stats-overview">
    <div className="stat-card">
      <div className="stat-icon"><FaMapMarkerAlt /></div>
      <div className="stat-info">
        <h3>Total Sellers</h3>
        <p className="stat-number">{sellers.length}</p>
        <span className="stat-change">All registered</span>
      </div>
    </div>
    <div className="stat-card">
      <div className="stat-icon"><FaUserCheck /></div>
      <div className="stat-info">
        <h3>Active Sellers</h3>
        <p className="stat-number">{sellers.filter(s => s.status === "Active").length}</p>
        <span className="stat-change">
          {sellers.length ? Math.round((sellers.filter(s => s.status === "Active").length / sellers.length) * 100) : 0}% of total
        </span>
      </div>
    </div>
    <div className="stat-card">
      <div className="stat-icon"><FaCalendarAlt /></div>
      <div className="stat-info">
        <h3>Pending</h3>
        <p className="stat-number">{sellers.filter(s => s.status === "Pending").length}</p>
        <span className="stat-change">Awaiting approval</span>
      </div>
    </div>
    <div className="stat-card">
      <div className="stat-icon"><FaBuilding /></div>
      <div className="stat-info">
        <h3>Total Products</h3>
        <p className="stat-number">{totalProducts}</p>
        <span className="stat-change">Across all sellers</span>
      </div>
    </div>
  </div>

        {/* Filters Section */}
  <div className="filters-section">
    <div className="search-container">
      <div className="search-box">
        <FaSearch className="search-icon" />
        <input
          type="text"
          placeholder="Search by ID, name, email or address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>
      <div className="filter-controls">
        <div className="filter-group">
          <label><FaFilter /> Filter by Status:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
            {["All", "Active", "Pending", "Suspended"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
            <option value="sellerId">Seller ID</option>
            <option value="name">Seller Name</option>
            <option value="date">Registration Date</option>
          </select>
        </div>
      </div>
    </div>
  </div>

      {/* Sellers Table */}
      {/* <div className="sellers-table-section">
        <div className="table-header">
          <h3><FaBuilding /> Seller Directory <span className="count-badge">{filteredSellers.length}</span></h3>
          <div className="table-summary">Showing {filteredSellers.length} of {sellers.length} sellers</div>
        </div>

        <div className="table-wrapper">
          <table className="sellers-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Seller Info</th>
                <th>Email</th>
                <th style={{ color: '#4299e1' }}><FaHelicopter /> Drones</th>
                <th style={{ color: '#4299e1' }}><FaCog /> Parts</th>
                <th style={{ color: '#4299e1' }}><FaCog /> Accessories</th>
                <th style={{ color: '#4299e1' }}><FaHelicopter /> Rentals</th>
                <th style={{ color: '#4299e1' }}><FaWrench /> Services</th>
                <th style={{ color: '#4299e1' }}><FaUserTie /> Pilots</th>
                <th style={{ color: '#4299e1' }}><FaBriefcase /> Jobs</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSellers.map((seller) => (
                <tr key={seller.id} className="seller-row">
                  <td>
                    <div className="seller-id-badge">
                      <FaUserCircle />
                      {seller.sellerId}
                    </div>
                  </td>

                  <td>
                    <div className="seller-info">
                      <div className="seller-avatar"><FaUserCircle /></div>
                      <div className="seller-details">
                        <h4>{seller.name}</h4>
                        <p>{seller.companyName || "N/A"}</p>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: '#4299e1' }}>
                      <FaEnvelope />
                      <span title={seller.email}>{seller.email ? seller.email.split('@')[0] + '...' : "N/A"}</span>
                    </div>
                  </td>

                  {productTypes.map(type => renderProductCell(seller, type))}

                  <td>
                    <span className={`status-badge status-${seller.status.toLowerCase()}`}>
                      {seller.status}
                    </span>
                  </td>

                  <td>
                    <div className="action-buttons">
                      <button
                        className="action-btn view-btn"
                        onClick={() => handleViewDetails(seller)}
                        title="View Details"
                      >
                        <FaEye />
                      </button>
                      <button
                        className="action-btn edit-btn"
                        onClick={() => alert("Edit functionality coming soon!")}
                        title="Edit Seller"
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={() => handleDelete(seller.id)}
                        title="Delete Seller"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div> */}
      <div className="sellers-table-section">
  <div className="table-header">
    <h3>
      <FaBuilding /> Seller Directory 
      <span className="count-badge">{filteredSellers.length}</span>
    </h3>
    <div className="table-summary">
      Showing {filteredSellers.length} of {sellers.length} sellers
    </div>
  </div>

  <div className="table-wrapper">
    <table className="sellers-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Seller Info</th>
          <th>Email</th>
          <th style={{ color: '#4299e1' }}>
            <FaHelicopter /> Drones
          </th>
          <th style={{ color: '#4299e1' }}>
            <FaCog /> Parts
          </th>
          <th style={{ color: '#4299e1' }}>
            <FaCog /> Accessories
          </th>
          <th style={{ color: '#4299e1' }}>
            <FaHelicopter /> Rentals
          </th>
          <th style={{ color: '#4299e1' }}>
            <FaWrench /> Services
          </th>
          <th style={{ color: '#4299e1' }}>
            <FaUserTie /> Pilots
          </th>
          <th style={{ color: '#4299e1' }}>
            <FaBriefcase /> Jobs
          </th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {filteredSellers.map((seller) => (
          <tr key={seller.id} className="seller-row">
            <td>
              <div className="seller-id-badge">
                <FaUserCircle />
                {seller.sellerId}
              </div>
            </td>

            <td>
              <div className="seller-info">
                <div className="seller-avatar">
                  <FaUserCircle />
                </div>
                <div className="seller-details">
                  <h4>{seller.name}</h4>
                  <p>{seller.companyName || "N/A"}</p>
                </div>
              </div>
            </td>

            <td>
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '6px', 
                  fontSize: '12px', 
                  color: '#4299e1' 
                }}
              >
                <FaEnvelope />
                <span title={seller.email}>
                  {seller.email ? seller.email.split('@')[0] + '...' : "N/A"}
                </span>
              </div>
            </td>

            {productTypes.map(type => renderProductCell(seller, type))}

            <td>
              <span className={`status-badge status-${seller.status.toLowerCase()}`}>
                {seller.status}
              </span>
            </td>

            <td>
              <div className="action-buttons">
                <button
                  className="action-btn view-btn"
                  onClick={() => handleViewDetails(seller)}
                  title="View Details"
                >
                  <FaEye />
                </button>
                <button
                  className="action-btn edit-btn"
                  onClick={() => alert("Edit functionality coming soon!")}
                  title="Edit Seller"
                >
                  <FaEdit />
                </button>
                <button
                  className="action-btn delete-btn"
                  onClick={() => handleDelete(seller.id)}
                  title="Delete Seller"
                >
                  <FaTrash />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>

      {/* Full Screen Products Modal */}
      {showProductsModal && selectedSeller && (
        <div className="fullscreen-modal">
          <div className="modal-top-bar">
            <div className="modal-title">
              {productIcons[productViewType] && React.createElement(productIcons[productViewType])}
              {productLabels[productViewType]} - {selectedSeller.name}
              <span className="stats-summary">
                <FaBuilding /> {filteredProducts.length} items
              </span>
            </div>
            <button className="modal-close-btn" onClick={() => setShowProductsModal(false)}>
              <FaTimes />
            </button>
          </div>

          <div className="modal-content-wrapper">
            <div className="search-controls">
              <div className="search-box">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder={`Search ${productLabels[productViewType]}...`}
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            {productLoading ? (
              <div className="loading-overlay">
                <div className="loading-spinner">⚙️</div>
                <p>Loading {productLabels[productViewType]}...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                <p>No {productLabels[productViewType]} found for this seller</p>
              </div>
            ) : (
              <div style={{ overflow: 'auto', borderRadius: '8px' }}>
                <table className="google-sheets-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Brand/Company</th>
                      <th>Price/Salary</th>
                      <th>Location</th>
                      <th>Quantity</th>
                      <th>Status</th>
                      <th>Description</th>
                      <th className="action-cell">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => {
                      const isEditing = editingRowId === getProductId(product);
                      
                      return (
                        <tr key={getProductId(product)} className={isEditing ? 'editing' : ''}>
                          <td>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingProduct[productViewType === "drones" ? "droneId" : productViewType === "parts" ? "partId" : productViewType.slice(0, -1) + "Id"] || ""}
                                onChange={(e) => handleInputChange(productViewType === "drones" ? "droneId" : productViewType === "parts" ? "partId" : productViewType.slice(0, -1) + "Id", e.target.value)}
                                className="sheet-input"
                              />
                            ) : (
                              <div style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '12px' }}>
                                {getProductId(product)}
                              </div>
                            )}
                          </td>
                          
                          <td>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingProduct.name || editingProduct.pilotName || editingProduct.jobName || ""}
                                onChange={(e) => handleInputChange(productViewType === "pilots" ? "pilotName" : productViewType === "jobs" ? "jobName" : "name", e.target.value)}
                                className="sheet-input"
                              />
                            ) : (
                              <div style={{ fontWeight: 600 }}>{getProductName(product)}</div>
                            )}
                          </td>
                          
                          <td>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingProduct.brand || editingProduct.pilotCompany || editingProduct.companyName || ""}
                                onChange={(e) => handleInputChange(productViewType === "pilots" ? "pilotCompany" : productViewType === "jobs" ? "companyName" : "brand", e.target.value)}
                                className="sheet-input"
                              />
                            ) : (
                              getProductBrand(product)
                            )}
                          </td>
                          
                          <td>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingProduct.price || editingProduct.salary || editingProduct.pricePerHour || ""}
                                onChange={(e) => handleInputChange(productViewType === "jobs" ? "salary" : productViewType === "rentals" || productViewType === "pilots" ? "pricePerHour" : "price", e.target.value)}
                                className="sheet-input"
                              />
                            ) : (
                              getProductPrice(product)
                            )}
                          </td>
                          
                          <td>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingProduct.location || ""}
                                onChange={(e) => handleInputChange("location", e.target.value)}
                                className="sheet-input"
                              />
                            ) : (
                              getProductLocation(product)
                            )}
                          </td>
                          
                          <td>
                            {isEditing ? (
                              <input
                                type="number"
                                value={editingProduct.quantity || ""}
                                onChange={(e) => handleInputChange("quantity", e.target.value)}
                                className="sheet-input"
                              />
                            ) : (
                              getProductQuantity(product)
                            )}
                          </td>
                          
                          <td>
                            {isEditing ? (
                              <select
                                value={editingProduct.status || editingProduct.adminStatus || ""}
                                onChange={(e) => handleInputChange(productViewType === "pilots" ? "adminStatus" : "status", e.target.value)}
                                className="sheet-select"
                              >
                                <option value="active">Active</option>
                                <option value="pending">Pending</option>
                                <option value="suspended">Suspended</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                              </select>
                            ) : (
                              <span className={`status-select status-${getProductStatus(product)?.toLowerCase()}`}>
                                {getProductStatus(product)}
                              </span>
                            )}
                          </td>
                          
                          <td>
                            {isEditing ? (
                              <textarea
                                value={editingProduct.description || ""}
                                onChange={(e) => handleInputChange("description", e.target.value)}
                                className="sheet-textarea"
                              />
                            ) : (
                              <div style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {product.description || "No description"}
                              </div>
                            )}
                          </td>
                          
                          <td className="action-cell">
                            <div className="action-buttons">
                              {isEditing ? (
                                <>
                                  <button
                                    className="action-btn save-btn"
                                    onClick={handleSaveRow}
                                    title="Save"
                                  >
                                    <FaCheck />
                                  </button>
                                  <button
                                    className="action-btn cancel-btn"
                                    onClick={handleCancelEdit}
                                    title="Cancel"
                                  >
                                    <FaTimes />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className="action-btn edit-btn"
                                    onClick={() => handleEditRow(product)}
                                    title="Edit"
                                  >
                                    <FaEdit />
                                  </button>
                                  <button
                                    className="action-btn delete-btn"
                                    onClick={() => handleDeleteProduct(product)}
                                    title="Delete"
                                  >
                                    <FaTrash />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seller Details Modal */}
      {showModal && selectedSeller && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FaUserCircle /> {selectedSeller.name}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ maxWidth: '600px' }}>
                <div style={{ display: 'grid', gap: '20px' }}>
                  <div style={{ background: '#f7fafc', padding: '16px', borderRadius: '8px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#1a202c', fontWeight: '700' }}>Basic Information</h3>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      <div>
                        <strong style={{ display: 'block', fontSize: '12px', color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Seller ID</strong>
                        <p style={{ margin: 0, color: '#2d3748', fontSize: '14px', fontFamily: 'monospace', fontWeight: 600 }}>{selectedSeller.sellerId}</p>
                      </div>
                      <div>
                        <strong style={{ display: 'block', fontSize: '12px', color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Company Name</strong>
                        <p style={{ margin: 0, color: '#2d3748', fontSize: '14px' }}>{selectedSeller.companyName || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#f7fafc', padding: '16px', borderRadius: '8px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#1a202c', fontWeight: '700' }}>Contact Information</h3>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      <div>
                        <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>
                          <FaEnvelope /> Email
                        </strong>
                        <p style={{ margin: 0, color: '#4299e1', fontSize: '14px', wordBreak: 'break-all' }}>{selectedSeller.email || "N/A"}</p>
                      </div>
                      <div>
                        <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>
                          <FaPhone /> Phone
                        </strong>
                        <p style={{ margin: 0, color: '#2d3748', fontSize: '14px' }}>{selectedSeller.phoneNumber || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#f7fafc', padding: '16px', borderRadius: '8px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#1a202c', fontWeight: '700' }}>Location</h3>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <FaMapMarkerAlt style={{ marginTop: '2px', color: '#4299e1', flexShrink: 0 }} />
                      <p style={{ margin: 0, color: '#2d3748', fontSize: '14px', lineHeight: '1.6' }}>{selectedSeller.address || "N/A"}</p>
                    </div>
                  </div>

                  <div style={{ background: '#f7fafc', padding: '16px', borderRadius: '8px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#1a202c', fontWeight: '700' }}>Status & Registration</h3>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      <div>
                        <strong style={{ display: 'block', fontSize: '12px', color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Status</strong>
                        <span className={`status-badge status-${selectedSeller.status.toLowerCase()}`}>{selectedSeller.status}</span>
                      </div>
                      <div>
                        <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>
                          <FaCalendarAlt /> Registration Date
                        </strong>
                        <p style={{ margin: 0, color: '#2d3748', fontSize: '14px' }}>{selectedSeller.registrationDate || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}     