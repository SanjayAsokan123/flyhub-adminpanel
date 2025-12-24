import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, gql } from "@apollo/client";
import { AuthContext } from "../context/AuthContext";
import "../styles/Login.css";

const LOGIN_MUTATION = gql`
  mutation AdminLogin($email: String!, $password: String!) {
    adminLogin(email: $email, password: $password) {
      success
      message
      token
      refreshToken
      user {
        name
        role
        assignedPage
      }
    }
  }
`;

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [adminLogin, { loading }] = useMutation(LOGIN_MUTATION);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { data } = await adminLogin({ variables: { email, password } });
      if (data.adminLogin.success) {
        login(data.adminLogin.token, data.adminLogin.refreshToken, data.adminLogin.user);

        // Redirect logic based on assignedPage or default
        const assignedPage = data.adminLogin.user?.assignedPage;
        if (assignedPage && assignedPage !== "/") {
          navigate(assignedPage);
        } else {
          navigate("/");
        }
      } else {
        alert(data.adminLogin.message || "Login failed");
      }
    } catch (err) {
      console.error("Login Error:", err);
      alert("Login failed: " + err.message);
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
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
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