import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../api/client";
import useOrderTrackingSocket from "../hooks/useOrderTrackingSocket";
import LiveOrderTrackingMap from "./LiveOrderTrackingMap";
import { normalizeOrderStatus } from "../utils/orderStatus";

const steps = ["confirmed", "driver_assigned", "picked_up", "out_for_delivery", "delivered"];

const statusToProgress = (status) => {
  // Handle pending status separately - show 10% to indicate order received
  if (status === "pending") return 10;
  const normalized = normalizeOrderStatus(status);
  const index = steps.indexOf(normalized);
  if (index < 0) return 0;
  // Ensure minimum progress of 20% for confirmed orders
  const progress = Math.round((index / (steps.length - 1)) * 100);
  return Math.max(progress, 20);
};

const parsePoint = (point) => {
  if (!point) return null;
  const lat = Number(point.lat ?? point.latitude);
  const lng = Number(point.lng ?? point.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

export default function OrderTrackingPanel({ order }) {
  const [trackingData, setTrackingData] = useState({
    status: order.status,
    restaurantLocation: parsePoint(order.restaurantLocation),
    userLocation: parsePoint(order.userLocation || order.deliveryLocation),
    driverLocation: parsePoint(order.driverLocation),
    // New fields from backend
    routeDistanceKm: null, // restaurant to user
    pickupDistanceKm: null, // driver to restaurant
    deliveryDistanceKm: null, // driver to user
    activeRoute: "restaurant_to_user",
    activeDistanceKm: null,
    estimatedDurationMin: null,
    updatedAt: order.updatedAt
  });
  const [routeStats, setRouteStats] = useState(null);

  const loadTracking = useCallback(async () => {
    try {
      const { data } = await API.get(`/orders/${order._id}/tracking`);
      setTrackingData({
        status: data.status,
        restaurantLocation: parsePoint(data.restaurantLocation),
        userLocation: parsePoint(data.userLocation),
        driverLocation: parsePoint(data.driverLocation),
        // New fields from backend
        routeDistanceKm: data.routeDistanceKm,
        pickupDistanceKm: data.pickupDistanceKm,
        deliveryDistanceKm: data.deliveryDistanceKm,
        activeRoute: data.activeRoute || "restaurant_to_user",
        activeDistanceKm: data.activeDistanceKm,
        estimatedDurationMin: data.estimatedDurationMin,
        updatedAt: data.updatedAt
      });
    } catch {
      // Keep stale map if endpoint fails.
    }
  }, [order._id]);

  useEffect(() => {
    loadTracking();
    const intervalId = setInterval(loadTracking, 15000);
    return () => clearInterval(intervalId);
  }, [loadTracking]);

  useOrderTrackingSocket({
    orderId: order._id,
    onTrackingUpdate: (payload) => {
      if (!payload || payload.orderId !== order._id) return;
      setTrackingData((prev) => ({
        ...prev,
        status: payload.status || prev.status,
        restaurantLocation: parsePoint(payload.restaurantLocation) || prev.restaurantLocation,
        userLocation: parsePoint(payload.userLocation) || prev.userLocation,
        driverLocation: parsePoint(payload.driverLocation) || prev.driverLocation,
        // Update new fields from socket
        routeDistanceKm: payload.routeDistanceKm ?? prev.routeDistanceKm,
        pickupDistanceKm: payload.pickupDistanceKm ?? prev.pickupDistanceKm,
        deliveryDistanceKm: payload.deliveryDistanceKm ?? prev.deliveryDistanceKm,
        activeRoute: payload.activeRoute || prev.activeRoute,
        activeDistanceKm: payload.activeDistanceKm ?? prev.activeDistanceKm,
        estimatedDurationMin: payload.estimatedDurationMin ?? prev.estimatedDurationMin,
        updatedAt: payload.updatedAt || prev.updatedAt
      }));
    }
  });

  // Use backend's activeDistanceKm if available, otherwise fallback to routeStats
  const displayDistance = useMemo(() => {
    if (trackingData.activeDistanceKm) {
      return trackingData.activeDistanceKm;
    }
    return routeStats?.distanceKm || null;
  }, [trackingData.activeDistanceKm, routeStats?.distanceKm]);

  // Use backend's estimatedDurationMin if available, otherwise fallback to routeStats
  const displayDuration = useMemo(() => {
    if (trackingData.estimatedDurationMin) {
      return trackingData.estimatedDurationMin;
    }
    return routeStats?.durationMin || null;
  }, [trackingData.estimatedDurationMin, routeStats?.durationMin]);

  const etaLabel = useMemo(() => {
    if (!displayDuration) return "Finding best route...";
    const rounded = Math.max(1, Math.round(displayDuration));
    return `${rounded} min`;
  }, [displayDuration]);

  // Get route description based on active route and order status
  const routeDescription = useMemo(() => {
    // Check status first for more accurate description
    const status = trackingData.status;
    if (status === "pending" || status === "confirmed") {
      return "Preparing your order";
    }
    if (["assigned", "accepted", "driver_assigned"].includes(status)) {
      return trackingData.activeRoute === "driver_to_restaurant" 
        ? "Driver heading to restaurant" 
        : "Awaiting pickup";
    }
    if (["picked", "picked_up"].includes(status)) {
      return "Out for delivery";
    }
    if (status === "out_for_delivery") {
      return "On the way to you";
    }
    if (status === "delivered") {
      return "Delivered";
    }
    switch (trackingData.activeRoute) {
      case "driver_to_restaurant":
        return "Driver heading to restaurant";
      case "driver_to_user":
        return "On the way to you";
      default:
        return "Restaurant → Customer";
    }
  }, [trackingData.activeRoute, trackingData.status]);

  return (
    <div className="tracking-panel">
      <LiveOrderTrackingMap
        restaurantLocation={trackingData.restaurantLocation}
        userLocation={trackingData.userLocation}
        driverLocation={trackingData.driverLocation}
        orderStatus={trackingData.status}
        lockTracking
        onStatsUpdate={setRouteStats}
      />

      <div className="tracking-meta">
        <p>
          <strong>ETA:</strong> {etaLabel}
        </p>
        {displayDistance ? (
          <p>
            <strong>Distance:</strong> {displayDistance.toFixed(2)} km
          </p>
        ) : null}
        <p>
          <strong>Route:</strong> {routeDescription}
        </p>
        <p>
          <strong>Progress:</strong> {statusToProgress(trackingData.status)}%
        </p>
        {trackingData.updatedAt ? (
          <p className="muted small-text">
            Last update: {new Date(trackingData.updatedAt).toLocaleTimeString()}
          </p>
        ) : null}
      </div>
    </div>
  );
}

