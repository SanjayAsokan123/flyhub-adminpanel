import React, { useState, useEffect } from "react";

const GRAPHQL_URL = "http://127.0.0.1:5001/graphql";

function TaxSettingsForm() {
  const [sgst, setSGST] = useState("");
  const [commission, setCommission] = useState("");
  const [message, setMessage] = useState("");
  const [latestTax, setLatestTax] = useState(null);

  // Fetch latest tax on load
  useEffect(() => {
    const fetchTax = async () => {
      const query = `
        query {
          getTax {
            sgst
            commission
            updatedAt
          }
        }
      `;

      try {
        const res = await fetch(GRAPHQL_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });

        const result = await res.json();

        if (!result.errors && result.data.getTax) {
          setLatestTax(result.data.getTax);
        }
      } catch (err) {
        console.error("Error fetching tax:", err);
      }
    };

    fetchTax();
  }, []);

  // Submit Mutation
  const handleSubmit = async (e) => {
    e.preventDefault();

    const mutation = `
      mutation UpdateTax($sgst: Float!, $commission: Float!) {
        updateTax(input: { sgst: $sgst, commission: $commission }) {
          sgst
          commission
          updatedAt
        }
      }
    `;

    try {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: mutation,
          variables: {
            sgst: parseFloat(sgst),
            commission: parseFloat(commission),
          },
        }),
      });

      const result = await res.json();

      if (!result.errors) {
        setMessage("✅ Tax rates updated successfully!");
        setLatestTax(result.data.updateTax);
      } else {
        setMessage("❌ Failed to update tax!");
      }
    } catch (err) {
      setMessage("⚠ Server error, try again.");
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🧾 Set SGST & Commission</h2>

      <form onSubmit={handleSubmit}>
        {/* SGST */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>SGST (%)</label>
          <input
            type="number"
            step="0.01"
            value={sgst}
            onChange={(e) => setSGST(e.target.value)}
            required
            style={styles.input}
          />
        </div>

        {/* Commission */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>Commission (%)</label>
          <input
            type="number"
            step="0.01"
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            required
            style={styles.input}
          />
        </div>

        <button type="submit" style={styles.button}>💾 Save Tax Rates</button>
      </form>

      {message && <div style={styles.message}>{message}</div>}

      {latestTax && (
        <div style={styles.lastSavedBox}>
          📊 <strong>Last Saved Rates:</strong>
          <div>SGST: {latestTax.sgst}% | Commission: {latestTax.commission}%</div>
          <div style={styles.date}>
            Updated: {new Date(latestTax.updatedAt).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 420,
    margin: "60px auto",
    padding: 32,
    borderRadius: 16,
    border: "1px solid #eee",
    background: "white",
    fontFamily: "Inter, sans-serif",
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  },
  title: { textAlign: "center", marginBottom: 25 },
  inputGroup: { marginBottom: 20 },
  label: { display: "block", marginBottom: 8, fontWeight: 500 },
  input: {
    width: "100%",
    padding: 10,
    borderRadius: 6,
    border: "1px solid #ccc",
  },
  button: {
    width: "100%",
    padding: 12,
    background: "#1A0A5B",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
  },
  message: { marginTop: 20, textAlign: "center", fontWeight: 500 },
  lastSavedBox: {
    marginTop: 25,
    padding: 18,
    background: "#EEF1FF",
    borderRadius: 10,
    textAlign: "center",
  },
  date: { fontSize: 12, marginTop: 5, opacity: 0.6 },
};

export default TaxSettingsForm;
