import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useAddressAutocomplete from "../hooks/useAddressAutocomplete";
import { reverseGeocodeCoordinates } from "../services/nominatim";
import { haversineDistanceKm } from "../utils/geo";
import OpenStreetMapPicker from "./OpenStreetMapPicker";

const DEFAULT_RESTAURANT_LOCATION = { lat: 23.0225,  lng: 72.5714 };
const DEFAULT_DELIVERY_RADIUS_KM = 30;

const toCoordinateLabel = ({ lat, lng }) =>
  `Pinned location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;

export default function DeliveryLocation({
  restaurantLocation = DEFAULT_RESTAURANT_LOCATION,
  deliveryRadiusKm = DEFAULT_DELIVERY_RADIUS_KM,
  value,
  onChange
}) {
  const [inputValue, setInputValue] = useState(value?.address || "");
  const [selectedAddress, setSelectedAddress] = useState(value?.address || "");
  const [selectedCoords, setSelectedCoords] = useState(value?.coordinates || null);
  const [selectedCity, setSelectedCity] = useState(value?.city || "");
  const [locationError, setLocationError] = useState("");
  const [mapError, setMapError] = useState("");
  const [isUsingCurrentLocation, setIsUsingCurrentLocation] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const reverseAbortRef = useRef(null);

  const { suggestions, isLoading, error: suggestionError, clearSuggestions } =
    useAddressAutocomplete(inputValue);

  const center = selectedCoords || restaurantLocation;

  const distanceKm = useMemo(() => {
    if (!selectedCoords) return null;
    return haversineDistanceKm(restaurantLocation, selectedCoords);
  }, [restaurantLocation, selectedCoords]);

  const isWithinDeliveryArea =
    typeof distanceKm === "number" && distanceKm <= deliveryRadiusKm;

  useEffect(() => {
    if (!onChange) return;

    onChange({
      address: selectedAddress,
      coordinates: selectedCoords,
      city: selectedCity,
      distanceKm,
      isWithinDeliveryArea,
      isAddressSelected: Boolean(selectedAddress && selectedCoords)
    });
  }, [
    distanceKm,
    isWithinDeliveryArea,
    onChange,
    selectedAddress,
    selectedCity,
    selectedCoords
  ]);

  const clearSelection = useCallback(
    (nextInput) => {
      setInputValue(nextInput);
      setSelectedAddress("");
      setSelectedCoords(null);
      setSelectedCity("");
      setMapError("");
    },
    []
  );

  const resolveAddressForCoordinates = useCallback(async (coordinates, fallbackLabel) => {
    reverseAbortRef.current?.abort();
    const abortController = new AbortController();
    reverseAbortRef.current = abortController;

    setIsResolvingAddress(true);
    setLocationError("");
    setSelectedCoords(coordinates);

    try {
      const resolvedLocation = await reverseGeocodeCoordinates(coordinates, {
        signal: abortController.signal
      });
      const nextAddress = resolvedLocation.displayName || fallbackLabel;
      setSelectedAddress(nextAddress);
      setSelectedCity(resolvedLocation.city || "");
      setInputValue(nextAddress);
    } catch (requestError) {
      if (requestError.name === "AbortError") return;
      setSelectedAddress(fallbackLabel);
      setSelectedCity("");
      setInputValue(fallbackLabel);
      setLocationError("Could not resolve address for the selected location.");
    } finally {
      setIsResolvingAddress(false);
    }
  }, []);

  useEffect(() => {
    return () => reverseAbortRef.current?.abort();
  }, []);

  const handleSuggestionSelect = (suggestion) => {
    clearSuggestions();
    setLocationError("");
    setMapError("");
    setSelectedCoords({ lat: suggestion.lat, lng: suggestion.lng });
    setSelectedAddress(suggestion.displayName);
    setSelectedCity(suggestion.city || "");
    setInputValue(suggestion.displayName);
  };

  const handleMapClick = useCallback(
    (coordinates) => {
      clearSuggestions();
      setMapError("");
      resolveAddressForCoordinates(coordinates, toCoordinateLabel(coordinates));
    },
    [clearSuggestions, resolveAddressForCoordinates]
  );

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }

    setIsUsingCurrentLocation(true);
    setLocationError("");
    setMapError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        clearSuggestions();
        resolveAddressForCoordinates(currentCoords, "Current location selected");
        setIsUsingCurrentLocation(false);
      },
      () => {
        setLocationError("Unable to fetch your current location.");
        setIsUsingCurrentLocation(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const addressError =
    !selectedCoords && inputValue.trim()
      ? "Select an address from suggestions or pin location on the map."
      : "";

  return (
    <div className="delivery-location-card">
      <h4>Delivery Address</h4>
      <div className="delivery-input-row">
        <div className="delivery-autocomplete-wrap">
          <input
            type="text"
            value={inputValue}
            placeholder="Search address with Nominatim"
            onChange={(event) => clearSelection(event.target.value)}
            className="delivery-address-input"
          />
          {(isLoading || suggestions.length > 0) && (
            <div className="delivery-suggestions">
              {isLoading && (
                <button type="button" className="delivery-suggestion" disabled>
                  Searching...
                </button>
              )}
              {!isLoading &&
                suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    className="delivery-suggestion"
                    onMouseDown={() => handleSuggestionSelect(suggestion)}
                  >
                    {suggestion.displayName}
                  </button>
                ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleUseCurrentLocation}
          disabled={isUsingCurrentLocation || isResolvingAddress}
        >
          {isUsingCurrentLocation ? "Locating..." : "Use My Current Location"}
        </button>
      </div>

      {addressError && <p className="delivery-error">{addressError}</p>}
      {suggestionError && <p className="delivery-error">{suggestionError}</p>}
      {locationError && <p className="delivery-error">{locationError}</p>}
      {mapError && <p className="delivery-error">{mapError}</p>}
      {isResolvingAddress && (
        <p className="delivery-map-note">Resolving selected map location...</p>
      )}

      <div className="delivery-map-wrap">
        <OpenStreetMapPicker
          center={center}
          markerPosition={selectedCoords}
          onMapClick={handleMapClick}
          onMapLoadError={setMapError}
        />
      </div>

      {typeof distanceKm === "number" && (
        <p className={`delivery-status ${isWithinDeliveryArea ? "ok" : "out"}`}>
          {isWithinDeliveryArea
            ? `Delivery available at this location (${distanceKm.toFixed(2)} km away)`
            : `Out of Delivery Area (${distanceKm.toFixed(2)} km away)`}
        </p>
      )}
      {selectedCity && <p className="delivery-map-note">Detected city: {selectedCity}</p>}
    </div>
  );
}
