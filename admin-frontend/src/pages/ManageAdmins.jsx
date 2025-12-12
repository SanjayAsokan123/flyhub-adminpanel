

import React, { useState, useEffect } from "react";
import "../styles/ManageAdmins.css";

export default function ManageAdmins() {
  const [admins, setAdmins] = useState([]);
  const [newAdmin, setNewAdmin] = useState({
    username: "",
    password: "",
    access: [],
  });
  const [editingAdmin, setEditingAdmin] = useState(null);

  const allPages = [
    "users",
    "reports",
    "parts",
    "accessories",
    "services",
    "rentals",
    "sold-product",
    "regulatory",
    "settings",
    "pilot",
    "job",
    "seller",
    "return-product",
    "drone-rent",
  ];

  // Load existing admins (or initialize)
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("admins")) || [];
    // always include superadmin
    const superAdmin = {
      username: "admin",
      password: "1234",
      role: "superadmin",
      access: allPages,
    };
    const merged = [superAdmin, ...stored.filter(a => a.username !== "admin")];
    setAdmins(merged);
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    const toStore = admins.filter(a => a.username !== "admin");
    localStorage.setItem("admins", JSON.stringify(toStore));
  }, [admins]);

  // Add new subadmin
  const handleAdd = (e) => {
    e.preventDefault();
    if (!newAdmin.username || !newAdmin.password) return alert("Fill all fields!");
    if (admins.some(a => a.username === newAdmin.username))
      return alert("Username already exists!");

    setAdmins([
      ...admins,
      {
        username: newAdmin.username,
        password: newAdmin.password,
        role: "subadmin",
        access: newAdmin.access,
      },
    ]);
    setNewAdmin({ username: "", password: "", access: [] });
  };

  // Toggle access permission
  const toggleAccess = (page) => {
    setNewAdmin(prev => ({
      ...prev,
      access: prev.access.includes(page)
        ? prev.access.filter(p => p !== page)
        : [...prev.access, page],
    }));
  };

  // Edit existing admin
  const handleEdit = (admin) => setEditingAdmin({ ...admin });

  // Save edited admin
  const saveEdit = () => {
    setAdmins(admins.map(a => a.username === editingAdmin.username ? editingAdmin : a));
    setEditingAdmin(null);
  };

  // Delete subadmin
  const deleteAdmin = (username) => {
    if (username === "admin") return alert("Cannot delete superadmin!");
    if (`window.confirm(Delete admin '${username}'?)`) {
      setAdmins(admins.filter(a => a.username !== username));
    }
  };

  return (
    <div className="manage-admins-container">
      <h1>Manage Admins 👑</h1>

      {/* === Add New Admin Form === */}
      <form className="add-admin-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="Username"
          value={newAdmin.username}
          onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
        />
        <input
          type="password"
          placeholder="Password"
          value={newAdmin.password}
          onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
        />

        <div className="access-box">
          <p>Page Access:</p>
          <div className="access-grid">
            {allPages.map((page) => (
              <label key={page}>
                <input
                  type="checkbox"
                  checked={newAdmin.access.includes(page)}
                  onChange={() => toggleAccess(page)}
                />
                {page}
              </label>
            ))}
          </div>
        </div>

        <button type="submit" className="add-btn">Add Subadmin</button>
      </form>

      {/* === Admin List === */}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Password</th>
            <th>Role</th>
            <th>Access Pages</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {admins.map((admin) => (
            <tr key={admin.username}>
              <td>{admin.username}</td>
              <td>{admin.password}</td>
              <td>{admin.role}</td>
              <td>{admin.access.join(", ")}</td>
              <td>
                {admin.username !== "admin" && (
                  <>
                    <button onClick={() => handleEdit(admin)}>Edit</button>
                    <button onClick={() => deleteAdmin(admin.username)}>Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* === Edit Modal === */}
      {editingAdmin && (
        <div className="edit-modal">
          <div className="edit-box">
            <h2>Edit Admin: {editingAdmin.username}</h2>
            <input
              type="password"
              value={editingAdmin.password}
              onChange={(e) => setEditingAdmin({ ...editingAdmin, password: e.target.value })}
            />
            <div className="access-grid">
              {allPages.map((page) => (
                <label key={page}>
                  <input
                    type="checkbox"
                    checked={editingAdmin.access.includes(page)}
                    onChange={() => {
                      setEditingAdmin(prev => ({
                        ...prev,
                        access: prev.access.includes(page)
                          ? prev.access.filter(p => p !== page)
                          : [...prev.access, page],
                      }));
                    }}
                  />
                  {page}
                </label>
              ))}
            </div>
            <button onClick={saveEdit}>Save Changes</button>
            <button onClick={() => setEditingAdmin(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}