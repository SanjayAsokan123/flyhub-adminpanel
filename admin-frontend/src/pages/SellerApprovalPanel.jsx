import React, { useCallback, useEffect, useState } from "react";
import { gql, ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
import "../styles/SellerApprove.css";

const BACKEND_URL = "http://127.0.0.1:5001/graphql";

const client = new ApolloClient({
  link: new HttpLink({
    uri: BACKEND_URL,
    fetchOptions: { method: "POST" },
    headers: { "Content-Type": "application/json" },
  }),
  cache: new InMemoryCache({
    typePolicies: {
      Seller: { keyFields: ["customId"] },
    },
  }),
});

/* ------------------- GraphQL ------------------- */
const GET_SELLERS_QUERY = gql`
  query GetSellers {
    getSellers {
      customId
      firebaseUid
      name
      companyName
      PANnumber
      gstNumber
      address
      bankIFCnumber
      bankAccountNumber
      bankName
      authorized
      email
      phoneNumber
      status
      shippingAddresses
      pickupAddresses
      companyPan
    }
  }
`;

/* 🔥 IMPORTANT: status must be SellerStatus enum */
const UPDATE_SELLER_STATUS_MUTATION = gql`
  mutation ChangeSellerStatus($customId: ID!, $status: SellerStatus!) {
    changeSellerStatus(customId: $customId, status: $status) {
      customId
      status
    }
  }
`;

const DELETE_SELLER_MUTATION = gql`
  mutation DeleteSeller($customId: ID!) {
    deleteSeller(customId: $customId) {
      customId
    }
  }
`;

export default function SellerApprovalPanel() {
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [searchTerm, setSearchTerm] = useState(""); // New state for search term

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const fetchSellers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await client.query({
        query: GET_SELLERS_QUERY,
        fetchPolicy: "no-cache",
      });

      const sellers = data?.getSellers ?? [];

      setPending(sellers.filter((s) => s.status === "pending"));
      setApproved(sellers.filter((s) => s.status === "approved"));
      setRejected(sellers.filter((s) => s.status === "rejected"));
    } catch (err) {
      setErrMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSellers();
  }, [fetchSellers]);

  /* 🔥 FIXED: status must be ENUM (not string) */
  const updateStatus = async (customId, statusEnum) => {
    try {
      setActionLoading(true);

      await client.mutate({
        mutation: UPDATE_SELLER_STATUS_MUTATION,
        variables: {
          customId,
          status: statusEnum, // ENUM directly passed
        },
      });

      await fetchSellers();
    } catch (err) {
      alert(err.message || "Status update failed");
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const deleteSeller = async (customId) => {
    if (!window.confirm("Delete seller permanently?")) return;

    try {
      setActionLoading(true);

      await client.mutate({
        mutation: DELETE_SELLER_MUTATION,
        variables: { customId },
      });

      await fetchSellers();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter sellers based on search term
  const filterSellers = (sellers) => {
    if (!searchTerm) return sellers;

    const term = searchTerm.toLowerCase();
    return sellers.filter(seller =>
      seller.customId.toLowerCase().includes(term) ||
      seller.name.toLowerCase().includes(term) ||
      seller.companyName.toLowerCase().includes(term) ||
      seller.address.toLowerCase().includes(term)
    );
  };

  const renderTable = (title, list, actions) => {
    const filteredList = filterSellers(list);

    return (
      <section className="table-section">
        <h2>{title}</h2>
        <div className="table-wrapper">
          <table className="seller-table">
            <thead>
              <tr>
                {[
                  "Custom ID",
                  "Firebase UID",
                  "Name",
                  "Company",
                  "PAN",
                  "GST",
                  "Address",
                  "Bank IFC",
                  "Bank Acc No",
                  "Bank Name",
                  "Authorized",
                  "Email",
                  "Phone",
                  "Company PAN",
                  "Shipping",
                  "Pickup",
                  "Actions",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan="17" className="empty-cell">
                    {searchTerm ? "No matching sellers found" : "No sellers"}
                  </td>
                </tr>
              ) : (
                filteredList.map((s) => (
                  <tr key={s.customId}>
                    <td>{s.customId}</td>
                    <td>{s.firebaseUid}</td>
                    <td>{s.name}</td>
                    <td>{s.companyName}</td>
                    <td>{s.PANnumber}</td>
                    <td>{s.gstNumber}</td>
                    <td>{s.address}</td>
                    <td>{s.bankIFCnumber}</td>
                    <td>{s.bankAccountNumber}</td>
                    <td>{s.bankName}</td>
                    <td>{s.authorized}</td>
                    <td>{s.email}</td>
                    <td>{s.phoneNumber}</td>
                    <td>{s.companyPan}</td>
                    <td>{s.shippingAddresses?.join(", ")}</td>
                    <td>{s.pickupAddresses?.join(", ")}</td>
                    <td>{actions(s)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  if (loading) return <p>Loading sellers...</p>;

  return (
    <div className="seller-panel">
      <h1>Seller Approval Panel</h1>

      {/* Search Bar */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search by Customer ID, Name, Company, or Address..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="search-button" onClick={() => {}}>
          🔍
        </button>
      </div>

      {errMsg && <p className="error">{errMsg}</p>}

      {renderTable("⏳ Pending", pending, (s) => (
        <div className="btn-group">
          <button onClick={() => updateStatus(s.customId, "approved")}>
            Approve
          </button>
          <button onClick={() => updateStatus(s.customId, "rejected")}>
            Reject
          </button>
          <button onClick={() => deleteSeller(s.customId)}>
            Delete
          </button>
        </div>
      ))}

      {renderTable("✅ Approved", approved, (s) => (
        <div className="btn-group">
          <button onClick={() => updateStatus(s.customId, "pending")}>
            Revert
          </button>
          <button onClick={() => deleteSeller(s.customId)}>
            Delete
          </button>
        </div>
      ))}

      {renderTable("❌ Rejected", rejected, (s) => (
        <div className="btn-group">
          <button onClick={() => updateStatus(s.customId, "pending")}>
            Revert
          </button>
          <button onClick={() => deleteSeller(s.customId)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}