import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/client";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useContext } from "react";

export default function DriverRegister() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    vehicleType: "bike",
    vehicleNumber: "",
    licenseNumber: ""
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const { addToast } = useToast();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await API.post("/auth/driver/register", form);
      login(data);
      addToast("Registration submitted. Please wait for admin approval.", "success");
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <main className="auth-wrap container">
      <section className="auth-copy">
        <p className="eyebrow">Driver Portal</p>
        <h1>Join our delivery team</h1>
        <p>Register as a driver to start delivering orders. Your account will need admin approval before you can start.</p>
      </section>

      <form className="auth-form" onSubmit={onSubmit}>
        <h2>Driver Registration</h2>
        {error && <p className="error">{error}</p>}
        <input
          type="text"
          placeholder="Full Name"
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
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <input
          type="tel"
          placeholder="Phone Number"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          required
        />
        <select
          value={form.vehicleType}
          onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
        >
          <option value="bike">Bike</option>
          <option value="scooter">Scooter</option>
          <option value="car">Car</option>
          <option value="van">Van</option>
        </select>
        <input
          type="text"
          placeholder="Vehicle Number"
          value={form.vehicleNumber}
          onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="License Number"
          value={form.licenseNumber}
          onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
          required
        />
        <button className="btn" type="submit">
          Register
        </button>
        <p className="muted small-text">
          Already a driver? <Link to="/driver/login">Login here</Link>
        </p>
      </form>
    </main>
  );
}
