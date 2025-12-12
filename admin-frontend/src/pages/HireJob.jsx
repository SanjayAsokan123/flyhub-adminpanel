import React, { useState, useEffect } from "react";
import "../styles/HireJob.css";

const GRAPHQL_URL = "http://127.0.0.1:5001/graphql";

function HireJobsDashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [updating, setUpdating] = useState({ id: null, status: null });
  const [searchTerm, setSearchTerm] = useState(""); // New state for search term

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      setError(null);

      const query = `
        query {
          jobs {
            jobId
            jobName
            companyName
            jobType
            experience
            location
            salary
            description
            requirement
            status
            sellerId
            email
            phoneNumber
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

        if (result.errors) setError(result.errors[0].message);
        else setJobs(result.data.jobs);
      } catch (err) {
        setError("Network error: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  // 🔥 Status badge classes
  const statusClass = (s) => {
    if (!s) return "badge-unknown";
    switch (s.toLowerCase()) {
      case "approved":
        return "badge-approved";
      case "pending":
        return "badge-pending";
      case "rejected":
        return "badge-rejected";
      default:
        return "badge-unknown";
    }
  };

  const isUpdating = (jobId, status) =>
    updating.id === jobId && updating.status === status;

  // 🔥 Update status mutation
  const handleApproval = async (jobId, status) => {
    setUpdating({ id: jobId, status });

    const mutation = `
      mutation {
        updateStatus(jobId: "${jobId}", status: "${status}") {
          jobId
          status
        }
      }
    `;

    try {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: mutation }),
      });

      const result = await res.json();

      if (!result.errors) {
        setJobs((prev) =>
          prev.map((job) =>
            job.jobId === jobId ? { ...job, status } : job
          )
        );
      }
    } catch (err) {
      console.error("Error updating job status:", err);
    } finally {
      setUpdating({ id: null, status: null });
    }
  };

  // Filter jobs based on status and search term
  const filteredJobs = jobs.filter((job) => {
    const statusMatch = filterStatus === "all" ||
                       job.status?.toLowerCase() === filterStatus;

    const searchMatch = searchTerm === "" ||
                       job.jobName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       job.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       job.jobType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       job.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       job.description.toLowerCase().includes(searchTerm.toLowerCase());

    return statusMatch && searchMatch;
  });

  if (loading) return <p className="loading">Loading jobs...</p>;
  if (error) return <p className="error">Error: {error}</p>;

  return (
    <div className="hire-jobs-container">
      <h2 className="page-title">💼 Hire Jobs Dashboard</h2>

      {/* Search Bar */}
      <div className="jobs-search-container">
        <input
          type="text"
          placeholder="Search by job name, company, type, location, or description..."
          className="jobs-search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="jobs-search-button" onClick={() => {}}>
          🔍
        </button>
      </div>

      {/* 🔥 Status Tabs */}
      <div className="status-tabs">
        {["all", "approved", "pending", "rejected"].map((s) => (
          <button
            key={s}
            className={`status-tab ${filterStatus === s ? "active" : ""}`}
            onClick={() => setFilterStatus(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="jobs-grid">
        {filteredJobs.length === 0 && (
          <p className="empty-text">
            {searchTerm
              ? `No jobs matching "${searchTerm}" found for this status.`
              : "No jobs found for this status."
            }
          </p>
        )}

        {filteredJobs.map((job) => (
          <div key={job.jobId} className="job-card">
            {/* 🔥 Status badge */}
            <div className={`status-badge ${statusClass(job.status)}`}>
              {job.status ? job.status.toUpperCase() : "UNKNOWN"}
            </div>

            <div className="job-details">
              <h3>{job.jobName}</h3>
              <p><strong>Job Id:</strong> {job.jobId}</p>
              <p><strong>Seller Id:</strong> {job.sellerId}</p>
              <p><strong>Company:</strong> {job.companyName}</p>
              <p><strong>Type:</strong> {job.jobType}</p>
              <p><strong>Experience:</strong> {job.experience}</p>
              <p><strong>Location:</strong> {job.location}</p>
              <p><strong>Salary:</strong> {job.salary}</p>
              <p><strong>Description:</strong> {job.description}</p>
              <p><strong>Requirement:</strong> {job.requirement}</p>

              <div className="seller-info">
                <p><strong>Email:</strong> {job.email}</p>
                <p><strong>Phone:</strong> {job.phoneNumber}</p>
              </div>
            </div>

            {/* 🔥 Action Buttons */}
            <div className="actions">
              {job.status === "pending" && (
                <>
                  <button
                    className="approve-btn"
                    disabled={isUpdating(job.jobId, "approved")}
                    onClick={() => handleApproval(job.jobId, "approved")}
                  >
                    {isUpdating(job.jobId, "approved")
                      ? "Updating..."
                      : "Approve"}
                  </button>

                  <button
                    className="reject-btn"
                    disabled={isUpdating(job.jobId, "rejected")}
                    onClick={() => handleApproval(job.jobId, "rejected")}
                  >
                    {isUpdating(job.jobId, "rejected")
                      ? "Updating..."
                      : "Reject"}
                  </button>
                </>
              )}

              {job.status === "approved" && (
                <>
                  <button
                    className="reject-btn"
                    disabled={isUpdating(job.jobId, "rejected")}
                    onClick={() => handleApproval(job.jobId, "rejected")}
                  >
                    {isUpdating(job.jobId, "rejected")
                      ? "Updating..."
                      : "Reject"}
                  </button>

                  <button
                    className="pending-btn"
                    disabled={isUpdating(job.jobId, "pending")}
                    onClick={() => handleApproval(job.jobId, "pending")}
                  >
                    {isUpdating(job.jobId, "pending")
                      ? "Updating..."
                      : "Move to Pending"}
                  </button>
                </>
              )}

              {job.status === "rejected" && (
                <>
                  <button
                    className="pending-btn"
                    disabled={isUpdating(job.jobId, "pending")}
                    onClick={() => handleApproval(job.jobId, "pending")}
                  >
                    {isUpdating(job.jobId, "pending")
                      ? "Updating..."
                      : "Move to Pending"}
                  </button>

                  <button
                    className="approve-btn"
                    disabled={isUpdating(job.jobId, "approved")}
                    onClick={() => handleApproval(job.jobId, "approved")}
                  >
                    {isUpdating(job.jobId, "approved")
                      ? "Updating..."
                      : "Approve"}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HireJobsDashboard;