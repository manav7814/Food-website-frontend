import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/client";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function AdminLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const { addToast } = useToast();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const { data } = await API.post("/auth/admin/login", form);
      login(data);
      addToast("Admin logged in successfully.", "success");
      navigate("/admin/dashboard");
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.code === "NOT_ADMIN") {
        setError("This account is not an admin account. Use the setup page to create an admin account.");
      } else if (errorData?.code === "USER_NOT_FOUND") {
        setError("No account found with this email.");
      } else if (errorData?.code === "INVALID_PASSWORD") {
        setError("Invalid password. Please check your credentials.");
      } else {
        setError(errorData?.message || "Admin login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-wrap container">
      <section className="auth-copy">
        <p className="eyebrow">Admin Portal</p>
        <h1>Sign in to manage the system</h1>
        <p>Access the admin dashboard to manage menu, orders, drivers, and more.</p>
      </section>

      <form className="auth-form" onSubmit={onSubmit}>
        <h2>Admin Login</h2>
        {error && <p className="error">{error}</p>}
        <input
          type="email"
          placeholder="Admin Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
        <p className="muted small-text">
          New admin? <Link to="/admin/setup">Create admin account</Link>
        </p>
        <p className="muted small-text">
          <Link to="/login">Back to user login</Link>
        </p>
        <p className="muted small-text">
          <Link to="/driver/login">Driver Login</Link>
        </p>
      </form>
    </main>
  );
}

