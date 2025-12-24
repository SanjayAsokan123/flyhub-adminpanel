
import React, { useState, useContext } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import { AuthContext } from "../context/AuthContext";
import "../styles/ManageAdmins.css";
import axios from "axios";

// GraphQL Operations
const GET_ADMINS = gql`
  query GetAllAdmins {
    getAllAdmins {
      id
      name
      email
      role
      subRole
      assignedPage
      profileImage
    }
  }
`;

const CREATE_SUB_ADMIN = gql`
  mutation CreateSubAdmin($name: String!, $email: String!, $password: String!, $role: String, $subRole: String, $assignedPage: String, $profileImage: String) {
    createSubAdmin(name: $name, email: $email, password: $password, role: $role, subRole: $subRole, assignedPage: $assignedPage, profileImage: $profileImage) {
      success
      message
    }
  }
`;

const DELETE_ADMIN = gql`
  mutation DeleteAdmin($id: ID!) {
    deleteAdmin(id: $id) {
      success
      message
    }
  }
`;

export default function ManageAdmins() {
  const { user } = useContext(AuthContext);
  const { data, loading, error, refetch } = useQuery(GET_ADMINS);

  const [createSubAdmin] = useMutation(CREATE_SUB_ADMIN);
  const [deleteAdmin] = useMutation(DELETE_ADMIN);

  const [newAdmin, setNewAdmin] = useState({
    name: "",
    email: "",
    password: "",
    role: "subadmin",
    subRole: "viewer",
    assignedPage: "/",
    profileImage: "",
  });

  const [uploading, setUploading] = useState(false);

  // Available Pages for assignment
  const allPages = [
    { label: "Dashboard", value: "/" },
    { label: "Users", value: "/users" },
    { label: "Reports", value: "/reports" }, // Assuming reports route
    { label: "Parts", value: "/parts" },
    { label: "Accessories", value: "/accessories" },
    { label: "Services", value: "/services" },
    { label: "Rentals", value: "/rentals" },
    { label: "Sold Products", value: "/sold-product" },
    { label: "Regulatory", value: "/regulatory" },
    { label: "Settings", value: "/settings" },
    { label: "Hire Pilot", value: "/pilot" },
    { label: "Hire Job", value: "/job" },
    { label: "Seller Approval", value: "/seller" },
    { label: "Returns", value: "/return-product" },
    { label: "Manage Admins", value: "/manage-admins" },
  ];

  // File Upload Handler
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "admin-profiles");

    try {
      // Use existing backend REST endpoint
      const res = await axios.post("http://127.0.0.1:5001/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        setNewAdmin({ ...newAdmin, profileImage: res.data.url });
        alert("File uploaded successfully! ✅");
      } else {
        alert("Upload failed.");
      }
    } catch (err) {
      console.error("Upload error", err);
      alert("Error uploading file.");
    } finally {
      setUploading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newAdmin.name || !newAdmin.email || !newAdmin.password) return alert("Fill all required fields!");

    try {
      const { data } = await createSubAdmin({ variables: { ...newAdmin } });
      if (data.createSubAdmin.success) {
        alert("User created successfully! 🎉");
        setNewAdmin({
          name: "",
          email: "",
          password: "",
          role: "subadmin",
          subRole: "viewer",
          assignedPage: "/",
          profileImage: "",
        });
        refetch();
      } else {
        alert("Error: " + data.createSubAdmin.message);
      }
    } catch (err) {
      alert("Error creating user: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        const { data } = await deleteAdmin({ variables: { id } });
        if (data.deleteAdmin.success) {
          refetch();
        } else {
          alert(data.deleteAdmin.message);
        }
      } catch (err) {
        alert("Error deleting user: " + err.message);
      }
    }
  };

  if (loading) return <p className="loading-text">Loading Admins...</p>;
  if (error) return <p className="error-text">Error loading admins: {error.message}</p>;

  // Only allow Main Admin to see this page content ideally
  if (user?.role !== "admin") {
    return <div className="unauthorized">You are not authorized to view this page.</div>;
  }

  return (
    <div className="manage-admins-container">
      <h1>User Management (RBAC) 👑</h1>

      {/* === Add New Admin Form === */}
      <form className="add-admin-form" onSubmit={handleAdd}>
        <h3>Create New User</h3>
        <div className="form-grid">
          <input
            type="text"
            placeholder="Name"
            value={newAdmin.name}
            onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={newAdmin.email}
            onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={newAdmin.password}
            onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
            required
          />

          <select
            value={newAdmin.role}
            onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
          >
            <option value="subadmin">Subadmin</option>
            <option value="admin">Admin</option>
          </select>

          <select
            value={newAdmin.subRole}
            onChange={(e) => setNewAdmin({ ...newAdmin, subRole: e.target.value })}
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>

          <div className="file-input-group">
            <label>Assigned Page:</label>
            <select
              value={newAdmin.assignedPage}
              onChange={(e) => setNewAdmin({ ...newAdmin, assignedPage: e.target.value })}
            >
              {allPages.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="file-input-group">
            <label>Profile/Doc Upload:</label>
            <input type="file" onChange={handleFileChange} />
            {uploading && <span>Uploading...</span>}
            {newAdmin.profileImage && <span className="success-mark">✓</span>}
          </div>
        </div>

        <button type="submit" className="add-btn" disabled={uploading}>
          {uploading ? "Wait..." : "Create User"}
        </button>
      </form>

      {/* === Admin List === */}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Profile</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Sub-Role</th>
            <th>Assigned Page</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data?.getAllAdmins?.map((admin) => (
            <tr key={admin.id}>
              <td>
                {admin.profileImage ? (
                  <img src={admin.profileImage} alt="profile" className="table-avatar" />
                ) : (
                  <span className="no-img">No Img</span>
                )}
              </td>
              <td>{admin.name}</td>
              <td>{admin.email}</td>
              <td>
                <span className={`badge ${admin.role}`}>{admin.role}</span>
              </td>
              <td>{admin.subRole}</td>
              <td>{admin.assignedPage}</td>
              <td>
                {admin.id !== user.id && (
                  <button className="delete-btn" onClick={() => handleDelete(admin.id)}>
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
