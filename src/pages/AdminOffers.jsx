import { useContext, useEffect, useState } from "react";
import API from "../api/client";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function AdminOffers() {
  const { user } = useContext(AuthContext);
  const { addToast } = useToast();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    discountType: "percentage",
    discountValue: "",
    minOrderValue: "",
    maxDiscountValue: "",
    usageLimit: "",
    userUsageLimit: 1,
    startDate: "",
    endDate: "",
    isPublic: true,
    isActive: true
  });

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  useEffect(() => {
    if (isAdmin) {
      loadOffers();
    }
  }, [isAdmin]);

  const loadOffers = async () => {
    try {
      const { data } = await API.get("/api/admin/offers");
      setOffers(data);
    } catch (err) {
      addToast("Failed to load offers", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        discountValue: parseFloat(formData.discountValue),
        minOrderValue: formData.minOrderValue ? parseFloat(formData.minOrderValue) : 0,
        maxDiscountValue: formData.maxDiscountValue ? parseFloat(formData.maxDiscountValue) : null,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
        userUsageLimit: parseInt(formData.userUsageLimit) || 1
      };
      
      if (editingOffer) {
        await API.put(`/api/admin/offers/${editingOffer._id}`, payload);
        addToast("Offer updated successfully", "success");
      } else {
        await API.post("/api/admin/offers", payload);
        addToast("Offer created successfully", "success");
      }
      setShowModal(false);
      resetForm();
      loadOffers();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to save offer", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (offer) => {
    setEditingOffer(offer);
    setFormData({
      code: offer.code || "",
      name: offer.name || "",
      description: offer.description || "",
      discountType: offer.discountType || "percentage",
      discountValue: offer.discountValue?.toString() || "",
      minOrderValue: offer.minOrderValue?.toString() || "",
      maxDiscountValue: offer.maxDiscountValue?.toString() || "",
      usageLimit: offer.usageLimit?.toString() || "",
      userUsageLimit: offer.userUsageLimit?.toString() || "1",
      startDate: offer.startDate ? offer.startDate.split("T")[0] : "",
      endDate: offer.endDate ? offer.endDate.split("T")[0] : "",
      isPublic: offer.isPublic,
      isActive: offer.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (offerId) => {
    if (!confirm("Are you sure you want to delete this offer?")) return;
    
    try {
      await API.delete(`/api/admin/offers/${offerId}`);
      addToast("Offer deleted successfully", "success");
      loadOffers();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to delete offer", "error");
    }
  };

  const handleToggle = async (offerId) => {
    try {
      await API.patch(`/api/admin/offers/${offerId}/toggle`);
      addToast("Offer status updated", "success");
      loadOffers();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to update offer", "error");
    }
  };

  const resetForm = () => {
    setEditingOffer(null);
    setFormData({
      code: "",
      name: "",
      description: "",
      discountType: "percentage",
      discountValue: "",
      minOrderValue: "",
      maxDiscountValue: "",
      usageLimit: "",
      userUsageLimit: 1,
      startDate: "",
      endDate: "",
      isPublic: true,
      isActive: true
    });
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };

  const getStatusBadge = (offer) => {
    const now = new Date();
    const startDate = new Date(offer.startDate);
    const endDate = new Date(offer.endDate);
    
    if (!offer.isActive) return <span className="badge badge-inactive">Inactive</span>;
    if (now < startDate) return <span className="badge badge-pending">Upcoming</span>;
    if (now > endDate) return <span className="badge badge-expired">Expired</span>;
    if (offer.usageLimit && offer.usageCount >= offer.usageLimit) return <span className="badge badge-expired">Limit Reached</span>;
    return <span className="badge badge-active">Active</span>;
  };

  if (!user) {
    return (
      <main className="container section page-gap">
        <p className="error">Please login as admin to view offers.</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="container section page-gap">
        <p className="error">Only admin can view offers.</p>
      </main>
    );
  }

  return (
    <main className="container page-gap">
      <section className="section">
        <div className="section-header">
          <h2>Offer & Coupon Management</h2>
          <button className="btn" onClick={openModal}>
            + Create Offer
          </button>
        </div>
      </section>

      {loading ? (
        <section className="section">
          <p>Loading offers...</p>
        </section>
      ) : offers.length === 0 ? (
        <section className="section">
          <article className="card">
            <p className="muted">No offers found. Create your first offer!</p>
          </article>
        </section>
      ) : (
        <section className="section">
          <article className="card">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Discount</th>
                    <th>Min Order</th>
                    <th>Usage</th>
                    <th>Valid Period</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((offer) => (
                    <tr key={offer._id}>
                      <td><code>{offer.code}</code></td>
                      <td>{offer.name}</td>
                      <td>
                        {offer.discountType === "percentage" 
                          ? `${offer.discountValue}%` 
                          : `₹${offer.discountValue}`}
                        {offer.maxDiscountValue && ` (Max ₹${offer.maxDiscountValue})`}
                      </td>
                      <td>₹{offer.minOrderValue || 0}</td>
                      <td>
                        {offer.usageCount || 0} / {offer.usageLimit || "∞"}
                      </td>
                      <td>
                        {new Date(offer.startDate).toLocaleDateString()} - 
                        {new Date(offer.endDate).toLocaleDateString()}
                      </td>
                      <td>{getStatusBadge(offer)}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn btn-small" 
                            onClick={() => handleToggle(offer._id)}
                          >
                            {offer.isActive ? "Disable" : "Enable"}
                          </button>
                          <button 
                            className="btn btn-small" 
                            onClick={() => handleEdit(offer)}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn btn-small btn-danger" 
                            onClick={() => handleDelete(offer._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingOffer ? "Edit Offer" : "Create New Offer"}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Offer Code *</label>
                    <input
                      type="text"
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g., SAVE20"
                      style={{ textTransform: "uppercase" }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Offer Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g., Save 20% on orders"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={2}
                    placeholder="Optional description for the offer"
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Discount Type *</label>
                    <select name="discountType" value={formData.discountType} onChange={handleInputChange}>
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₹)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Discount Value *</label>
                    <input
                      type="number"
                      name="discountValue"
                      value={formData.discountValue}
                      onChange={handleInputChange}
                      required
                      min={0}
                      placeholder={formData.discountType === "percentage" ? "20" : "100"}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Minimum Order Value (₹)</label>
                    <input
                      type="number"
                      name="minOrderValue"
                      value={formData.minOrderValue}
                      onChange={handleInputChange}
                      min={0}
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>Maximum Discount (₹)</label>
                    <input
                      type="number"
                      name="maxDiscountValue"
                      value={formData.maxDiscountValue}
                      onChange={handleInputChange}
                      min={0}
                      placeholder="For percentage only"
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Total Usage Limit</label>
                    <input
                      type="number"
                      name="usageLimit"
                      value={formData.usageLimit}
                      onChange={handleInputChange}
                      min={1}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>
                  <div className="form-group">
                    <label>Per User Limit</label>
                    <input
                      type="number"
                      name="userUsageLimit"
                      value={formData.userUsageLimit}
                      onChange={handleInputChange}
                      min={1}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date *</label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>End Date *</label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="isPublic"
                        checked={formData.isPublic}
                        onChange={handleInputChange}
                      />
                      Public (anyone can use)
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                      />
                      Active
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? "Saving..." : editingOffer ? "Update Offer" : "Create Offer"}
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
        
        .badge {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        
        .badge-active {
          background: #d1fae5;
          color: #065f46;
        }
        
        .badge-inactive {
          background: #fee2e2;
          color: #991b1b;
        }
        
        .badge-pending {
          background: #fef3c7;
          color: #92400e;
        }
        
        .badge-expired {
          background: #e5e7eb;
          color: #374151;
        }
        
        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }
        
        .modal-lg {
          max-width: 600px;
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
        
        .checkbox-label {
          display: flex !important;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }
        
        .checkbox-label input {
          width: auto !important;
        }
      `}</style>
    </main>
  );
}
