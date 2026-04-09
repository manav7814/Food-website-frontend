import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/client";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function DriverLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const { addToast } = useToast();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await API.post("/auth/driver/login", form);
      login(data);
      addToast("Logged in successfully.", "success");
      navigate("/driver/dashboard");
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.code === "DRIVER_NOT_FOUND") {
        setError("No driver account found with this email. Please register first.");
      } else if (errorData?.code === "DRIVER_PENDING_APPROVAL") {
        setError("Your driver account is pending approval. Please wait for admin to approve your registration.");
      } else if (errorData?.code === "DRIVER_BLOCKED") {
        setError("Your driver account has been blocked. Please contact support.");
      } else if (errorData?.code === "DRIVER_SUSPENDED") {
        setError(errorData.message || "Your driver account is suspended. Please contact support.");
      } else if (errorData?.code === "INVALID_PASSWORD") {
        setError("Invalid password. Please check your credentials.");
      } else {
        setError(err.response?.data?.message || "Login failed");
      }
    }
  };

  return (
    <main className="auth-wrap container">
      <section className="auth-copy">
        <p className="eyebrow">Driver Portal</p>
        <h1>Sign in to start delivering</h1>
        <p>Access your delivery dashboard, view assigned orders, and manage your deliveries.</p>
      </section>

      <form className="auth-form" onSubmit={onSubmit}>
        <h2>Driver Login</h2>
        {error && <p className="error">{error}</p>}
        <input
          type="email"
          placeholder="Email"
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
        <button className="btn" type="submit">
          Login
        </button>
        <p className="muted small-text">
          New driver? <Link to="/driver/register">Register here</Link>
        </p>
      </form>
    </main>
  );
}
