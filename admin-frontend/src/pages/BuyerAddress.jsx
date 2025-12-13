import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  Search, 
  Filter, 
  Download, 
  Edit, 
  Trash2,
  Building,
  Copy,
  CheckCircle,
  XCircle,
  ChevronRight,
  Calendar,
  ShoppingBag,
  DollarSign,
  Package,
  Save,
  X,
  Home
} from 'lucide-react';
import "../styles/BuyerAddress.css";

// GraphQL queries
const GET_ALL_BUYERS = gql`
  query GetAllBuyers {
    getAllBuyers {
      id
      buyerId
      name
      email
      phone
      addresses {
        addressId
        streetAddress
        city
        state
        zipCode
        phone
      }
    }
  }
`;

const UPDATE_BUYER = gql`
  mutation UpdateBuyer($input: UpdateBuyerInput!) {
    updateBuyer(input: $input) {
      id
      buyerId
      name
      email
      phone
    }
  }
`;

const DELETE_BUYER = gql`
  mutation DeleteBuyer($id: ID!) {
    deleteBuyer(id: $id)
  }
`;

const BuyersAddress = () => {
  const { data, loading, error, refetch } = useQuery(GET_ALL_BUYERS);
  const [updateBuyer] = useMutation(UPDATE_BUYER);
  const [deleteBuyer] = useMutation(DELETE_BUYER);

  const [buyers, setBuyers] = useState([]);
  const [filteredBuyers, setFilteredBuyers] = useState([]);
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    city: '',
    status: ''
  });
  const [copiedId, setCopiedId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  // Show toast message
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Initialize with GraphQL data
  useEffect(() => {
    if (data?.getAllBuyers) {
      const transformedBuyers = data.getAllBuyers.map(buyer => ({
        id: buyer.id,
        buyerId: buyer.buyerId,
        name: buyer.name || 'Unknown Buyer',
        email: buyer.email || 'No email',
        phone: buyer.phone || 'No phone',
        addresses: buyer.addresses || [],
        totalOrders: buyer.addresses?.length || 0,
        totalSpent: (buyer.addresses?.length * 150) || 0,
        memberSince: new Date().toISOString().split('T')[0]
      }));
      setBuyers(transformedBuyers);
      setFilteredBuyers(transformedBuyers);
      if (transformedBuyers.length > 0 && !selectedBuyer) {
        setSelectedBuyer(transformedBuyers[0]);
      }
    }
  }, [data]);

  // Calculate statistics based on GraphQL data
  const stats = {
    totalBuyers: buyers.length,
    totalAddresses: buyers.reduce((acc, buyer) => acc + (buyer.addresses?.length || 0), 0),
    differentCities: [...new Set(buyers.flatMap(b => 
      b.addresses?.map(addr => addr.city).filter(Boolean)
    ))].length,
    activeBuyers: buyers.filter(b => b.addresses?.length > 0).length
  };

  // Handle search and filter
  const handleSearchAndFilter = () => {
    let results = buyers;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(buyer => 
        buyer.name?.toLowerCase().includes(term) ||
        buyer.email?.toLowerCase().includes(term) ||
        buyer.phone?.toLowerCase().includes(term) ||
        buyer.buyerId?.toLowerCase().includes(term) ||
        buyer.addresses?.some(addr => 
          addr.city?.toLowerCase().includes(term) ||
          addr.streetAddress?.toLowerCase().includes(term)
        )
      );
    }
    
    if (filters.city) {
      results = results.filter(buyer => 
        buyer.addresses?.some(addr => 
          addr.city?.toLowerCase() === filters.city.toLowerCase()
        )
      );
    }
    
    setFilteredBuyers(results);
    if (results.length > 0 && !results.find(b => b.id === selectedBuyer?.id)) {
      setSelectedBuyer(results[0]);
    }
  };

  // Apply filters when search or filters change
  useEffect(() => {
    handleSearchAndFilter();
  }, [searchTerm, filters, buyers]);

  // Copy to clipboard
  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    if (id === 'buyerId') {
      showToast('Buyer ID copied to clipboard!', 'success');
    } else if (id === 'allAddresses') {
      showToast('All addresses copied to clipboard!', 'success');
    } else {
      showToast('Address copied to clipboard!', 'success');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    try {
      const headers = ['Buyer ID', 'Name', 'Email', 'Phone', 'Total Addresses', 'Total Orders', 'Total Spent', 'Member Since'];
      const csvData = buyers.map(buyer => [
        buyer.buyerId,
        buyer.name,
        buyer.email,
        buyer.phone,
        buyer.addresses?.length || 0,
        buyer.totalOrders,
        `$${buyer.totalSpent.toFixed(2)}`,
        buyer.memberSince
      ]);
      
      let csvContent = headers.join(',') + '\n';
      csvData.forEach(row => {
        csvContent += row.map(cell => `${cell}`).join(',') + '\n';
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `buyers-addresses-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      showToast('CSV exported successfully!', 'success');
    } catch (err) {
      console.error('Error exporting CSV:', err);
      showToast('Failed to export CSV', 'error');
    }
  };

  // Get all unique cities for filters
  const cities = [...new Set(buyers.flatMap(buyer => 
    buyer.addresses?.map(addr => addr.city).filter(Boolean)
  ))];

  // Format address
  const formatAddress = (address) => {
    if (!address) return 'No address provided';
    const parts = [
      address.streetAddress,
      address.city,
      address.state,
      address.zipCode
    ].filter(Boolean);
    return parts.join(', ');
  };

  // Get full address with line breaks
  const formatAddressWithDetails = (address) => {
    if (!address) return '';
    const parts = [];
    if (address.streetAddress) parts.push(`Street: ${address.streetAddress}`);
    if (address.city) parts.push(`City: ${address.city}`);
    if (address.state) parts.push(`State: ${address.state}`);
    if (address.zipCode) parts.push(`Zip Code: ${address.zipCode}`);
    if (address.phone) parts.push(`Phone: ${address.phone}`);
    return parts.join('\n');
  };

  // Start editing buyer
  const handleEdit = () => {
    setIsEditing(true);
    setEditForm({
      ...selectedBuyer,
      addresses: selectedBuyer.addresses ? [...selectedBuyer.addresses] : []
    });
  };

  // Save buyer edits
  const handleSave = async () => {
    try {
      const { data } = await updateBuyer({
        variables: {
          input: {
            id: editForm.id,
            name: editForm.name,
            email: editForm.email,
            phone: editForm.phone
          }
        }
      });
      
      if (data.updateBuyer) {
        const updatedBuyers = buyers.map(buyer => 
          buyer.id === editForm.id ? { ...buyer, ...data.updateBuyer } : buyer
        );
        setBuyers(updatedBuyers);
        setSelectedBuyer(prev => ({ ...prev, ...data.updateBuyer }));
        setIsEditing(false);
        showToast('Buyer information updated successfully!', 'success');
        refetch();
      }
    } catch (err) {
      console.error('Error updating buyer:', err);
      showToast('Failed to update buyer information', 'error');
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({});
  };

  // Delete buyer
  const handleDelete = async () => {
    try {
      const { data } = await deleteBuyer({
        variables: { id: selectedBuyer.id }
      });
      
      if (data.deleteBuyer) {
        const updatedBuyers = buyers.filter(buyer => buyer.id !== selectedBuyer.id);
        setBuyers(updatedBuyers);
        setFilteredBuyers(updatedBuyers);
        if (updatedBuyers.length > 0) {
          setSelectedBuyer(updatedBuyers[0]);
        } else {
          setSelectedBuyer(null);
        }
        setShowDeleteConfirm(false);
        showToast('Buyer deleted successfully!', 'success');
      }
    } catch (err) {
      console.error('Error deleting buyer:', err);
      showToast('Failed to delete buyer', 'error');
    }
  };

  // Handle edit form changes
  const handleEditChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Loading buyers data...</p>
    </div>
  );
  
  if (error) return (
    <div className="error-container">
      <h3>Error loading data</h3>
      <p>{error.message}</p>
      <button onClick={() => refetch()} className="btn-retry">
        Retry
      </button>
    </div>
  );

  return (
    <div className="buyers-address-container">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast ${toast.type}`}>
          <div className="toast-content">
            {toast.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <XCircle size={20} />
            )}
            <span>{toast.message}</span>
          </div>
          <button className="toast-close" onClick={() => setToast({ show: false, message: '', type: '' })}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="buyers-address-header">
        <div className="header-title">
          <div className="header-icon">
            <MapPin size={32} />
          </div>
          <div>
            <h1>Buyers Address Directory</h1>
            <p>View and manage buyer addresses and contact information</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-export" onClick={handleExportCSV}>
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary">
            <User size={24} />
          </div>
          <div className="stat-content">
            <h3>{stats.totalBuyers}</h3>
            <p>Total Buyers</p>
            <span className="stat-subtext">Registered in system</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon success">
            <Package size={24} />
          </div>
          <div className="stat-content">
            <h3>{stats.totalAddresses}</h3>
            <p>Total Addresses</p>
            <span className="stat-subtext">Across all buyers</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon warning">
            <Building size={24} />
          </div>
          <div className="stat-content">
            <h3>{stats.differentCities}</h3>
            <p>Different Cities</p>
            <span className="stat-subtext">Address locations</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon info">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>{stats.activeBuyers}</h3>
            <p>Active Buyers</p>
            <span className="stat-subtext">With addresses</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="search-filters">
        <div className="search-box">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search by ID, name, email, phone, city or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filters">
          <div className="filter-group">
            <Filter size={16} />
            <span>Filters:</span>
          </div>
          
          <select
            value={filters.city}
            onChange={(e) => setFilters({...filters, city: e.target.value})}
            className="filter-select"
          >
            <option value="">All Cities</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
          
          <button 
            className="btn-clear-filters"
            onClick={() => setFilters({ city: '', status: '' })}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="buyers-address-content">
        {/* Buyers List */}
        <div className="buyers-list-section">
          <div className="section-header">
            <h2>Buyers List ({filteredBuyers.length})</h2>
            <div className="list-info">
              Showing {filteredBuyers.length} of {buyers.length} buyers
            </div>
          </div>
          
          <div className="buyers-list-container">
            {filteredBuyers.length > 0 ? (
              <div className="buyers-list">
                {filteredBuyers.map(buyer => (
                  <div
                    key={buyer.id}
                    className={`buyer-card ${selectedBuyer?.id === buyer.id ? 'active' : ''}`}
                    onClick={() => setSelectedBuyer(buyer)}
                  >
                    <div className="buyer-avatar">
                      {buyer.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="buyer-card-content">
                      <div className="buyer-main-info">
                        <h4>{buyer.name}</h4>
                        <div className="buyer-meta">
                          <span className={`status-badge ${buyer.addresses?.length > 0 ? 'active' : 'inactive'}`}>
                            {buyer.addresses?.length > 0 ? 'Active' : 'No Address'}
                          </span>
                          <span className="buyer-id">
                            ID: {buyer.buyerId}
                            <button 
                              className="copy-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(buyer.buyerId, 'buyerId');
                              }}
                            >
                              {copiedId === 'buyerId' ? (
                                <CheckCircle size={12} />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </span>
                        </div>
                      </div>
                      
                      <div className="buyer-contact-info">
                        <div className="contact-item">
                          <Mail size={14} />
                          <span className="truncate">{buyer.email}</span>
                        </div>
                        {buyer.phone && (
                          <div className="contact-item">
                            <Phone size={14} />
                            <span>{buyer.phone}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="buyer-address-preview">
                        <MapPin size={14} />
                        <span className="truncate">
                          {buyer.addresses && buyer.addresses.length > 0 ? 
                            `${buyer.addresses[0].city || ''}, ${buyer.addresses.length} addresses` :
                            'No addresses'
                          }
                        </span>
                      </div>
                      
                      <div className="buyer-card-footer">
                        <span className="order-count">
                          <ShoppingBag size={14} />
                          {buyer.totalOrders} orders
                        </span>
                        <span className="total-spent">
                          <DollarSign size={14} />
                          ${buyer.totalSpent.toFixed(2)}
                        </span>
                        <ChevronRight size={16} className="chevron" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-results">
                <User size={48} />
                <h3>No Buyers Found</h3>
                <p>Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>

        {/* Address Details */}
        <div className="address-details-section">
          {selectedBuyer ? (
            <>
              <div className="details-header">
                <div className="buyer-profile">
                  <div className="profile-avatar">
                    {selectedBuyer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="profile-info">
                    <h2>{selectedBuyer.name}</h2>
                    <div className="profile-meta">
                      <span className="buyer-id-display">
                        <User size={14} />
                        ID: {selectedBuyer.buyerId}
                        <button 
                          className="copy-btn-small"
                          onClick={() => copyToClipboard(selectedBuyer.buyerId, 'buyerId')}
                        >
                          {copiedId === 'buyerId' ? (
                            <CheckCircle size={12} />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </span>
                      <span className={`verification-status ${selectedBuyer.addresses?.length > 0 ? 'active' : 'inactive'}`}>
                        {selectedBuyer.addresses?.length > 0 ? (
                          <>
                            <CheckCircle size={14} />
                            Active Buyer
                          </>
                        ) : (
                          <>
                            <XCircle size={14} />
                            No Addresses
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="details-actions">
                  <button className="btn-action danger" onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 size={18} />
                    Delete
                  </button>
                </div>
              </div>

              {isEditing ? (
                <div className="edit-form">
                  <div className="edit-form-header">
                    <h3>Edit Buyer Information</h3>
                    <div className="edit-actions">
                      <button className="btn-save" onClick={handleSave}>
                        <Save size={16} />
                        Save Changes
                      </button>
                      <button className="btn-cancel" onClick={handleCancelEdit}>
                        <X size={16} />
                        Cancel
                      </button>
                    </div>
                  </div>
                  
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Full Name *</label>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => handleEditChange('name', e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Email *</label>
                      <input
                        type="email"
                        value={editForm.email || ''}
                        onChange={(e) => handleEditChange('email', e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Phone</label>
                      <input
                        type="text"
                        value={editForm.phone || ''}
                        onChange={(e) => handleEditChange('phone', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="details-content">
                  {/* Contact Information */}
                  <div className="info-section">
                    <h3>Contact Information</h3>
                    <div className="info-grid">
                      <div className="info-item">
                        <Mail size={18} />
                        <div>
                          <label>Email</label>
                          <p>{selectedBuyer.email}</p>
                        </div>
                      </div>
                      
                      <div className="info-item">
                        <Phone size={18} />
                        <div>
                          <label>Phone</label>
                          <p>{selectedBuyer.phone || 'Not provided'}</p>
                        </div>
                      </div>
                      
                      <div className="info-item">
                        <Calendar size={18} />
                        <div>
                          <label>Member Since</label>
                          <p>{new Date(selectedBuyer.memberSince).toLocaleDateString()}</p>
                        </div>
                      </div>
                      
                      <div className="info-item">
                        <ShoppingBag size={18} />
                        <div>
                          <label>Total Orders</label>
                          <p>{selectedBuyer.totalOrders}</p>
                        </div>
                      </div>
                      
                      <div className="info-item">
                        <DollarSign size={18} />
                        <div>
                          <label>Total Spent</label>
                          <p>${selectedBuyer.totalSpent.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Address Details */}
                  <div className="info-section">
                    <div className="section-header-with-action">
                      <h3>Addresses ({selectedBuyer.addresses?.length || 0})</h3>
                      {selectedBuyer.addresses && selectedBuyer.addresses.length > 0 && (
                        <button 
                          className="btn-copy-all"
                          onClick={() => {
                            const allAddresses = selectedBuyer.addresses.map(addr => formatAddressWithDetails(addr)).join('\n\n');
                            copyToClipboard(allAddresses, 'allAddresses');
                          }}
                        >
                          <Copy size={16} />
                          Copy All Addresses
                        </button>
                      )}
                    </div>
                    
                    {selectedBuyer.addresses && selectedBuyer.addresses.length > 0 ? (
                      <div className="addresses-list">
                        {selectedBuyer.addresses.map((address, index) => (
                          <div key={address.addressId} className="address-item">
                            <div className="address-header">
                              <div className="address-title">
                                <h4>
                                  <Home size={16} />
                                  Address #{index + 1}
                                </h4>
                                <span className="address-id">ID: {address.addressId}</span>
                              </div>
                              <button 
                                className="btn-copy-address"
                                onClick={() => copyToClipboard(formatAddressWithDetails(address), `address-${address.addressId}`)}
                                title="Copy address"
                              >
                                {copiedId === `address-${address.addressId}` ? (
                                  <>
                                    <CheckCircle size={14} />
                                    <span>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={14} />
                                    <span>Copy Address</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="address-details">
                              <p className="address-full">{formatAddress(address)}</p>
                              <div className="address-breakdown">
                                {address.streetAddress && (
                                  <div className="address-line">
                                    <strong>Street:</strong> {address.streetAddress}
                                  </div>
                                )}
                                
                                {address.city && (
                                  <div className="address-line">
                                    <strong>City:</strong> {address.city}
                                  </div>
                                )}
                                
                                {address.state && (
                                  <div className="address-line">
                                    <strong>State:</strong> {address.state}
                                  </div>
                                )}
                                
                                {address.zipCode && (
                                  <div className="address-line">
                                    <strong>Zip Code:</strong> {address.zipCode}
                                  </div>
                                )}
                              </div>
                              {address.phone && (
                                <div className="address-contact">
                                  <Phone size={14} />
                                  <span>{address.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="no-address">
                        <MapPin size={48} />
                        <h4>No Addresses Found</h4>
                        <p>This buyer hasn't added any addresses yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="no-selection">
              <User size={64} />
              <h3>Select a Buyer</h3>
              <p>Choose a buyer from the list to view their address details</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Buyer Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Confirm Delete</h3>
              <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="warning-icon">
                <Trash2 size={48} />
              </div>
              <p>Are you sure you want to delete <strong>{selectedBuyer?.name}</strong>?</p>
              <p className="warning-text">This will permanently delete all buyer information and addresses.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={handleDelete}>
                Delete Buyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyersAddress;