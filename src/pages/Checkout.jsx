import { useEffect, useState } from "react";
import API from "../api/client";
import DeliveryLocation from "../components/DeliveryLocation";

export default function Checkout() {
  const [restaurantConfig, setRestaurantConfig] = useState({
    lat: Number(import.meta.env.VITE_RESTAURANT_LAT || 23.0225),
    lng: Number(import.meta.env.VITE_RESTAURANT_LNG || 72.5714),
    radiusKm: Number(import.meta.env.VITE_DELIVERY_RADIUS_KM || 30)
  });
  const [locationData, setLocationData] = useState({
    address: "",
    coordinates: null,
    city: "",
    distanceKm: null,
    isWithinDeliveryArea: false,
    isAddressSelected: false
  });
  const [error, setError] = useState("");
  const [orderPreview, setOrderPreview] = useState(null);

  useEffect(() => {
    const loadDeliveryConfig = async () => {
      try {
        const { data } = await API.get("/restaurants/delivery-config");
        setRestaurantConfig((previous) => ({
          lat: Number.isFinite(Number(data.lat)) ? Number(data.lat) : previous.lat,
          lng: Number.isFinite(Number(data.lng)) ? Number(data.lng) : previous.lng,
          radiusKm:
            Number.isFinite(Number(data.radiusKm)) && Number(data.radiusKm) > 0
              ? Number(data.radiusKm)
              : previous.radiusKm
        }));
      } catch {
        // Keep env-based fallback values if backend config is unavailable.
      }
    };

    loadDeliveryConfig();
  }, []);

  const handleCheckout = () => {
    if (!locationData.isAddressSelected) {
      setError("Please select an address from autocomplete suggestions.");
      return;
    }
    if (!locationData.isWithinDeliveryArea) {
      setError(`Out of Delivery Area. Delivery is available within ${restaurantConfig.radiusKm} km.`);
      return;
    }

    setError("");
    setOrderPreview({
      address: locationData.address,
      deliveryLocation: {
        latitude: locationData.coordinates.lat,
        longitude: locationData.coordinates.lng
      }
    });
  };

  const isCheckoutDisabled =
    !locationData.isAddressSelected || !locationData.isWithinDeliveryArea;

  return (
    <main className="container section page-gap">
      <div className="summary-card">
        <h2>Checkout Example</h2>
        <DeliveryLocation
          restaurantLocation={{
            lat: restaurantConfig.lat,
            lng: restaurantConfig.lng
          }}
          deliveryRadiusKm={restaurantConfig.radiusKm}
          value={locationData}
          onChange={setLocationData}
        />
        {error && <p className="delivery-error">{error}</p>}
        <button
          className="btn"
          type="button"
          onClick={handleCheckout}
          disabled={isCheckoutDisabled}
        >
          Place Order
        </button>
        {orderPreview && (
          <pre style={{ marginTop: "1rem", overflowX: "auto" }}>
            {JSON.stringify(orderPreview, null, 2)}
          </pre>
        )}
      </div>
    </main>
  );
}
