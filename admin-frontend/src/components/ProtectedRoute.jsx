import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, allowedFor }) => {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  if (!isLoggedIn || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  // restrict subadmins from opening superadmin-only pages
  if (allowedFor && currentUser.role !== allowedFor) {
    alert("Access denied ❌ Only Super Admin can view this page.");
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;