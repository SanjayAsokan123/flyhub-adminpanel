import React, { useState } from "react";
import "../styles/TrainingBookingStatus.css"; // your CSS file

const TrainingBookingStatus = () => {
  const [activeTab, setActiveTab] = useState("All");

  const bookings = [
    {
      id: "TRN-001",
      name: "Drone Flight Basics",
      date: "2025-01-14",
      status: "Pending",
    },
    {
      id: "TRN-002",
      name: "Advanced Aerial Photography",
      date: "2025-01-10",
      status: "Approved",
    },
    {
      id: "TRN-003",
      name: "Drone Safety & Regulations",
      date: "2025-01-05",
      status: "Rejected",
    },
    {
      id: "TRN-004",
      name: "Commercial Drone Operations",
      date: "2025-01-02",
      status: "Completed",
    },
  ];

  const statusTabs = ["All", "Pending", "Approved", "Rejected", "Completed"];

  const filteredBookings =
    activeTab === "All"
      ? bookings
      : bookings.filter((b) => b.status === activeTab);

  return (
    <div className="training-status-container">
      <h2 className="training-status-title">Training Booking Status</h2>

      {/* Tabs */}
      <div className="training-tabs">
        {statusTabs.map((tab) => (
          <button
            key={tab}
            className={`training-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Booking Cards Grid */}
      <div className="training-list">
        {filteredBookings.length === 0 ? (
          <p>No bookings found.</p>
        ) : (
          filteredBookings.map((item) => (
            <div className="training-card" key={item.id}>
              <div className="training-card-header">
                <span className="training-id">{item.id}</span>

                {/* FIXED CLASSNAME ERROR */}
                <span
                  className={`training-status status-${item.status.toLowerCase()}`}
                >
                  {item.status}
                </span>
              </div>

              <div className="training-card-body">
                <p>
                  <span>Training:</span> {item.name}
                </p>
                <p>
                  <span>Date:</span> {item.date}
                </p>
              </div>

              <div className="training-card-footer">
                <button className="training-view-btn">View Details</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TrainingBookingStatus;
