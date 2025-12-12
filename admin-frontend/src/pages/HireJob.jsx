import React, { useState, useEffect } from "react";
import "../styles/HireJob.css";

const GRAPHQL_URL = "http://127.0.0.1:5001/graphql";

function HireJobsDashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [updating, setUpdating] = useState({ id: null, status: null });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("lifo");

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

    setUpdating({ id: jobId, status: "deleting" });

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
      
      // Optional: Refresh from database
      setTimeout(() => {
        fetchJobs();
      }, 500);
    } catch (err) {
      alert("❌ Failed to delete job: " + err.message);
      fetchJobs();
    } finally {
      setUpdating({ id: null, status: null });
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
        <button className="jobs-search-button" onClick={() => {}}>
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
              <div className={`status-badge ${statusClass(job.status)}`}>
                {job.status ? job.status.toUpperCase() : "UNKNOWN"}
              </div>

              <div className="job-details">
                <h3>{job.jobName}</h3>
                <p><strong>Job ID:</strong> {job.jobId}</p>
                <p><strong>Seller ID:</strong> {job.sellerId}</p>
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

              {/* Action Buttons - Positioned at bottom */}
              <div className="actions-container">
                {/* Status Action Buttons */}
                <div className="status-actions">
                  {(!job.status || job.status.toLowerCase() === "pending") && (
                    <>
                      <button
                        className="action-btn approve-btn"
                        disabled={isUpdating(job.jobId, "approved")}
                        onClick={() => updateJobStatus(job.jobId, "approved")}
                      >
                        {isUpdating(job.jobId, "approved")
                          ? "Updating..."
                          : "✅ Approve"}
                      </button>

                      <button
                        className="action-btn reject-btn"
                        disabled={isUpdating(job.jobId, "rejected")}
                        onClick={() => updateJobStatus(job.jobId, "rejected")}
                      >
                        {isUpdating(job.jobId, "rejected")
                          ? "Updating..."
                          : "❌ Reject"}
                      </button>
                    </>
                  )}

                  {job.status && job.status.toLowerCase() === "approved" && (
                    <>
                      <button
                        className="action-btn reject-btn"
                        disabled={isUpdating(job.jobId, "rejected")}
                        onClick={() => updateJobStatus(job.jobId, "rejected")}
                      >
                        {isUpdating(job.jobId, "rejected")
                          ? "Updating..."
                          : "❌ Reject"}
                      </button>

                      <button
                        className="action-btn pending-btn"
                        disabled={isUpdating(job.jobId, "pending")}
                        onClick={() => updateJobStatus(job.jobId, "pending")}
                      >
                        {isUpdating(job.jobId, "pending")
                          ? "Updating..."
                          : "⏳ Pending"}
                      </button>
                    </>
                  )}

                  {job.status && job.status.toLowerCase() === "rejected" && (
                    <>
                      <button
                        className="action-btn pending-btn"
                        disabled={isUpdating(job.jobId, "pending")}
                        onClick={() => updateJobStatus(job.jobId, "pending")}
                      >
                        {isUpdating(job.jobId, "pending")
                          ? "Updating..."
                          : "⏳ Pending"}
                      </button>

                      <button
                        className="action-btn approve-btn"
                        disabled={isUpdating(job.jobId, "approved")}
                        onClick={() => updateJobStatus(job.jobId, "approved")}
                      >
                        {isUpdating(job.jobId, "approved")
                          ? "Updating..."
                          : "✅ Approve"}
                      </button>
                    </>
                  )}
                </div>

                {/* Delete Button - Always at bottom */}
                <button
                  className="action-btn delete-btn"
                  disabled={isUpdating(job.jobId, "deleting")}
                  onClick={() => deleteJob(job.jobId)}
                >
                  {isUpdating(job.jobId, "deleting") ? "Deleting..." : "🗑 Delete"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default HireJobsDashboard;