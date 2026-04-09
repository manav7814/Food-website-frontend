import { useContext, useEffect, useState } from "react";
import API from "../api/client";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function AdminSettings() {
  const { user } = useContext(AuthContext);
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [restaurantLat, setRestaurantLat] = useState("23.0225");
  const [restaurantLng, setRestaurantLng] = useState("72.5714");
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState("30");
  const [savingDeliveryConfig, setSavingDeliveryConfig] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  // Notification broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState("all");
  const [broadcasting, setBroadcasting] = useState(false);

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  useEffect(() => {
    if (isAdmin) {
      loadMaintenanceStatus();
      loadDeliveryConfig();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin && !loading) {
      loadCategories();
    }
  }, [isAdmin, loading]);

  const loadMaintenanceStatus = async () => {
    try {
      const { data } = await API.get("/admin/maintenance");
      setMaintenanceMode(data.value?.enabled || false);
      setMaintenanceMessage(data.value?.message || "");
    } catch (err) {
      console.error("Failed to load maintenance status", err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const { data } = await API.get("/admin/categories");
      setCategories(data);
    } catch (err) {
      console.error("Failed to load categories", err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadDeliveryConfig = async () => {
    try {
      const { data } = await API.get("/admin/settings");
      const deliveryConfig = data.find(
        (setting) => setting.key === "RESTAURANT_DELIVERY_CONFIG"
      );
      const value = deliveryConfig?.value || {};
      const nextLat = Number(value.lat);
      const nextLng = Number(value.lng);
      const nextRadius = Number(value.radiusKm);

      if (Number.isFinite(nextLat)) setRestaurantLat(String(nextLat));
      if (Number.isFinite(nextLng)) setRestaurantLng(String(nextLng));
      if (Number.isFinite(nextRadius)) setDeliveryRadiusKm(String(nextRadius));
    } catch (err) {
      console.error("Failed to load restaurant delivery config", err);
    }
  };

  const handleMaintenanceToggle = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/admin/maintenance", {
        enabled: !maintenanceMode,
        message: maintenanceMessage
      });
      setMaintenanceMode(!maintenanceMode);
      addToast(
        `Maintenance mode ${!maintenanceMode ? "enabled" : "disabled"} successfully`,
        "success"
      );
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to update maintenance mode", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryVisibilityToggle = async (categoryName, currentVisibility) => {
    try {
      await API.post("/admin/categories/visibility", {
        category: categoryName,
        isVisible: !currentVisibility
      });
      setCategories(categories.map(cat => 
        cat.name === categoryName ? { ...cat, isVisible: !currentVisibility } : cat
      ));
      addToast(`Category "${categoryName}" is now ${!currentVisibility ? "visible" : "hidden"}`, "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to update category visibility", "error");
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      addToast("Please enter both title and message", "error");
      return;
    }
    
    setBroadcasting(true);
    try {
      const { data } = await API.post("/admin/broadcast", {
        title: broadcastTitle,
        message: broadcastMessage,
        target: broadcastTarget
      });
      addToast(`Notification sent to ${data.recipients} recipients`, "success");
      setBroadcastTitle("");
      setBroadcastMessage("");
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to broadcast notification", "error");
    } finally {
      setBroadcasting(false);
    }
  };

  const handleDeliveryConfigSave = async (e) => {
    e.preventDefault();

    const lat = Number(restaurantLat);
    const lng = Number(restaurantLng);
    const radiusKm = Number(deliveryRadiusKm);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      addToast("Latitude must be between -90 and 90", "error");
      return;
    }

    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      addToast("Longitude must be between -180 and 180", "error");
      return;
    }

    if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 100) {
      addToast("Delivery radius must be greater than 0 and at most 100 km", "error");
      return;
    }

    setSavingDeliveryConfig(true);
    try {
      await API.put("/admin/settings/RESTAURANT_DELIVERY_CONFIG", {
        value: { lat, lng, radiusKm },
        description: "Restaurant map location and delivery service radius"
      });
      addToast("Restaurant delivery location updated successfully", "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to update delivery config", "error");
    } finally {
      setSavingDeliveryConfig(false);
    }
  };

  if (!user) {
    return (
      <main className="container section page-gap">
        <p className="error">Please login as admin to view settings.</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="container section page-gap">
        <p className="error">Only admin can view settings.</p>
      </main>
    );
  }

  return (
    <main className="container page-gap">
      <section className="section">
        <h2>System Settings</h2>
      </section>

      {loading ? (
        <section className="section">
          <p>Loading settings...</p>
        </section>
      ) : (
        <>
          <section className="section">
            <article className="card">
              <h3>Maintenance Mode</h3>
              <p className="muted">
                When enabled, the application will show a maintenance message to all users except admins.
              </p>
              
              <form onSubmit={handleMaintenanceToggle} className="settings-form">
                <div className="form-group">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={maintenanceMode}
                      onChange={(e) => setMaintenanceMode(e.target.checked)}
                    />
                    <span className="toggle-text">
                      {maintenanceMode ? "Enabled" : "Disabled"}
                    </span>
                  </label>
                </div>
                
                <div className="form-group">
                  <label htmlFor="maintenanceMessage">Maintenance Message</label>
                  <textarea
                    id="maintenanceMessage"
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                    placeholder="Enter message to show during maintenance..."
                    rows={3}
                  />
                </div>
                
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? "Saving..." : maintenanceMode ? "Disable Maintenance Mode" : "Enable Maintenance Mode"}
                </button>
              </form>
            </article>
          </section>

          <section className="section">
            <article className="card">
              <div className="card-header">
                <h3>Category Visibility</h3>
                <button className="btn btn-small" onClick={loadCategories} disabled={loadingCategories}>
                  {loadingCategories ? "Loading..." : "Refresh"}
                </button>
              </div>
              <p className="muted">
                Toggle visibility of menu item categories. Hidden categories won't be visible to customers.
              </p>
              
              {loadingCategories ? (
                <p>Loading categories...</p>
              ) : categories.length > 0 ? (
                <div className="category-list">
                  {categories.map((category) => (
                    <div key={category.name} className="category-item">
                      <div className="category-info">
                        <span className="category-name">{category.name}</span>
                        <span className="category-count">
                          {category.visibleItems} / {category.totalItems} items visible
                        </span>
                      </div>
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={category.isVisible}
                          onChange={() => handleCategoryVisibilityToggle(category.name, category.isVisible)}
                        />
                        <span className="toggle-text">
                          {category.isVisible ? "Visible" : "Hidden"}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No categories found. Add menu items first.</p>
              )}
            </article>
          </section>

          <section className="section">
            <article className="card">
              <h3>Restaurant Delivery Location</h3>
              <p className="muted">
                Set the restaurant coordinates used for distance checks and delivery zone.
              </p>

              <form onSubmit={handleDeliveryConfigSave} className="settings-form">
                <div className="form-group">
                  <label htmlFor="restaurantLat">Latitude</label>
                  <input
                    id="restaurantLat"
                    type="number"
                    step="any"
                    value={restaurantLat}
                    onChange={(e) => setRestaurantLat(e.target.value)}
                    placeholder="e.g. 19.076"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="restaurantLng">Longitude</label>
                  <input
                    id="restaurantLng"
                    type="number"
                    step="any"
                    value={restaurantLng}
                    onChange={(e) => setRestaurantLng(e.target.value)}
                    placeholder="e.g. 72.8777"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="deliveryRadiusKm">Delivery Radius (km)</label>
                  <input
                    id="deliveryRadiusKm"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="100"
                    value={deliveryRadiusKm}
                    onChange={(e) => setDeliveryRadiusKm(e.target.value)}
                    placeholder="e.g. 5"
                    required
                  />
                </div>

                <button type="submit" className="btn" disabled={savingDeliveryConfig}>
                  {savingDeliveryConfig ? "Saving..." : "Save Delivery Location"}
                </button>
              </form>
            </article>
          </section>

          <section className="section">
            <article className="card">
              <h3>Notification Broadcasting</h3>
              <p className="muted">
                Send notifications to all users, customers, or drivers.
              </p>
              
              <form onSubmit={handleBroadcast} className="settings-form">
                <div className="form-group">
                  <label htmlFor="broadcastTitle">Title</label>
                  <input
                    type="text"
                    id="broadcastTitle"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="Enter notification title..."
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="broadcastMessage">Message</label>
                  <textarea
                    id="broadcastMessage"
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Enter notification message..."
                    rows={3}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="broadcastTarget">Send To</label>
                  <select
                    id="broadcastTarget"
                    value={broadcastTarget}
                    onChange={(e) => setBroadcastTarget(e.target.value)}
                  >
                    <option value="all">All Users (Customers and Drivers)</option>
                    <option value="customers">Customers Only</option>
                    <option value="drivers">Drivers Only</option>
                  </select>
                </div>
                
                <button type="submit" className="btn" disabled={broadcasting}>
                  {broadcasting ? "Sending..." : "Send Notification"}
                </button>
              </form>
            </article>
          </section>
        </>
      )}

      <style>{`
        .settings-form {
          margin-top: 1rem;
        }
        
        .form-group {
          margin-bottom: 1rem;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        
        .form-group textarea,
        .form-group input,
        .form-group select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: inherit;
        }
        
        .toggle-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }
        
        .toggle-label input[type="checkbox"] {
          width: 1.25rem;
          height: 1.25rem;
          cursor: pointer;
        }
        
        .toggle-text {
          font-weight: 500;
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        
        .category-list {
          margin-top: 1rem;
        }
        
        .category-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #eee;
        }
        
        .category-item:last-child {
          border-bottom: none;
        }
        
        .category-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .category-name {
          font-weight: 600;
        }
        
        .category-count {
          font-size: 0.875rem;
          color: #666;
        }
      `}</style>
    </main>
  );
}
