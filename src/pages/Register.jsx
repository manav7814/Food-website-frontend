import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/client";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const { addToast } = useToast();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await API.post("/auth/register", form);
      login(data);
      addToast("Account created successfully.", "success");
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <main className="auth-wrap container">
      <section className="auth-copy">
        <p className="eyebrow">Create account</p>
        <h1>Join FoodHub and start ordering smarter</h1>
        <p>Set up your profile once and enjoy seamless checkout and personalized ordering.</p>
      </section>

      <form className="auth-form" onSubmit={onSubmit}>
        <h2>Register</h2>
        {error && <p className="error">{error}</p>}
        <input
          type="text"
          placeholder="Full name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Password (min 6 chars)"
          minLength="6"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <button className="btn" type="submit">
          Create Account
        </button>
        <p className="muted small-text">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </main>
  );
}
