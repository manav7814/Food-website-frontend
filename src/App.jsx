import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ToastProvider } from "./context/ToastContext";
import { NotificationProvider } from "./context/NotificationContext";
import Cart from "./pages/Cart";
import Contact from "./pages/Contact";
import Chatbot from "./pages/Chatbot";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Menu from "./pages/Menu";
import Orders from "./pages/Orders";
import Register from "./pages/Register";
import AdminMenu from "./pages/AdminMenu";
import AdminSetup from "./pages/AdminSetup";
import AdminOrders from "./pages/AdminOrders";
import AdminDrivers from "./pages/AdminDrivers";
import AdminFinancial from "./pages/AdminFinancial";
import AdminDashboard from "./pages/AdminDashboard";
import AdminSettings from "./pages/AdminSettings";
import AdminBanners from "./pages/AdminBanners";
import AdminOffers from "./pages/AdminOffers";
import AdminRoles from "./pages/AdminRoles";
import AdminAuditLogs from "./pages/AdminAuditLogs";
import DriverDelivery from "./pages/DriverDelivery";
import DriverLogin from "./pages/DriverLogin";
import DriverRegister from "./pages/DriverRegister";
import DriverDashboard from "./pages/DriverDashboard";
import DriverProfile from "./pages/DriverProfile";
import DriverOrders from "./pages/DriverOrders";
import DriverEarnings from "./pages/DriverEarnings";
import DriverChat from "./pages/DriverChat";
import AdminLogin from "./pages/AdminLogin";
import "./admin-sidebar.css";

function AppContent() {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith("/admin");
  const { user } = useAuth();
  const isAdminUser = user?.role === "admin";
  const showFooter = !isAdminPage && !isAdminUser;

  return (
    <>
      <Navbar />
      <div className={isAdminPage ? "admin-layout" : ""}>
        {isAdminPage && <Sidebar />}
        <main className={isAdminPage ? "admin-main" : ""}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/chat" element={<Chatbot />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/driver/login" element={<DriverLogin />} />
            <Route path="/driver/register" element={<DriverRegister />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/admin/menu" element={<AdminMenu />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/drivers" element={<AdminDrivers />} />
            <Route path="/admin/financial" element={<AdminFinancial />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/banners" element={<AdminBanners />} />
            <Route path="/admin/offers" element={<AdminOffers />} />
            <Route path="/admin/roles" element={<AdminRoles />} />
            <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
            <Route path="/driver/delivery" element={<DriverDelivery />} />
            <Route path="/driver/dashboard" element={<DriverDashboard />} />
            <Route path="/driver/profile" element={<DriverProfile />} />
            <Route path="/driver/orders" element={<DriverOrders />} />
            <Route path="/driver/earnings" element={<DriverEarnings />} />
            <Route path="/driver/chat" element={<DriverChat />} />
            <Route path="/admin/setup" element={<AdminSetup />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
      {showFooter && <Footer />}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <ToastProvider>
            <NotificationProvider>
              <AppContent />
            </NotificationProvider>
          </ToastProvider>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
