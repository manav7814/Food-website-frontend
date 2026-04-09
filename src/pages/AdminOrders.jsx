import { useContext, useEffect, useMemo, useState } from "react";
import API from "../api/client";
import OrderTimeline from "../components/OrderTimeline";
import AddressDisplay from "../components/AddressDisplay";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatINR } from "../utils/currency";
import { ORDER_STEPS, formatOrderStatus, PRIORITY_LEVELS, formatPriority } from "../utils/orderStatus";

export default function AdminOrders() {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTimeSlot, setScheduledTimeSlot] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("medium");
  const { addToast } = useToast();

  const isAdmin = user?.role === "admin";
  const pageSize = 6;

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await API.get("/orders/admin/all");
      setOrders(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const loadDrivers = async () => {
    try {
      const { data } = await API.get("/orders/available-drivers");
      setDrivers(data);
    } catch (err) {
      console.error("Failed to load drivers", err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadOrders();
      loadDrivers();
    }
  }, [isAdmin]);

  const filteredOrders = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    let byStatus = filter === "all" ? orders : orders.filter((order) => order.status === filter);
    byStatus = priorityFilter === "all" ? byStatus : byStatus.filter((order) => order.priority === priorityFilter);
    return byStatus.filter((order) => {
      if (!normalized) return true;
      return (
        order._id.toLowerCase().includes(normalized) ||
        order.user?.name?.toLowerCase().includes(normalized) ||
        order.user?.email?.toLowerCase().includes(normalized)
      );
    });
  }, [orders, filter, search, priorityFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

  const updateStatus = async (orderId, status) => {
    try {
      setError("");
      await API.patch(`/orders/${orderId}/status`, { status });
      addToast(`Order updated to ${formatOrderStatus(status)}.`, "success");
      await loadOrders();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update order status");
      addToast(err.response?.data?.message || "Failed to update order status", "error");
    }
  };

  const openDriverModal = (order) => {
    setSelectedOrder(order);
    setSelectedDriver(order.driver?._id || "");
    setEstimatedTime(order.estimatedDeliveryTime || "30-40 min");
    setShowDriverModal(true);
  };

  const openScheduleModal = (order) => {
    setSelectedOrder(order);
    setScheduledDate(order.scheduledDelivery?.scheduledDate ? new Date(order.scheduledDelivery.scheduledDate).toISOString().split('T')[0] : "");
    setScheduledTimeSlot(order.scheduledDelivery?.scheduledTimeSlot || "");
    setShowScheduleModal(true);
  };

  const openRefundModal = (order) => {
    setSelectedOrder(order);
    setRefundAmount(order.totalPrice.toString());
    setRefundReason("");
    setShowRefundModal(true);
  };

  const openPriorityModal = (order) => {
    setSelectedOrder(order);
    setSelectedPriority(order.priority || "medium");
    setShowPriorityModal(true);
  };

  const assignDriver = async () => {
    if (!selectedDriver || !selectedOrder) return;
    
    try {
      setError("");
      await API.patch(`/orders/${selectedOrder._id}/assign-driver`, {
        driverId: selectedDriver,
        estimatedDeliveryTime: estimatedTime
      });
      addToast("Driver assigned successfully!", "success");
      setShowDriverModal(false);
      await loadOrders();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to assign driver");
      addToast(err.response?.data?.message || "Failed to assign driver", "error");
    }
  };

  const autoAssignDriver = async (orderId) => {
    try {
      setError("");
      const { data } = await API.post(`/orders/${orderId}/auto-assign-driver`, {
        estimatedDeliveryTime: "30-40 min"
      });
      addToast(data.message, "success");
      await loadOrders();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to auto-assign driver");
      addToast(err.response?.data?.message || "Failed to auto-assign driver", "error");
    }
  };

  const scheduleDelivery = async () => {
    if (!selectedOrder || !scheduledDate || !scheduledTimeSlot) return;
    
    try {
      setError("");
      await API.patch(`/orders/${selectedOrder._id}/schedule`, {
        scheduledDate,
        scheduledTimeSlot
      });
      addToast("Delivery scheduled successfully!", "success");
      setShowScheduleModal(false);
      await loadOrders();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to schedule delivery");
      addToast(err.response?.data?.message || "Failed to schedule delivery", "error");
    }
  };

  const cancelSchedule = async (orderId) => {
    try {
      await API.patch(`/orders/${orderId}/cancel-schedule`);
      addToast("Schedule cancelled!", "success");
      await loadOrders();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to cancel schedule", "error");
    }
  };

  const processRefund = async () => {
    if (!selectedOrder || !refundAmount || !refundReason) return;
    
    try {
      setError("");
      await API.post(`/orders/${selectedOrder._id}/refund`, {
        refundAmount: parseFloat(refundAmount),
        refundReason
      });
      addToast("Refund processed successfully!", "success");
      setShowRefundModal(false);
      await loadOrders();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to process refund");
      addToast(err.response?.data?.message || "Failed to process refund", "error");
    }
  };

  const updatePriority = async () => {
    if (!selectedOrder) return;
    
    try {
      setError("");
      await API.patch(`/orders/${selectedOrder._id}/priority`, {
        priority: selectedPriority
      });
      addToast("Priority updated successfully!", "success");
      setShowPriorityModal(false);
      await loadOrders();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update priority");
      addToast(err.response?.data?.message || "Failed to update priority", "error");
    }
  };

  const updateDeliveryTime = async (orderId) => {
    try {
      await API.patch(`/orders/${orderId}/delivery-time`, {
        estimatedDeliveryTime: estimatedTime
      });
      addToast("Delivery time updated!", "success");
      await loadOrders();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to update time", "error");
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case "urgent": return "priority-urgent";
      case "high": return "priority-high";
      case "medium": return "priority-medium";
      case "low": return "priority-low";
      default: return "priority-medium";
    }
  };

  if (!user) {
    return (
      <main className="container section page-gap">
        <p className="error">Please login as admin to manage all orders.</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="container section page-gap">
        <p className="error">Only admin can view all orders.</p>
      </main>
    );
  }

  return (
    <main className="container page-gap">
      {/* Driver Assignment Modal */}
      {showDriverModal && (
        <div className="modal-overlay" onClick={() => setShowDriverModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Assign Driver to Order</h3>
            {error && <p className="error">{error}</p>}
            
            <div className="form-group">
              <label>Select Driver</label>
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                required
              >
                <option value="">Select a driver</option>
                {drivers.map((driver) => (
                  <option key={driver._id} value={driver._id}>
                    {driver.name} - {driver.vehicleType} ({driver.phone})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Estimated Delivery Time</label>
              <input
                type="text"
                placeholder="e.g., 30-40 min"
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button className="btn" onClick={assignDriver} disabled={!selectedDriver}>
                Assign Driver
              </button>
              <button className="btn btn-secondary" onClick={() => setShowDriverModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Delivery Modal */}
      {showScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Schedule Delivery</h3>
            {error && <p className="error">{error}</p>}
            
            <div className="form-group">
              <label>Scheduled Date</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Time Slot</label>
              <select
                value={scheduledTimeSlot}
                onChange={(e) => setScheduledTimeSlot(e.target.value)}
                required
              >
                <option value="">Select time slot</option>
                <option value="08:00 AM - 10:00 AM">08:00 AM - 10:00 AM</option>
                <option value="10:00 AM - 12:00 PM">10:00 AM - 12:00 PM</option>
                <option value="12:00 PM - 02:00 PM">12:00 PM - 02:00 PM</option>
                <option value="02:00 PM - 04:00 PM">02:00 PM - 04:00 PM</option>
                <option value="04:00 PM - 06:00 PM">04:00 PM - 06:00 PM</option>
                <option value="06:00 PM - 08:00 PM">06:00 PM - 08:00 PM</option>
                <option value="08:00 PM - 10:00 PM">08:00 PM - 10:00 PM</option>
              </select>
            </div>

            <div className="modal-actions">
              <button className="btn" onClick={scheduleDelivery} disabled={!scheduledDate || !scheduledTimeSlot}>
                Schedule
              </button>
              <button className="btn btn-secondary" onClick={() => setShowScheduleModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="modal-overlay" onClick={() => setShowRefundModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Process Refund</h3>
            {error && <p className="error">{error}</p>}
            
            <div className="form-group">
              <label>Order Total</label>
              <p className="muted">{formatINR(selectedOrder?.totalPrice || 0)}</p>
            </div>

            <div className="form-group">
              <label>Refund Amount</label>
              <input
                type="number"
                placeholder="Enter refund amount"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                min="0"
                max={selectedOrder?.totalPrice}
                required
              />
            </div>

            <div className="form-group">
              <label>Refund Reason</label>
              <select
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                required
              >
                <option value="">Select reason</option>
                <option value="Customer requested cancellation">Customer requested cancellation</option>
                <option value="Item not available">Item not available</option>
                <option value="Delivery delay">Delivery delay</option>
                <option value="Quality issues">Quality issues</option>
                <option value="Duplicate payment">Duplicate payment</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="modal-actions">
              <button className="btn" onClick={processRefund} disabled={!refundAmount || !refundReason}>
                Process Refund
              </button>
              <button className="btn btn-secondary" onClick={() => setShowRefundModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Priority Modal */}
      {showPriorityModal && (
        <div className="modal-overlay" onClick={() => setShowPriorityModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Set Order Priority</h3>
            {error && <p className="error">{error}</p>}
            
            <div className="form-group">
              <label>Priority Level</label>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                required
              >
                {PRIORITY_LEVELS.map((priority) => (
                  <option key={priority} value={priority}>
                    {formatPriority(priority)}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-actions">
              <button className="btn" onClick={updatePriority}>
                Update Priority
              </button>
              <button className="btn btn-secondary" onClick={() => setShowPriorityModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="section">
        <h2>Admin Orders</h2>
        {error && <p className="error">{error}</p>}
        <div className="menu-toolbar">
          <input
            type="text"
            value={search}
            placeholder="Search by order id, customer, email"
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Status</option>
            {ORDER_STEPS.map((status) => (
              <option key={status} value={status}>
                {formatOrderStatus(status)}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Priority</option>
            {PRIORITY_LEVELS.map((priority) => (
              <option key={priority} value={priority}>
                {formatPriority(priority)}
              </option>
            ))}
          </select>
        </div>
        <div className="chip-list">
          <button
            className={`chip ${filter === "all" ? "chip-active" : ""}`}
            onClick={() => {
              setFilter("all");
              setPage(1);
            }}
          >
            All
          </button>
          {ORDER_STEPS.map((status) => (
            <button
              key={status}
              className={`chip ${filter === status ? "chip-active" : ""}`}
              onClick={() => {
                setFilter(status);
                setPage(1);
              }}
            >
              {formatOrderStatus(status)}
            </button>
          ))}
        </div>
      </section>

      <section className="card-grid">
        {loading &&
          Array.from({ length: 4 }).map((_, index) => <article key={index} className="card skeleton-card" />)}
        {!loading &&
          paginatedOrders.map((order) => (
          <article key={order._id} className="card order-card">
            <div className="order-head">
              <h3>Order #{order._id.slice(-6)}</h3>
              <div className="order-badges">
                <span className={`priority-badge ${getPriorityClass(order.priority)}`}>
                  {formatPriority(order.priority || "medium")}
                </span>
                <span className={`status status-${order.status}`}>{formatOrderStatus(order.status)}</span>
              </div>
            </div>
            <p className="muted"><span className="cell-content">Customer: {order.user?.name || "N/A"}</span></p>
            <p className="muted"><span className="cell-content">Email: {order.user?.email || "N/A"}</span></p>
            <p className="muted">Phone: {order.user?.phone || "N/A"}</p>
            <p className="muted"><span className="cell-content break-word">Address: <AddressDisplay address={order.address} /></span></p>

            {/* Payment Status */}
            <div className="payment-section">
              <h4>Payment</h4>
              <div className="payment-details">
                <span className={`payment-status payment-${order.paymentStatus}`}>
                  {order.paymentStatus?.toUpperCase() || "PENDING"}
                </span>
                <span className="muted">{formatINR(order.totalPrice)}</span>
              </div>
              {order.paymentStatus === "refunded" && order.refundAmount > 0 && (
                <p className="muted small-text">Refunded: {formatINR(order.refundAmount)}</p>
              )}
            </div>
            
            {/* Order Cart Items Details */}
            <div className="order-items-section">
              <h4>Order Items ({order.items?.length || 0})</h4>
              <div className="order-items-list">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item, index) => (
                    <div key={index} className="order-item-detail">
                      <span className="order-item-name">{item.name || item.menuItem?.name}</span>
                      <span className="order-item-qty">x{item.quantity} {item.unit || 'pieces'}</span>
                      <span className="order-item-price">{formatINR(item.price * item.quantity)}</span>
                    </div>
                  ))
                ) : (
                  <p className="muted">No items in order</p>
                )}
              </div>
            </div>
            
            {/* Scheduled Delivery */}
            {order.scheduledDelivery?.isScheduled && (
              <div className="schedule-section">
                <h4>Scheduled Delivery</h4>
                <p>
                  <strong>Date:</strong> {new Date(order.scheduledDelivery.scheduledDate).toLocaleDateString()}
                </p>
                <p>
                  <strong>Time:</strong> {order.scheduledDelivery.scheduledTimeSlot}
                </p>
                <button 
                  className="btn btn-secondary btn-small" 
                  onClick={() => cancelSchedule(order._id)}
                >
                  Cancel Schedule
                </button>
              </div>
            )}
            
            {/* Driver Assignment */}
            <div className="driver-section">
              <h4>Delivery Driver</h4>
              {order.driver ? (
                <div className="driver-info">
                  <p><strong>Driver:</strong> <span className="cell-content">{order.driverName || order.driver?.name}</span></p>
                  <p><strong>Phone:</strong> {order.driverPhone || order.driver?.phone}</p>
                  <p><strong>Vehicle:</strong> {order.driver?.vehicleType || "N/A"}</p>
                  {order.estimatedDeliveryTime && (
                    <p><strong>ETA:</strong> {order.estimatedDeliveryTime}</p>
                  )}
                  {order.deliveryOtp && (
                    <p><strong>OTP:</strong> {order.deliveryOtp}</p>
                  )}
                </div>
              ) : (
                <p className="muted">No driver assigned</p>
              )}
              <div className="driver-buttons">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => openDriverModal(order)}
                >
                  {order.driver ? "Change Driver" : "Assign Driver"}
                </button>
                {!order.driver && (
                  <button 
                    className="btn" 
                    onClick={() => autoAssignDriver(order._id)}
                    title="Auto-assign nearest driver"
                  >
                    Auto-Assign
                  </button>
                )}
              </div>
            </div>
            
            <OrderTimeline status={order.status} />
            <p className="summary-row">
              <span>Total</span>
              <strong>{formatINR(order.totalPrice)}</strong>
            </p>
            <p className="muted small-text">{new Date(order.createdAt).toLocaleString()}</p>
            
            {/* Action Buttons */}
            <div className="admin-order-actions">
              <div className="action-group">
                <span className="action-label">Status</span>
                <div className="status-actions">
                  <button className="btn btn-secondary btn-small" onClick={() => updateStatus(order._id, "pending")}>
                    Pending
                  </button>
                  <button className="btn btn-secondary btn-small" onClick={() => updateStatus(order._id, "confirmed")}>
                    Confirmed
                  </button>
                  <button className="btn btn-secondary btn-small" onClick={() => updateStatus(order._id, "out_for_delivery")}>
                    Out
                  </button>
                  <button className="btn btn-small" onClick={() => updateStatus(order._id, "delivered")}>
                    Done
                  </button>
                </div>
              </div>
              
              <div className="action-group">
                <span className="action-label">Quick Actions</span>
                <div className="quick-actions">
                  <button 
                    className="btn btn-secondary btn-small" 
                    onClick={() => openPriorityModal(order)}
                    title="Set priority"
                  >
                    Priority
                  </button>
                  <button 
                    className="btn btn-secondary btn-small" 
                    onClick={() => openScheduleModal(order)}
                    title="Schedule delivery"
                  >
                    Schedule
                  </button>
                  {order.paymentStatus !== "refunded" && (
                    <button 
                      className="btn btn-secondary btn-small refund-btn" 
                      onClick={() => openRefundModal(order)}
                      title="Process refund"
                    >
                      Refund
                    </button>
                  )}
                </div>
              </div>
            </div>
          </article>
          ))}
      </section>
      <section className="pagination-bar">
        <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>
          Prev
        </button>
        <p className="muted">
          Page {page} / {totalPages}
        </p>
        <button
          className="btn btn-secondary"
          disabled={page >= totalPages}
          onClick={() => setPage((prev) => prev + 1)}
        >
          Next
        </button>
      </section>
    </main>
  );
}
