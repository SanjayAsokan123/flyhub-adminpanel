import React, { useState } from 'react';

export default function SellerApprovalPanel() {
  const containerStyle = {
    minHeight: '100vh',
    background: '#f5f5f5', // professional light gray background
    padding: '40px 20px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  };

  const pageTitleStyle = {
    textAlign: 'center',
    color: '#111', // black
    fontSize: '2.5rem',
    marginBottom: '30px',
  };

  const statsContainerStyle = {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    marginBottom: '40px',
    flexWrap: 'wrap',
  };

  const statCardStyle = {
    background: 'white',
    borderRadius: '12px',
    padding: '25px 40px',
    textAlign: 'center',
    border: '2px solid #ccc', // subtle border
    minWidth: '150px',
  };

  const statTitleStyle = {
    fontSize: '1rem',
    color: '#111', // black title
    marginBottom: '10px',
    fontWeight: 600,
  };

  const statNumberStyle = (type) => ({
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color:
      type === 'pending' ? '#f39c12' : type === 'approved' ? '#11998e' : '#eb3349',
  });

  const sectionTitleStyle = {
    color: '#111',
    fontSize: '1.8rem',
    marginBottom: '20px',
    textAlign: 'center',
    fontWeight: 600,
  };

  const tableWrapperStyle = {
    background: 'white',
    borderRadius: '12px',
    overflowX: 'auto',
    margin: '0 auto 50px auto',
    maxWidth: '1600px',
    border: '1px solid #ccc',
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '1000px',
  };

  const thStyle = {
    padding: '15px',
    textAlign: 'left',
    fontWeight: 600,
    fontSize: '0.95rem',
    borderBottom: '2px solid #ccc',
    color: '#111',
    background: '#f9f9f9',
  };

  const tdStyle = {
    padding: '12px',
    borderBottom: '1px solid #e0e0e0',
  };

  const actionButtonStyle = {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    whiteSpace: 'nowrap',
    marginRight: '5px',
  };

  const buttonVariants = {
    approve: {
      background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      color: 'white',
    },
    reject: {
      background: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
      color: 'white',
    },
    delete: {
      background: 'linear-gradient(135deg, #434343 0%, #000000 100%)',
      color: 'white',
    },
    moveBack: {
      background: 'linear-gradient(135deg, #f39c12 0%, #f1c40f 100%)',
      color: 'white',
    },
  };

  const [sellers, setSellers] = useState([
    {
      id: 1,
      companyName: 'Tech Solutions Ltd',
      panNumber: 'ABCDE1234F',
      gstNumber: '29ABCDE1234F1Z5',
      email: 'contact@techsol.com',
      phoneNumber: '+91 9876543210',
      status: 'pending',
    },
    {
      id: 2,
      companyName: 'Global Traders',
      panNumber: 'PQRST5678G',
      gstNumber: '27PQRST5678G1Z8',
      email: 'info@globaltraders.com',
      phoneNumber: '+91 8765432109',
      status: 'pending',
    },
  ]);

  const [approvedSellers, setApprovedSellers] = useState([]);
  const [rejectedSellers, setRejectedSellers] = useState([]);

  const deleteRow = (id) => {
    if (window.confirm('Are you sure you want to delete this seller?')) {
      setSellers(sellers.filter((seller) => seller.id !== id));
    }
  };

  const handleApprove = (id) => {
    const seller = sellers.find((s) => s.id === id);
    if (!seller.companyName || !seller.email) {
      alert('Please fill in required fields (Company Name and Email)');
      return;
    }
    const approvedSeller = {
      ...seller,
      status: 'approved',
      approvedDate: new Date().toLocaleString(),
    };
    setApprovedSellers([...approvedSellers, approvedSeller]);
    setSellers(sellers.filter((s) => s.id !== id));
    alert(`✅ Approved: ${seller.companyName}`);
  };

  const handleReject = (id) => {
    const seller = sellers.find((s) => s.id === id);
    const reason = window.prompt('Enter rejection reason (optional):');
    const rejectedSeller = {
      ...seller,
      status: 'rejected',
      rejectedDate: new Date().toLocaleString(),
      rejectionReason: reason || 'No reason provided',
    };
    setRejectedSellers([...rejectedSellers, rejectedSeller]);
    setSellers(sellers.filter((s) => s.id !== id));
    alert(`❌ Rejected: ${seller.companyName || 'Seller'}`);
  };

  const moveBackToPending = (id, fromList) => {
    let seller;
    if (fromList === 'approved') {
      seller = approvedSellers.find((s) => s.id === id);
      setApprovedSellers(approvedSellers.filter((s) => s.id !== id));
    } else {
      seller = rejectedSellers.find((s) => s.id === id);
      setRejectedSellers(rejectedSellers.filter((s) => s.id !== id));
    }
    setSellers([...sellers, { ...seller, status: 'pending' }]);
  };

  const permanentlyDelete = (id, fromList) => {
    if (window.confirm('Permanently delete this record?')) {
      if (fromList === 'approved') {
        setApprovedSellers(approvedSellers.filter((s) => s.id !== id));
      } else {
        setRejectedSellers(rejectedSellers.filter((s) => s.id !== id));
      }
      alert('Record permanently deleted');
    }
  };

  return (
    <div style={containerStyle}>
      <h1 style={pageTitleStyle}>Seller Approval Panel</h1>

      <div style={statsContainerStyle}>
        <div style={statCardStyle}>
          <h3 style={statTitleStyle}>Pending</h3>
          <p style={statNumberStyle('pending')}>{sellers.length}</p>
        </div>
        <div style={statCardStyle}>
          <h3 style={statTitleStyle}>Approved</h3>
          <p style={statNumberStyle('approved')}>{approvedSellers.length}</p>
        </div>
        <div style={statCardStyle}>
          <h3 style={statTitleStyle}>Rejected</h3>
          <p style={statNumberStyle('rejected')}>{rejectedSellers.length}</p>
        </div>
      </div>

      {/* Pending Sellers */}
      <div style={{ marginBottom: '50px' }}>
        <h2 style={sectionTitleStyle}>⏳ Pending Approvals</h2>
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Company Name</th>
                <th style={thStyle}>PAN Number</th>
                <th style={thStyle}>GST Number</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Phone Number</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sellers.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#999', fontStyle: 'italic' }}>
                    No pending sellers
                  </td>
                </tr>
              ) : (
                sellers.map((seller) => (
                  <tr key={seller.id}>
                    <td style={tdStyle}>{seller.id}</td>
                    <td style={tdStyle}>{seller.companyName}</td>
                    <td style={tdStyle}>{seller.panNumber}</td>
                    <td style={tdStyle}>{seller.gstNumber}</td>
                    <td style={tdStyle}>{seller.email}</td>
                    <td style={tdStyle}>{seller.phoneNumber}</td>
                    <td style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button style={{ ...actionButtonStyle, ...buttonVariants.approve }} onClick={() => handleApprove(seller.id)}>✓ Approve</button>
                      <button style={{ ...actionButtonStyle, ...buttonVariants.reject }} onClick={() => handleReject(seller.id)}>✗ Reject</button>
                      <button style={{ ...actionButtonStyle, ...buttonVariants.delete }} onClick={() => deleteRow(seller.id)}>🗑 Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approved Sellers */}
      {approvedSellers.length > 0 && (
        <div style={{ marginBottom: '50px' }}>
          <h2 style={sectionTitleStyle}>✅ Approved Sellers</h2>
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Company Name</th>
                  <th style={thStyle}>PAN Number</th>
                  <th style={thStyle}>GST Number</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Phone Number</th>
                  <th style={thStyle}>Approved Date</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {approvedSellers.map((seller) => (
                  <tr key={seller.id}>
                    <td style={tdStyle}>{seller.id}</td>
                    <td style={tdStyle}>{seller.companyName}</td>
                    <td style={tdStyle}>{seller.panNumber}</td>
                    <td style={tdStyle}>{seller.gstNumber}</td>
                    <td style={tdStyle}>{seller.email}</td>
                    <td style={tdStyle}>{seller.phoneNumber}</td>
                    <td style={tdStyle}>{seller.approvedDate}</td>
                    <td style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button style={{ ...actionButtonStyle, ...buttonVariants.moveBack }} onClick={() => moveBackToPending(seller.id, 'approved')}>↩ Revert</button>
                      <button style={{ ...actionButtonStyle, ...buttonVariants.delete }} onClick={() => permanentlyDelete(seller.id, 'approved')}>🗑 Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rejected Sellers */}
      {rejectedSellers.length > 0 && (
        <div style={{ marginBottom: '50px' }}>
          <h2 style={sectionTitleStyle}>❌ Rejected Sellers</h2>
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Company Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Rejected Date</th>
                  <th style={thStyle}>Reason</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rejectedSellers.map((seller) => (
                  <tr key={seller.id}>
                    <td style={tdStyle}>{seller.id}</td>
                    <td style={tdStyle}>{seller.companyName || 'N/A'}</td>
                    <td style={tdStyle}>{seller.email || 'N/A'}</td>
                    <td style={tdStyle}>{seller.rejectedDate}</td>
                    <td style={tdStyle}>{seller.rejectionReason}</td>
                    <td style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button style={{ ...actionButtonStyle, ...buttonVariants.moveBack }} onClick={() => moveBackToPending(seller.id, 'rejected')}>↩ Revert</button>
                      <button style={{ ...actionButtonStyle, ...buttonVariants.delete }} onClick={() => permanentlyDelete(seller.id, 'rejected')}>🗑 Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}