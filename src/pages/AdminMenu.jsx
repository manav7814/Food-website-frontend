import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import API from "../api/client";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatINR } from "../utils/currency";
import OpenStreetMapPicker from "../components/OpenStreetMapPicker";
import useAddressAutocomplete from "../hooks/useAddressAutocomplete";
import { reverseGeocodeCoordinates } from "../services/nominatim";

const DEFAULT_ADMIN_MAP_CENTER = { lat: 19.076, lng: 72.8777 };

const defaultForm = {
  restaurant: "",
  name: "",
  category: "",
  description: "",
  price: "",
  image: "",
  quantity: "1",
  unit: "pieces"
};

const defaultRestaurantForm = {
  name: "",
  cuisine: "",
  address: "",
  location: null,
  image: "",
  rating: "4.5",
  deliveryTime: "30-40 min"
};

export default function AdminMenu() {
  const { user } = useContext(AuthContext);
  const [restaurants, setRestaurants] = useState([]);
  const [menu, setMenu] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  // Restaurant management state
  const [restaurantForm, setRestaurantForm] = useState(defaultRestaurantForm);
  const [editRestaurantId, setEditRestaurantId] = useState("");
  const [locationError, setLocationError] = useState("");
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [isUsingCurrentLocation, setIsUsingCurrentLocation] = useState(false);
  const [mapLoadError, setMapLoadError] = useState("");
  const reverseAbortRef = useRef(null);
  const {
    suggestions: restaurantSuggestions,
    isLoading: isAddressLoading,
    error: addressLookupError,
    clearSuggestions
  } = useAddressAutocomplete(restaurantForm.address || "");

  const isAdmin = user?.role === "admin";

  const categories = useMemo(
    () => ["Curry","Sabji","Paneer","Beverages","Burger","Cheese Sabji","Rice","Starters","Bread","Pizza", "Pasta", "Sides", "Noodles", "Bowl", "Other"],
    []
  );

  const units = useMemo(
    () => [
      { value: "pieces", label: "Pieces" },
      { value: "kg", label: "Kg" },
      { value: "pack", label: "Pack" },
      { value: "liter", label: "Liter" },
      { value: "glass", label: "Glass" },
      { value: "plate", label: "Plate" },
      { value: "bowl", label: "Bowl" },
      { value: "medium", label: "Medium" },
      { value: "large", label: "Large" }
    ],
    []
  );

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [menuRes, restaurantsRes] = await Promise.all([API.get("/menu"), API.get("/restaurants")]);
      setMenu(menuRes.data);
      setRestaurants(restaurantsRes.data);
      if (!form.restaurant && restaurantsRes.data[0]) {
        setForm((prev) => ({ ...prev, restaurant: restaurantsRes.data[0]._id }));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load admin menu data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        quantity: Number(form.quantity)
      };
      if (editId) {
        await API.put(`/menu/${editId}`, payload);
        addToast("Menu item updated.", "success");
      } else {
        await API.post("/menu", payload);
        addToast("Menu item created.", "success");
      }
      setEditId("");
      setForm((prev) => ({ ...defaultForm, restaurant: prev.restaurant }));
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Action failed");
      addToast(err.response?.data?.message || "Action failed", "error");
    }
  };

  const startEdit = (item) => {
    setEditId(item._id);
    setForm({
      restaurant: item.restaurant?._id || "",
      name: item.name || "",
      category: item.category || "Other",
      description: item.description || "",
      price: String(item.price ?? ""),
      image: item.image || "",
      quantity: String(item.quantity ?? 100),
      unit: item.unit || "pieces"
    });
  };

  const deleteItem = async (id) => {
    try {
      setError("");
      await API.delete(`/menu/${id}`);
      addToast("Menu item deleted.", "success");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
      addToast(err.response?.data?.message || "Delete failed", "error");
    }
  };

  // Restaurant management functions
  const onRestaurantSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editRestaurantId) {
        await API.put(`/restaurants/${editRestaurantId}`, {
          ...restaurantForm,
          rating: Number(restaurantForm.rating)
        });
        addToast("Restaurant updated.", "success");
      } else {
        await API.post("/restaurants", {
          ...restaurantForm,
          rating: Number(restaurantForm.rating)
        });
        addToast("Restaurant created.", "success");
      }
      setEditRestaurantId("");
      setRestaurantForm(defaultRestaurantForm);
      setLocationError("");
      setMapLoadError("");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Restaurant action failed");
      addToast(err.response?.data?.message || "Restaurant action failed", "error");
    }
  };

  const startEditRestaurant = (restaurant) => {
    setEditRestaurantId(restaurant._id);
    setRestaurantForm({
      name: restaurant.name || "",
      cuisine: restaurant.cuisine || "",
      address: restaurant.address || "",
      location: restaurant.location || null,
      image: restaurant.image || "",
      rating: String(restaurant.rating ?? "4.5"),
      deliveryTime: restaurant.deliveryTime || "30-40 min"
    });
    setLocationError("");
    setMapLoadError("");
  };

  const resolveAddressFromLocation = useCallback(async (location, fallbackAddress = "") => {
    reverseAbortRef.current?.abort();
    const abortController = new AbortController();
    reverseAbortRef.current = abortController;

    setIsResolvingLocation(true);
    setLocationError("");
    setMapLoadError("");
    setRestaurantForm((prev) => ({ ...prev, location }));

    try {
      const resolvedLocation = await reverseGeocodeCoordinates(location, {
        signal: abortController.signal
      });
      setRestaurantForm((prev) => ({
        ...prev,
        location,
        address: resolvedLocation.displayName || fallbackAddress || prev.address
      }));
    } catch (requestError) {
      if (requestError.name !== "AbortError") {
        setLocationError("Could not resolve address for selected location.");
        if (fallbackAddress) {
          setRestaurantForm((prev) => ({ ...prev, location, address: fallbackAddress }));
        }
      }
    } finally {
      setIsResolvingLocation(false);
    }
  }, []);

  useEffect(() => {
    return () => reverseAbortRef.current?.abort();
  }, []);

  const handleRestaurantSuggestionSelect = (suggestion) => {
    clearSuggestions();
    setLocationError("");
    setMapLoadError("");
    setRestaurantForm((prev) => ({
      ...prev,
      address: suggestion.displayName,
      location: { lat: suggestion.lat, lng: suggestion.lng }
    }));
  };

  const handleRestaurantMapClick = useCallback(
    (location) => {
      clearSuggestions();
      resolveAddressFromLocation(
        location,
        `Pinned location (${location.lat.toFixed(5)}, ${location.lng.toFixed(5)})`
      );
    },
    [clearSuggestions, resolveAddressFromLocation]
  );

  const handleUseCurrentLocationForRestaurant = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }

    setIsUsingCurrentLocation(true);
    setLocationError("");
    setMapLoadError("");

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location = { lat: coords.latitude, lng: coords.longitude };
        clearSuggestions();
        resolveAddressFromLocation(location, "Current location selected");
        setIsUsingCurrentLocation(false);
      },
      () => {
        setLocationError("Unable to fetch current location.");
        setIsUsingCurrentLocation(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const deleteRestaurant = async (id) => {
    try {
      setError("");
      await API.delete(`/restaurants/${id}`);
      addToast("Restaurant deleted.", "success");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
      addToast(err.response?.data?.message || "Delete failed", "error");
    }
  };

  if (!user) {
    return (
      <main className="container section page-gap">
        <p className="error">Please login as admin to manage menu.</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="container section page-gap">
        <p className="error">Only admin can edit menu details.</p>
      </main>
    );
  }

  return (
    <main className="container page-gap">
      {/* Restaurant Management Section */}
      <section className="section">
        <h2>Restaurant Management</h2>
        {error && <p className="error">{error}</p>}
        <form className="admin-form" onSubmit={onRestaurantSubmit}>
          <input
            type="text"
            placeholder="Restaurant name"
            value={restaurantForm.name}
            onChange={(e) => setRestaurantForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <input
            type="text"
            placeholder="Cuisine type"
            value={restaurantForm.cuisine}
            onChange={(e) => setRestaurantForm((prev) => ({ ...prev, cuisine: e.target.value }))}
            required
          />
          <div className="admin-restaurant-location">
            <div className="delivery-input-row">
              <div className="delivery-autocomplete-wrap">
                <input
                  type="text"
                  placeholder="Restaurant address"
                  value={restaurantForm.address}
                  onChange={(e) =>
                    setRestaurantForm((prev) => ({
                      ...prev,
                      address: e.target.value,
                      location: null
                    }))
                  }
                />
                {(isAddressLoading || restaurantSuggestions.length > 0) && (
                  <div className="delivery-suggestions">
                    {isAddressLoading && (
                      <button type="button" className="delivery-suggestion" disabled>
                        Searching...
                      </button>
                    )}
                    {!isAddressLoading &&
                      restaurantSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          className="delivery-suggestion"
                          onMouseDown={() => handleRestaurantSuggestionSelect(suggestion)}
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
                onClick={handleUseCurrentLocationForRestaurant}
                disabled={isUsingCurrentLocation || isResolvingLocation}
              >
                {isUsingCurrentLocation ? "Locating..." : "Use Current Location"}
              </button>
            </div>

            {addressLookupError && <p className="delivery-error">{addressLookupError}</p>}
            {locationError && <p className="delivery-error">{locationError}</p>}
            {mapLoadError && <p className="delivery-error">{mapLoadError}</p>}
            {isResolvingLocation && (
              <p className="delivery-map-note">Resolving selected map location...</p>
            )}
            {!restaurantForm.location && restaurantForm.address.trim() && (
              <p className="delivery-error">
                Select an address from suggestions or pin the location on map.
              </p>
            )}

            <div className="delivery-map-wrap">
              <OpenStreetMapPicker
                center={restaurantForm.location || DEFAULT_ADMIN_MAP_CENTER}
                markerPosition={restaurantForm.location}
                onMapClick={handleRestaurantMapClick}
                onMapLoadError={setMapLoadError}
              />
            </div>
          </div>
          <input
            type="text"
            placeholder="Image URL"
            value={restaurantForm.image}
            onChange={(e) => setRestaurantForm((prev) => ({ ...prev, image: e.target.value }))}
          />
          <input
            type="number"
            step="0.1"
            min="0"
            max="5"
            placeholder="Rating (0-5)"
            value={restaurantForm.rating}
            onChange={(e) => setRestaurantForm((prev) => ({ ...prev, rating: e.target.value }))}
          />
          <input
            type="text"
            placeholder="Delivery time (e.g., 30-40 min)"
            value={restaurantForm.deliveryTime}
            onChange={(e) => setRestaurantForm((prev) => ({ ...prev, deliveryTime: e.target.value }))}
          />
          <div className="admin-actions">
            <button className="btn" type="submit">
              {editRestaurantId ? "Update Restaurant" : "Add Restaurant"}
            </button>
            {editRestaurantId && (
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  setEditRestaurantId("");
                  setRestaurantForm(defaultRestaurantForm);
                  setLocationError("");
                  setMapLoadError("");
                }}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="section">
        <h3>Current Restaurants</h3>
        {loading && (
          <div className="card-grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <article key={index} className="card skeleton-card" />
            ))}
          </div>
        )}
        <div className="card-grid">
          {!loading &&
            restaurants.map((restaurant) => (
              <article className="card" key={restaurant._id}>
                <div className="card-content">
                  <p className="tag">{restaurant.cuisine}</p>
                  <h4>{restaurant.name}</h4>
                  {restaurant.address && <p className="muted">{restaurant.address}</p>}
                  {restaurant.location?.lat && restaurant.location?.lng && (
                    <p className="muted">
                      Location: {restaurant.location.lat.toFixed(5)}, {restaurant.location.lng.toFixed(5)}
                    </p>
                  )}
                  <p className="muted">Rating: {restaurant.rating} | Delivery: {restaurant.deliveryTime}</p>
                  <div className="admin-actions">
                    <button className="btn btn-secondary" onClick={() => startEditRestaurant(restaurant)}>
                      Edit
                    </button>
                    <button className="btn btn-ghost" onClick={() => deleteRestaurant(restaurant._id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
        </div>
      </section>

      {/* Menu Item Management Section */}
      <section className="section">
        <h2>Menu Item Management</h2>
        {error && <p className="error">{error}</p>}
        <form className="admin-form" onSubmit={onSubmit}>
          <select
            value={form.restaurant}
            onChange={(e) => setForm((prev) => ({ ...prev, restaurant: e.target.value }))}
            required
          >
            <option value="">Select restaurant</option>
            {restaurants.map((restaurant) => (
              <option key={restaurant._id} value={restaurant._id}>
                {restaurant.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Item name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <select
            value={form.category}
            onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
            required
          >
            <option value="">Select category</option>
            {categories.map((itemCategory) => (
              <option key={itemCategory} value={itemCategory}>
                {itemCategory}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Price"
            value={form.price}
            onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
            required
          />
          <div className="form-row">
            <input
              type="number"
              min="0"
              placeholder="Quantity"
              value={form.quantity}
              onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
              required
            />
            <select
              value={form.unit}
              onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
              required
            >
              {units.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            placeholder="Image URL"
            value={form.image}
            onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
          />
          <input
            type="text"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />
          <div className="admin-actions">
            <button className="btn" type="submit">
              {editId ? "Update Item" : "Create Item"}
            </button>
            {editId && (
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  setEditId("");
                  setForm((prev) => ({ ...defaultForm, restaurant: prev.restaurant }));
                }}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="section">
        <h3>Current Menu Items</h3>
        {loading && (
          <div className="card-grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <article key={index} className="card skeleton-card" />
            ))}
          </div>
        )}
        <div className="card-grid">
          {!loading &&
            menu.map((item) => (
              <article className="card" key={item._id}>
                <div className="card-content">
                  <p className="tag">{item.category || "Other"}</p>
                  <h4>{item.name}</h4>
                  <p className="muted">{item.restaurant?.name}</p>
                  <p>{formatINR(item.price)}</p>
                  <p className={item.quantity === 0 ? "error" : item.quantity < 10 ? "warning" : ""}>
                    Quantity: {item.quantity} {item.unit}
                  </p>
                  <div className="admin-actions">
                    <button className="btn btn-secondary" onClick={() => startEdit(item)}>
                      Edit
                    </button>
                    <button className="btn btn-ghost" onClick={() => deleteItem(item._id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
        </div>
      </section>
    </main>
  );
}
