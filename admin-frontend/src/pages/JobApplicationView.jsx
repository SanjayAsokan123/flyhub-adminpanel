import React, { useEffect, useState } from "react";
import "../styles/JobApplicationView.css";

const GRAPHQL_URL = "http://localhost:5001/graphql";

export default function JobApplicationsList() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("newest");
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 6;

  const fetchApplications = async () => {
    setLoading(true);
    setError(null);

    const gqlQuery = `
      query GetJobApplications {
        getJobApplications {
          id
          buyerId
          jobId
          name
          email
          phoneNumber
          resumeUrl
          status
          appliedAt
          createdAt
        }
      }
    `;

    try {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: gqlQuery }),
      });

      const json = await res.json();

      if (json.errors) {
        setError(json.errors[0].message);
        setApplications([]);
      } else {
        setApplications(json.data.getJobApplications || []);
      }
    } catch (err) {
      setError("Network Error: " + err.message);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const processed = applications
    .filter((app) => {
      const q = query.toLowerCase();
      return (
        app.name.toLowerCase().includes(q) ||
        app.email.toLowerCase().includes(q) ||
        app.phoneNumber.toLowerCase().includes(q) ||
        app.status.toLowerCase().includes(q) ||
        app.jobId.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortKey === "newest")
        return new Date(b.createdAt) - new Date(a.createdAt);

      if (sortKey === "oldest")
        return new Date(a.createdAt) - new Date(b.createdAt);

      if (sortKey === "status") return a.status.localeCompare(b.status);
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const visible = processed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return <p className="loading">Loading applications...</p>;
  if (error) return <p className="error">Error: {error}</p>;

  return (
    <div className="job-applications-root">
      <header className="job-applications-header">
        <h1>Job Applications</h1>

        <div className="job-applications-actions">
          <input
            placeholder="Search name, email, phone, status, jobId..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />

          <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="status">Status</option>
          </select>

          <button onClick={fetchApplications}>Refresh</button>
        </div>
      </header>

      <main className="job-applications-list">
        {visible.length === 0 ? (
          <div className="empty">No applications found.</div>
        ) : (
          visible.map((app) => (
            <article key={app.id} className="job-application-item">
              <div>
                <strong>{app.name}</strong> ({app.email}) <br />
                📞 {app.phoneNumber} <br />
                👤 Buyer ID: {app.buyerId} <br />
                🆔 Job ID: {app.jobId} <br />
                <br />
                Status:{" "}
                <span className={`status ${app.status.toLowerCase()}`}>
                  {app.status.toUpperCase()}
                </span>
                <br />
                Applied On:{" "}
                {app.appliedAt
                  ? new Date(app.appliedAt).toLocaleString("en-IN")
                  : "-"}
                <br />
                Created On:{" "}
                {app.createdAt
                  ? new Date(app.createdAt).toLocaleString("en-IN")
                  : "-"}
              </div>

              <div>
                <a
                  href={app.resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View Resume
                </a>
              </div>
            </article>
          ))
        )}
      </main>

      <footer className="job-applications-footer">
        <div>
          Showing <strong>{processed.length}</strong> applications
        </div>

        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            Prev
          </button>

          <span>
            {page} / {totalPages}
          </span>

          <button
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