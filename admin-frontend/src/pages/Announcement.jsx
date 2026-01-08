// src/components/AnnouncementManager.js
import React, { useState, useEffect } from 'react';
// import { uploadSingleFile } from '../../../admin-backend/utils/uploadToFirebase.js';
import '../styles/Announcement.css';

const GRAPHQL_ENDPOINT = 'http://localhost:5001/graphql';
const UPLOAD_ENDPOINT = 'http://localhost:5001/upload';

// Utility function to upload image to Firebase
const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "announcements");

    const res = await fetch(UPLOAD_ENDPOINT, {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Upload failed");
    }

    const data = await res.json();

    if (!data.success || !data.url) {
        throw new Error("Invalid upload response");
    }

    return {
        url: data.url,
        path: data.path,
    };
};


// AnnouncementItem Component
function AnnouncementItem({ announcement, loading, onEdit, onDelete }) {
    return (
        <div className="announcement-item">
            {announcement.imageUrl && (
                <img
                    src={announcement.imageUrl}
                    alt={announcement.title}
                    className="announcement-item__image"
                />
            )}
            <div className="announcement-item__content">
                <h3>{announcement.title}</h3>
                <p>{announcement.message}</p>
                <div className="announcement-item__meta">
                    <span className={`announcement-item__status-badge ${announcement.isActive ? 'announcement-item__status-badge--active' : 'announcement-item__status-badge--inactive'}`}>
                        {announcement.isActive ? '✓ Active' : '○ Inactive'}
                    </span>
                    <span>
                        Created: {new Date(announcement.createdAt).toLocaleDateString()}
                    </span>
                </div>
            </div>
            <div className="announcement-item__actions">
                <button
                    className="announcement-button announcement-button--primary"
                    onClick={() => onEdit(announcement)}
                    disabled={loading}
                >
                    Edit
                </button>
                <button
                    className="announcement-button announcement-button--danger"
                    onClick={() => onDelete(announcement.id)}
                    disabled={loading}
                >
                    Delete
                </button>
            </div>
        </div>
    );
}

// AnnouncementList Component
function AnnouncementList({ announcements, loading, onEdit, onDelete }) {
    return (
        <div className="announcement-list">
            <h2 className="announcement-list__title">📋 All Announcements</h2>

            {announcements.length === 0 ? (
                <div className="announcement-empty-state">
                    <p>No announcements yet. Create one to get started!</p>
                </div>
            ) : (
                announcements.map((announcement) => (
                    <AnnouncementItem
                        key={announcement.id}
                        announcement={announcement}
                        loading={loading}
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                ))
            )}
        </div>
    );
}

// AnnouncementForm Component
function AnnouncementForm({
    formData,
    editingId,
    loading,
    message,
    onFormChange,
    onFormSubmit,
    onCancel
}) {

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            onFormChange({ ...formData, imageFile: file });
        }
    };


    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        onFormChange({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    return (
        <div className="announcement-form">
            <h2 className="announcement-form__title">
                {editingId ? '✏️ Edit Announcement' : '➕ Create Announcement'}
            </h2>

            {message && (
                <div className={`announcement-alert announcement-alert--${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="announcement-form__group">
                <label className="announcement-form__label">Image</label>
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="announcement-form__input"
                />
                {/* Image Preview Logic */}
                {formData.imageFile ? (
                    <img
                        src={URL.createObjectURL(formData.imageFile)}
                        alt="Preview"
                        className="announcement-form__image-preview"
                    />
                ) : formData.imageUrl ? (
                    <img
                        src={formData.imageUrl}
                        alt="Preview"
                        className="announcement-form__image-preview"
                    />
                ) : (
                    <div className="announcement-form__image-preview announcement-form__image-preview--empty">
                        No image selected
                    </div>
                )}
            </div>

            <div className="announcement-form__group">
                <label htmlFor="title" className="announcement-form__label">Title</label>
                <input
                    id="title"
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Announcement title"
                    className="announcement-form__input"
                />
            </div>

            <div className="announcement-form__group">
                <label htmlFor="message" className="announcement-form__label">Message</label>
                <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Announcement message"
                    className="announcement-form__textarea"
                />
            </div>

            <div className="announcement-form__checkbox-group">
                <input
                    id="isActive"
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="announcement-form__checkbox"
                />
                <label htmlFor="isActive" className="announcement-form__checkbox-label">
                    Active
                </label>
            </div>

            <div className="announcement-form__button-group">
                <button
                    className="announcement-button announcement-button--primary"
                    onClick={onFormSubmit}
                    disabled={
                        loading ||
                        !formData.title ||
                        !formData.message ||
                        (!formData.imageFile && !formData.imageUrl)
                    }
                >
                    {loading ? 'Processing...' : editingId ? 'Update' : 'Create'}
                </button>
                {editingId && (
                    <button
                        className="announcement-button announcement-button--secondary"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
}

// Main AnnouncementManager Component
function AnnouncementManager() {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        imageUrl: '',
        imagePath: '',
        imageFile: null,
        title: '',
        message: '',
        isActive: false,
    });




    // Fetch announcements
    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            const response = await fetch(GRAPHQL_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `{
                        getAllAnnouncements {
                            id
                            imageUrl
                            title
                            message
                            isActive
                            createdAt
                            updatedAt
                        }
                    }`,
                }),
            });
            const result = await response.json();
            if (result.data?.getAllAnnouncements) {
                setAnnouncements(result.data.getAllAnnouncements);
            }
        } catch (error) {
            setMessage({ type: 'Popup', text: 'No Latest Update Anncouncement' });
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    // Create announcement
    const handleCreate = async () => {
        setLoading(true);
        try {
            let imageData = {};

            if (formData.imageFile) {
                imageData = await uploadImage(formData.imageFile);
            }

            const response = await fetch(GRAPHQL_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: `
                mutation {
                    createAnnouncement(
                    title: ${JSON.stringify(formData.title)}
                    message: ${JSON.stringify(formData.message)}
                    isActive: ${formData.isActive}
                    imageUrl: ${JSON.stringify(imageData.url || "")}
                    imagePath: ${JSON.stringify(imageData.path || "")}
                    ) {
                    success
                    }
                }
                `,
                }),
            });

            const result = await response.json();
            if (result.errors) {
                console.error("GraphQL Errors:", result.errors);
                setMessage({ type: "error", text: "Failed to create announcement" });
                return;
            }

            resetForm();
            fetchAnnouncements();
        } catch (err) {
            setMessage({ type: "error", text: err.message });
        } finally {
            setLoading(false);
        }
    };


    // Update announcement
    const handleUpdate = async () => {
        setLoading(true);
        try {
            let imageData = {};

            if (formData.imageFile) {
                imageData = await uploadImage(formData.imageFile);
            }

            // Construct mutation args dynamically
            const mutationArgs = [
                `id: "${editingId}"`,
                `title: ${JSON.stringify(formData.title)}`,
                `message: ${JSON.stringify(formData.message)}`,
                `isActive: ${formData.isActive}`
            ];

            if (imageData.url) {
                mutationArgs.push(`imageUrl: ${JSON.stringify(imageData.url)}`);
                mutationArgs.push(`imagePath: ${JSON.stringify(imageData.path)}`);
            }

            const response = await fetch(GRAPHQL_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: `
                mutation {
                    updateAnnouncement(
                        ${mutationArgs.join('\n')}
                    ) {
                    success
                    }
                }
                `,
                }),
            });

            const result = await response.json();
            if (result.errors) {
                console.error("GraphQL Errors:", result.errors);
                setMessage({ type: "error", text: "Failed to update announcement" });
                return;
            }

            resetForm();
            fetchAnnouncements();
        } catch (err) {
            console.error(err);
            setMessage({ type: "error", text: err.message });
        } finally {
            setLoading(false);
        }
    };




    // Delete announcement
    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this announcement?')) return false;

        setLoading(true);
        try {
            const response = await fetch(GRAPHQL_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `
                        mutation {
                            deleteAnnouncement(id: "${id}") {
                                success
                                message
                            }
                        }
                    `,
                }),
            });

            const result = await response.json();
            if (result.data?.deleteAnnouncement?.success) {
                setMessage({ type: 'success', text: 'Announcement deleted successfully' });
                fetchAnnouncements();
                return true;
            } else {
                setMessage({ type: 'error', text: result.data?.deleteAnnouncement?.message });
                return false;
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Edit announcement
    const handleEdit = (announcement) => {
        setEditingId(announcement.id);
        setFormData({
            imageUrl: announcement.imageUrl,
            imagePath: announcement.imagePath,
            imageFile: null,
            title: announcement.title,
            message: announcement.message,
            isActive: announcement.isActive,
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            imageUrl: '',
            imagePath: '',
            title: '',
            message: '',
            isActive: false,
        });
        setEditingId(null);
    };

    return (
        <div className="announcement-manager">
            <div className="announcement-manager__container">
                <div className="announcement-manager__header">
                    <h1>📢 Announcement Manager</h1>
                    <p>Create, update, and manage announcements with images</p>
                </div>

                <div className="announcement-manager__layout">
                    <AnnouncementForm
                        formData={formData}
                        editingId={editingId}
                        loading={loading}
                        message={message}
                        onFormChange={setFormData}
                        onFormSubmit={editingId ? handleUpdate : handleCreate}
                        onCancel={resetForm}
                    />

                    <AnnouncementList
                        announcements={announcements}
                        loading={loading}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                </div>
            </div>
        </div>
    );
}

export default AnnouncementManager;