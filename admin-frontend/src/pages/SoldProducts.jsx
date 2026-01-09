import React, { useState, useEffect } from "react";
import { gql, useQuery } from "@apollo/client";
import "../styles/SoldProducts.css";

// GraphQL query to get delivered orders
const GET_DELIVERED_ORDERS = gql`
  query GetDeliveredOrders {
    orders {
      orderId
      status
      totalAmount
      createdAt
      buyer {
        name
        email
        phone
      }
      items {
        name
        quantity
        price
        sellerId
        type
      }
    }
  }
`;

export default function SoldProducts() {
  const { data, loading, error } = useQuery(GET_DELIVERED_ORDERS);
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("date-newest");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  useEffect(() => {
    if (data?.orders) {
      const soldProducts = data.orders
        // ✅ ONLY delivered orders
        .filter(order => order.status === "delivered")
        .flatMap(order =>
          order.items.map(item => ({
            orderId: order.orderId,
            name: item.name,
            buyer: order.buyer.name,
            email: order.buyer.email,
            phone: order.buyer.phone,
            qty: item.quantity,
            price: item.price,
            date: order.createdAt,
            type: item.type,
            sellerId: item.sellerId,
            totalAmount: order.totalAmount,
          }))
        );

      setProducts(soldProducts);
    }
  }, [data]);

  const filtered = () => {
    let out = products.filter((p) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.buyer.toLowerCase().includes(q) ||
        String(p.price).includes(q) ||
        p.orderId.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        p.sellerId.toLowerCase().includes(q)
      );
    });

    out.sort((a, b) => {
      if (sortKey === "date-newest") return new Date(b.date) - new Date(a.date);
      if (sortKey === "date-oldest") return new Date(a.date) - new Date(b.date);
      if (sortKey === "price") return b.price - a.price;
      if (sortKey === "price-asc") return a.price - b.price;
      if (sortKey === "name") return a.name.localeCompare(b.name);
      return 0;
    });

    return out;
  };

  const list = filtered();
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const visible = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCSV = () => {
    const rows = visible.map((r) => [
      r.orderId,
      r.name, 
      r.buyer, 
      r.qty, 
      r.price, 
      r.totalAmount ? r.totalAmount : (r.qty * r.price),
      r.type,
      r.sellerId,
      new Date(r.date).toLocaleDateString()
    ]);
    const header = [
      "Order ID", 
      "Product Name", 
      "Buyer", 
      "Quantity", 
      "Unit Price", 
      "Total Amount", 
      "Type", 
      "Seller ID", 
      "Date"
    ];
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sold-products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getStatusColor = (status) => {
    return '#10b981'; // Green for delivered
  };

  if (loading) return (
    <div className="sold-root">
      <div className="sold-loading">
        <div className="loading-spinner"></div>
        <p>Loading Sold Products...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="sold-root">
      <div className="sold-error">
        <h3>⚠️ Error Loading Products</h3>
        <p>{error.message}</p>
        <button 
          className="sold-btn primary"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="sold-root">
      <header className="sold-header">
        <div>
          <h1 className="sold-title">Sold Products</h1>
          <p className="sold-sub">Track all delivered sales with buyer and product details.</p>
        </div>

        <div className="sold-actions">
          <div className="search-container">
            <input
              className="sold-search"
              placeholder="Search by product, buyer, order ID..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            />
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
          
          <select
            className="sold-select"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
          >
            <option value="date-newest">Newest First</option>
            <option value="date-oldest">Oldest First</option>
            <option value="price">Price (High to Low)</option>
            <option value="price-asc">Price (Low to High)</option>
            <option value="name">Name (A-Z)</option>
          </select>

          <button className="sold-btn export" onClick={exportCSV}>
            📊 Export CSV
          </button>
        </div>
      </header>

      {/* Stats Summary */}
      {products.length > 0 && (
        <div className="stats-summary">
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <h3>Total Products Sold</h3>
              <p className="stat-value">{products.length}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h3>Total Revenue</h3>
              <p className="stat-value">
                {formatCurrency(products.reduce((sum, p) => sum + (p.totalAmount || (p.qty * p.price)), 0))}
              </p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>Total Quantity</h3>
              <p className="stat-value">
                {products.reduce((sum, p) => sum + p.qty, 0)}
              </p>
            </div>
          </div>
        </div>
      )}

      <main className="sold-list">
        {visible.length === 0 && (
          <div className="sold-empty">
            <div className="empty-icon">📦</div>
            <h3>No sold products found</h3>
            <p>
              {query 
                ? `No results for "${query}". Try a different search term.`
                : "No delivered products found in your orders."
              }
            </p>
            {query && (
              <button 
                className="sold-btn primary"
                onClick={() => setQuery("")}
              >
                Clear Search
              </button>
            )}
          </div>
        )}
        
        {visible.map((p, idx) => (
          <article key={`${p.orderId}-${idx}`} className="sold-item">
            <div className="sold-item-left">
              <div className="sold-item-header">
                <div className="order-id">Order: {p.orderId}</div>
                <div className="type-badge">{p.type.toUpperCase()}</div>
              </div>
              
              <div className="sold-item-title">{p.name}</div>
              
              <div className="sold-item-meta">
                <div className="meta-row">
                  <span className="meta-label">Buyer:</span>
                  <span className="meta-value">{p.buyer}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Email:</span>
                  <span className="meta-value">{p.email}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Phone:</span>
                  <span className="meta-value">{p.phone}</span>
                </div>
              </div>
              
              <div className="sold-item-pricing">
                <div className="price-item">
                  <span className="price-label">Quantity:</span>
                  <span className="price-value">{p.qty}</span>
                </div>
                <div className="price-item">
                  <span className="price-label">Unit Price:</span>
                  <span className="price-value">{formatCurrency(p.price)}</span>
                </div>
                <div className="price-item">
                  <span className="price-label">Total:</span>
                  <span className="price-value total">
                    {formatCurrency(p.totalAmount || (p.qty * p.price))}
                  </span>
                </div>
              </div>
              
              <div className="seller-info">
                <span className="seller-label">Seller ID:</span>
                <span className="seller-value">{p.sellerId}</span>
              </div>
            </div>
            
            <div className="sold-item-right">
              <div className="sold-item-date">
                <div className="date-icon">📅</div>
                <div className="date-content">
                  <div className="date-text">
                    {new Date(p.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="time-text">
                    {new Date(p.date).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
              
              <div 
                className="sold-item-status"
                style={{ backgroundColor: getStatusColor('delivered') }}
              >
                DELIVERED
              </div>
            </div>
          </article>
        ))}
      </main>

      <footer className="sold-footer">
        <div className="footer-left">
          Showing <strong>{visible.length}</strong> of <strong>{list.length}</strong> sold products
          {query && (
            <span className="search-info">
              • Search: "<strong>{query}</strong>"
            </span>
          )}
        </div>
        
        <div className="sold-pages">
          <button
            className="sold-page-btn prev"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            ← Previous
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
                <button
                  key={pageNum}
                  className={`page-number ${page === pageNum ? 'active' : ''}`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            className="sold-page-btn next"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next →
          </button>
        </div>
      </footer>
    </div>
  );
}