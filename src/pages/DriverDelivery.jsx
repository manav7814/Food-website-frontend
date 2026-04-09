import { useContext, useEffect, useState } from "react";
import API from "../api/client";
import OrderTimeline from "../components/OrderTimeline";
import AddressDisplay from "../components/AddressDisplay";
import OrderTrackingPanel from "../components/OrderTrackingPanel";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatINR } from "../utils/currency";
import { formatOrderStatus } from "../utils/orderStatus";

export default function DriverDelivery() {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const { addToast } = useToast();

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError("");
      // Get orders assigned to this driver
      const { data } = await API.get("/orders/driver/orders?status=out_for_delivery");
      setOrders(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleConfirmDelivery = async (orderId) => {
    if (!otpInput || otpInput.length < 4) {
      addToast("Please enter a valid OTP", "error");
      return;
    }

    setVerifying(true);
    try {
      await API.post("/drivers/deliver", {
        orderId: orderId,
        otp: otpInput
      });
      addToast("Order delivered successfully!", "success");
      setOtpInput("");
      setSelectedOrder(null);
      await loadOrders();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to confirm delivery", "error");
    } finally {
      setVerifying(false);
    }
  };

  if (!user) {
    return (
      <main className="container section page-gap">
        <p className="error">Please login to view your deliveries.</p>
      </main>
    );
  }

  return (
    <main className="container section page-gap">
      <h2>Delivery Confirmations</h2>
      <p className="muted">Enter the customer's OTP to confirm delivery</p>
      
      {error && <p className="error">{error}</p>}

      {loading ? (
        <div className="card-grid">
          {Array.from({ length: 3 }).map((_, index) => (
            <article key={index} className="card skeleton-card" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <h3>No deliveries pending</h3>
          <p>All orders have been delivered!</p>
        </div>
      ) : (
        <div className="card-grid">
          {orders.map((order) => (
            <article key={order._id} className="card order-card">
              <div className="order-head">
                <h3>Order #{order._id.slice(-6)}</h3>
                <span className={`status status-${order.status}`}>{formatOrderStatus(order.status)}</span>
              </div>
              
              <div className="customer-info">
                <p><strong>Customer:</strong> {order.user?.name}</p>
                <p><strong>Phone:</strong> {order.user?.phone}</p>
<p><strong>Address:</strong> <AddressDisplay address={order.address} /></p>
              </div>

              <div className="order-items-section">
                <h4>Order Items ({order.items?.length || 0})</h4>
                <div className="order-items-list">
                  {order.items && order.items.map((item, index) => (
                    <div key={index} className="order-item-detail">
                      <span className="order-item-name">{item.name}</span>
                      <span className="order-item-qty">x{item.quantity}</span>
                      <span className="order-item-price">{formatINR(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <OrderTrackingPanel order={order} />

              <p className="summary-row">
                <span>Total</span>
                <strong>{formatINR(order.totalPrice)}</strong>
              </p>

              {selectedOrder === order._id ? (
                <div className="otp-verification" style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
                  <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                    Enter Customer OTP:
                  </label>
                  <input
                    type="text"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 4-6 digit OTP"
                    style={{ 
                      width: '100%', 
                      padding: '10px', 
                      fontSize: '18px', 
                      textAlign: 'center',
                      letterSpacing: '5px',
                      marginBottom: '10px'
                    }}
                    maxLength={6}
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      className="btn" 
                      onClick={() => handleConfirmDelivery(order._id)}
                      disabled={verifying || otpInput.length < 4}
                    >
                      {verifying ? "Verifying..." : "Confirm Delivery"}
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => {
                        setSelectedOrder(null);
                        setOtpInput("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  className="btn" 
                  onClick={() => setSelectedOrder(order._id)}
                  style={{ marginTop: '15px', width: '100%' }}
                >
                  Confirm Delivery with OTP
                </button>
              )}
              
              <p className="muted small-text" style={{ marginTop: '10px' }}>
                {new Date(order.createdAt).toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
