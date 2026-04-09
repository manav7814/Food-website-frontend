import { useContext, useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";
import API from "../api/client";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const { items } = useContext(CartContext);
  const [deliveryCount, setDeliveryCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Check if current page is an admin page
  const isAdminPage = location.pathname.startsWith("/admin");

  // Don't render navbar on admin pages
  if (isAdminPage) {
    return null;
  }

  useEffect(() => {
    if (user?.role === "driver") {
      fetchDeliveryCount();
    }
  }, [user]);

  // Close mobile menu when location changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const fetchDeliveryCount = async () => {
    try {
      const { data } = await API.get("/orders/driver/orders?status=assigned,accepted,picked,out_for_delivery");
      setDeliveryCount(data.length);
    } catch (err) {
      console.error("Failed to fetch delivery count:", err);
    }
  };

  const isDriver = user?.role === "driver";
  const isAdmin = user?.role === "admin";
  const isRegularUser = user && !isDriver && !isAdmin;

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    document.body.style.overflow = !mobileMenuOpen ? 'hidden' : '';
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
  };

  return (
    <>
      <header className="navbar-shell">
        <div className="navbar container">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button 
              className={`hamburger-btn ${mobileMenuOpen ? 'active' : ''}`} 
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            <NavLink to={isDriver ? "/driver/dashboard" : "/"} className="brand">
              <span className="brand-dot" />
              FoodHub
            </NavLink>
          </div>

          <nav className="nav-links">
            {/* Links for non-driver users */}
            {!isDriver && <NavLink to="/" className="nav-link">Home</NavLink>}
            {!isDriver && <NavLink to="/menu" className="nav-link">Menu</NavLink>}
            {!isDriver && <NavLink to="/contact" className="nav-link">Contact</NavLink>}
            {!isDriver && <NavLink to="/chat" className="nav-link">Assistant</NavLink>}
            
            {/* Cart - shown for all users */}
            <NavLink to="/cart" className="nav-link">
              Cart  
              <span className="cart-pill">{items.length}</span>
            </NavLink>
            
            {/* Orders - shown for logged in users (not drivers) */}
            {user && !isDriver && <NavLink to="/orders" className="nav-link">Orders</NavLink>}
            
            {/* Driver links */}
            {isDriver && (
              <>
                <NavLink to="/driver/dashboard" className="nav-link">Dashboard</NavLink>
                <NavLink to="/driver/orders" className="nav-link">
                  Orders
                  {deliveryCount > 0 && <span className="delivery-badge">{deliveryCount}</span>}
                </NavLink>
                <NavLink to="/driver/earnings" className="nav-link">Earnings</NavLink>
                <NavLink to="/driver/chat" className="nav-link">Chat</NavLink>
                <NavLink to="/driver/profile" className="nav-link">Profile</NavLink>
              </>
            )}
          </nav>

          <div className="nav-auth">
            {/* Notification bell for logged in users (customers and drivers) */}
            {user && !isAdmin && <NotificationBell />}
            
            {!user ? (
              <>
                <NavLink to="/login" className="nav-link">Login</NavLink>
                <NavLink to="/register" className="btn btn-secondary">Register</NavLink>
              </>
            ) : (
              <>
                <span className="user-chip">{user.name}</span>
                <button className="btn btn-ghost" onClick={logout}>Logout</button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div 
        className={`mobile-menu-overlay ${mobileMenuOpen ? 'active' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Navigation */}
      <nav className={`mobile-nav ${mobileMenuOpen ? 'active' : ''}`}>
        <button 
          className="mobile-nav-close" 
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu"
        >
          ×
        </button>

        {user && (
          <div className="mobile-nav-user">
            <span className="user-chip">{user.name}</span>
          </div>
        )}

        <div className="mobile-nav-links">
          {/* Links for non-driver users */}
          {!isDriver && (
            <NavLink to="/" className="mobile-nav-link">
              Home
            </NavLink>
          )}
          {!isDriver && (
            <NavLink to="/menu" className="mobile-nav-link">
              Menu
            </NavLink>
          )}
          {!isDriver && (
            <NavLink to="/contact" className="mobile-nav-link">
              Contact
            </NavLink>
          )}
          {!isDriver && (
            <NavLink to="/chat" className="mobile-nav-link">
              Assistant
            </NavLink>
          )}
          
          {/* Cart - shown for all users */}
          <NavLink to="/cart" className="mobile-nav-link">
            Cart
            <span className="cart-pill">{items.length}</span>
          </NavLink>
          
          {/* Orders - shown for logged in users (not drivers) */}
          {user && !isDriver && (
            <NavLink to="/orders" className="mobile-nav-link">
              Orders
            </NavLink>
          )}
          
          {/* Driver links */}
          {isDriver && (
            <>
              <NavLink to="/driver/dashboard" className="mobile-nav-link">
                Dashboard
              </NavLink>
              <NavLink to="/driver/orders" className="mobile-nav-link">
                Orders
                {deliveryCount > 0 && <span className="delivery-badge">{deliveryCount}</span>}
              </NavLink>
              <NavLink to="/driver/earnings" className="mobile-nav-link">
                Earnings
              </NavLink>
              <NavLink to="/driver/chat" className="mobile-nav-link">
                Chat
              </NavLink>
              <NavLink to="/driver/profile" className="mobile-nav-link">
                Profile
              </NavLink>
            </>
          )}
        </div>

        <div className="mobile-nav-auth">
          {user && !isAdmin && <NotificationBell />}
          
          {!user ? (
            <>
              <NavLink to="/login" className="btn btn-secondary" style={{ textAlign: 'center' }}>
                Login
              </NavLink>
              <NavLink to="/register" className="btn" style={{ textAlign: 'center' }}>
                Register
              </NavLink>
            </>
          ) : (
            <button className="btn btn-ghost" onClick={handleLogout} style={{ width: '100%' }}>
              Logout
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
