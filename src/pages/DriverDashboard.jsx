import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/client";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AddressDisplay from "../components/AddressDisplay";
import { formatINR } from "../utils/currency";
import { OrdersIcon, MoneyIcon, StarIcon, TrendingUpIcon, ClipboardIcon, UserIcon, MessageIcon, CircleIcon } from "../components/Icons";

export default function DriverDashboard() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== "driver") {
      navigate("/driver/login");
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, ordersRes] = await Promise.all([
        API.get("/drivers/stats"),
        API.get("/orders/driver/orders?status=assigned,accepted,out_for_delivery")
      ]);
      setStats(statsRes.data);
      setOrders(ordersRes.data);
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (updatingStatus) return;
    setUpdatingStatus(true);
    try {
      await API.put("/drivers/status", { status: newStatus });
      addToast(`Status changed to ${newStatus}`, "success");
      loadData();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to update status", "error");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "available": return "success";
      case "busy": return "warning";
      case "offline": return "secondary";
      default: return "secondary";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "available": return <><CircleIcon size={12} color="#22c55e" /> Online</>;
      case "busy": return <><CircleIcon size={12} color="#ef4444" /> Busy</>;
      case "offline": return <><CircleIcon size={12} color="#6b7280" /> Offline</>;
      default: return <><CircleIcon size={12} color="#6b7280" /> Offline</>;
    }
  };

  if (loading) {
    return (
      <main className="container section page-gap">
        <div className="loading">Loading dashboard...</div>
      </main>
    );
  }

  return (
    <main className="container section page-gap">
      <div className="driver-dashboard">
        <div className="dashboard-header">
          <h1>Driver Dashboard</h1>
          
          {/* Status Selector */}
          <div className="status-selector">
            <span className="status-label">Your Status:</span>
            <div className="status-buttons">
              <button
                className={`btn ${stats?.status === "available" ? "btn-success" : "btn-outline"}`}
                onClick={() => handleStatusChange("available")}
                disabled={updatingStatus}
                title="Accept new deliveries"
              >
                <CircleIcon size={12} color="#22c55e" /> Online
              </button>
              <button
                className={`btn ${stats?.status === "busy" ? "btn-warning" : "btn-outline"}`}
                onClick={() => handleStatusChange("busy")}
                disabled={updatingStatus}
                title="Currently on a delivery"
              >
                <CircleIcon size={12} color="#ef4444" /> Busy
              </button>
              <button
                className={`btn ${stats?.status === "offline" ? "btn-secondary" : "btn-outline"}`}
                onClick={() => handleStatusChange("offline")}
                disabled={updatingStatus}
                title="Not accepting deliveries"
              >
                <CircleIcon size={12} color="#6b7280" /> Offline
              </button>
            </div>
          </div>
        </div>

        {/* Current Status Display */}
        <div className="current-status-display">
          <span className="current-status-label">Current Status:</span>
          <span className={`current-status-badge ${stats?.status}`}>
            {getStatusLabel(stats?.status)}
          </span>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon"><OrdersIcon size={32} /></div>
            <div className="stat-info">
              <h3>{stats?.todayDeliveries || 0}</h3>
              <p>Today's Deliveries</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><MoneyIcon size={32} /></div>
            <div className="stat-info">
              <h3>{formatINR(stats?.todayEarnings || 0)}</h3>
              <p>Today's Earnings</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><StarIcon size={32} /></div>
            <div className="stat-info">
              <h3>{stats?.rating?.toFixed(1) || "5.0"}</h3>
              <p>Rating</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><TrendingUpIcon size={32} /></div>
            <div className="stat-info">
              <h3>{stats?.completionRate || 0}%</h3>
              <p>Completion Rate</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="quick-stats">
          <div className="quick-stat">
            <span className="label">Wallet Balance:</span>
            <span className="value">{formatINR(stats?.walletBalance || 0)}</span>
          </div>
          <div className="quick-stat">
            <span className="label">Total Deliveries:</span>
            <span className="value">{stats?.totalDeliveries || 0}</span>
          </div>
          <div className="quick-stat">
            <span className="label">Avg Delivery Time:</span>
            <span className="value">{stats?.averageDeliveryTime || 0} min</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <Link to="/driver/orders" className="btn">
              <ClipboardIcon size={18} /> View All Orders
            </Link>
            <Link to="/driver/earnings" className="btn btn-secondary">
              <MoneyIcon size={18} /> Earnings
            </Link>
            <Link to="/driver/profile" className="btn btn-secondary">
              <UserIcon size={18} /> Profile
            </Link>
            <Link to="/driver/chat" className="btn btn-secondary">
              <MessageIcon size={18} /> Chat
            </Link>
          </div>
        </div>

        {/* Active Orders */}
        {orders.length > 0 && (
          <div className="active-orders">
            <h2>Active Deliveries ({orders.length})</h2>
            <div className="orders-list">
              {orders.slice(0, 3).map((order) => (
                <div key={order._id} className="order-item">
                  <div className="order-info">
                    <h4>Order #{order._id.slice(-6)}</h4>
<p>{order.user?.name} - <AddressDisplay address={order.address} /></p>
                    <span className={`status status-${order.status}`}>
                      {order.status.replace("_", " ")}
                    </span>
                  </div>
                  <Link to="/driver/orders" className="btn btn-sm">
                    View Details
                  </Link>
                </div>
              ))}
            </div>
            {orders.length > 3 && (
              <Link to="/driver/orders" className="view-all">
                View all {orders.length} orders →
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
