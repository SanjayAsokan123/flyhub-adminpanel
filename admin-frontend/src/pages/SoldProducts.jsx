import React, { useState } from "react";
import "../styles/SoldProducts.css";

export default function SoldProducts() {
  const [products, setProducts] = useState(sampleData());
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    buyer: "",
    qty: 1,
    price: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const [sortKey, setSortKey] = useState("date-newest");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  function sampleData() {
    return [
      { id: genId(), name: "Vintage Camera", buyer: "Asha R.", qty: 1, price: 4800, date: "2025-01-20" },
      { id: genId(), name: "Leather Satchel", buyer: "Rohit M.", qty: 2, price: 3200, date: "2025-03-22" },
      { id: genId(), name: "Handmade Mug", buyer: "Neha S.", qty: 3, price: 600, date: "2025-02-23" },
      { id: genId(), name: "Antique Keychain", buyer: "Vikram P.", qty: 1, price: 250, date: "2025-04-05" },
      { id: genId(), name: "Silk Scarf", buyer: "Priya K.", qty: 1, price: 1200, date: "2025-06-10" },
      { id: genId(), name: "Classic Pen", buyer: "Sunita G.", qty: 4, price: 960, date: "2025-05-26" },
    ];
  }

  function genId() {
    return Math.random().toString(36).slice(2, 9);
  }

  function onSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.buyer.trim() || !form.price) {
      alert("Please fill product name, buyer, and price.");
      return;
    }

    const newItem = {
      id: genId(),
      name: form.name.trim(),
      buyer: form.buyer.trim(),
      qty: Number(form.qty) || 1,
      price: Number(form.price),
      date: form.date || new Date().toISOString().slice(0, 10),
    };

    setProducts((p) => [newItem, ...p]);
    setForm({
      name: "",
      buyer: "",
      qty: 1,
      price: "",
      date: new Date().toISOString().slice(0, 10),
    });
    setShowForm(false);
    setPage(1);
  }

  function exportCSV() {
    const rows = products.map((r) => [r.name, r.buyer, r.qty, r.price, r.date]);
    const header = ["Product Name", "Buyer", "Quantity", "Price", "Date"];
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sold-products-${new Date().toISOString().slice(0, 10)}.csv`; // ✅ fixed
    a.click();
    URL.revokeObjectURL(url);
  }

  function filtered() {
    let out = products.filter((p) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.buyer.toLowerCase().includes(q) ||
        String(p.price).includes(q) ||
        p.date.includes(q)
      );
    });

    out.sort((a, b) => {
      if (sortKey === "date-newest") return b.date.localeCompare(a.date);
      if (sortKey === "date-oldest") return a.date.localeCompare(b.date);
      if (sortKey === "month") {
        const monthA = parseInt(a.date.split("-")[1]);
        const monthB = parseInt(b.date.split("-")[1]);
        return monthA - monthB;
      }
      if (sortKey === "day") {
        const dayA = parseInt(a.date.split("-")[2]);
        const dayB = parseInt(b.date.split("-")[2]);
        return dayA - dayB;
      }
      if (sortKey === "price") return b.price - a.price;
      if (sortKey === "name") return a.name.localeCompare(b.name);
      return 0;
    });

    return out;
  }

  const list = filtered();
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const visible = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="sold-root">
      {/* Header Section */}
      <header className="sold-header">
        <div>
          <h1 className="sold-title">Sold Products</h1>
          <p className="sold-sub">Track your completed sales and add new ones easily.</p>
        </div>

        <div className="sold-actions">
          <input
            className="sold-search"
            placeholder="Search name, buyer, or price..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="sold-select"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
          >
            <option value="date-newest">Sort: newest first</option>
            <option value="date-oldest">Sort: oldest first</option>
            <option value="month">Sort: by month</option>
            <option value="day">Sort: by day</option>
            <option value="price">Sort: price</option>
            <option value="name">Sort: name</option>
          </select>

          <button className="sold-btn" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Close Form" : "Add Sold Product"}
          </button>
          <button className="sold-btn ghost" onClick={exportCSV}>
            Export CSV
          </button>
        </div>
      </header>

      {/* Add Form */}
      {showForm && (
        <form className="sold-form" onSubmit={onSubmit}>
          <div className="sold-field">
            <label>Product Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="sold-row">
            <div className="sold-field">
              <label>Buyer</label>
              <input
                value={form.buyer}
                onChange={(e) => setForm({ ...form, buyer: e.target.value })}
              />
            </div>

            <div className="sold-field small">
              <label>Qty</label>
              <input
                type="number"
                min="1"
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: e.target.value })}
              />
            </div>

            <div className="sold-field small">
              <label>Price (₹)</label>
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>

            <div className="sold-field small">
              <label>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
          </div>

          <div className="sold-form-actions">
            <button type="submit" className="sold-btn">
              Save
            </button>
            <button
              type="button"
              className="sold-btn ghost"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Product List */}
      <main className="sold-list">
        {visible.length === 0 && (
          <div className="sold-empty">No sold products found.</div>
        )}
        {visible.map((p) => (
          <article key={p.id} className="sold-item">
            <div className="sold-item-left">
              <div className="sold-item-title">{p.name}</div>
              <div className="sold-item-meta">
                Bought by <strong>{p.buyer}</strong> • {p.qty} pcs • ₹{p.price}
              </div>
            </div>
            <div className="sold-item-right">
              <div className="sold-item-date">{p.date}</div>
              <div className="sold-item-status">SOLD</div>
            </div>
          </article>
        ))}
      </main>

      {/* Pagination Footer */}
      <footer className="sold-footer">
        <div>
          Showing <strong>{list.length}</strong> sold products
        </div>
        <div className="sold-pages">
          <button
            className="sold-page-btn"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Prev
          </button>
          <span className="sold-page-ind">
            {page} / {totalPages}
          </span>
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