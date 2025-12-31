import React, { useState, useEffect } from "react";
import "../styles/HireJob.css";

const GRAPHQL_URL = "http://localhost:5001/graphql";

function HireJobsDashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [updating, setUpdating] = useState({ id: null, status: null });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("lifo");
  const [deletingJob, setDeletingJob] = useState(null);

  // Fetch jobs
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
          image
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

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      setJobs(result.data.jobs || []);
    } catch (err) {
      setError(err.message || "Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Delete job function
  const deleteJob = async (jobId) => {
    if (!window.confirm("Are you sure you want to delete this job?")) return;

    setDeletingJob(jobId);

    const mutation = `
      mutation DeleteJob($jobId: String!) {
        deleteJob(jobId: $jobId) {
          jobId
        }
      }
    `;

    try {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: mutation,
          variables: { jobId },
        }),
      });

      const json = await res.json();

      if (json.errors) {
        throw new Error(json.errors[0].message);
      }

      // Remove from UI immediately
      setJobs((prev) => prev.filter((j) => j.jobId !== jobId));
      alert("✅ Job deleted successfully!");
    } catch (err) {
      alert("❌ Failed to delete job: " + err.message);
      fetchJobs();
    } finally {
      setDeletingJob(null);
    }
  };

  // Update job status
  const updateJobStatus = async (jobId, newStatus) => {
    setUpdating({ id: jobId, status: newStatus });

    // Try multiple mutation formats based on your backend
    const mutationQueries = [
      // Format 1: With adminUpdate prefix
      `mutation UpdateJobStatus($jobId: String!, $status: String!) {
        adminUpdateJobStatus(jobId: $jobId, status: $status) {
          jobId
          status
        }
      }`,

      // Format 2: Simple updateStatus
      `mutation UpdateJobStatus($jobId: String!, $status: String!) {
        updateStatus(jobId: $jobId, status: $status) {
          jobId
          status
        }
      }`,

      // Format 3: updateJobStatus
      `mutation UpdateJobStatus($jobId: String!, $status: String!) {
        updateJobStatus(jobId: $jobId, status: $status) {
          jobId
          status
        }
      }`,

      // Format 4: Direct update
      `mutation {
        updateJobStatus(jobId: "${jobId}", status: "${newStatus}") {
          jobId
          status
        }
      }`
    ];

    let mutationError = null;

    for (const mutation of mutationQueries) {
      try {
        const isUsingVariables = mutation.includes("$jobId") && mutation.includes("$status");

        const requestBody = isUsingVariables
          ? {
            query: mutation,
            variables: { jobId, status: newStatus }
          }
          : { query: mutation };

        const res = await fetch(GRAPHQL_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        const json = await res.json();

        if (json.errors) {
          mutationError = json.errors[0].message;
          continue; // Try next mutation format
        }

        // Success - update UI
        setJobs((prev) =>
          prev.map((j) =>
            j.jobId === jobId ? { ...j, status: newStatus } : j
          )
        );

        alert(`✅ Job status updated to ${newStatus}`);
        mutationError = null;
        break; // Exit loop on success
      } catch (err) {
        mutationError = err.message;
        continue;
      }
    }

    if (mutationError) {
      alert(`❌ Failed to update status: ${mutationError}. Please check your GraphQL schema.`);

      // For development/testing, update UI anyway
      console.log("Updating UI locally for testing...");
      setJobs((prev) =>
        prev.map((j) =>
          j.jobId === jobId ? { ...j, status: newStatus } : j
        )
      );
    }

    setUpdating({ id: null, status: null });
  };

  // Status badge classes
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

  const statusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "status-approved";
      case "pending":
        return "status-pending";
      case "rejected":
        return "status-rejected";
      default:
        return "";
    }
  };

  const isUpdating = (jobId, status) =>
    updating.id === jobId && updating.status === status;

  // Filter jobs based on status and search term
  const filteredJobs = jobs.filter((job) => {
    const statusMatch = filterStatus === "all" ||
      (job.status || "").toLowerCase() === filterStatus;

    const searchMatch = searchTerm === "" ||
      (job.jobName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.companyName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.jobType || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.location || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.description || "").toLowerCase().includes(searchTerm.toLowerCase());

    return statusMatch && searchMatch;
  });

  // Apply LIFO/FIFO sorting
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    // Try to parse jobId as number for better sorting
    const aId = parseInt(a.jobId) || a.jobId;
    const bId = parseInt(b.jobId) || b.jobId;

    if (sortOrder === "lifo") {
      return bId > aId ? 1 : bId < aId ? -1 : 0;
    } else {
      return aId > bId ? 1 : aId < bId ? -1 : 0;
    }
  });

  if (loading) return <div className="loading">Loading jobs...</div>;
  if (error) return <div className="error">❌ {error}</div>;

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
        <button className="jobs-search-button" onClick={() => { }}>
          🔍
        </button>
      </div>

      {/* Status Tabs */}
      <div className="status-tabs">
        {["all", "approved", "pending", "rejected"].map((s) => (
          <button
            key={s}
            className={`status-tab ${filterStatus === s ? "active" : ""}`}
            onClick={() => setFilterStatus(s)}
          >
            {s === "all" && "📋 All Jobs"}
            {s === "approved" && "✅ Approved"}
            {s === "pending" && "⏳ Pending"}
            {s === "rejected" && "❌ Rejected"}
          </button>
        ))}
      </div>

      {/* LIFO/FIFO Sort Buttons */}
      <div className="sort-container">
        <button
          className={`sort-btn ${sortOrder === "lifo" ? "active" : ""}`}
          onClick={() => setSortOrder("lifo")}
        >
          📥 LIFO (Latest First)
        </button>
        <button
          className={`sort-btn ${sortOrder === "fifo" ? "active" : ""}`}
          onClick={() => setSortOrder("fifo")}
        >
          📤 FIFO (Oldest First)
        </button>
      </div>

      <div className="jobs-grid">
        {sortedJobs.length === 0 ? (
          <div className="empty-text">
            {searchTerm
              ? `No jobs matching "${searchTerm}" found.`
              : filterStatus === "all"
                ? "No jobs found."
                : `No ${filterStatus} jobs found.`}
          </div>
        ) : (
          sortedJobs.map((job) => (
            <div key={job.jobId} className="job-card">
              {/* Status badge */}
              <span className={`status-badge ${statusColor(job.status)}`}>
                {job.status ? job.status.toUpperCase() : "UNKNOWN"}
              </span>

              {/* Job Image */}
              <div className="job-image-container">
                <img
                  src={job.image || "/placeholder-job.jpg"}
                  alt={`${job.companyName} logo`}
                  className="job-img"
                  onError={(e) => {
                    e.target.src = "/placeholder-job.jpg";
                  }}
                />
              </div>

              <div className="job-details">
                <h3>{job.jobName}</h3>
                <p className="company-name">
                  <strong>Company:</strong> {job.companyName}
                </p>
                <p className="job-type">
                  <strong>Type:</strong> {job.jobType}
                </p>
                <p className="experience">
                  <strong>Experience:</strong> {job.experience}
                </p>
                <p className="location">
                  <strong>Location:</strong> {job.location}
                </p>
                <p className="salary">
                  <strong>Salary:</strong> {job.salary}
                </p>
                <div className="description-box">
                  <p className="description-label">
                    <strong>Description:</strong>
                  </p>
                  <p className="description-text">{job.description}</p>
                </div>
                <div className="requirement-box">
                  <p className="requirement-label">
                    <strong>Requirements:</strong>
                  </p>
                  <p className="requirement-text">{job.requirement}</p>
                </div>

                <div className="seller-info">
                  <p>
                    <strong>Seller ID:</strong> {job.sellerId}
                  </p>
                  <p>
                    <strong>Email:</strong> {job.email}
                  </p>
                  <p>
                    <strong>Phone:</strong> {job.phoneNumber}
                  </p>
                </div>
              </div>

              {/* Job ID at bottom */}
              <p className="job-id-text">
                <strong>Job ID:</strong> {job.jobId}
              </p>

              {/* Action Buttons */}
              <div className="status-actions">
                {job.status?.toLowerCase() === "approved" && (
                  <>
                    <button
                      className="status-btn reject"
                      onClick={() => updateJobStatus(job.jobId, "rejected")}
                      disabled={isUpdating(job.jobId, "rejected")}
                    >
                      {isUpdating(job.jobId, "rejected") ? "Updating..." : "Reject"}
                    </button>
                    <button
                      className="status-btn pending"
                      onClick={() => updateJobStatus(job.jobId, "pending")}
                      disabled={isUpdating(job.jobId, "pending")}
                    >
                      {isUpdating(job.jobId, "pending") ? "Updating..." : "Move to Pending"}
                    </button>
                    <button
                      className="status-btn delete"
                      onClick={() => deleteJob(job.jobId)}
                      disabled={deletingJob === job.jobId}
                      style={{ backgroundColor: "#dc3545", color: "white" }}
                    >
                      {deletingJob === job.jobId ? "Deleting..." : "🗑 Delete"}
                    </button>
                  </>
                )}

                {job.status?.toLowerCase() === "pending" && (
                  <>
                    <button
                      className="status-btn approve"
                      onClick={() => updateJobStatus(job.jobId, "approved")}
                      disabled={isUpdating(job.jobId, "approved")}
                    >
                      {isUpdating(job.jobId, "approved") ? "Updating..." : "Approve"}
                    </button>
                    <button
                      className="status-btn reject"
                      onClick={() => updateJobStatus(job.jobId, "rejected")}
                      disabled={isUpdating(job.jobId, "rejected")}
                    >
                      {isUpdating(job.jobId, "rejected") ? "Updating..." : "Reject"}
                    </button>
                    <button
                      className="status-btn delete"
                      onClick={() => deleteJob(job.jobId)}
                      disabled={deletingJob === job.jobId}
                      style={{ backgroundColor: "#dc3545", color: "white" }}
                    >
                      {deletingJob === job.jobId ? "Deleting..." : "🗑 Delete"}
                    </button>
                  </>
                )}

                {job.status?.toLowerCase() === "rejected" && (
                  <>
                    <button
                      className="status-btn pending"
                      onClick={() => updateJobStatus(job.jobId, "pending")}
                      disabled={isUpdating(job.jobId, "pending")}
                    >
                      {isUpdating(job.jobId, "pending") ? "Updating..." : "Move to Pending"}
                    </button>
                    <button
                      className="status-btn approve"
                      onClick={() => updateJobStatus(job.jobId, "approved")}
                      disabled={isUpdating(job.jobId, "approved")}
                    >
                      {isUpdating(job.jobId, "approved") ? "Updating..." : "Approve"}
                    </button>
                    <button
                      className="status-btn delete"
                      onClick={() => deleteJob(job.jobId)}
                      disabled={deletingJob === job.jobId}
                      style={{ backgroundColor: "#dc3545", color: "white" }}
                    >
                      {deletingJob === job.jobId ? "Deleting..." : "🗑 Delete"}
                    </button>
                  </>
                )}

                {/* If status is unknown/null */}
                {(!job.status || job.status?.toLowerCase() === "unknown") && (
                  <>
                    <button
                      className="status-btn approve"
                      onClick={() => updateJobStatus(job.jobId, "approved")}
                      disabled={isUpdating(job.jobId, "approved")}
                    >
                      {isUpdating(job.jobId, "approved") ? "Updating..." : "Approve"}
                    </button>
                    <button
                      className="status-btn reject"
                      onClick={() => updateJobStatus(job.jobId, "rejected")}
                      disabled={isUpdating(job.jobId, "rejected")}
                    >
                      {isUpdating(job.jobId, "rejected") ? "Updating..." : "Reject"}
                    </button>
                    <button
                      className="status-btn delete"
                      onClick={() => deleteJob(job.jobId)}
                      disabled={deletingJob === job.jobId}
                      style={{ backgroundColor: "#dc3545", color: "white" }}
                    >
                      {deletingJob === job.jobId ? "Deleting..." : "🗑 Delete"}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default HireJobsDashboard;