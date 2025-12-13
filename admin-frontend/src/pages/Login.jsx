import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    // default superadmin credentials
    if (username === "admin" && password === "1234") {
      const user = { username, role: "superadmin" };
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("currentUser", JSON.stringify(user));
      navigate("/");
      return;
    }

    // check sub-admins from localStorage
    const subAdmins = JSON.parse(localStorage.getItem("admins")) || [];
    const found = subAdmins.find(
      (a) => a.username === username && a.password === password
    );

    if (found) {
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("currentUser", JSON.stringify(found));
      navigate("/");
    } else {
      alert("Invalid credentials ⚠");
    }
  };

  return (
    <div className="login-dark">
      <div className="login-box">
        <img src="/flyhubicon.svg" alt="FlyHub Logo" className="flyhub-logo" />
        <p className="login-sub">Admin Access Portal</p>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login-btn">
            Log In
          </button>
        </form>

        <footer className="login-footer">
          <small>© 2025 Drone Admin. All rights reserved.</small>
        </footer>
      </div>

      <div className="orb orb1"></div>
      <div className="orb orb2"></div>
      <div className="orb orb3"></div>
    </div>
  );
}

export default Login;