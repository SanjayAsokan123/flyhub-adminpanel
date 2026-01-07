import React, { useState, useEffect } from "react";
import "../styles/Rental.css";

const GRAPHQL_URL = "http://localhost:5001/graphql";

function Rentals() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState("fifo"); // fifo/lifo sorting

  // ===== Fetch Rentals =====
  useEffect(() => {
    const fetchRentals = async () => {
      setLoading(true);
      setError(null);

      const query = `
        query {
          rentals {
            rentalId
            name
            brand
            location
            pricePerHour
            pricePerDay
            description
            quantity
            image
            status
            sellerId
            sellerInfo {
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

        const text = await res.text();
        let json;
        try {
          json = JSON.parse(text);
        } catch (e) {
          console.error("Fetch rentals: server did not return JSON:", text);
          setError("Server error: response not JSON (check console).");
          setLoading(false);
          return;
        }

        if (json.errors) {
          console.error("Fetch rentals GraphQL errors:", json.errors);
          setError(json.errors[0]?.message || "Unknown GraphQL error");
        } else {
          setRentals(json.data.rentals || []);
        }
      } catch (err) {
        console.error("Fetch rentals network error:", err);
        setError("Network error: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRentals();
  }, []);

  // ===== Update Status =====
  const handleApproval = async (rentalId, newStatus) => {
    const mutation = `
      mutation UpdateRentalStatus($rentalId: String!, $status: String!) {
        updateRentalStatus(rentalId: $rentalId, status: $status) {
          rentalId
          status
        }
      }
    `;

    try {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: mutation,
          variables: { rentalId, status: newStatus },
        }),
      });

      const json = await res.json();

      if (json.errors) {
        console.error("Update status errors:", json.errors);
        alert(json.errors[0]?.message || "Error updating status");
        return;
      }

      const updated = json.data.updateRentalStatus;
      setRentals((prev) =>
        prev.map((r) =>
          r.rentalId === updated.rentalId ? { ...r, status: updated.status } : r
        )
      );

      alert(`Rental ${newStatus} successfully!`);
    } catch (err) {
      console.error("Update status network error:", err);
      alert("Network error: " + err.message);
    }
  };

  // ===== Helper: send GraphQL request and return parsed JSON or raw text =====
  const sendGraphQL = async (query, variables = {}) => {
    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });

    const text = await res.text();
    try {
      const json = JSON.parse(text);
      return { ok: true, json };
    } catch (e) {
      return { ok: false, text };
    }
  };

  // ===== Delete Rental (robust, tries multiple shapes) =====
  const handleDelete = async (rentalId) => {
    if (!window.confirm("Sure? Once gone… it's gone forever 👻")) return;

    // Candidate mutation attempts in order of likelihood
    const attempts = [
      {
        name: "boolean-rentalId",
        query: `
          mutation DeleteRental($rentalId: String!) {
            deleteRental(rentalId: $rentalId)
          }
        `,
        variables: { rentalId },
        parseSuccess: (json) => json.data && json.data.deleteRental === true,
        onSuccessValue: (json) => json.data.deleteRental === true,
      },
      {
        name: "object-rentalId",
        // server might return the deleted object
        query: `
          mutation DeleteRental($rentalId: String!) {
            deleteRental(rentalId: $rentalId) {
              rentalId
            }
          }
        `,
        variables: { rentalId },
        parseSuccess: (json) => json.data && json.data.deleteRental && json.data.deleteRental.rentalId,
        onSuccessValue: (json) => json.data.deleteRental.rentalId,
      },
      {
        name: "boolean-id",
        query: `
          mutation DeleteRental($id: String!) {
            deleteRental(id: $id)
          }
        `,
        variables: { id: rentalId },
        parseSuccess: (json) => json.data && json.data.deleteRental === true,
        onSuccessValue: (json) => json.data.deleteRental === true,
      },
      {
        name: "object-id",
        query: `
          mutation DeleteRental($id: String!) {
            deleteRental(id: $id) {
              rentalId
            }
          }
        `,
        variables: { id: rentalId },
        parseSuccess: (json) => json.data && json.data.deleteRental && json.data.deleteRental.rentalId,
        onSuccessValue: (json) => json.data.deleteRental.rentalId,
      },
    ];

    let lastError = null;
    for (let attempt of attempts) {
      try {
        console.log(`Attempting delete with: ${attempt.name}`, attempt.variables);
        const resp = await sendGraphQL(attempt.query, attempt.variables);

        if (!resp.ok) {
          console.warn(`Attempt ${attempt.name} returned non-JSON response:`, resp.text);
          lastError = `Server returned non-JSON response for attempt ${attempt.name}. Check server logs / CORS.`;
          continue;
        }

        const json = resp.json;
        if (json.errors) {
          console.warn(`Attempt ${attempt.name} GraphQL errors:`, json.errors);
          lastError = `GraphQL error on attempt ${attempt.name}: ${json.errors[0]?.message || JSON.stringify(json.errors)}`;
          // try next attempt
          continue;
        }

        // success condition depends on mutation shape
        if (attempt.parseSuccess(json)) {
          // update frontend list accordingly
          setRentals((prev) => prev.filter((r) => r.rentalId !== rentalId));
          console.log(`Delete succeeded with attempt ${attempt.name}:`, json);
          alert("Rental deleted successfully!");
          return;
        } else {
          console.warn(`Attempt ${attempt.name} returned unexpected shape:`, json);
          lastError = `Unexpected return shape for attempt ${attempt.name}. See console.`;
        }
      } catch (err) {
        console.error(`Attempt ${attempt.name} network/error:`, err);
        lastError = `Network/error during attempt ${attempt.name}: ${err.message}`;
      }
    }

    // if we get here, all attempts failed
    console.error("All delete attempts failed. Last error:", lastError);
    alert(
      `Delete failed. Reason: ${lastError ||
      "unknown"}. Check console for detailed response. Common causes: mutation not defined, argument name mismatch (id vs rentalId), CORS, or endpoint incorrect.`
    );

    // Helpful tip in console
    console.info(
      "If server expects a different mutation or returns a custom object, test in GraphQL playground with variations such as:\n" +
      "1) mutation { deleteRental(rentalId: \"XYZ\") }\n" +
      "2) mutation { deleteRental(id: \"XYZ\") }\n" +
      "3) mutation { deleteRental(rentalId: \"XYZ\") { rentalId } }\n" +
      "Check server logs and network tab for exact GraphQL error messages."
    );
  };

  // ===== Loading / Error UI =====
  if (loading) return <p className="rentals-loading">Loading rentals...</p>;
  if (error) return <p className="rentals-error">Error: {error}</p>;

  // ===== FIFO / LIFO Sorting =====
  const sorted = [...rentals].sort((a, b) => {
    if (sortMode === "fifo") {
      return a.rentalId.localeCompare(b.rentalId);
    } else {
      return b.rentalId.localeCompare(a.rentalId);
    }
  });

  // ===== Filtering =====
  const filtered = sorted.filter((r) => {
    const matchesStatus = r.status.toLowerCase() === selectedStatus;
    const term = searchTerm.toLowerCase();

    const matchesSearch =
      searchTerm === "" ||
      (r.name && r.name.toLowerCase().includes(term)) ||
      (r.brand && r.brand.toLowerCase().includes(term)) ||
      (r.location && r.location.toLowerCase().includes(term)) ||
      (r.description && r.description.toLowerCase().includes(term));

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="rentals-container">
      <h2 className="rentals-title">🚁 Rentals Approval Dashboard</h2>

      {/* ========== SEARCH BAR ========== */}
      <div className="rentals-search-container">
        <input
          type="text"
          placeholder="Search rentals..."
          className="rentals-search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="rentals-search-button">🔍</button>
      </div>

      {/* ========== SORT BUTTONS ========== */}
      <div className="rentals-sort-container">
        <button
          className={`rentals-sort-btn ${sortMode === "fifo" ? "active" : ""}`}
          onClick={() => setSortMode("fifo")}
        >
          📦 FIFO
        </button>
        <button
          className={`rentals-sort-btn ${sortMode === "lifo" ? "active" : ""}`}
          onClick={() => setSortMode("lifo")}
        >
          🔄 LIFO
        </button>
      </div>

      {/* ========== STATUS TABS ========== */}
      <div className="rentals-status-tabs">
        {["pending", "approved", "rejected"].map((s) => (
          <button
            key={s}
            className={`rentals-tab ${selectedStatus === s ? "active" : ""}`}
            onClick={() => setSelectedStatus(s)}
          >
            {s === "pending" && "⏳ Pending"}
            {s === "approved" && "✅ Approved"}
            {s === "rejected" && "❌ Rejected"}
          </button>
        ))}
      </div>

      {/* ========== RENTAL CARDS ========== */}
      <div className="rentals-grid">
        {filtered.length === 0 ? (
          <p className="rentals-empty-text">
            No {selectedStatus} rentals matching "{searchTerm}"
          </p>
        ) : (
          filtered.map((rental) => (
            <div key={rental.rentalId} className="rental-card">
              <div className={`rental-badge ${rental.status.toLowerCase()}`}>
                {rental.status}
              </div>

              <div className="rental-image-wrapper">
                {rental.image ? (
                  <img src={rental.image} alt={rental.name} className="rental-image" />
                ) : (
                  <div className="rental-no-image">No Image</div>
                )}
              </div>

              <div className="rental-details">
                <h3>{rental.name}</h3>
                <p><strong>ID:</strong> {rental.rentalId}</p>
                <p><strong>Brand:</strong> {rental.brand}</p>
                <p><strong>Location:</strong> {rental.location}</p>
                <p><strong>Quantity:</strong> {rental.quantity}</p>
                <p><strong>Price/Hour:</strong> ₹{rental.pricePerHour}</p>
                <p><strong>Price/Day:</strong> ₹{rental.pricePerDay}</p>
                <p><strong>Description:</strong> {rental.description}</p>

                {rental.sellerInfo ? (
                  <>
                    <p><strong>Seller ID:</strong> {rental.sellerId}</p>
                    <p><strong>Phone:</strong> {rental.sellerInfo.phoneNumber}</p>
                    <p><strong>Email:</strong> {rental.sellerInfo.email}</p>
                  </>
                ) : (
                  <p><strong>Seller:</strong> Not available</p>
                )}

                <div className="rental-actions">
                  {/* APPROVE / REJECT / PENDING BUTTONS */}
                  {rental.status === "pending" && (
                    <>
                      <button
                        className="rental-approve-btn"
                        onClick={() => handleApproval(rental.rentalId, "approved")}
                      >
                        ✅ Approve
                      </button>
                      <button
                        className="rental-reject-btn"
                        onClick={() => handleApproval(rental.rentalId, "rejected")}
                      >
                        ❌ Reject
                      </button>
                    </>
                  )}

                  {rental.status === "approved" && (
                    <>
                      <button
                        className="rental-reject-btn"
                        onClick={() => handleApproval(rental.rentalId, "rejected")}
                      >
                        ❌ Reject
                      </button>
                      <button
                        className="rental-pending-btn"
                        onClick={() => handleApproval(rental.rentalId, "pending")}
                      >
                        ⏳ Pending
                      </button>
                    </>
                  )}

                  {rental.status === "rejected" && (
                    <>
                      <button
                        className="rental-approve-btn"
                        onClick={() => handleApproval(rental.rentalId, "approved")}
                      >
                        ✅ Approve
                      </button>
                      <button
                        className="rental-pending-btn"
                        onClick={() => handleApproval(rental.rentalId, "pending")}
                      >
                        ⏳ Pending
                      </button>
                    </>
                  )}

                  {/* DELETE BUTTON */}
                  <button
                    className="rental-delete-btn"
                    onClick={() => handleDelete(rental.rentalId)}
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Rentals;