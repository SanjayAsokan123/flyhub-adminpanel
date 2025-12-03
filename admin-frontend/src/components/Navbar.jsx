import React, { useState } from "react";
import "../styles/Navbar.css";

function Navbar() {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogout = () => setShowConfirm(true);

  const confirmLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "/login";
  };

  return (
    <header className="navbar">
      <h1>Flyhub Admin Dashboard</h1>
      <div className="profile">
        <span>Admin</span>
        <img src="https://i.pravatar.cc/40" alt="profile" />
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>

      {showConfirm && (
        <div className="logout-overlay">
          <div className="logout-modal">
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to log out?</p>
            <div className="logout-actions">
              <button onClick={confirmLogout} className="confirm-btn">Yes</button>
              <button onClick={() => setShowConfirm(false)} className="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
