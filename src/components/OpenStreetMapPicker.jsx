import { useEffect, useRef } from "react";
import { loadLeaflet } from "../services/leafletLoader";

const DEFAULT_ZOOM = 13;
const SELECTED_ZOOM = 16;

export default function OpenStreetMapPicker({
  center,
  markerPosition,
  onMapClick,
  onMapLoadError
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const clickHandlerRef = useRef(onMapClick);

  useEffect(() => {
    clickHandlerRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    let isDisposed = false;

    const initializeMap = async () => {
      try {
        const L = await loadLeaflet();
        if (isDisposed || !mapContainerRef.current || mapRef.current) return;

        mapRef.current = L.map(mapContainerRef.current).setView(
          [center.lat, center.lng],
          markerPosition ? SELECTED_ZOOM : DEFAULT_ZOOM
        );

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors"
        }).addTo(mapRef.current);

        mapRef.current.on("click", (event) => {
          const nextCoords = {
            lat: event.latlng.lat,
            lng: event.latlng.lng
          };
          clickHandlerRef.current?.(nextCoords);
        });
      } catch {
        onMapLoadError?.("Unable to load map tiles. Please check your network.");
      }
    };

    initializeMap();

    return () => {
      isDisposed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
    };
  }, [onMapLoadError]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(
      [center.lat, center.lng],
      markerPosition ? SELECTED_ZOOM : DEFAULT_ZOOM
    );
  }, [center.lat, center.lng, markerPosition]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!markerPosition) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    const L = window.L;
    if (!L) return;

    if (!markerRef.current) {
      markerRef.current = L.marker([markerPosition.lat, markerPosition.lng]).addTo(
        mapRef.current
      );
      return;
    }

    markerRef.current.setLatLng([markerPosition.lat, markerPosition.lng]);
  }, [markerPosition]);

  return <div ref={mapContainerRef} className="delivery-map-canvas" />;
}
