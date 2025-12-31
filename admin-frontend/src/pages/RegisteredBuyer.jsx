import React, { useEffect, useState } from "react";
import "../styles/RegisteredBuyer.css";

const GRAPHQL_URL = "https://flyhub-webadmin-4.onrender.com/graphql";

function BuyersList() {
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState(""); // New state for search term

  const fetchBuyers = async () => {
    setLoading(true);
    setError(null);

    const query = `
      query GetBuyers {
        buyers {
          buyerId
          name
          email
          phone
          createdAt
        }
      }
    `;

    try {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) throw new Error("HTTP " + res.status);

      const result = await res.json();
      console.log("Fetched buyers:", result);

      if (result.errors) {
        setError(result.errors[0].message);
        setBuyers([]);
        return;
      }

      setBuyers(result.data.buyers || []);
    } catch (err) {
      console.error("Buyer fetch error:", err);
      setError("Network error: " + err.message);
      setBuyers([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchBuyers();
  }, []);

  // Filter buyers based on search term
  const filteredBuyers = buyers.filter(buyer => {
    if (!searchTerm) return true;

    const term = searchTerm.toLowerCase();
    return (
      buyer.buyerId.toLowerCase().includes(term) ||
      (buyer.name && buyer.name.toLowerCase().includes(term)) ||
      (buyer.email && buyer.email.toLowerCase().includes(term))
    );
  });

  const parseDate = (value) => {
    if (!value) return null;

    // If value is a number (UNIX timestamp)
    if (!isNaN(value)) {
      // If it's in seconds, convert to milliseconds
      if (value.toString().length === 10) {
        return new Date(value * 1000);
      }
      return new Date(Number(value));
    }

    // Otherwise assume ISO date
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  };

  // 📌 Format "January 21, 2025"
  const formatFullDate = (dateValue) => {
    const date = parseDate(dateValue);
    if (!date) return "Invalid Date";

    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // 📌 Format YYYY-MM-DD
  const formatShortDate = (dateValue) => {
    const date = parseDate(dateValue);
    if (!date) return "—";
    return date.toISOString().slice(0, 10);
  };

  if (loading) return <p className="buyer-loading">Loading buyers...</p>;
  if (error) return <p className="buyer-error">Error: {error}</p>;

  return (
    <div className="buyer-container">
      <h2 className="buyer-title">👤 Registered Buyers</h2>

      {/* Search Bar */}
      <div className="buyer-search-container">
        <input
          type="text"
          placeholder="Search by ID, name, or email..."
          className="buyer-search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="buyer-search-button" onClick={() => {}}>
          🔍
        </button>
      </div>

      <div className="buyer-table-wrapper">
        {filteredBuyers.length === 0 ? (
          <p className="buyer-empty">
            {searchTerm ? "No buyers matching your search" : "No buyers registered yet"}
          </p>
        ) : (
          <table className="buyer-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Registered On</th>
              </tr>
            </thead>

            <tbody>
              {filteredBuyers.map((buyer) => (
                <tr key={buyer.buyerId}>
                  <td>{buyer.buyerId}</td>
                  <td>{buyer.name || "—"}</td>
                  <td>{buyer.email || "—"}</td>

                  <td>
                    {/* YYYY-MM-DD */}
                    {formatShortDate(buyer.createdAt)}
                    <br />
                    {/* January 12, 2025 */}
                    <small className="buyer-date-sub">
                      {formatFullDate(buyer.createdAt)}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default BuyersList;