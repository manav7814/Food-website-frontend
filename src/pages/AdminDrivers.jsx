import { useContext, useEffect, useState } from "react";
import API from "../api/client";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { CarIcon, ScooterIcon, VanIcon, BicycleIcon, CheckIcon, StarIcon } from "../components/Icons";

const defaultForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  vehicleType: "bike",
  vehicleNumber: "",
  licenseNumber: ""
};

export default function AdminDrivers() {
  const { user } = useContext(AuthContext);
  const [drivers, setDrivers] = useState([]);
  const [pendingDrivers, setPendingDrivers] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverPerformance, setDriverPerformance] = useState(null);
  const [driverDeliveries, setDriverDeliveries] = useState([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockAction, setBlockAction] = useState("");
  const { addToast } = useToast();

  const isAdmin = user?.role === "admin";

  const loadDrivers = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await API.get("/drivers");
      setDrivers(data);
      setPendingDrivers(data.filter(driver => !driver.isVerified));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load drivers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadDrivers();
    }
  }, [isAdmin]);

  // Load driver performance when selected
  useEffect(() => {
    if (selectedDriver && activeTab === "performance") {
      loadDriverPerformance(selectedDriver._id);
    }
  }, [selectedDriver, activeTab]);

  // Load driver deliveries when selected
  useEffect(() => {
    if (selectedDriver && activeTab === "deliveries") {
      loadDriverDeliveries(selectedDriver._id);
    }
  }, [selectedDriver, activeTab]);

  const loadDriverPerformance = async (driverId) => {
    try {
      setPerformanceLoading(true);
      const { data } = await API.get(`/drivers/${driverId}/performance`);
      setDriverPerformance(data);
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to load performance", "error");
    } finally {
      setPerformanceLoading(false);
    }
  };

  const loadDriverDeliveries = async (driverId, page = 1) => {
    try {
      setDeliveriesLoading(true);
      const { data } = await API.get(`/drivers/${driverId}/deliveries?page=${page}&limit=20`);
      setDriverDeliveries(data.orders || []);
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to load deliveries", "error");
    } finally {
      setDeliveriesLoading(false);
    }
  };

  const handleApprove = async (driverId) => {
    try {
      await API.put(`/drivers/${driverId}/verify`, { isVerified: true });
      addToast("Driver approved successfully!", "success");
      await loadDrivers();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to approve driver", "error");
    }
  };

  const handleReject = async (driverId) => {
    if (!confirm("Are you sure you want to reject this driver?")) return;
    try {
      await API.delete(`/drivers/${driverId}`);
      addToast("Driver rejected and removed.", "success");
      await loadDrivers();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to reject driver", "error");
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editId) {
        await API.put(`/drivers/${editId}`, form);
        addToast("Driver updated successfully.", "success");
      } else {
        await API.post("/drivers", form);
        addToast("Driver added successfully.", "success");
      }
      setEditId("");
      setForm(defaultForm);
      await loadDrivers();
    } catch (err) {
      setError(err.response?.data?.message || "Action failed");
      addToast(err.response?.data?.message || "Action failed", "error");
    }
  };

  const startEdit = (driver) => {
    setEditId(driver._id);
    setForm({
      name: driver.name || "",
      email: driver.email || "",
      phone: driver.phone || "",
      vehicleType: driver.vehicleType || "bike",
      vehicleNumber: driver.vehicleNumber || "",
      licenseNumber: driver.licenseNumber || ""
    });
  };

  const selectDriver = (driver) => {
    setSelectedDriver(driver);
  };

  const deleteDriver = async (id) => {
    if (!confirm("Are you sure you want to delete this driver?")) return;
    try {
      setError("");
      await API.delete(`/drivers/${id}`);
      addToast("Driver deleted successfully.", "success");
      setSelectedDriver(null);
      await loadDrivers();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
      addToast(err.response?.data?.message || "Delete failed", "error");
    }
  };

  const toggleStatus = async (driver) => {
    try {
      const newStatus = driver.status === "available" ? "offline" : "available";
      await API.put(`/drivers/${driver._id}`, { status: newStatus });
      addToast(`Driver status updated to ${newStatus}`, "success");
      await loadDrivers();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to update status", "error");
    }
  };

  // Handle block/suspend driver
  const handleBlockAction = async () => {
    if (!selectedDriver) return;
    try {
      const { data } = await API.put(`/drivers/${selectedDriver._id}/block`, { 
        action: blockAction, 
        reason: blockReason 
      });
      addToast(`Driver ${blockAction}ed successfully!`, "success");
      setShowBlockModal(false);
      setBlockReason("");
      await loadDrivers();
      // Update selected driver with the new status from API response
      setSelectedDriver({ ...selectedDriver, status: data.driver.status });
    } catch (err) {
      addToast(err.response?.data?.message || `Failed to ${blockAction} driver`, "error");
    }
  };

  // Handle KYC approval
  const handleKycApproval = async (status) => {
    if (!selectedDriver) return;
    const reason = status === "rejected" ? prompt("Enter rejection reason (optional):") : "";
    try {
      await API.put(`/drivers/${selectedDriver._id}/kyc`, { status, reason });
      addToast(`KYC ${status} successfully!`, "success");
      await loadDrivers();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to update KYC", "error");
    }
  };

  // Handle rating update
  const handleRatingUpdate = async (newRating) => {
    if (!selectedDriver) return;
    try {
      await API.put(`/drivers/${selectedDriver._id}/rating`, { rating: newRating });
      addToast("Rating updated successfully!", "success");
      await loadDrivers();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to update rating", "error");
    }
  };

  if (!isAdmin) {
    return <main className="container"><p>Access denied. Admin only.</p></main>;
  }

  const getVehicleIcon = (type) => {
    switch(type) {
      case 'bike': return <BicycleIcon size={32} />;
      case 'scooter': return <ScooterIcon size={32} />;
      case 'car': return <CarIcon size={32} />;
      case 'van': return <VanIcon size={32} />;
      default: return <BicycleIcon size={32} />;
    }
  };
  
  const getVehicleIconSmall = (type) => {
    switch(type) {
      case 'bike': return <BicycleIcon size={20} />;
      case 'scooter': return <ScooterIcon size={20} />;
      case 'car': return <CarIcon size={20} />;
      case 'van': return <VanIcon size={20} />;
      default: return <BicycleIcon size={20} />;
    }
  };

  const displayedDrivers = activeTab === "pending" ? pendingDrivers : drivers;

  // Filter drivers based on status for different tabs
  const blockedDrivers = drivers.filter(d => d.status === "blocked");
  const suspendedDrivers = drivers.filter(d => d.status === "suspended");

  return (
    <main className="container">
      <h1>Driver Management</h1>
      {error && <p className="error">{error}</p>}

      <div className="tabs">
        <button 
          className={`tab ${activeTab === "all" ? "active" : ""}`}
          onClick={() => { setActiveTab("all"); setSelectedDriver(null); }}
        >
          All Drivers ({drivers.length})
        </button>
        <button 
          className={`tab ${activeTab === "pending" ? "active" : ""}`}
          onClick={() => { setActiveTab("pending"); setSelectedDriver(null); }}
        >
          Pending Approval ({pendingDrivers.length})
        </button>
        <button 
          className={`tab ${activeTab === "blocked" ? "active" : ""}`}
          onClick={() => { setActiveTab("blocked"); setSelectedDriver(null); }}
        >
          Blocked ({blockedDrivers.length})
        </button>
        <button 
          className={`tab ${activeTab === "suspended" ? "active" : ""}`}
          onClick={() => { setActiveTab("suspended"); setSelectedDriver(null); }}
        >
          Suspended ({suspendedDrivers.length})
        </button>
      </div>

      {activeTab === "all" && (
        <section className="section">
          <h3>{editId ? "Edit Driver" : "Add New Driver"}</h3>
          <form className="form-inline" onSubmit={onSubmit}>
            <input
              type="text"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          <input
            type="tel"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required={!editId}
          />
          <select
              value={form.vehicleType}
              onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
            >
              <option value="bike">Bike</option>
              <option value="scooter">Scooter</option>
              <option value="car">Car</option>
              <option value="van">Van</option>
            </select>
            <input
              type="text"
              placeholder="Vehicle Number"
              value={form.vehicleNumber}
              onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="License Number"
              value={form.licenseNumber}
              onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
              required
            />
            <button className="btn" type="submit">
              {editId ? "Update" : "Add"} Driver
            </button>
            {editId && (
              <button 
                className="btn btn-secondary" 
                type="button"
                onClick={() => {
                  setEditId("");
                  setForm(defaultForm);
                }}
              >
                Cancel
              </button>
            )}
          </form>
        </section>
      )}

      <section className="section">
        <h3>
          {activeTab === "pending" ? "Pending Approvals" : 
           activeTab === "blocked" ? "Blocked Drivers" :
           activeTab === "suspended" ? "Suspended Drivers" : "All Drivers"}
        </h3>
        {loading && (
          <div className="card-grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <article key={index} className="card skeleton-card" />
            ))}
          </div>
        )}
        <div className="card-grid">
          {!loading && displayedDrivers.length === 0 && (
            <p className="muted">No drivers found.</p>
          )}
          {!loading &&
            displayedDrivers.map((driver) => (
              <article 
                key={driver._id} 
                className={`card ${selectedDriver?._id === driver._id ? "selected" : ""}`}
                onClick={() => selectDriver(driver)}
              >
                <div className="card-content">
                  <div className="driver-header">
                    <span className="driver-icon">{getVehicleIcon(driver.vehicleType)}</span>
                    <div>
                      <h4>{driver.name}</h4>
                      <p className="muted">{driver.phone}</p>
                    </div>
                  </div>
                  <p className="muted">{driver.email}</p>
                  <div className="driver-details">
                    <span className="tag">{driver.vehicleType}</span>
                    <span className="muted">{driver.vehicleNumber}</span>
                  </div>
                  <div className="driver-status">
                    {activeTab === "pending" ? (
                      <span className="status status-pending">Pending Approval</span>
                    ) : (
                      <span className={`status status-${driver.status === "available" ? "confirmed" : driver.status === "blocked" ? "cancelled" : driver.status === "suspended" ? "pending" : "pending"}`}>
                        {driver.status}
                      </span>
                    )}
                    <span className="muted">⭐ {driver.rating ? driver.rating.toFixed(1) : "5.0"} | {driver.totalDeliveries || 0} deliveries</span>
                    {driver.isVerified && <span className="tag tag-success">Verified</span>}
                    {!driver.isVerified && <span className="tag tag-warning">Pending</span>}
                  </div>
                  
                  {activeTab === "pending" && !driver.isVerified ? (
                    <div className="admin-actions">
                      <button 
                        className="btn" 
                        onClick={(e) => { e.stopPropagation(); handleApprove(driver._id); }}
                      >
                        Approve
                      </button>
                      <button 
                        className="btn btn-ghost" 
                        onClick={(e) => { e.stopPropagation(); handleReject(driver._id); }}
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <div className="admin-actions">
                      <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); startEdit(driver); }}>
                        Edit
                      </button>
                      {activeTab === "all" && (
                        <button 
                          className="btn btn-secondary" 
                          onClick={(e) => { e.stopPropagation(); toggleStatus(driver); }}
                        >
                          {driver.status === "available" ? "Set Offline" : "Set Available"}
                        </button>
                      )}
                      {activeTab === "all" && (
                        <>
                          <button 
                            className="btn btn-warning" 
                            onClick={(e) => { e.stopPropagation(); setSelectedDriver(driver); setBlockAction("block"); setShowBlockModal(true); }}
                          >
                            Block
                          </button>
                          <button 
                            className="btn btn-danger" 
                            onClick={(e) => { e.stopPropagation(); setSelectedDriver(driver); setBlockAction("suspend"); setShowBlockModal(true); }}
                          >
                            Suspend
                          </button>
                        </>
                      )}
                      {activeTab === "blocked" && (
                        <button 
                          className="btn btn-secondary" 
                          onClick={(e) => { e.stopPropagation(); setSelectedDriver(driver); setBlockAction("unblock"); setShowBlockModal(true); }}
                        >
                          Unblock
                        </button>
                      )}
                      {activeTab === "suspended" && (
                        <button 
                          className="btn btn-secondary" 
                          onClick={(e) => { e.stopPropagation(); setSelectedDriver(driver); setBlockAction("unsuspend"); setShowBlockModal(true); }}
                        >
                          Unsuspend
                        </button>
                      )}
                      <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); deleteDriver(driver._id); }}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
        </div>
      </section>

      {/* Driver Details Panel */}
      {selectedDriver && (
        <section className="section driver-details-panel">
          <div className="panel-header">
            <h3>Driver Details: {selectedDriver.name}</h3>
            <button className="btn btn-ghost" onClick={() => setSelectedDriver(null)}>✕ Close</button>
          </div>
          
          <div className="tabs sub-tabs">
            <button 
              className={`tab ${activeTab === "info" ? "active" : ""}`}
              onClick={() => setActiveTab("info")}
            >
              Info
            </button>
            <button 
              className={`tab ${activeTab === "performance" ? "active" : ""}`}
              onClick={() => setActiveTab("performance")}
            >
              Performance
            </button>
            <button 
              className={`tab ${activeTab === "deliveries" ? "active" : ""}`}
              onClick={() => setActiveTab("deliveries")}
            >
              Deliveries
            </button>
            <button 
              className={`tab ${activeTab === "kyc" ? "active" : ""}`}
              onClick={() => setActiveTab("kyc")}
            >
              KYC
            </button>
          </div>

          {activeTab === "info" && (
            <div className="driver-info">
              <div className="info-grid">
                <div className="info-item">
                  <label>Name:</label>
                  <span>{selectedDriver.name}</span>
                </div>
                <div className="info-item">
                  <label>Email:</label>
                  <span>{selectedDriver.email}</span>
                </div>
                <div className="info-item">
                  <label>Phone:</label>
                  <span>{selectedDriver.phone}</span>
                </div>
                <div className="info-item">
                  <label>Vehicle Type:</label>
                  <span>{getVehicleIconSmall(selectedDriver.vehicleType)} {selectedDriver.vehicleType}</span>
                </div>
                <div className="info-item">
                  <label>Vehicle Number:</label>
                  <span>{selectedDriver.vehicleNumber}</span>
                </div>
                <div className="info-item">
                  <label>License Number:</label>
                  <span>{selectedDriver.licenseNumber}</span>
                </div>
                <div className="info-item">
                  <label>Status:</label>
                  <span className={`status status-${selectedDriver.status === "available" ? "confirmed" : selectedDriver.status === "blocked" ? "cancelled" : "pending"}`}>
                    {selectedDriver.status}
                  </span>
                </div>
                <div className="info-item">
                  <label>Verified:</label>
                  <span>{selectedDriver.isVerified ? "✅ Yes" : "❌ No"}</span>
                </div>
                <div className="info-item">
                  <label>Rating:</label>
                  <div className="rating-display">
                    <StarIcon size={16} />
                    <span className="rating-value">{(selectedDriver.rating || 5).toFixed(1)}</span>
                    <select 
                      value={Math.round(selectedDriver.rating || 5)} 
                      onChange={(e) => handleRatingUpdate(Number(e.target.value))}
                      className="rating-select"
                    >
                      {[1,2,3,4,5].map(r => (
                        <option key={r} value={r}>{r} ★</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="info-item">
                  <label>Total Deliveries:</label>
                  <span>{selectedDriver.totalDeliveries || 0}</span>
                </div>
                <div className="info-item">
                  <label>Wallet Balance:</label>
                  <span>₹{selectedDriver.walletBalance?.toFixed(2) || "0.00"}</span>
                </div>
                <div className="info-item">
                  <label>Total Earnings:</label>
                  <span>₹{selectedDriver.totalEarnings?.toFixed(2) || "0.00"}</span>
                </div>
                <div className="info-item">
                  <label>Joined:</label>
                  <span>{new Date(selectedDriver.createdAt).toLocaleDateString()}</span>
                </div>
                {selectedDriver.status === "blocked" && (
                  <div className="info-item">
                    <label>Blocked:</label>
                    <span>{selectedDriver.blockedAt ? new Date(selectedDriver.blockedAt).toLocaleDateString() : "N/A"}</span>
                  </div>
                )}
                {selectedDriver.status === "suspended" && (
                  <div className="info-item">
                    <label>Suspended:</label>
                    <span>{selectedDriver.suspendedAt ? new Date(selectedDriver.suspendedAt).toLocaleDateString() : "N/A"}</span>
                  </div>
                )}
                {selectedDriver.suspensionReason && (
                  <div className="info-item full-width">
                    <label>Reason:</label>
                    <span>{selectedDriver.suspensionReason}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "performance" && (
            <div className="driver-performance">
              {performanceLoading ? (
                <p>Loading performance data...</p>
              ) : driverPerformance ? (
                <div className="performance-grid">
                  <div className="perf-card">
                    <h4>Rating</h4>
                    <p className="perf-value">⭐ {driverPerformance.rating?.toFixed(1) || "5.0"}</p>
                  </div>
                  <div className="perf-card">
                    <h4>Total Deliveries</h4>
                    <p className="perf-value">{driverPerformance.totalDeliveries || 0}</p>
                  </div>
                  <div className="perf-card">
                    <h4>Completed</h4>
                    <p className="perf-value">{driverPerformance.completedDeliveries || 0}</p>
                  </div>
                  <div className="perf-card">
                    <h4>Cancelled</h4>
                    <p className="perf-value">{driverPerformance.cancelledDeliveries || 0}</p>
                  </div>
                  <div className="perf-card">
                    <h4>Completion Rate</h4>
                    <p className="perf-value">{driverPerformance.completionRate || 0}%</p>
                  </div>
                  <div className="perf-card">
                    <h4>Cancellation Rate</h4>
                    <p className="perf-value">{driverPerformance.cancellationRate || 0}%</p>
                  </div>
                  <div className="perf-card">
                    <h4>Avg Delivery Time</h4>
                    <p className="perf-value">{driverPerformance.averageDeliveryTime || 0} min</p>
                  </div>
                  <div className="perf-card">
                    <h4>Month Deliveries</h4>
                    <p className="perf-value">{driverPerformance.monthDeliveries || 0}</p>
                  </div>
                  <div className="perf-card">
                    <h4>Month Earnings</h4>
                    <p className="perf-value">₹{driverPerformance.monthEarnings?.toFixed(2) || "0.00"}</p>
                  </div>
                  <div className="perf-card">
                    <h4>Total Earnings</h4>
                    <p className="perf-value">₹{driverPerformance.totalEarnings?.toFixed(2) || "0.00"}</p>
                  </div>
                  <div className="perf-card">
                    <h4>Bonuses</h4>
                    <p className="perf-value">₹{driverPerformance.bonuses?.toFixed(2) || "0.00"}</p>
                  </div>
                  <div className="perf-card">
                    <h4>Penalties</h4>
                    <p className="perf-value">₹{driverPerformance.penalties?.toFixed(2) || "0.00"}</p>
                  </div>
                </div>
              ) : (
                <p className="muted">No performance data available</p>
              )}
            </div>
          )}

          {activeTab === "deliveries" && (
            <div className="driver-deliveries">
              {deliveriesLoading ? (
                <p>Loading delivery history...</p>
              ) : driverDeliveries.length > 0 ? (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Status</th>
                        <th>Amount</th>
                        <th>Delivery Time</th>
                        <th>Earnings</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {driverDeliveries.map((order) => (
                        <tr key={order._id}>
                          <td>#{order.orderId}</td>
                          <td>{order.customerName}</td>
                          <td>
                            <span className={`status status-${order.status === "delivered" ? "confirmed" : "pending"}`}>
                              {order.status}
                            </span>
                          </td>
                          <td>₹{order.totalPrice?.toFixed(2)}</td>
                          <td>
                            {order.deliveryTimeMinutes ? (
                              <span className={order.deliveryTimeMinutes > 45 ? "text-danger" : ""}>
                                {order.deliveryTimeMinutes} min
                              </span>
                            ) : (
                              <span className="muted">N/A</span>
                            )}
                          </td>
                          <td>₹{order.driverEarning?.toFixed(2) || "0.00"}</td>
                          <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted">No delivery history available</p>
              )}
            </div>
          )}

          {activeTab === "kyc" && (
            <div className="driver-kyc">
              <div className="kyc-status">
                <h4>KYC Status</h4>
                <span className={`tag ${selectedDriver.kyc?.status === "approved" ? "tag-success" : selectedDriver.kyc?.status === "rejected" ? "tag-danger" : "tag-warning"}`}>
                  {selectedDriver.kyc?.status || "Not Submitted"}
                </span>
              </div>
              
              {selectedDriver.kyc ? (
                <>
                  <div className="kyc-documents">
                    <div className="kyc-doc">
                      <label>Aadhar Card:</label>
                      <span>{selectedDriver.kyc.aadharCard || "Not uploaded"}</span>
                    </div>
                    <div className="kyc-doc">
                      <label>PAN Card:</label>
                      <span>{selectedDriver.kyc.panCard || "Not uploaded"}</span>
                    </div>
                    <div className="kyc-doc">
                      <label>Photo:</label>
                      <span>{selectedDriver.kyc.photo || "Not uploaded"}</span>
                    </div>
                    <div className="kyc-doc">
                      <label>Uploaded:</label>
                      <span>{selectedDriver.kyc.uploadedAt ? new Date(selectedDriver.kyc.uploadedAt).toLocaleDateString() : "N/A"}</span>
                    </div>
                    {selectedDriver.kyc.verifiedAt && (
                      <div className="kyc-doc">
                        <label>Verified:</label>
                        <span>{new Date(selectedDriver.kyc.verifiedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedDriver.kyc.rejectedReason && (
                      <div className="kyc-doc full-width">
                        <label>Rejection Reason:</label>
                        <span className="text-danger">{selectedDriver.kyc.rejectedReason}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="kyc-actions">
                    {selectedDriver.kyc.status === "pending" && (
                      <>
                        <button className="btn" onClick={() => handleKycApproval("approved")}>
                          ✅ Approve KYC
                        </button>
                        <button className="btn btn-danger" onClick={() => handleKycApproval("rejected")}>
                          ❌ Reject KYC
                        </button>
                      </>
                    )}
                    {selectedDriver.kyc.status === "approved" && (
                      <button className="btn btn-warning" onClick={() => handleKycApproval("rejected")}>
                        Revoke KYC
                      </button>
                    )}
                    {selectedDriver.kyc.status === "rejected" && (
                      <button className="btn" onClick={() => handleKycApproval("approved")}>
                        Re-approve KYC
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <p className="muted">No KYC documents submitted by this driver</p>
              )}
            </div>
          )}
        </section>
      )}

      {/* Block/Suspend Modal */}
      {showBlockModal && (
        <div className="modal-overlay" onClick={() => setShowBlockModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{blockAction === "block" ? "Block Driver" : 
                    blockAction === "unblock" ? "Unblock Driver" :
                    blockAction === "suspend" ? "Suspend Driver" : "Unsuspend Driver"}</h3>
            <p>Are you sure you want to {blockAction} this driver?</p>
            {(blockAction === "block" || blockAction === "suspend") && (
              <textarea
                placeholder="Enter reason (optional)"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                rows="3"
              />
            )}
            <div className="modal-actions">
              <button className="btn" onClick={handleBlockAction}>
                Confirm
              </button>
              <button className="btn btn-secondary" onClick={() => setShowBlockModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

