import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import API from "../api/client";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastChecked, setLastChecked] = useState(new Date());

  // Fetch notifications based on user role
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      let endpoint = "";
      if (user.role === "driver") {
        endpoint = "/drivers/notifications";
      } else if (user.role === "customer") {
        endpoint = "/orders/notifications";
      } else {
        return;
      }

      const res = await API.get(endpoint);
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, [user]);

  // Poll for new notifications periodically
  useEffect(() => {
    if (!user) return;

    // Fetch immediately on mount
    fetchNotifications();

    // Poll every 10 seconds
    const interval = setInterval(fetchNotifications, 10000);

    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  // Check for new notifications and show toast
  useEffect(() => {
    if (!user || notifications.length === 0) return;

    // Find unread notifications that came in after lastChecked
    const newNotifications = notifications.filter(
      n => !n.isRead && new Date(n.createdAt) > lastChecked
    );

    // Show toast for each new notification
    newNotifications.forEach(notification => {
      const senderName = notification.senderName || (notification.sender === "driver" ? "Driver" : "Customer");
      addToast(`New message from ${senderName}: ${notification.message}`, "info");
    });

    if (newNotifications.length > 0) {
      setLastChecked(new Date());
    }
  }, [notifications, user, lastChecked, addToast]);

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user) return;

    try {
      let endpoint = "";
      if (user.role === "driver") {
        endpoint = "/drivers/notifications/read";
      } else if (user.role === "customer") {
        endpoint = "/orders/notifications/read";
      } else {
        return;
      }

      await API.put(endpoint);
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Failed to mark notifications as read:", err);
    }
  };

  // Mark specific notification as read
  const markAsRead = async (notificationId) => {
    if (!user) return;

    try {
      let endpoint = "";
      if (user.role === "driver") {
        endpoint = `/drivers/notifications/${notificationId}/read`;
      } else if (user.role === "customer") {
        endpoint = `/orders/notifications/${notificationId}/read`;
      } else {
        return;
      }

      await API.put(endpoint);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const value = {
    notifications,
    unreadCount,
    fetchNotifications,
    markAllAsRead,
    markAsRead
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
}
