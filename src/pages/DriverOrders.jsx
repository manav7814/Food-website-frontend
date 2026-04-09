import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/client";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AddressDisplay from "../components/AddressDisplay";
import OrderTrackingPanel from "../components/OrderTrackingPanel";
import { formatINR } from "../utils/currency";
import { OrdersIcon, BicycleIcon, CheckIcon, MapPinIcon } from "../components/Icons";

export default function DriverOrders() {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [currentLocation, setCurrentLocation] = useState(null);
  const [driverId, setDriverId] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== "driver") {
      navigate("/driver/login");
      return;
    }
    loadOrders();
  }, [user, filter, refreshTick]);

  useEffect(() => {
    const intervalId = setInterval(() => setRefreshTick((prev) => prev + 1), 15000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const loadDriverProfile = async () => {
      try {
        const { data } = await API.get("/drivers/profile/me");
        if (data?._id) setDriverId(data._id);
      } catch {
        // Driver page already shows auth errors elsewhere.
      }
    };
    loadDriverProfile();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return undefined;
    const watcher = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  useEffect(() => {
    if (!driverId || !currentLocation) return undefined;

    const pushLocation = async () => {
      try {
        await API.post(`/drivers/${driverId}/location`, {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        });
      } catch {
        // Transient location failures should not block UI.
      }
    };

    pushLocation();
    const intervalId = setInterval(pushLocation, 4000);
    return () => clearInterval(intervalId);
  }, [currentLocation, driverId]);

  const nowTs = Date.now();

  const loadOrders = async () => {
    try {
      setLoading(true);
      let statusQuery = "";
      if (filter === "active") {
        statusQuery = "?status=assigned,accepted,picked,out_for_delivery";
      } else if (filter === "completed") {
        statusQuery = "?status=delivered";
      } else if (filter === "cancelled") {
        statusQuery = "?status=cancelled";
      }
      const { data } = await API.get(`/orders/driver/orders${statusQuery}`);
      setOrders(data || []);
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to load orders", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (orderId) => {
    try {
      await API.post(`/drivers/orders/${orderId}/accept`);
      addToast("Order accepted successfully", "success");
      loadOrders();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to accept order", "error");
    }
  };

  const handleReject = async (orderId) => {
    const reason = prompt("Please provide a reason for rejecting:");
    if (!reason) return;
    try {
      await API.post(`/drivers/orders/${orderId}/reject`, { reason });
      addToast("Order rejected and reassigned", "success");
      loadOrders();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to reject order", "error");
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await API.put(`/drivers/orders/${orderId}/status`, { status: newStatus });
      addToast(`Order status updated to ${newStatus}`, "success");
      loadOrders();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to update status", "error");
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "assigned":
        return "Assigned";
      case "accepted":
        return "Accepted";
      case "picked":
        return "Picked";
      case "out_for_delivery":
        return "On the Way";
      case "delivered":
        return "Delivered";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  const getNextStatus = (currentStatus) => {
    switch (currentStatus) {
      case "accepted":
        return "picked";
      case "picked":
        return "out_for_delivery";
      case "out_for_delivery":
        return "delivered";
      default:
        return null;
    }
  };

  const getRemainingSeconds = (order) => {
    if (order.status !== "assigned") return 0;
    if (!order.assignedExpiresAt) return 0;
    const expiresAt = new Date(order.assignedExpiresAt).getTime();
    const remaining = Math.floor((expiresAt - nowTs) / 1000);
    return remaining > 0 ? remaining : 0;
  };

  const directionsLinkByOrder = useMemo(() => {
    const map = {};
    orders.forEach((order) => {
      const destination = encodeURIComponent(order.address || "");
      if (!destination) return;
      if (currentLocation) {
        const origin = `${currentLocation.latitude},${currentLocation.longitude}`;
        map[order._id] = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
      } else {
        map[order._id] = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
      }
    });
    return map;
  }, [orders, currentLocation]);

  if (loading) {
    return (
      <main className="container section page-gap">
        <div className="loading">Loading orders...</div>
      </main>
    );
  }

  return (
    <main className="container section page-gap">
      <div className="driver-orders">
        <h1>My Deliveries</h1>

        <div className="filter-tabs">
          <button className={`tab ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
            All
          </button>
          <button className={`tab ${filter === "active" ? "active" : ""}`} onClick={() => setFilter("active")}>
            Active
          </button>
          <button className={`tab ${filter === "completed" ? "active" : ""}`} onClick={() => setFilter("completed")}>
            Completed
          </button>
          <button className={`tab ${filter === "cancelled" ? "active" : ""}`} onClick={() => setFilter("cancelled")}>
            Cancelled
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="empty-state">
            <h3>No orders found</h3>
            <p>You do not have any {filter !== "all" ? filter : ""} orders yet.</p>
            <Link to="/driver/dashboard" className="btn">
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => {
              const remainingSeconds = getRemainingSeconds(order);
              const expired = order.status === "assigned" && remainingSeconds <= 0;
              const nextStatus = getNextStatus(order.status);
              const mapUrl = directionsLinkByOrder[order._id];
              return (
                <div key={order._id} className="order-card">
                  <div className="order-header">
                    <div>
                      <h3>Order #{order._id.slice(-6)}</h3>
                      <span className={`status status-${order.status}`}>{getStatusLabel(order.status)}</span>
                    </div>
                    <div className="order-time">{new Date(order.createdAt).toLocaleString()}</div>
                  </div>

                  <div className="order-details">
                    <div className="detail-row">
                      <span className="label">Customer:</span>
                      <span className="value">{order.user?.name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Phone:</span>
                      <span className="value">{order.user?.phone || order.phone}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Address:</span>
                      <span className="value">
                        <AddressDisplay address={order.address} />
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Total:</span>
                      <span className="value">{formatINR(order.totalPrice)}</span>
                    </div>
                    {order.driverEarning > 0 && (
                      <div className="detail-row earnings">
                        <span className="label">Your Earning:</span>
                        <span className="value">{formatINR(order.driverEarning)}</span>
                      </div>
                    )}
                  </div>

                  <div className="order-items">
                    <h4>Items ({order.items?.length || 0})</h4>
                    {order.items?.map((item, index) => (
                      <div key={index} className="item">
                        <span>
                          {item.name} x{item.quantity}
                        </span>
                        <span>{formatINR(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  {order.status === "assigned" && (
                    <p className="driver-timer">
                      {expired
                        ? "Acceptance window expired"
                        : `Accept/Reject within ${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, "0")}`}
                    </p>
                  )}

                  {["assigned", "accepted", "picked", "out_for_delivery"].includes(order.status) && (
                    <OrderTrackingPanel order={order} />
                  )}

                  <div className="order-actions">
                    {order.status === "assigned" && (
                      <>
                        <button className="btn btn-success" onClick={() => handleAccept(order._id)} disabled={expired}>
                          <CheckIcon size={18} /> Accept
                        </button>
                        <button className="btn btn-danger" onClick={() => handleReject(order._id)} disabled={expired}>
                          Reject
                        </button>
                      </>
                    )}

                    {["accepted", "picked", "out_for_delivery"].includes(order.status) && nextStatus && (
                      <button className="btn" onClick={() => handleStatusUpdate(order._id, nextStatus)}>
                        {order.status === "accepted" ? (
                          <>
                            <OrdersIcon size={18} /> Mark as Picked
                          </>
                        ) : order.status === "picked" ? (
                          <>
                            <BicycleIcon size={18} /> Mark On the Way
                          </>
                        ) : (
                          <>
                            <CheckIcon size={18} /> Mark Delivered
                          </>
                        )}
                      </button>
                    )}

                    {order.status === "out_for_delivery" && (
                      <>
                        <Link to={`/driver/delivery?order=${order._id}`} className="btn btn-secondary">
                          <MapPinIcon size={18} /> Track Location
                        </Link>
                        {mapUrl && (
                          <a href={mapUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
                            Open Live Route
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
