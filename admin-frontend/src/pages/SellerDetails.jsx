import React, { useState, useEffect } from 'react';
import '../styles/SellerDetails.css';
import {
  FaSearch,
  FaEdit,
  FaTrash,
  FaEye,
  FaUserCircle,
  FaBuilding,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaFilter,
  FaStar,
  FaChartLine,
  FaStore,
  FaUserCheck,
  FaUserTimes,
  FaDownload,
  FaPlus
} from 'react-icons/fa';

const SellerDetails = () => {
  // Mock data for sellers - Only address and ID fields
  const initialSellers = [
    {
      id: 1,
      sellerId: 'SELL001',
      name: 'John Smith',
      address: '123 Main St, San Francisco, CA 94101',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94101',
      country: 'USA',
      registrationDate: '2023-01-15',
      status: 'Active',
    },
    {
      id: 2,
      sellerId: 'SELL002',
      name: 'Sarah Johnson',
      address: '456 Oak Ave, New York, NY 10001',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
      registrationDate: '2023-02-20',
      status: 'Active',
    },
    {
      id: 3,
      sellerId: 'SELL003',
      name: 'Mike Wilson',
      address: '789 Pine Rd, Chicago, IL 60601',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      country: 'USA',
      registrationDate: '2023-03-10',
      status: 'Active',
    },
    {
      id: 4,
      sellerId: 'SELL004',
      name: 'Emily Chen',
      address: '101 Tech Blvd, Austin, TX 73301',
      city: 'Austin',
      state: 'TX',
      zipCode: '73301',
      country: 'USA',
      registrationDate: '2023-04-05',
      status: 'Suspended',
    },
    {
      id: 5,
      sellerId: 'SELL005',
      name: 'Robert Brown',
      address: '202 Innovation Dr, Boston, MA 02101',
      city: 'Boston',
      state: 'MA',
      zipCode: '02101',
      country: 'USA',
      registrationDate: '2023-01-30',
      status: 'Active',
    },
    {
      id: 6,
      sellerId: 'SELL006',
      name: 'Lisa Wong',
      address: '303 Skyline Ave, Denver, CO 80201',
      city: 'Denver',
      state: 'CO',
      zipCode: '80201',
      country: 'USA',
      registrationDate: '2023-05-12',
      status: 'Active',
    },
    {
      id: 7,
      sellerId: 'SELL007',
      name: 'David Miller',
      address: '404 Service Rd, Seattle, WA 98101',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98101',
      country: 'USA',
      registrationDate: '2023-06-18',
      status: 'Pending',
    },
    {
      id: 8,
      sellerId: 'SELL008',
      name: 'Maria Garcia',
      address: '505 Camera St, Los Angeles, CA 90001',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90001',
      country: 'USA',
      registrationDate: '2023-07-22',
      status: 'Active',
    }
  ];

  const [sellers, setSellers] = useState(initialSellers);
  const [filteredSellers, setFilteredSellers] = useState(initialSellers);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState('All');
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [sortBy, setSortBy] = useState('sellerId');

  // Get unique cities from sellers
  const cities = ['All', ...new Set(sellers.map(seller => seller.city))];

  // Filter sellers based on search and filters
  useEffect(() => {
    let result = sellers;
    
    // Search filter
    if (searchTerm) {
      result = result.filter(seller =>
        seller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        seller.sellerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        seller.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        seller.city.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Status filter
    if (statusFilter !== 'All') {
      result = result.filter(seller => seller.status === statusFilter);
    }
    
    // City filter
    if (cityFilter !== 'All') {
      result = result.filter(seller => seller.city === cityFilter);
    }
    
    // Sorting
    result = [...result].sort((a, b) => {
      switch(sortBy) {
        case 'sellerId':
          return a.sellerId.localeCompare(b.sellerId);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'city':
          return a.city.localeCompare(b.city);
        case 'date':
          return new Date(b.registrationDate) - new Date(a.registrationDate);
        default:
          return 0;
      }
    });
    
    setFilteredSellers(result);
  }, [searchTerm, statusFilter, cityFilter, sortBy, sellers]);

  const handleViewDetails = (seller) => {
    setSelectedSeller(seller);
    setShowModal(true);
  };

  const handleEdit = (sellerId) => {
    alert(`Edit seller address with ID: ${sellerId}`);
  };

  const handleDelete = (sellerId) => {
    if (window.confirm('Are you sure you want to delete this seller address?')) {
      setSellers(sellers.filter(seller => seller.id !== sellerId));
    }
  };

  const handleStatusChange = (sellerId, newStatus) => {
    setSellers(sellers.map(seller => 
      seller.id === sellerId ? { ...seller, status: newStatus } : seller
    ));
  };

  const handleExportData = () => {
    alert('Exporting seller address data...');
  };

  const handleAddSeller = () => {
    alert('Add new seller address form will open...');
  };

  const getFullAddress = (seller) => {
    return `${seller.address}, ${seller.city}, ${seller.state} ${seller.zipCode}, ${seller.country}`;
  };

  const statusOptions = ['All', 'Active', 'Pending', 'Suspended'];
  const sortOptions = [
    { value: 'sellerId', label: 'Seller ID' },
    { value: 'name', label: 'Seller Name' },
    { value: 'city', label: 'City' },
    { value: 'date', label: 'Registration Date' }
  ];

  const getStatusCount = (status) => {
    return sellers.filter(seller => seller.status === status).length;
  };

  return (
    <div className="seller-details-container">
      <div className="seller-header">
        <div className="header-content">
          <h1><FaMapMarkerAlt /> Seller Address Directory</h1>
          <p>Manage and view all seller addresses with their IDs</p>
        </div>
        <div className="header-actions">
          <button className="btn-export" onClick={handleExportData}>
            <FaDownload /> Export Addresses
          </button>
          <button className="btn-add" onClick={handleAddSeller}>
            <FaPlus /> Add New Address
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-overview">
        <div className="stat-card total-sellers">
          <div className="stat-icon">
            <FaMapMarkerAlt />
          </div>
          <div className="stat-info">
            <h3>Total Addresses</h3>
            <p className="stat-number">{sellers.length}</p>
            <span className="stat-change">{sellers.length} registered addresses</span>
          </div>
        </div>
        
        <div className="stat-card active-sellers">
          <div className="stat-icon">
            <FaUserCheck />
          </div>
          <div className="stat-info">
            <h3>Active Sellers</h3>
            <p className="stat-number">{getStatusCount('Active')}</p>
            <span className="stat-change">{Math.round((getStatusCount('Active') / sellers.length) * 100)}% active</span>
          </div>
        </div>
        
        <div className="stat-card pending-sellers">
          <div className="stat-icon">
            <FaCalendarAlt />
          </div>
          <div className="stat-info">
            <h3>Pending Verification</h3>
            <p className="stat-number">{getStatusCount('Pending')}</p>
            <span className="stat-change">Awaiting approval</span>
          </div>
        </div>
        
        <div className="stat-card total-cities">
          <div className="stat-icon">
            <FaBuilding />
          </div>
          <div className="stat-info">
            <h3>Total Cities</h3>
            <p className="stat-number">{cities.length - 1}</p>
            <span className="stat-change">{sellers.length} addresses</span>
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
              placeholder="Search by seller ID, name, address, or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-controls">
            <div className="filter-group">
              <label><FaFilter /> Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="filter-select"
              >
                {statusOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label><FaBuilding /> City:</label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="filter-select"
              >
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label>Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Sellers Table */}
      <div className="sellers-table-section">
        <div className="table-header">
          <h3>Seller Address Directory <span className="count-badge">{filteredSellers.length} addresses</span></h3>
          <div className="table-summary">
            Showing {filteredSellers.length} of {sellers.length} seller addresses
          </div>
        </div>
        
        <div className="table-wrapper">
          <table className="sellers-table">
            <thead>
              <tr>
                <th>Seller ID</th>
                <th>Seller Information</th>
                <th>Address Details</th>
                <th>Location</th>
                <th>Status</th>
                <th>Registration Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSellers.map(seller => (
                <tr key={seller.id} className="seller-row">
                  <td className="seller-id-cell">
                    <div className="seller-id-badge">
                      <FaUserCircle className="id-icon" />
                      <div>
                        <strong>{seller.sellerId}</strong>
                        <small>ID: {seller.id}</small>
                      </div>
                    </div>
                  </td>
                  <td className="seller-info-cell">
                    <div className="seller-info">
                      <div className="seller-avatar">
                        <FaUserCircle />
                      </div>
                      <div className="seller-details">
                        <h4>{seller.name}</h4>
                        <p className="seller-id-display">Seller ID: {seller.sellerId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="address-cell">
                    <div className="address-info">
                      <div className="address-header">
                        <FaMapMarkerAlt className="address-icon" />
                        <h4>Registered Address</h4>
                      </div>
                      <p className="full-address">{getFullAddress(seller)}</p>
                      <div className="address-breakdown">
                        <span className="address-part">
                          <strong>Street:</strong> {seller.address}
                        </span>
                        <span className="address-part">
                          <strong>City:</strong> {seller.city}
                        </span>
                        <span className="address-part">
                          <strong>State:</strong> {seller.state}
                        </span>
                        <span className="address-part">
                          <strong>ZIP:</strong> {seller.zipCode}
                        </span>
                        <span className="address-part">
                          <strong>Country:</strong> {seller.country}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="location-cell">
                    <div className="location-info">
                      <div className="location-details">
                        <div className="location-item">
                          <FaBuilding />
                          <div>
                            <span className="location-label">City</span>
                            <span className="location-value">{seller.city}</span>
                          </div>
                        </div>
                        <div className="location-item">
                          <FaMapMarkerAlt />
                          <div>
                            <span className="location-label">State</span>
                            <span className="location-value">{seller.state}</span>
                          </div>
                        </div>
                        <div className="location-item">
                          <span className="location-label">ZIP Code</span>
                          <span className="location-value zip-code">{seller.zipCode}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="status-cell">
                    <div className="status-container">
                      <span className={`status-indicator status-${seller.status.toLowerCase()}`}>
                        {seller.status}
                      </span>
                    </div>
                  </td>
                  <td className="date-cell">
                    <div className="date-info">
                      <FaCalendarAlt className="date-icon" />
                      <div>
                        <span className="date-display">{seller.registrationDate}</span>
                        <small className="date-label">Registered</small>
                      </div>
                    </div>
                  </td>
                  <td className="actions-cell">
                    <div className="action-buttons">
                      <button
                        className="action-btn view-btn"
                        onClick={() => handleViewDetails(seller)}
                        title="View Address Details"
                      >
                        <FaEye />
                      </button>
                      <button
                        className="action-btn edit-btn"
                        onClick={() => handleEdit(seller.id)}
                        title="Edit Address"
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={() => handleDelete(seller.id)}
                        title="Delete Address"
                      >
                        <FaTrash />
                      </button>
                      {seller.status === 'Pending' && (
                        <button
                          className="approve-btn"
                          onClick={() => handleStatusChange(seller.id, 'Active')}
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                ))}
            </tbody>
          </table>
        </div>
        
        {filteredSellers.length === 0 && (
          <div className="no-results">
            <FaMapMarkerAlt className="no-results-icon" />
            <h4>No seller addresses found</h4>
            <p>Try adjusting your search criteria or filters</p>
          </div>
        )}
      </div>

      {/* Seller Address Details Modal */}
      {showModal && selectedSeller && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <FaMapMarkerAlt /> Seller Address Details
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>
            
            <div className="modal-body">
              <div className="modal-profile">
                <div className="profile-header">
                  <div className="profile-avatar">
                    <FaUserCircle />
                  </div>
                  <div className="profile-info">
                    <h3>{selectedSeller.name}</h3>
                    <p className="profile-id">Seller ID: {selectedSeller.sellerId}</p>
                    <div className="profile-status">
                      <span className={`status-badge status-${selectedSeller.status.toLowerCase()}`}>
                        {selectedSeller.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="profile-details-grid">
                  <div className="detail-section address-section">
                    <h4><FaMapMarkerAlt /> Complete Address</h4>
                    <div className="address-display">
                      <div className="address-line">
                        <FaMapMarkerAlt />
                        <p>{getFullAddress(selectedSeller)}</p>
                      </div>
                    </div>
                    <div className="address-components">
                      <div className="address-component">
                        <strong>Street Address:</strong>
                        <span>{selectedSeller.address}</span>
                      </div>
                      <div className="address-component">
                        <strong>City:</strong>
                        <span>{selectedSeller.city}</span>
                      </div>
                      <div className="address-component">
                        <strong>State:</strong>
                        <span>{selectedSeller.state}</span>
                      </div>
                      <div className="address-component">
                        <strong>ZIP Code:</strong>
                        <span>{selectedSeller.zipCode}</span>
                      </div>
                      <div className="address-component">
                        <strong>Country:</strong>
                        <span>{selectedSeller.country}</span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section seller-info-section">
                    <h4><FaUserCircle /> Seller Information</h4>
                    <div className="info-item">
                      <strong>Seller ID:</strong>
                      <span className="seller-id">{selectedSeller.sellerId}</span>
                    </div>
                    <div className="info-item">
                      <strong>Seller Name:</strong>
                      <span>{selectedSeller.name}</span>
                    </div>
                    <div className="info-item">
                      <strong>Registration Date:</strong>
                      <span>{selectedSeller.registrationDate}</span>
                    </div>
                    <div className="info-item">
                      <strong>Account Status:</strong>
                      <span className={`status-label status-${selectedSeller.status.toLowerCase()}`}>
                        {selectedSeller.status}
                      </span>
                    </div>
                  </div>

                  <div className="detail-section location-section">
                    <h4><FaBuilding /> Location Details</h4>
                    <div className="location-cards">
                      <div className="location-card">
                        <div className="location-icon">
                          <FaBuilding />
                        </div>
                        <div className="location-details">
                          <div className="location-title">City</div>
                          <div className="location-value">{selectedSeller.city}</div>
                        </div>
                      </div>
                      <div className="location-card">
                        <div className="location-icon">
                          <FaMapMarkerAlt />
                        </div>
                        <div className="location-details">
                          <div className="location-title">State</div>
                          <div className="location-value">{selectedSeller.state}</div>
                        </div>
                      </div>
                      <div className="location-card">
                        <div className="location-icon">
                          <span>ZIP</span>
                        </div>
                        <div className="location-details">
                          <div className="location-title">ZIP Code</div>
                          <div className="location-value">{selectedSeller.zipCode}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Close
              </button>
              <button className="btn btn-primary" onClick={() => handleEdit(selectedSeller.id)}>
                <FaEdit /> Edit Address
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDetails;