// src/components/AnnouncementManager.js
import React, { useState, useEffect } from 'react';
import '../styles/Announcement.css';

// AnnouncementItem Component
function AnnouncementItem({ announcement, loading, onEdit, onDelete }) {
    return (
        <div className="announcement-item">
            {announcement.image && (
                <img
                    src={announcement.image}
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
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target.result;
                onFormChange({ ...formData, image: base64 });
            };
            reader.readAsDataURL(file);
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
                {formData.image && (
                    <div className="announcement-form__image-preview">
                        <img src={formData.image} alt="Preview" />
                    </div>
                )}
                {!formData.image && (
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
                    disabled={loading || (!formData.title || !formData.message)}
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
        image: '',
        title: '',
        message: '',
        isActive: false,
    });

    const GRAPHQL_ENDPOINT = 'https://flyhub-webadmin-4.onrender.com/graphql';

    // Fetch announcements
    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            const response = await fetch(GRAPHQL_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `{
                        getActiveAnnouncement {
                            id
                            image
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
            if (result.data?.getActiveAnnouncement) {
                setAnnouncements([result.data.getActiveAnnouncement]);
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
        if (!formData.title || !formData.message) {
            setMessage({ type: 'error', text: 'Title and message are required' });
            return false;
        }

        setLoading(true);
        try {
            const response = await fetch(GRAPHQL_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `
                        mutation {
                            createAnnouncement(
                                image: "${formData.image.replace(/"/g, '\\"')}"
                                title: "${formData.title.replace(/"/g, '\\"')}"
                                message: "${formData.message.replace(/"/g, '\\"')}"
                                isActive: ${formData.isActive}
                            ) {
                                success
                                message
                                data {
                                    id
                                    image
                                    title
                                    message
                                    isActive
                                    createdAt
                                    updatedAt
                                }
                            }
                        }
                    `,
                }),
            });

            const result = await response.json();
            if (result.data?.createAnnouncement?.success) {
                setMessage({ type: 'success', text: 'Announcement created successfully' });
                resetForm();
                fetchAnnouncements();
                return true;
            } else {
                setMessage({ type: 'error', text: result.data?.createAnnouncement?.message });
                return false;
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Update announcement
    const handleUpdate = async () => {
        if (!editingId) return false;
        if (!formData.title || !formData.message) {
            setMessage({ type: 'error', text: 'Title and message are required' });
            return false;
        }

        setLoading(true);
        try {
            const updateData = {
                title: formData.title,
                message: formData.message,
                isActive: formData.isActive,
            };

            if (formData.image && formData.image.startsWith('data:')) {
                updateData.image = formData.image;
            }

            const imageField = updateData.image
                ? `image: "${updateData.image.replace(/"/g, '\\"')}"`
                : '';

            const response = await fetch(GRAPHQL_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `
                        mutation {
                            updateAnnouncement(
                                id: "${editingId}"
                                ${imageField}
                                title: "${updateData.title.replace(/"/g, '\\"')}"
                                message: "${updateData.message.replace(/"/g, '\\"')}"
                                isActive: ${updateData.isActive}
                            ) {
                                success
                                message
                                data {
                                    id
                                    image
                                    title
                                    message
                                    isActive
                                    createdAt
                                    updatedAt
                                }
                            }
                        }
                    `,
                }),
            });

            const result = await response.json();
            if (result.data?.updateAnnouncement?.success) {
                setMessage({ type: 'success', text: 'Announcement updated successfully' });
                resetForm();
                fetchAnnouncements();
                return true;
            } else {
                setMessage({ type: 'error', text: result.data?.updateAnnouncement?.message });
                return false;
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
            return false;
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
            image: announcement.image,
            title: announcement.title,
            message: announcement.message,
            isActive: announcement.isActive,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            image: '',
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