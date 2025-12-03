// OrderPage.jsx
import React, { useState } from "react";
import "../styles/OrderPage.css";

export default function OrderPage() {
  const [orders, setOrders] = useState(sampleData());
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    product: "",
    customer: "",
    qty: 1,
    price: "",
    payment: "Credit Card",
    status: "Pending",
    date: new Date().toISOString().slice(0, 10),
  });

  const [sortKey, setSortKey] = useState("date-newest");
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 6;

  function genId() {
    return Math.random().toString(36).slice(2, 9);
  }

  function sampleData() {
    return [
      { id: genId(), product: "Wireless Headphones", customer: "Amit S.", qty: 1, price: 2499, payment: "Credit Card", status: "Delivered", date: "2025-06-15" },
      { id: genId(), product: "Smart Watch", customer: "Priya K.", qty: 2, price: 8999, payment: "PayPal", status: "Shipped", date: "2025-06-18" },
      { id: genId(), product: "Bluetooth Speaker", customer: "Raj M.", qty: 1, price: 3299, payment: "UPI", status: "Processing", date: "2025-06-20" },
      { id: genId(), product: "Laptop Stand", customer: "Neha P.", qty: 1, price: 1299, payment: "Cash on Delivery", status: "Pending", date: "2025-06-21" },
      { id: genId(), product: "USB-C Hub", customer: "Vikram T.", qty: 3, price: 2499, payment: "Credit Card", status: "Delivered", date: "2025-06-10" },
      { id: genId(), product: "Wireless Mouse", customer: "Sunita G.", qty: 2, price: 1599, payment: "UPI", status: "Shipped", date: "2025-06-19" },
    ];
  }

  function onSubmit(e) {
    e.preventDefault();

    if (!form.product.trim() || !form.customer.trim() || !form.price) {
      alert("Please fill product name, customer and price.");
      return;
    }

    const newOrder = {
      id: genId(),
      product: form.product.trim(),
      customer: form.customer.trim(),
      qty: Number(form.qty) || 1,
      price: Number(form.price),
      payment: form.payment,
      status: form.status,
      date: form.date || new Date().toISOString().slice(0, 10),
    };

    setOrders((o) => [newOrder, ...o]);
    setForm({
      product: "",
      customer: "",
      qty: 1,
      price: "",
      payment: "Credit Card",
      status: "Pending",
      date: new Date().toISOString().slice(0, 10),
    });
    setShowForm(false);
    setPage(1);
  }

  function exportCSV() {
    const rows = orders.map((r) => [
      r.product,
      r.customer,
      r.qty,
      r.price,
      r.payment,
      r.status,
      r.date,
    ]);

    const header = ["Product", "Customer", "Quantity", "Price", "Payment Method", "Status", "Date"];

    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `customer-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  function filtered() {
    let out = orders.filter((o) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;

      return (
        o.product.toLowerCase().includes(q) ||
        o.customer.toLowerCase().includes(q) ||
        String(o.price).includes(q) ||
        o.payment.toLowerCase().includes(q) ||
        o.status.toLowerCase().includes(q) ||
        o.date.includes(q)
      );
    });

    out.sort((a, b) => {
      if (sortKey === "date-newest") return b.date.localeCompare(a.date);
      if (sortKey === "date-oldest") return a.date.localeCompare(b.date);

      if (sortKey === "month") {
        return parseInt(a.date.split("-")[1]) - parseInt(b.date.split("-")[1]);
      }

      if (sortKey === "day") {
        return parseInt(a.date.split("-")[2]) - parseInt(b.date.split("-")[2]);
      }

      if (sortKey === "price") return b.price - a.price;
      if (sortKey === "product") return a.product.localeCompare(b.product);
      if (sortKey === "customer") return a.customer.localeCompare(b.customer);
      if (sortKey === "payment") return a.payment.localeCompare(b.payment);
      if (sortKey === "status") return a.status.localeCompare(b.status);

      return 0;
    });

    return out;
  }

  const list = filtered();
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const visible = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getStatusColor = (status) => {
    switch (status) {
      case "Delivered":
        return "#10B981";
      case "Shipped":
        return "#3B82F6";
      case "Processing":
        return "#F59E0B";
      case "Pending":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  return (
    <div className="order-root">
      <header className="order-header">
        <div>
          <h1 className="order-title">Customer Orders</h1>
          <p className="order-sub">Track all customer orders and payment details.</p>
        </div>

        <div className="order-actions">
          <input
            className="order-search"
            placeholder="Search product, customer, or payment..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />

          <select
            className="order-select"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
          >
            <option value="date-newest">Sort: newest first</option>
            <option value="date-oldest">Sort: oldest first</option>
            <option value="month">Sort: by month</option>
            <option value="day">Sort: by day</option>
            <option value="price">Sort: price</option>
            <option value="product">Sort: product</option>
            <option value="customer">Sort: customer</option>
            <option value="payment">Sort: payment</option>
            <option value="status">Sort: status</option>
          </select>

          <button className="order-btn" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Close Form" : "Add New Order"}
          </button>

          <button className="order-btn ghost" onClick={exportCSV}>
            Export CSV
          </button>
        </div>
      </header>

      {showForm && (
        <form className="order-form" onSubmit={onSubmit}>
          <div className="order-field">
            <label>Product Name</label>
            <input
              value={form.product}
              onChange={(e) => setForm({ ...form, product: e.target.value })}
            />
          </div>

          <div className="order-row">
            <div className="order-field">
              <label>Customer</label>
              <input
                value={form.customer}
                onChange={(e) => setForm({ ...form, customer: e.target.value })}
              />
            </div>

            <div className="order-field small">
              <label>Qty</label>
              <input
                type="number"
                min="1"
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: e.target.value })}
              />
            </div>

            <div className="order-field small">
              <label>Price (₹)</label>
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
          </div>

          <div className="order-row">
            <div className="order-field">
              <label>Payment Method</label>
              <select
                value={form.payment}
                onChange={(e) => setForm({ ...form, payment: e.target.value })}
              >
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="PayPal">PayPal</option>
                <option value="UPI">UPI</option>
                <option value="Cash on Delivery">Cash on Delivery</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>

            <div className="order-field">
              <label>Order Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="order-field small">
              <label>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
          </div>

          <div className="order-form-actions">
            <button type="submit" className="order-btn">
              Save Order
            </button>
            <button type="button" className="order-btn ghost" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <main className="order-list">
        {visible.length === 0 && <div className="order-empty">No orders found.</div>}

        {visible.map((o) => (
          <article key={o.id} className="order-item">
            <div className="order-item-left">
              <div className="order-item-title">{o.product}</div>
              <div className="order-item-meta">
                Ordered by <strong>{o.customer}</strong> • {o.qty} pcs • ₹{o.price}
              </div>

              <div className="order-item-payment">
                Payment: <strong>{o.payment}</strong>
              </div>
            </div>

            <div className="order-item-right">
              <div className="order-item-date">{o.date}</div>
              <div
                className="order-item-status"
                style={{ backgroundColor: getStatusColor(o.status) }}
              >
                {o.status}
              </div>
            </div>
          </article>
        ))}
      </main>

      <footer className="order-footer">
        <div>
          Showing <strong>{list.length}</strong> orders
        </div>

        <div className="order-pages">
          <button className="order-page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Prev
          </button>

          <span className="order-page-ind">
            {page} / {totalPages}
          </span>

          <button
            className="order-page-btn"
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
