import { useEffect, useMemo, useRef, useState } from "react";
import { loadLeaflet } from "../services/leafletLoader";
import { fetchOsrmRoute } from "../services/osrm";

const DEFAULT_ZOOM = 13;

const toLatLngArray = (coordinates = []) => coordinates.map((point) => [point.lat, point.lng]);

const createEmojiIcon = (emoji, className) =>
  window.L.divIcon({
    className,
    html: `<span>${emoji}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });

const isPickupPhase = (status) =>
  ["assigned", "accepted", "driver_assigned"].includes(status);

const isDeliveryPhase = (status) =>
  ["picked", "picked_up", "out_for_delivery"].includes(status);

export default function LiveOrderTrackingMap({
  restaurantLocation,
  userLocation,
  driverLocation,
  orderStatus,
  lockTracking = true,
  height = 320,
  onStatsUpdate
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef({
    blue: null,
    green: null,
    red: null,
    restaurantMarker: null,
    userMarker: null,
    driverMarker: null
  });
  const [routes, setRoutes] = useState({
    base: null,
    pickup: null,
    delivery: null
  });
  const animatedDriverRef = useRef(driverLocation || null);
  const animationFrameRef = useRef(null);

  const hasDriver = Boolean(driverLocation?.lat && driverLocation?.lng);

  const activeRoute = useMemo(() => {
    if (hasDriver && isDeliveryPhase(orderStatus) && routes.delivery) return routes.delivery;
    if (hasDriver && isPickupPhase(orderStatus) && routes.pickup) return routes.pickup;
    return routes.base;
  }, [hasDriver, orderStatus, routes.base, routes.delivery, routes.pickup]);

  useEffect(() => {
    let aborted = false;
    const abortController = new AbortController();

    const loadRoutes = async () => {
      try {
        const [base, pickup, delivery] = await Promise.all([
          restaurantLocation && userLocation
            ? fetchOsrmRoute(restaurantLocation, userLocation, { signal: abortController.signal })
            : Promise.resolve(null),
          hasDriver && restaurantLocation
            ? fetchOsrmRoute(driverLocation, restaurantLocation, { signal: abortController.signal })
            : Promise.resolve(null),
          hasDriver && userLocation
            ? fetchOsrmRoute(driverLocation, userLocation, { signal: abortController.signal })
            : Promise.resolve(null)
        ]);

        if (!aborted) {
          setRoutes({ base, pickup, delivery });
          const active = isDeliveryPhase(orderStatus) ? delivery : isPickupPhase(orderStatus) ? pickup : base;
          onStatsUpdate?.(
            active
              ? {
                  distanceKm: active.distanceKm,
                  durationMin: active.durationMin
                }
              : null
          );
        }
      } catch {
        if (!aborted) {
          setRoutes({ base: null, pickup: null, delivery: null });
          onStatsUpdate?.(null);
        }
      }
    };

    loadRoutes();

    return () => {
      aborted = true;
      abortController.abort();
    };
  }, [
    driverLocation,
    hasDriver,
    onStatsUpdate,
    orderStatus,
    restaurantLocation,
    userLocation
  ]);

  useEffect(() => {
    let disposed = false;

    const initializeMap = async () => {
      const L = await loadLeaflet();
      if (disposed || !mapContainerRef.current || mapRef.current) return;

      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: !lockTracking,
        scrollWheelZoom: !lockTracking,
        doubleClickZoom: !lockTracking,
        dragging: true
      }).setView([restaurantLocation?.lat || 19.076, restaurantLocation?.lng || 72.8777], DEFAULT_ZOOM);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(mapRef.current);
    };

    initializeMap();

    return () => {
      disposed = true;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lockTracking]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.L) return;
    const L = window.L;
    const layers = layersRef.current;

    const drawRoute = (key, route, color) => {
      if (layers[key]) {
        layers[key].remove();
        layers[key] = null;
      }
      if (!route?.coordinates?.length) return;
      layers[key] = L.polyline(toLatLngArray(route.coordinates), {
        color,
        weight: 5,
        opacity: 0.85
      }).addTo(map);
    };

    const setMarker = (key, point, emoji, className) => {
      if (layers[key]) {
        layers[key].remove();
        layers[key] = null;
      }
      if (!point) return;
      layers[key] = L.marker([point.lat, point.lng], {
        icon: createEmojiIcon(emoji, className)
      }).addTo(map);
    };

    drawRoute("blue", routes.base, "#2563eb");
    drawRoute("green", hasDriver && isPickupPhase(orderStatus) ? routes.pickup : null, "#16a34a");
    drawRoute("red", hasDriver && isDeliveryPhase(orderStatus) ? routes.delivery : null, "#dc2626");

    setMarker("restaurantMarker", restaurantLocation, "🏪", "track-marker restaurant");
    setMarker("userMarker", userLocation, "🏠", "track-marker user");

    if (driverLocation && !layers.driverMarker) {
      layers.driverMarker = L.marker([driverLocation.lat, driverLocation.lng], {
        icon: createEmojiIcon("🛵", "track-marker driver")
      }).addTo(map);
      animatedDriverRef.current = driverLocation;
    }

    if (!driverLocation && layers.driverMarker) {
      layers.driverMarker.remove();
      layers.driverMarker = null;
      animatedDriverRef.current = null;
    }

    const boundsPoints = [];
    if (activeRoute?.coordinates?.length) {
      boundsPoints.push(...toLatLngArray(activeRoute.coordinates));
    } else {
      if (restaurantLocation) boundsPoints.push([restaurantLocation.lat, restaurantLocation.lng]);
      if (userLocation) boundsPoints.push([userLocation.lat, userLocation.lng]);
      if (driverLocation) boundsPoints.push([driverLocation.lat, driverLocation.lng]);
    }

    if (boundsPoints.length > 1) {
      map.fitBounds(boundsPoints, { padding: [28, 28] });
    } else if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], DEFAULT_ZOOM);
    }

    if (lockTracking) {
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
      map.touchZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
    } else {
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      map.touchZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
    }
  }, [
    activeRoute,
    driverLocation,
    hasDriver,
    lockTracking,
    orderStatus,
    restaurantLocation,
    routes.base,
    routes.delivery,
    routes.pickup,
    userLocation
  ]);

  useEffect(() => {
    const marker = layersRef.current.driverMarker;
    if (!marker || !driverLocation) return;

    const start = animatedDriverRef.current || driverLocation;
    const end = driverLocation;
    const durationMs = 1200;
    const startTs = performance.now();

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    const tick = (now) => {
      const progress = Math.min(1, (now - startTs) / durationMs);
      const lat = start.lat + (end.lat - start.lat) * progress;
      const lng = start.lng + (end.lng - start.lng) * progress;
      marker.setLatLng([lat, lng]);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      animatedDriverRef.current = end;
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  }, [driverLocation]);

  return <div ref={mapContainerRef} className="order-tracking-map" style={{ minHeight: `${height}px` }} />;
}
