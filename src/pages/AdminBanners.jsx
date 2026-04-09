import { useContext, useEffect, useState } from "react";
import API from "../api/client";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function AdminBanners() {
  const { user } = useContext(AuthContext);
  const { addToast } = useToast();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image: "",
    link: "",
    linkType: "none",
    category: "",
    position: 0,
    isActive: true,
    startDate: "",
    endDate: ""
  });

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  useEffect(() => {
    if (isAdmin) {
      loadBanners();
    }
  }, [isAdmin]);

const loadBanners = async () => {
    try {
      console.log("Loading banners from /admin/banners...");
      const { data } = await API.get("/admin/banners");
      console.log("Banners loaded:", data);
      setBanners(data);
    } catch (err) {
      console.error("Failed to load banners:", err);
      addToast(err.response?.data?.message || "Failed to load banners", "error");
    } finally {
      setLoading(false);
    }
  };

  const seedSampleBanners = async () => {
    try {
      setLoading(true);
      console.log("Seeding sample banners...");
      const { data } = await API.post("/seed/banners");
      console.log("Seed result:", data);
      addToast(data.message || "Sample banners created successfully", "success");
      loadBanners();
    } catch (err) {
      console.error("Failed to seed banners:", err);
      addToast(err.response?.data?.message || "Failed to create sample banners", "error");
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : type === "number" ? Number(value) : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingBanner) {
        await API.put(`/admin/banners/${editingBanner._id}`, formData);
        addToast("Banner updated successfully", "success");
      } else {
        await API.post("/admin/banners", formData);
        addToast("Banner created successfully", "success");
      }
      setShowModal(false);
      resetForm();
      loadBanners();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to save banner", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || "",
      description: banner.description || "",
      image: banner.image || "",
      link: banner.link || "",
      linkType: banner.linkType || "none",
      category: banner.category || "",
      position: banner.position || 0,
      isActive: banner.isActive,
      startDate: banner.startDate ? banner.startDate.split("T")[0] : "",
      endDate: banner.endDate ? banner.endDate.split("T")[0] : ""
    });
    setShowModal(true);
  };

  const handleDelete = async (bannerId) => {
    if (!confirm("Are you sure you want to delete this banner?")) return;
    
    try {
      await API.delete(`/admin/banners/${bannerId}`);
      addToast("Banner deleted successfully", "success");
      loadBanners();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to delete banner", "error");
    }
  };

  const handleToggle = async (bannerId) => {
    try {
      await API.patch(`/admin/banners/${bannerId}/toggle`);
      addToast("Banner status updated", "success");
      loadBanners();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to update banner", "error");
    }
  };

  const resetForm = () => {
    setEditingBanner(null);
    setFormData({
      title: "",
      description: "",
      image: "",
      link: "",
      linkType: "none",
      category: "",
      position: 0,
      isActive: true,
      startDate: "",
      endDate: ""
    });
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };

  if (!user) {
    return (
      <main className="container section page-gap">
        <p className="error">Please login as admin to view banners.</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="container section page-gap">
        <p className="error">Only admin can view banners.</p>
      </main>
    );
  }

  return (
    <main className="container page-gap">
      <section className="section">
        <div className="section-header">
          <h2>Banner Management</h2>
          <button className="btn" onClick={openModal}>
            + Add Banner
          </button>
        </div>
      </section>

      {loading ? (
        <section className="section">
          <p>Loading banners...</p>
        </section>
      ) : banners.length === 0 ? (
        <section className="section">
          <article className="card">
            <p className="muted">No banners found. Create your first banner or seed sample banners!</p>
            <div style={{ marginTop: '1rem' }}>
              <button className="btn" onClick={seedSampleBanners} disabled={loading}>
                {loading ? "Seeding..." : "Seed Sample Banners"}
              </button>
            </div>
          </article>
        </section>
      ) : (
        <section className="section">
          <div className="banner-grid">
            {banners.map((banner) => (
              <article key={banner._id} className="card banner-card">
                {banner.image && (
                  <div className="banner-image">
                    <img src={banner.image} alt={banner.title} />
                  </div>
                )}
                <div className="banner-content">
                  <h4>{banner.title}</h4>
                  <p className="muted">{banner.description}</p>
                  <div className="banner-meta">
                    <span className={`status ${banner.isActive ? "status-active" : "status-inactive"}`}>
                      {banner.isActive ? "Active" : "Inactive"}
                    </span>
                    <span className="banner-position">Position: {banner.position}</span>
                  </div>
                  <div className="banner-actions">
                    <button 
                      className="btn btn-small" 
                      onClick={() => handleToggle(banner._id)}
                    >
                      {banner.isActive ? "Disable" : "Enable"}
                    </button>
                    <button 
                      className="btn btn-small" 
                      onClick={() => handleEdit(banner)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-small btn-danger" 
                      onClick={() => handleDelete(banner._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingBanner ? "Edit Banner" : "Add Banner"}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={2}
                  />
                </div>
                <div className="form-group">
                  <label>Image URL</label>
                  <input
                    type="url"
                    name="image"
                    value={formData.image}
                    onChange={handleInputChange}
                    placeholder="https://example.com/image.jpg (optional)"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Link Type</label>
                    <select name="linkType" value={formData.linkType} onChange={handleInputChange}>
                      <option value="none">None</option>
                      <option value="menu">Menu</option>
                      <option value="category">Category</option>
                      <option value="custom">Custom URL</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Link/Category</label>
                    <input
                      type="text"
                      name="link"
                      value={formData.link}
                      onChange={handleInputChange}
                      placeholder="URL or category name"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Position</label>
                    <input
                      type="number"
                      name="position"
                      value={formData.position}
                      onChange={handleInputChange}
                      min={0}
                    />
                  </div>
                  <div className="form-group">
                    <label>Active</label>
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? "Saving..." : editingBanner ? "Update Banner" : "Create Banner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .banner-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        
        .banner-card {
          overflow: hidden;
        }
        
        .banner-image {
          height: 150px;
          overflow: hidden;
        }
        
        .banner-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .banner-content {
          padding: 1rem;
        }
        
        .banner-content h4 {
          margin-bottom: 0.5rem;
        }
        
        .banner-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 1rem 0;
          font-size: 0.875rem;
        }
        
        .status-active {
          color: #10b981;
        }
        
        .status-inactive {
          color: #ef4444;
        }
        
        .banner-actions {
          display: flex;
          gap: 0.5rem;
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #eee;
        }
        
        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
        }
        
        .modal-body {
          padding: 1rem;
        }
        
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
          padding: 1rem;
          border-top: 1px solid #eee;
        }
        
        .form-group {
          margin-bottom: 1rem;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
      `}</style>
    </main>
  );
}
