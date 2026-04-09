import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/client";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const { addToast } = useToast();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await API.post("/auth/login", form);
      login(data);
      addToast("Logged in successfully.", "success");
      navigate("/");
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.code === "USER_NOT_FOUND") {
        setError("No account found with this email. Please register or check your email.");
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
        <p className="eyebrow">Welcome back</p>
        <h1>Sign in to manage your orders and cart</h1>
        <p>Track deliveries, reorder favorites, and checkout faster with saved account details.</p>
      </section>

      <form className="auth-form" onSubmit={onSubmit}>
        <h2>Login</h2>
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
          New here? <Link to="/register">Create an account</Link>
        </p>
        <p className="muted small-text">
          <Link to="/admin/login">Admin Login</Link>
        </p>
      </form>
    </main>
  );
}
