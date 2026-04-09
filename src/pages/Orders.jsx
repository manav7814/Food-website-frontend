import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../api/client";
import OrderTimeline from "../components/OrderTimeline";
import AddressDisplay from "../components/AddressDisplay";
import OrderTrackingPanel from "../components/OrderTrackingPanel";
import { formatINR } from "../utils/currency";
import { formatOrderStatus } from "../utils/orderStatus";

const CANCELLABLE_STATUSES = ["pending", "confirmed", "assigned"];
const TRACKABLE_STATUSES = ["confirmed", "assigned", "accepted", "picked", "out_for_delivery"];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatOrder, setChatOrder] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [reviewByOrder, setReviewByOrder] = useState({});
  const [reviewLoadingOrderId, setReviewLoadingOrderId] = useState("");
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/orders/my");
      setOrders(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const chatOrderId = searchParams.get("chatOrderId");
    if (!chatOrderId || orders.length === 0) return;
    const order = orders.find((item) => item._id === chatOrderId);
    if (order && order.driver) {
      openChat(order);
      window.history.replaceState({}, document.title, "/orders");
    }
  }, [orders, searchParams]);

  // Chat available when driver is assigned (not just out_for_delivery)
  const ordersWithDriver = orders.filter((order) => 
    order.driver && ["assigned", "accepted", "picked", "picked_up", "out_for_delivery"].includes(order.status)
  );

  const openChat = async (order) => {
    if (!order.driver) {
      alert("No driver assigned to this order yet");
      return;
    }
    setChatOrder(order);
    setChatLoading(true);
    try {
      const res = await API.get(`/orders/${order._id}/chat`);
      setMessages(res.data.chatMessages || []);
    } catch (_err) {
      setMessages([]);
    } finally {
      setChatLoading(false);
    }
  };

  const closeChat = () => {
    setChatOrder(null);
    setMessages([]);
    setNewMessage("");
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!newMessage.trim() || !chatOrder) return;
    setSending(true);
    try {
      const res = await API.post(`/orders/${chatOrder._id}/chat`, { message: newMessage.trim() });
      setMessages(res.data.chatMessages || []);
      setNewMessage("");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    const reason = prompt("Reason for cancellation (optional):") || "";
    try {
      await API.patch(`/orders/${orderId}/cancel`, { reason });
      await loadOrders();
      alert("Order cancelled successfully");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel order");
    }
  };

  const handleReviewChange = (orderId, key, value) => {
    setReviewByOrder((prev) => ({
      ...prev,
      [orderId]: {
        rating: prev[orderId]?.rating || 5,
        comment: prev[orderId]?.comment || "",
        [key]: value
      }
    }));
  };

  const submitReview = async (orderId) => {
    const review = reviewByOrder[orderId] || { rating: 5, comment: "" };
    setReviewLoadingOrderId(orderId);
    try {
      await API.post(`/orders/${orderId}/review`, {
        rating: Number(review.rating || 5),
        comment: review.comment || ""
      });
      await loadOrders();
      alert("Review submitted");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit review");
    } finally {
      setReviewLoadingOrderId("");
    }
  };

  return (
    <main className="container section page-gap">
      <h2>My Orders</h2>
      {error && <p className="error">{error}</p>}
      {loading && (
        <div className="card-grid">
          {Array.from({ length: 3 }).map((_, index) => (
            <article key={index} className="card skeleton-card" />
          ))}
        </div>
      )}

      {!loading && orders.length === 0 ? (
        <div className="empty-state">
          <h3>No orders yet</h3>
          <p>Your placed orders will appear here with status updates.</p>
        </div>
      ) : (
        <div className="card-grid">
          {orders.map((order) => {
            const draftReview = reviewByOrder[order._id] || { rating: 5, comment: "" };
            return (
              <article key={order._id} className="card order-card">
                <div className="order-head">
                  <h3>Order #{order._id.slice(-6)}</h3>
                  <span className={`status status-${order.status}`}>{formatOrderStatus(order.status)}</span>
                </div>

                <p className="muted">
                  Address: <AddressDisplay address={order.address} />
                </p>

                {order.deliveryOtp && (
                  <div className="otp-section">
                    <p style={{ margin: 0, fontWeight: "bold" }}>Delivery OTP: {order.deliveryOtp}</p>
                    <p className="muted small-text" style={{ margin: "5px 0 0 0" }}>
                      Share this OTP with the delivery driver
                    </p>
                  </div>
                )}

                {order.driver && (
                  <div className="driver-info">
                    <p className="muted">
                      <strong>Driver:</strong> {order.driverName || order.driver?.name}
                    </p>
                    <p className="muted">
                      <strong>Phone:</strong> {order.driverPhone || order.driver?.phone}
                    </p>
                    {order.estimatedDeliveryTime && (
                      <p className="muted">
                        <strong>ETA:</strong> {order.estimatedDeliveryTime}
                      </p>
                    )}
                  </div>
                )}

                {ordersWithDriver.some((item) => item._id === order._id) && (
                  <button className="btn btn-secondary" style={{ width: "100%" }} onClick={() => openChat(order)}>
                    Chat with Driver
                  </button>
                )}

                {TRACKABLE_STATUSES.includes(order.status) && (
                  <OrderTrackingPanel order={order} />
                )}

                {CANCELLABLE_STATUSES.includes(order.status) && (
                  <button className="btn btn-secondary" onClick={() => handleCancelOrder(order._id)}>
                    Cancel Order
                  </button>
                )}

                {order.status === "delivered" && !order.customerReview?.rating && (
                  <div className="payment-section">
                    <h4>Rate your order</h4>
                    <select
                      value={draftReview.rating}
                      onChange={(event) => handleReviewChange(order._id, "rating", event.target.value)}
                    >
                      <option value={5}>5 - Excellent</option>
                      <option value={4}>4 - Good</option>
                      <option value={3}>3 - Average</option>
                      <option value={2}>2 - Poor</option>
                      <option value={1}>1 - Bad</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Write a short review (optional)"
                      value={draftReview.comment}
                      onChange={(event) => handleReviewChange(order._id, "comment", event.target.value)}
                      maxLength={500}
                    />
                    <button
                      className="btn"
                      onClick={() => submitReview(order._id)}
                      disabled={reviewLoadingOrderId === order._id}
                    >
                      {reviewLoadingOrderId === order._id ? "Submitting..." : "Submit Review"}
                    </button>
                  </div>
                )}

                {order.status === "delivered" && order.customerReview?.rating && (
                  <div className="payment-section">
                    <h4>Your review</h4>
                    <p className="muted">Rating: {order.customerReview.rating}/5</p>
                    {order.customerReview.comment ? (
                      <p className="muted">{order.customerReview.comment}</p>
                    ) : (
                      <p className="muted">No comment added.</p>
                    )}
                  </div>
                )}

                <OrderTimeline status={order.status} />
                <p className="summary-row">
                  <span>Total</span>
                  <strong>{formatINR(order.totalPrice)}</strong>
                </p>
                <p className="muted small-text">{new Date(order.createdAt).toLocaleString()}</p>
              </article>
            );
          })}
        </div>
      )}

      {chatOrder && (
        <div className="modal-overlay" onClick={closeChat}>
          <div className="chat-modal-enhanced" onClick={(event) => event.stopPropagation()}>
            <div className="chat-modal-header">
              <div>
                <h3>Chat with Driver</h3>
                <p style={{ opacity: 0.9, fontSize: 13, marginTop: 2 }}>
                  Order #{chatOrder._id.slice(-6)} | {chatOrder.driverName || chatOrder.driver?.name}
                </p>
              </div>
              <button className="close-btn" onClick={closeChat}>
                x
              </button>
            </div>

            <div className="chat-modal-messages">
              {chatLoading ? (
                <p style={{ textAlign: "center", color: "var(--muted)" }}>Loading messages...</p>
              ) : messages.length === 0 ? (
                <p style={{ textAlign: "center", color: "var(--muted)", padding: 20 }}>
                  No messages yet. Start a conversation.
                </p>
              ) : (
                messages.map((msg, index) => (
                  <div key={index} className={`message-enhanced ${msg.sender === "customer" ? "sent" : "received"}`}>
                    <div className="message-bubble">
                      <div className="message-sender">{msg.senderName || msg.sender}</div>
                      <p className="message-text">{msg.message}</p>
                      <span className="message-time">
                        {new Date(msg.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="chat-modal-form">
              <input
                type="text"
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
                placeholder="Type a message..."
              />
              <button type="submit" className="btn" disabled={sending || !newMessage.trim()}>
                {sending ? "..." : "Send"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
