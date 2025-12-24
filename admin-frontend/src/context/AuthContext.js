import React, { createContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { client } from "../apolloClient"; // Ensure this path is correct

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing token
        const token = localStorage.getItem("accessToken");
        if (token) {
            try {
                const decoded = jwtDecode(token);
                // Check expiry? handled by apollo client refresh mostly, but good to check here too
                if (decoded.exp * 1000 > Date.now()) {
                    setUser(decoded);
                } else {
                    // Token expired, maybe try refresh or logout
                    localStorage.removeItem("accessToken");
                    localStorage.removeItem("refreshToken");
                    setUser(null);
                }
            } catch (err) {
                console.error("Invalid token", err);
                localStorage.removeItem("accessToken");
            }
        }
        setLoading(false);
    }, []);

    const login = (token, refreshToken, userData) => {
        localStorage.setItem("accessToken", token);
        localStorage.setItem("refreshToken", refreshToken);

        // If userData is provided, use it, otherwise decode token
        if (userData) {
            setUser({ ...userData, ...jwtDecode(token) });
        } else {
            setUser(jwtDecode(token));
        }
    };

    const logout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        setUser(null);
        client.resetStore(); // Clear Apollo cache
        window.location.href = "/login";
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
