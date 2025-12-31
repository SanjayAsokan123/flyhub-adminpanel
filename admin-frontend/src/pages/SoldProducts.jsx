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
  const { data, loading, error, refetch } = useQuery(GET_DELIVERED_ORDERS);
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
        String(p.price).includes(q)
      );
    });

    out.sort((a, b) => {
      if (sortKey === "date-newest") return new Date(b.date) - new Date(a.date);
      if (sortKey === "date-oldest") return new Date(a.date) - new Date(b.date);
      if (sortKey === "price") return b.price - a.price;
      if (sortKey === "name") return a.name.localeCompare(b.name);
      return 0;
    });

    return out;
  };

  const list = filtered();
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const visible = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCSV = () => {
    const rows = visible.map((r) => [r.name, r.buyer, r.qty, r.price, r.date]);
    const header = ["Product Name", "Buyer", "Quantity", "Price", "Date"];
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sold-products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div>Loading Sold Products...</div>;
  if (error) return <div>Error loading products!</div>;

  return (
    <div className="sold-root">
      <header className="sold-header">
        <div>
          <h1 className="sold-title">Sold Products</h1>
          <p className="sold-sub">Track all delivered sales with buyer and product details.</p>
        </div>

        <div className="sold-actions">
          <input
            className="sold-search"
            placeholder="Search name, buyer, or price..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          />
          <select
            className="sold-select"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
          >
            <option value="date-newest">Sort: newest first</option>
            <option value="date-oldest">Sort: oldest first</option>
            <option value="price">Sort: price</option>
            <option value="name">Sort: name</option>
          </select>

          <button className="sold-btn ghost" onClick={exportCSV}>Export CSV</button>
        </div>
      </header>

      <main className="sold-list">
        {visible.length === 0 && <div className="sold-empty">No sold products found.</div>}
        {visible.map((p, idx) => (
          <article key={idx} className="sold-item">
            <div className="sold-item-left">
              <div className="sold-item-title">{p.name} ({p.type})</div>
              <div className="sold-item-meta">
                Buyer: <strong>{p.buyer}</strong> • Qty: {p.qty} • ₹{p.price} • Seller: {p.sellerId}
              </div>
            </div>
            <div className="sold-item-right">
              <div className="sold-item-date">{new Date(p.date).toLocaleDateString()}</div>
              <div className="sold-item-status">SOLD</div>
            </div>
          </article>
        ))}
      </main>

      <footer className="sold-footer">
        <div>Showing <strong>{list.length}</strong> sold products</div>
        <div className="sold-pages">
          <button
            className="sold-page-btn"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Prev
          </button>
          <span className="sold-page-ind">{page} / {totalPages}</span>
          <button
            className="sold-page-btn"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </footer>
    </div>
  );
}