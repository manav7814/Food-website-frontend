import { useContext, useEffect, useMemo, useState } from "react";
import API from "../api/client";
import { CartContext } from "../context/CartContext";
import { formatINR } from "../utils/currency";

const fallbackDishImage =
  "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80";

export default function Menu() {
  const [menu, setMenu] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [banners, setBanners] = useState([]);
  const [category, setCategory] = useState("All");
  const [restaurantId, setRestaurantId] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { addToCart } = useContext(CartContext);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [menuRes, restaurantsRes, bannersRes] = await Promise.all([
          API.get("/menu"),
          API.get("/restaurants"),
          API.get("/menu/banners")
        ]);
        setMenu(menuRes.data);
        setRestaurants(restaurantsRes.data);
        setBanners(bannersRes.data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load menu.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const categories = useMemo(() => {
    const list = [...new Set(menu.map((item) => item.category || "Other"))];
    return ["All", ...list];
  }, [menu]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menu.filter((item) => {
      const byCategory = category === "All" ? true : (item.category || "Other") === category;
      const byRestaurant = restaurantId === "All" ? true : item.restaurant?._id === restaurantId;
      const bySearch = q
        ? item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.restaurant?.name?.toLowerCase().includes(q)
        : true;
      return byCategory && byRestaurant && bySearch;
    });
  }, [menu, category, restaurantId, search]);

  // Handle banner click
  const handleBannerClick = (banner) => {
    if (banner.linkType === "category" && banner.linkValue) {
      setCategory(banner.linkValue);
    } else if (banner.linkType === "restaurant" && banner.linkValue) {
      setRestaurantId(banner.linkValue);
    }
  };

  return (
    <main className="container page-gap">
      {/* Banners Section */}
      {banners.length > 0 && (
        <section className="menu-banners">
          <div className="banner-carousel">
            {banners.map((banner) => (
              <div
                key={banner._id}
                className="banner-slide"
                onClick={() => handleBannerClick(banner)}
                style={{ backgroundImage: banner.image ? `url(${banner.image})` : undefined }}
              >
                {!banner.image && <div className="banner-placeholder" />}
                <div className="banner-content">
                  <h2>{banner.title}</h2>
                  {banner.description && <p>{banner.description}</p>}
                  {banner.buttonText && <span className="banner-btn">{banner.buttonText}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="menu-hero">
        <div className="menu-hero-content">
          <p className="eyebrow">Menu collection</p>
          <h1>Explore dishes by category</h1>
          <p>Filter by restaurant, category, and search terms to find your perfect meal.</p>
        </div>
      </section>

      <section className="section">
        <h2>Menu</h2>
        <div className="menu-toolbar">
          <input
            type="text"
            placeholder="Search menu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)}>
            <option value="All">All Restaurants</option>
            {restaurants.map((restaurant) => (
              <option key={restaurant._id} value={restaurant._id}>
                {restaurant.name}
              </option>
            ))}
          </select>
        </div>
        <div className="chip-list">
          {categories.map((itemCategory) => (
            <button
              key={itemCategory}
              className={`chip ${category === itemCategory ? "chip-active" : ""}`}
              onClick={() => setCategory(itemCategory)}
            >
              {itemCategory}
            </button>
          ))}
        </div>
      </section>

      {loading && (
        <section className="card-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <article key={index} className="card skeleton-card" />
          ))}
        </section>
      )}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <section className="card-grid">
          {filtered.map((item) => (
            <article key={item._id} className="card menu-card">
              <img
                src={item.image || fallbackDishImage}
                alt={item.name}
                onError={(e) => {
                  e.currentTarget.src = fallbackDishImage;
                }}
              />
              <div className="card-content">
                <p className="tag">{item.category || "Other"}</p>
                <h3 className="truncate">{item.name}</h3>
                <p className="muted truncate">{item.restaurant?.name}</p>
                <p className="truncate-3line">{item.description}</p>
                <div className="menu-footer">
                  <strong>{formatINR(item.price)}</strong>
                  <button className="btn" onClick={() => addToCart(item)}>
                    Add to Cart
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
