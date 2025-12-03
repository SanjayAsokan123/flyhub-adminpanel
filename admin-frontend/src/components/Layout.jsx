import React from "react";
import Sidebar from "./Sidebar";
import "../styles/Layout.css";
import SessionManager from "./SessionManager"; // ✅ import

function Layout({ children }) {
  return (
    <div className="layout">
      <Sidebar />
      <main className="content">
        <SessionManager /> {/* ✅ Active session tracking */}
        {children}
      </main>
    </div>
  );
}

export default Layout;