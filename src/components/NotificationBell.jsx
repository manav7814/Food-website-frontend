import { useNotification } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

export default function NotificationBell() {
  const { unreadCount, markAllAsRead, notifications } = useNotification();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleClick = (e) => {
    e.preventDefault();
    
    // Mark all as read
    if (unreadCount > 0) {
      markAllAsRead();
    }
    
    // If there's a recent notification with an orderId, navigate to that order's chat
    if (notifications.length > 0) {
      const latestNotification = notifications[0];
      if (latestNotification.orderId) {
        if (user?.role === "customer") {
          // Navigate to orders page with the order ID as query param to open chat
          navigate(`/orders?chatOrderId=${latestNotification.orderId}`);
          return;
        } else if (user?.role === "driver") {
          // Navigate to driver chat page with the order ID as query param to open chat
          navigate(`/driver/chat?chatOrderId=${latestNotification.orderId}`);
          return;
        }
      }
    }
    
    // Default navigation if no orderId in notification
    if (user?.role === "driver") {
      navigate("/driver/chat");
      return;
    }
    
    navigate("/orders");
  };

  return (
    <Link 
      to="#" 
      className="notification-bell"
      onClick={handleClick}
      style={{ position: "relative", marginRight: "15px", display: "inline-flex", alignItems: "center" }}
      title="Notifications"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="20" 
        height="20" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {unreadCount > 0 && (
        <span 
          className="notification-badge"
          style={{
            position: "absolute",
            top: "-5px",
            right: "-5px",
            backgroundColor: "#e74c3c",
            color: "white",
            borderRadius: "50%",
            padding: "2px 6px",
            fontSize: "10px",
            fontWeight: "bold",
            minWidth: "16px",
            textAlign: "center"
          }}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
