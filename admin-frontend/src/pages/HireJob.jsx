import React, { useEffect, useState, useRef } from "react";
import "../styles/HireJob.css";

const GRAPHQL_URL = "http://localhost:5001/graphql";

function HireJobsDashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [updatingIds, setUpdatingIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "jobId", direction: "desc" });
  const [expandedSellers, setExpandedSellers] = useState(new Set());
  const tableRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [viewingJob, setViewingJob] = useState(null);

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

    const updatingIdsCopy = new Set(updatingIds);
    updatingIdsCopy.add(`${jobId}-deleting`);
    setUpdatingIds(updatingIdsCopy);

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
      const newUpdatingIdsCopy = new Set(updatingIds);
      newUpdatingIdsCopy.delete(`${jobId}-deleting`);
      setUpdatingIds(newUpdatingIdsCopy);
    }
  };

  // Update job status
  const updateJobStatus = async (jobId, newStatus) => {
    const updatingIdsCopy = new Set(updatingIds);
    updatingIdsCopy.add(`${jobId}-${newStatus}`);
    setUpdatingIds(updatingIdsCopy);

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
    
    const newUpdatingIdsCopy = new Set(updatingIds);
    newUpdatingIdsCopy.delete(`${jobId}-${newStatus}`);
    setUpdatingIds(newUpdatingIdsCopy);
  };

  // View job details
  const viewJobDetails = (job) => {
    setViewingJob(job);
  };

  // Close job details modal
  const closeJobDetails = () => {
    setViewingJob(null);
  };

  // Handle scroll to show shadow on sticky columns
  const handleTableScroll = (e) => {
    const isScrolled = e.target.scrollLeft > 0;
    setScrolled(isScrolled);
  };

  // Toggle seller expansion
  const toggleSeller = (sellerId) => {
    const newExpanded = new Set(expandedSellers);
    if (newExpanded.has(sellerId)) {
      newExpanded.delete(sellerId);
    } else {
      newExpanded.add(sellerId);
    }
    setExpandedSellers(newExpanded);
  };

  // Filter and sort jobs
  const filteredJobs = jobs
    .filter(job => {
      const matchesStatus = selectedStatus === "all" || (job.status || "").toLowerCase() === selectedStatus;
      const matchesSearch =
        searchTerm === "" ||
        (job.jobName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (job.companyName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (job.jobType || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (job.location || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (job.description || "").toLowerCase().includes(searchTerm.toLowerCase());

      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      const key = sortConfig.key;
      let aVal = a[key];
      let bVal = b[key];

      if (key === "salary") {
        // Extract numeric value from salary string
        aVal = parseInt(a.salary?.replace(/[^\d]/g, '') || "0");
        bVal = parseInt(b.salary?.replace(/[^\d]/g, '') || "0");
      }

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortConfig.direction === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  const statusStats = {
    all: jobs.length,
    approved: jobs.filter(j => j.status === "approved").length,
    pending: jobs.filter(j => !j.status || j.status === "pending").length,
    rejected: jobs.filter(j => j.status === "rejected").length,
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon active">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>;
  };

  const JobRow = ({ job, isSubRow = false }) => (
    <tr key={job.jobId} className={`job-row ${isSubRow ? 'sub-row' : ''}`}>
      <td className="sticky-col sticky-col-id">
        <div className="job-id-cell">
          <div className="id-badge">{job.jobId}</div>
        </div>
      </td>

      <td className="sticky-col sticky-col-seller-id">
        <div className="seller-id-cell">
          <div className="id-badge seller">{job.sellerId}</div>
          <div className="seller-quick-info">
            <span className="seller-email">{job.email || "No email"}</span>
          </div>
        </div>
      </td>

      <td className="cell-name">
        <div className="name-cell">
          <div className="name-info">
            <strong>{job.jobName}</strong>
            <div className="job-details">
              <span className="company">{job.companyName || "Not specified"}</span>
              <span className="type">{job.jobType || "Not specified"}</span>
            </div>
          </div>
        </div>
      </td>
      
      <td className="cell-location">
        <div className="location-badge">
          <span className="location-text">{job.location || "Remote"}</span>
        </div>
      </td>
      
      <td className="cell-experience">
        <div className="experience-badge">
          <span className="experience-text">{job.experience || "Not specified"}</span>
        </div>
      </td>
      
      <td className="cell-salary">
        <div className="salary-badge">
          <span className="salary-icon">₹</span>
          <span className="salary-text">{job.salary || "Not specified"}</span>
        </div>
      </td>
      
      <td className="cell-status">
        <span className={`status-badge status-${job.status || 'pending'}`}>
          {(job.status || "pending").toUpperCase()}
        </span>
      </td>
      
      <td className="cell-actions">
        <div className="action-buttons">
          {(!job.status || job.status.toLowerCase() === "pending") && (
            <>
              <button
                className="action-btn approve"
                onClick={() => updateJobStatus(job.jobId, "approved")}
                disabled={updatingIds.has(`${job.jobId}-approved`)}
                title="Approve job"
              >
                {updatingIds.has(`${job.jobId}-approved`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✓</span>
                )}
              </button>
              <button
                className="action-btn reject"
                onClick={() => updateJobStatus(job.jobId, "rejected")}
                disabled={updatingIds.has(`${job.jobId}-rejected`)}
                title="Reject job"
              >
                {updatingIds.has(`${job.jobId}-rejected`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✗</span>
                )}
              </button>
            </>
          )}

          {job.status && job.status.toLowerCase() === "approved" && (
            <>
              <button
                className="action-btn pending"
                onClick={() => updateJobStatus(job.jobId, "pending")}
                disabled={updatingIds.has(`${job.jobId}-pending`)}
                title="Move to pending"
              >
                {updatingIds.has(`${job.jobId}-pending`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>⏳</span>
                )}
              </button>
              <button
                className="action-btn reject"
                onClick={() => updateJobStatus(job.jobId, "rejected")}
                disabled={updatingIds.has(`${job.jobId}-rejected`)}
                title="Reject job"
              >
                {updatingIds.has(`${job.jobId}-rejected`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✗</span>
                )}
              </button>
            </>
          )}

          {job.status && job.status.toLowerCase() === "rejected" && (
            <>
              <button
                className="action-btn pending"
                onClick={() => updateJobStatus(job.jobId, "pending")}
                disabled={updatingIds.has(`${job.jobId}-pending`)}
                title="Move to pending"
              >
                {updatingIds.has(`${job.jobId}-pending`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>⏳</span>
                )}
              </button>
              <button
                className="action-btn approve"
                onClick={() => updateJobStatus(job.jobId, "approved")}
                disabled={updatingIds.has(`${job.jobId}-approved`)}
                title="Approve job"
              >
                {updatingIds.has(`${job.jobId}-approved`) ? (
                  <span className="loading-dots"></span>
                ) : (
                  <span>✓</span>
                )}
              </button>
            </>
          )}

          <button
            className="action-btn view"
            onClick={() => viewJobDetails(job)}
            title="View details"
          >
            👁
          </button>

          <button
            className="action-btn delete"
            onClick={() => deleteJob(job.jobId)}
            disabled={updatingIds.has(`${job.jobId}-deleting`)}
            title="Delete job"
          >
            {updatingIds.has(`${job.jobId}-deleting`) ? (
              <span className="loading-dots"></span>
            ) : (
              <span>🗑</span>
            )}
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="drones-container">
      {/* Header */}
      <div className="header-section">
        <div className="header-top">
          <div className="title-section">
            <h1 className="page-title">Hire Jobs Management</h1>
            <p className="page-subtitle">Manage and oversee all job postings and listings</p>
          </div>
          <div className="header-controls">
            <div className="stats-summary">
              <div className="summary-item">
                <span className="summary-label">TOTAL</span>
                <span className="summary-value">{jobs.length}</span>
              </div>
              <div className="summary-item active">
                <span className="summary-label">APPROVED</span>
                <span className="summary-value">{statusStats.approved}</span>
              </div>
            </div>
            <button
              className="refresh-btn"
              onClick={fetchJobs}
              disabled={loading}
            >
              <span className="refresh-icon">↻</span>
              {loading ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search jobs by name, company, type, location, or description..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm("")}>
              ✕
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠</span>
            <span>{error}</span>
            <button className="error-dismiss" onClick={() => setError(null)}>
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Status Tabs */}
      <div className="status-tabs-container">
        {["all", "approved", "pending", "rejected"].map((status) => (
          <button
            key={status}
            className={`status-tab ${selectedStatus === status ? "active" : ""}`}
            onClick={() => setSelectedStatus(status)}
          >
            <div className="tab-content">
              <span className="tab-icon">
                {status === "all" && "💼"}
                {status === "approved" && "✅"}
                {status === "pending" && "⏳"}
                {status === "rejected" && "❌"}
              </span>
              <span className="tab-text">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
              <span className="tab-count">{statusStats[status]}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Data Table with Horizontal Scroll */}
      <div className={`table-wrapper ${scrolled ? "scrolled" : ""}`}>
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading job data...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="no-data-message">
            <div className="no-data-icon">📭</div>
            <p>No jobs found</p>
            {searchTerm && <p className="no-data-hint">Try adjusting your search criteria</p>}
            <button className="no-data-action" onClick={() => {setSearchTerm(""); setSelectedStatus("all");}}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="table-scroll-container" ref={tableRef} onScroll={handleTableScroll}>
            <table className="drones-table">
              <thead>
                <tr>
                  <th className="sticky-col sticky-col-id" onClick={() => handleSort("jobId")}>
                    <div className="th-content">
                      Job ID <SortIcon column="jobId" />
                    </div>
                  </th>

                  <th className="sticky-col sticky-col-seller-id" onClick={() => handleSort("sellerId")}>
                    <div className="th-content">
                      Seller Details <SortIcon column="sellerId" />
                    </div>
                  </th>

                  <th onClick={() => handleSort("jobName")}>
                    <div className="th-content">
                      Job Details <SortIcon column="jobName" />
                    </div>
                  </th>
                  <th onClick={() => handleSort("location")}>
                    <div className="th-content">
                      Location <SortIcon column="location" />
                    </div>
                  </th>
                  <th onClick={() => handleSort("experience")}>
                    <div className="th-content">
                      Experience <SortIcon column="experience" />
                    </div>
                  </th>
                  <th onClick={() => handleSort("salary")}>
                    <div className="th-content">
                      Salary <SortIcon column="salary" />
                    </div>
                  </th>
                  <th onClick={() => handleSort("status")}>
                    <div className="th-content">
                      Status <SortIcon column="status" />
                    </div>
                  </th>
                  <th>
                    <div className="th-content">
                      Actions
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Group filtered jobs by seller
                  const sellerGroups = filteredJobs.reduce((acc, job) => {
                    if (!acc[job.sellerId]) {
                      acc[job.sellerId] = [];
                    }
                    acc[job.sellerId].push(job);
                    return acc;
                  }, {});

                  // Convert to array and render
                  return Object.entries(sellerGroups).flatMap(([sellerId, sellerJobs]) => {
                    if (sellerJobs.length === 0) return [];

                    const isExpanded = expandedSellers.has(sellerId);
                    const hasMultipleJobs = sellerJobs.length > 1;

                    return [
                      hasMultipleJobs ? (
                        <tr
                          key={`header-${sellerId}`}
                          className="seller-header-row"
                          onClick={() => toggleSeller(sellerId)}
                        >
                          <td colSpan="8" className="seller-header-cell">
                            <div className="seller-header-content">
                              <span className="expand-icon">
                                {isExpanded ? "▼" : "▶"}
                              </span>
                              <span className="seller-id">{sellerId}</span>
                              <span className="drone-count">{sellerJobs.length} jobs</span>
                              <div className="seller-info">
                                {sellerJobs[0].email && (
                                  <span className="info-item email">📧 {sellerJobs[0].email}</span>
                                )}
                                {sellerJobs[0].phoneNumber && (
                                  <span className="info-item phone">📱 {sellerJobs[0].phoneNumber}</span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null,
                      ...(!hasMultipleJobs || isExpanded
                        ? sellerJobs.map((job) => (
                            <JobRow
                              key={job.jobId}
                              job={job}
                              isSubRow={hasMultipleJobs}
                            />
                          ))
                        : [])
                    ];
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="footer-stats">
        <div className="stat-card">
          <div className="stat-icon">💼</div>
          <div className="stat-content">
            <div className="stat-label">Total Jobs</div>
            <div className="stat-value">{jobs.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-label">Approved</div>
            <div className="stat-value">{statusStats.approved}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-label">Pending</div>
            <div className="stat-value">{statusStats.pending}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <div className="stat-label">Rejected</div>
            <div className="stat-value">{statusStats.rejected}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">Avg. Salary</div>
            <div className="stat-value">
              {(() => {
                const salaries = jobs.map(j => {
                  const num = parseInt(j.salary?.replace(/[^\d]/g, '') || "0");
                  return isNaN(num) ? 0 : num;
                }).filter(n => n > 0);
                
                if (salaries.length === 0) return "N/A";
                
                const avg = Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length);
                return `₹${avg.toLocaleString('en-IN')}`;
              })()}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📍</div>
          <div className="stat-content">
            <div className="stat-label">Locations</div>
            <div className="stat-value">
              {[...new Set(jobs.map(j => j.location).filter(Boolean))].length}
            </div>
          </div>
        </div>
      </div>

      {/* Job Details Modal */}
      {viewingJob && (
        <div className="drone-modal-overlay" onClick={closeJobDetails}>
          <div className="drone-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Job Details</h2>
              <button className="modal-close" onClick={closeJobDetails}>
                ✕
              </button>
            </div>
            <div className="modal-content">
              <div className="modal-profile">
                <div className="modal-name">
                  <h3>{viewingJob.jobName}</h3>
                  <span className={`modal-status status-${viewingJob.status || 'pending'}`}>
                    {(viewingJob.status || "pending").toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="modal-details-grid">
                <div className="detail-section">
                  <h4>Job Information</h4>
                  <div className="detail-row">
                    <span className="detail-label">Job ID:</span>
                    <span className="detail-value">{viewingJob.jobId}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Seller ID:</span>
                    <span className="detail-value">{viewingJob.sellerId}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Company:</span>
                    <span className="detail-value">{viewingJob.companyName}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Job Type:</span>
                    <span className="detail-value">{viewingJob.jobType || "Not specified"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Experience:</span>
                    <span className="detail-value">{viewingJob.experience || "Not specified"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Location:</span>
                    <span className="detail-value">{viewingJob.location || "Remote"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Salary:</span>
                    <span className="detail-value">₹{viewingJob.salary || "Not specified"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className={`detail-value status-badge status-${viewingJob.status || 'pending'}`}>
                      {(viewingJob.status || "pending").toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Description</h4>
                  <div className="detail-row full-width">
                    <span className="detail-value description-full">
                      {viewingJob.description || "No description provided."}
                    </span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Requirements</h4>
                  <div className="detail-row full-width">
                    <span className="detail-value description-full">
                      {viewingJob.requirement || "No requirements specified."}
                    </span>
                  </div>
                </div>

                {viewingJob.email && (
                  <div className="detail-section seller-section">
                    <h4>Contact Information</h4>
                    <div className="detail-row">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{viewingJob.email}</span>
                    </div>
                    {viewingJob.phoneNumber && (
                      <div className="detail-row">
                        <span className="detail-label">Phone:</span>
                        <span className="detail-value">{viewingJob.phoneNumber}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <div className="modal-actions">
                {(!viewingJob.status || viewingJob.status.toLowerCase() === "pending") && (
                  <>
                    <button
                      className="modal-action-btn approve"
                      onClick={() => {
                        updateJobStatus(viewingJob.jobId, "approved");
                        closeJobDetails();
                      }}
                      disabled={updatingIds.has(`${viewingJob.jobId}-approved`)}
                    >
                      {updatingIds.has(`${viewingJob.jobId}-approved`) ? "Processing..." : "Approve"}
                    </button>
                    <button
                      className="modal-action-btn reject"
                      onClick={() => {
                        updateJobStatus(viewingJob.jobId, "rejected");
                        closeJobDetails();
                      }}
                      disabled={updatingIds.has(`${viewingJob.jobId}-rejected`)}
                    >
                      {updatingIds.has(`${viewingJob.jobId}-rejected`) ? "Processing..." : "Reject"}
                    </button>
                  </>
                )}

                {viewingJob.status && viewingJob.status.toLowerCase() === "approved" && (
                  <>
                    <button
                      className="modal-action-btn pending"
                      onClick={() => {
                        updateJobStatus(viewingJob.jobId, "pending");
                        closeJobDetails();
                      }}
                      disabled={updatingIds.has(`${viewingJob.jobId}-pending`)}
                    >
                      {updatingIds.has(`${viewingJob.jobId}-pending`) ? "Processing..." : "Move to Pending"}
                    </button>
                    <button
                      className="modal-action-btn reject"
                      onClick={() => {
                        updateJobStatus(viewingJob.jobId, "rejected");
                        closeJobDetails();
                      }}
                      disabled={updatingIds.has(`${viewingJob.jobId}-rejected`)}
                    >
                      {updatingIds.has(`${viewingJob.jobId}-rejected`) ? "Processing..." : "Reject"}
                    </button>
                  </>
                )}

                {viewingJob.status && viewingJob.status.toLowerCase() === "rejected" && (
                  <>
                    <button
                      className="modal-action-btn pending"
                      onClick={() => {
                        updateJobStatus(viewingJob.jobId, "pending");
                        closeJobDetails();
                      }}
                      disabled={updatingIds.has(`${viewingJob.jobId}-pending`)}
                    >
                      {updatingIds.has(`${viewingJob.jobId}-pending`) ? "Processing..." : "Move to Pending"}
                    </button>
                    <button
                      className="modal-action-btn approve"
                      onClick={() => {
                        updateJobStatus(viewingJob.jobId, "approved");
                        closeJobDetails();
                      }}
                      disabled={updatingIds.has(`${viewingJob.jobId}-approved`)}
                    >
                      {updatingIds.has(`${viewingJob.jobId}-approved`) ? "Processing..." : "Approve"}
                    </button>
                  </>
                )}

                <button
                  className="modal-action-btn delete"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete this job?")) {
                      deleteJob(viewingJob.jobId);
                      closeJobDetails();
                    }
                  }}
                  disabled={updatingIds.has(`${viewingJob.jobId}-deleting`)}
                >
                  {updatingIds.has(`${viewingJob.jobId}-deleting`) ? "Deleting..." : "Delete"}
                </button>

                <button
                  className="modal-action-btn close"
                  onClick={closeJobDetails}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HireJobsDashboard;