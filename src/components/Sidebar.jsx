import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useContext, useState } from "react";
import { DashboardIcon, MenuIcon, OrdersIcon, CarIcon, MoneyIcon, SettingsIcon, BannerIcon, TagIcon, UsersIcon, ClipboardIcon, ToolsIcon, LogoutIcon } from "./Icons";

export default function Sidebar() {
  const { logout, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [systemMenuOpen, setSystemMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const adminLinks = [
    { path: "/admin/dashboard", label: "Dashboard", icon: DashboardIcon },
    { path: "/admin/menu", label: "Admin Menu", icon: MenuIcon },
    { path: "/admin/orders", label: "Admin Orders", icon: OrdersIcon },
    { path: "/admin/drivers", label: "Drivers", icon: CarIcon },
    { path: "/admin/financial", label: "Financial", icon: MoneyIcon },
  ];

  const systemLinks = [
    { path: "/admin/settings", label: "Settings", icon: SettingsIcon },
    { path: "/admin/banners", label: "Banners", icon: BannerIcon },
    { path: "/admin/offers", label: "Offers & Coupons", icon: TagIcon },
  ];

  // Add role management and audit logs for super_admin
  if (user?.role === "super_admin") {
    systemLinks.push(
      { path: "/admin/roles", label: "Role Management", icon: UsersIcon },
      { path: "/admin/audit-logs", label: "Audit Logs", icon: ClipboardIcon }
    );
  }

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-header">
        <NavLink to="/admin/dashboard" className="sidebar-brand">
          <span className="brand-dot" />
          FoodHub Admin
        </NavLink>
        <button 
          className="sidebar-hamburger" 
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </div>
      
      <nav className={`sidebar-nav ${mobileMenuOpen ? 'active' : ''}`}>
        {adminLinks.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className="sidebar-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            <span className="sidebar-icon"><link.icon /></span>
            {link.label}
          </NavLink>
        ))}
        
        {/* System Management Dropdown */}
        <div className="sidebar-dropdown">
          <button 
            className="sidebar-link dropdown-toggle"
            onClick={() => setSystemMenuOpen(!systemMenuOpen)}
          >
            <span className="sidebar-icon"><ToolsIcon /></span>
            System Management
            <span className="dropdown-arrow">{systemMenuOpen ? "▼" : "▶"}</span>
          </button>
          
          {systemMenuOpen && (
            <div className="sidebar-dropdown-menu">
              {systemLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className="sidebar-dropdown-item"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sidebar-icon"><link.icon /></span>
                  {link.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-link logout-btn" onClick={handleLogout}>
          <span className="sidebar-icon"><LogoutIcon /></span>
          Logout
        </button>
      </div>
    </aside>
  );
}

