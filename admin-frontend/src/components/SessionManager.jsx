import React, { useEffect, useState, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";

const REFRESH_TOKEN = gql`
  mutation RefreshAdminToken($refreshToken: String!) {
    refreshAdminToken(refreshToken: $refreshToken) {
      success
      token
    }
  }
`;

export default function SessionManager() {
  const [showWarning, setShowWarning] = useState(false);
  const [refreshAdminToken] = useMutation(REFRESH_TOKEN);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "/login";
  };

  const handleTokenRefresh = useCallback(async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) return handleLogout();

    try {
      const { data } = await refreshAdminToken({ variables: { refreshToken } });

      if (data.refreshAdminToken.success) {
        localStorage.setItem("accessToken", data.refreshAdminToken.token);
        setShowWarning(false);
      } else {
        handleLogout();
      }
    } catch {
      handleLogout();
    }
  }, [refreshAdminToken]);

  useEffect(() => {
    const checkSession = () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      try {
        const decoded = jwtDecode(token);
        const remaining = decoded.exp - Date.now() / 1000;

        if (remaining <= 60 && remaining > 0) {
          setShowWarning(true);
        } else if (remaining <= 0) {
          handleTokenRefresh();
        }
      } catch {
        handleLogout();
      }
    };

    const interval = setInterval(checkSession, 10000);
    return () => clearInterval(interval);
  }, [handleTokenRefresh]);

  return (
    showWarning && (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <h3>Session Expiring Soon</h3>
          <p>Your session will expire soon.</p>

          <div style={styles.buttons}>
            <button onClick={handleTokenRefresh} style={styles.refresh}>
              🔄 Refresh
            </button>
            <button onClick={handleLogout} style={styles.logout}>
              🚪 Logout
            </button>
          </div>
        </div>
      </div>
    )
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modal: {
    background: "#fff",
    padding: "24px",
    borderRadius: "12px",
    width: "320px",
    textAlign: "center",
  },
  buttons: {
    marginTop: "16px",
    display: "flex",
    justifyContent: "space-around",
  },
  refresh: {
    background: "#10b981",
    color: "white",
    padding: "8px 14px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  logout: {
    background: "#ef4444",
    color: "white",
    padding: "8px 14px",
    borderRadius: "6px",
    cursor: "pointer",
  },
};
