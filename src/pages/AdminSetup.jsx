import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/client";
import { AuthContext } from "../context/AuthContext";

export default function AdminSetup() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    setupKey: ""
  });
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      console.log("Submitting admin setup with:", form);
      const { data } = await API.post("/auth/bootstrap-admin", form);
      console.log("Admin setup success:", data);
      login(data);
      navigate("/admin/menu");
    } catch (err) {
      console.error("Admin setup error:", err);
      setError(err.response?.data?.message || err.message || "Admin setup failed");
    }
  };

  return (
    <main className="auth-wrap container">
      <section className="auth-copy">
        <p className="eyebrow">Admin Setup</p>
        <h1>Create or promote an admin account</h1>
        <p>Use your backend `ADMIN_SETUP_KEY` to enable admin access for menu management.</p>
      </section>
      <form className="auth-form" onSubmit={onSubmit}>
        <h2>Admin Setup</h2>
        {error && <p className="error">{error}</p>}
        <input
          type="text"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          required
        />
        <input
          type="password"
          placeholder="Password"
          minLength="6"
          value={form.password}
          onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          required
        />
        <input
          type="text"
          placeholder="Admin setup key"
          value={form.setupKey}
          onChange={(e) => setForm((prev) => ({ ...prev, setupKey: e.target.value }))}
          required
        />
        <button className="btn" type="submit">
          Enable Admin
        </button>
      </form>
    </main>
  );
}
