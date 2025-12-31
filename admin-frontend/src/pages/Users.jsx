import React, { useState, useEffect } from "react";
import "../styles/Page.css";

const GRAPHQL_URL = "https://flyhub-webadmin-4.onrender.com/graphql";

function Users() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // ✅ Fetch Sellers from Backend
  const fetchSellers = async () => {
    setLoading(true);
    setMessage("");

    const query = `
      query {
        getSellers {
          id
          name
          company
          email
          phone
          status
        }
      }
    `;

    try {
      const response = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const result = await response.json();

      if (result.errors) {
        console.error("GraphQL Error:", result.errors);
        setMessage("❌ Failed to load sellers.");
      } else {
        setSellers(result.data.getSellers);
      }
    } catch (err) {
      console.error("Network error:", err);
      setMessage("⚠️ Network error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellers();
  }, []);

  // ✅ Approve or Reject Individual Seller
  const handleStatusChange = async (id, status) => {
    const mutation = `
      mutation {
        changeSellerStatus(id: "${id}", status: "${status}") {
          id
          name
          status
        }
      }
    `;

    try {
      const response = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: mutation }),
      });

      const result = await response.json();

      if (result.errors) {
        console.error("Mutation error:", result.errors);
      } else {
        const updated = result.data.changeSellerStatus;
        setSellers((prev) =>
          prev.map((seller) =>
            seller.id === updated.id
              ? { ...seller, status: updated.status }
              : seller
          )
        );
        setMessage(`✅ Seller ${updated.name} marked as ${updated.status}.`);
      }
    } catch (err) {
      console.error("Error updating status:", err);
      setMessage("❌ Update failed: " + err.message);
    }
  };

  // ✅ Approve All Pending Sellers
  const handleApproveAll = async () => {
    const pendingSellers = sellers.filter((s) => s.status === "pending");
    if (pendingSellers.length === 0) {
      alert("No pending sellers to approve.");
      return;
    }

    for (const seller of pendingSellers) {
      await handleStatusChange(seller.id, "approved");
    }
    alert("✅ All pending sellers approved!");
  };

  if (loading) return <p>Loading sellers...</p>;

  return (
    <div className="page">
      <h2>👤 Seller Management</h2>

      <div className="bulk-actions">
        <button className="approve-all-btn" onClick={handleApproveAll}>
          ✅ Approve All Pending Sellers
        </button>
      </div>

      {message && <p className="status-message">{message}</p>}

      <table className="seller-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Company</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {sellers.length === 0 ? (
            <tr>
              <td colSpan="6">No sellers found.</td>
            </tr>
          ) : (
            sellers.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.company}</td>
                <td>{s.email}</td>
                <td>{s.phone}</td>
                <td>
                  <span
                    className={`status-badge ${
                      s.status === "approved"
                        ? "status-approved"
                        : s.status === "rejected"
                        ? "status-rejected"
                        : "status-pending"
                    }`}
                  >
                    {s.status}
                  </span>
                </td>
                <td>
                  <div className="actions">
                    <button
                      className="approve-btn"
                      onClick={() => handleStatusChange(s.id, "approved")}
                    >
                      ✅ Approve
                    </button>
                    <button
                      className="reject-btn"
                      onClick={() => handleStatusChange(s.id, "rejected")}
                    >
                      ❌ Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Users;


//
// import React from "react";
// import "../styles/User.css";
// import { useNavigate } from "react-router-dom"; // If using react-router
// import SellerApprovalPanel from "./SellerApprovalPanel";
// function Users() {
//   const navigate = useNavigate(); // For navigation
//
//   return (
//     <div className="page">
//       <h2>👤 Choose User Type</h2>
//       <div className="user-selection">
//         <div
//           className="user-box buyer"
//           onClick={() => navigate("/buyer")} // Replace with your buyer route
//         >
//           <h3>Buyer</h3>
//           <p>Explore and purchase products</p>
//         </div>
//         <div
//           className="user-box seller"
//           onClick={() => navigate("/seller")} // Replace with your seller route
//         >
//           <h3>Seller</h3>
//           <p>List products and manage sales</p>
//         </div>
//       </div>
//     </div>
//   );
// }
//
// export default Users;
