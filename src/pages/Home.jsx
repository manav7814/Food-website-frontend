import { useContext, useEffect, useMemo, useState } from "react";
import API from "../api/client";
import { CartContext } from "../context/CartContext";
import { formatINR } from "../utils/currency";
import HeroSlider from "../components/HeroSlider";
import ImageLoop from "../components/ImageLoop";


const fallbackDishImage =
  "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80";

export default function Home() {
  const [restaurants, setRestaurants] = useState([]);
  const [menu, setMenu] = useState([]);
  const [banners, setBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [bannersError, setBannersError] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { addToCart } = useContext(CartContext);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");
        const [restaurantRes, menuRes] = await Promise.all([
          API.get("/restaurants"),
          API.get("/menu")
        ]);
        setRestaurants(restaurantRes.data);
        setMenu(menuRes.data);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load menu data.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Fetch banners separately with proper error handling
  useEffect(() => {
    const loadBanners = async () => {
      try {
        setBannersLoading(true);
        setBannersError("");
        const bannerRes = await API.get("/menu/banners");
        setBanners(bannerRes.data || []);
      } catch (err) {
        console.error("Failed to load banners:", err);
        setBannersError(err.response?.data?.message || "Unable to load banners");
        setBanners([]);
      } finally {
        setBannersLoading(false);
      }
    };

    loadBanners();
  }, []);

  const filteredMenu = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return menu.filter((item) => {
      const matchRestaurant = selectedRestaurant
        ? item.restaurant?._id === selectedRestaurant
        : true;

      const matchSearch = normalizedSearch
        ? item.name.toLowerCase().includes(normalizedSearch) ||
          item.description.toLowerCase().includes(normalizedSearch) ||
          item.restaurant?.name?.toLowerCase().includes(normalizedSearch)
        : true;

      return matchRestaurant && matchSearch;
    });
  }, [menu, search, selectedRestaurant]);

  const featuredCount = filteredMenu.length;
  const spotlightDishes = menu.slice(0, 3);

  return (
    <main className="container page-gap">
      {/* Hero Slider - Integrated Swiper.js Banner Slider */}
      <HeroSlider 
        banners={banners} 
        loading={bannersLoading} 
        error={bannersError} 
      />

      <section className="hero">
        <div>
          <p className="eyebrow">Fast delivery network</p>
          <h1>Order great food from trusted local kitchens</h1>
          <p className="hero-copy">
            Discover curated restaurants, explore detailed menus, and place orders in minutes.
          </p>
          <div className="hero-meta">
            <span>{restaurants.length} restaurants</span>
            <span>{menu.length} menu items</span>
            <span>Live order history</span>
          </div>
        </div>
        <div className="hero-panel">
          <h3>Search your meal</h3>
          <input
            type="text"
            placeholder="Search by dish, cuisine, or restaurant"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <p>{featuredCount} items match your current filters.</p>
          <div className="hero-food-grid">
            {spotlightDishes.map((dish) => (
              <img
                key={dish._id}
                src={dish.image || fallbackDishImage}
                alt={dish.name}
                onError={(e) => {
                  e.currentTarget.src = fallbackDishImage;
                }}
              />
            ))}
          </div>
        </div>
      </section>

      <ImageLoop />

      <section className="section">
        <div className="section-head">
          <h2>Partner Restaurants</h2>
          {selectedRestaurant && (
            <button className="btn btn-secondary" onClick={() => setSelectedRestaurant("")}>
              Clear Restaurant Filter
            </button>
          )}
        </div>

        {loading && (
          <div className="card-grid">
            {Array.from({ length: 3 }).map((_, index) => (
              <article key={index} className="card skeleton-card" />
            ))}
          </div>
        )}
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <div className="card-grid">
            {restaurants.map((restaurant) => (
              <article key={restaurant._id} className="card restaurant-card">
                <img
                  src={restaurant.image || fallbackDishImage}
                  alt={restaurant.name}
                  onError={(e) => {
                    e.currentTarget.src = fallbackDishImage;
                  }}
                />
                <div className="card-content">
                  <h3>{restaurant.name}</h3>
                  <p>{restaurant.cuisine}</p>
                  <p className="muted">
                    {restaurant.rating} rating | {restaurant.deliveryTime}
                  </p>
                  <button className="btn" onClick={() => setSelectedRestaurant(restaurant._id)}>
                    View Menu
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <h2>Menu Highlights</h2>
        {!loading && !error && filteredMenu.length === 0 && (
          <p className="info">No menu items found for your current filter.</p>
        )}

        <div className="card-grid">
          {loading &&
            Array.from({ length: 6 }).map((_, index) => <article key={index} className="card skeleton-card" />)}
          {!loading &&
            filteredMenu.map((item) => (
            <article key={item._id} className="card menu-card">
              <img
                src={item.image || fallbackDishImage}
                alt={item.name}
                onError={(e) => {
                  e.currentTarget.src = fallbackDishImage;
                }}
              />
              <div className="card-content">
                <p className="tag">{item.restaurant?.name || "Restaurant"}</p>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <div className="menu-footer">
                  <strong>{formatINR(item.price)}</strong>
                  <button className="btn" onClick={() => addToCart(item)}>
                    Add to Cart
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
