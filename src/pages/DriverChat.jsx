import { useContext, useEffect, useState, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import API from "../api/client";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AddressDisplay from "../components/AddressDisplay";

export default function DriverChat() {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sosSending, setSosSending] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user || user.role !== "driver") {
      navigate("/driver/login");
      return;
    }
    loadOrders();
  }, [user]);

  useEffect(() => {
    const chatOrderId = searchParams.get("chatOrderId");
    if (chatOrderId && orders.length > 0) {
      const order = orders.find(o => o._id === chatOrderId);
      if (order) {
        selectOrder(order);
        window.history.replaceState({}, document.title, "/driver/chat");
      }
    }
  }, [orders, searchParams]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/drivers/my-orders");
      const allOrders = data.filter(order => 
        order.status !== "cancelled" && order.status !== "delivered"
      );
      setOrders(allOrders);
      if (allOrders.length > 0 && !selectedOrder) {
        selectOrder(allOrders[0]);
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
      addToast(err.response?.data?.message || "Failed to load orders", "error");
    } finally {
      setLoading(false);
    }
  };

  const selectOrder = async (order) => {
    setSelectedOrder(order);
    try {
      const { data } = await API.get(`/drivers/chat/${order._id}`);
      setMessages(data.chatMessages || []);
    } catch (err) {
      console.error("Failed to load chat:", err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedOrder) return;

    setSending(true);
    try {
      await API.post("/drivers/chat", {
        orderId: selectedOrder._id,
        message: newMessage,
        recipient: "customer"
      });
      setNewMessage("");
      selectOrder(selectedOrder);
      addToast("Message sent to customer!", "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to send message", "error");
    } finally {
      setSending(false);
    }
  };

  const handleReportIssue = async () => {
    if (!selectedOrder) {
      addToast("Please select an order first", "error");
      return;
    }
    
    const issueType = prompt("Issue type (e.g., Customer not responding, Address wrong, etc.):");
    if (!issueType || issueType.trim() === "") {
      addToast("Please provide an issue type", "error");
      return;
    }
    
    const description = prompt("Describe the issue:");
    if (!description || description.trim() === "") {
      addToast("Please provide a description", "error");
      return;
    }

    try {
      await API.post("/drivers/issues", {
        orderId: selectedOrder._id,
        issueType,
        description
      });
      addToast("Issue reported successfully", "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to report issue", "error");
    }
  };

  const handleSOS = async () => {
    const confirmSOS = confirm("⚠️ This will trigger an emergency alert. Are you sure?");
    if (!confirmSOS) return;

    setSosSending(true);
    try {
      const { data } = await API.post("/drivers/sos", {
        description: "Emergency triggered by driver"
      });
      addToast("SOS Alert sent! Emergency services will be notified.", "success");
      alert(`Emergency contact: 100\nLocation: ${JSON.stringify(data.sosRecord?.location)}`);
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to send SOS", "error");
    } finally {
      setSosSending(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      assigned: "#fbbf24",
      accepted: "#34d399",
      picked: "#60a5fa",
      out_for_delivery: "#a78bfa",
      delivered: "#10b981",
      pending: "#f59e0b",
      confirmed: "#3b82f6",
      cancelled: "#ef4444"
    };
    return colors[status] || "#94a3b8";
  };

  if (loading) {
    return (
      <main className="container section page-gap">
        <div className="loading">Loading chat...</div>
      </main>
    );
  }

  return (
    <main className="container section page-gap">
      <div className="chat-section">
        <div className="chat-header-section">
          <div>
            <h2>💬 Communication</h2>
            <p style={{ opacity: 0.9, fontSize: 14, marginTop: 4 }}>
              {orders.length} order{orders.length !== 1 ? 's' : ''} total
            </p>
          </div>
          <button 
            className="btn" 
            style={{ 
              background: 'rgba(255,255,255,0.2)', 
              border: '1px solid rgba(255,255,255,0.3)'
            }}
            onClick={handleSOS}
            disabled={sosSending}
          >
            {sosSending ? "Sending..." : "🚨 SOS"}
          </button>
        </div>

        <div className="chat-container-enhanced">
          <div className="chat-sidebar-enhanced">
            <div className="chat-sidebar-header">
              <h3>My Orders</h3>
            </div>
            <div className="orders-list-enhanced">
              {orders.length === 0 ? (
                <p className="muted" style={{ padding: 20, textAlign: 'center' }}>No orders</p>
              ) : (
                orders.map((order) => (
                  <div
                    key={order._id}
                    className={`order-item-enhanced ${selectedOrder?._id === order._id ? "active" : ""}`}
                    onClick={() => selectOrder(order)}
                  >
                    <div className="order-header">
                      <span className="order-id">#{order._id.slice(-6)}</span>
                      <span className="order-time">
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="customer-name">{order.user?.name || 'Customer'}</div>
                    <div className="order-preview">
                      {order.items?.length || 0} items • ₹{order.totalPrice}
                    </div>
                    <span 
                      className="status-badge" 
                      style={{ 
                        background: getStatusColor(order.status) + '20',
                        color: getStatusColor(order.status)
                      }}
                    >
                      {order.status?.replace('_', ' ')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="chat-area-enhanced">
            {selectedOrder ? (
              <>
                <div className="chat-order-header-enhanced">
                  <h3>Chat with Customer</h3>
                  <div className="order-details">
                    <div className="detail-item">
                      <span>👤</span>
                      <span>{selectedOrder.user?.name}</span>
                    </div>
                    <div className="detail-item">
                      <span>📱</span>
                      <span>{selectedOrder.user?.phone}</span>
                    </div>
                    <div className="detail-item">
                      <span>📍</span>
                      <span><AddressDisplay address={selectedOrder.address} maxLength={25} /></span>
                    </div>
                  </div>
                </div>

                <div className="messages-container-enhanced">
                  {messages.length === 0 ? (
                    <div className="no-messages-enhanced">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p>No messages yet. Start a conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`message-enhanced ${msg.sender === "driver" ? "sent" : "received"}`}
                      >
                        <div className="message-bubble">
                          <div className="message-sender">
                            <span className="message-avatar">
                              {(msg.senderName || msg.sender || '?').charAt(0).toUpperCase()}
                            </span>
                            {msg.senderName || msg.sender}
                          </div>
                          <p className="message-text">{msg.message}</p>
                          <span className="message-time">
                            {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="message-form-enhanced">
                  <input
                    type="text"
                    placeholder="Type a message to customer..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <button type="submit" className="btn" disabled={sending || !newMessage.trim()}>
                    {sending ? "..." : "Send"}
                  </button>
                </form>

                <div className="issue-buttons-enhanced">
                  <button className="btn btn-secondary" onClick={handleReportIssue}>
                    ⚠️ Report Issue
                  </button>
                </div>
              </>
            ) : (
              <div className="no-order-selected-enhanced">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p>Select an order to start chatting</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
