import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/client";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function DriverProfile() {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    vehicleType: "bike",
    vehicleNumber: "",
    licenseNumber: ""
  });
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== "driver") {
      navigate("/driver/login");
      return;
    }
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/drivers/profile/me");
      setProfile(data);
      setForm({
        name: data.name || "",
        phone: data.phone || "",
        vehicleType: data.vehicleType || "bike",
        vehicleNumber: data.vehicleNumber || "",
        licenseNumber: data.licenseNumber || ""
      });
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to load profile", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await API.put("/drivers/profile", form);
      setProfile(data);
      addToast("Profile updated successfully", "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentUpload = async (docType) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      // In production, you'd upload to a server/cloud storage
      // For now, we'll just store the file name as a placeholder
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const docField = docType === "license" ? "licenseImage" : 
                          docType === "vehicle" ? "vehicleImage" : "insuranceImage";
          const { data } = await API.put("/drivers/documents", {
            [docField]: reader.result // Base64 for demo
          });
          addToast(`${docType} document uploaded successfully`, "success");
          loadProfile();
        } catch (err) {
          addToast("Failed to upload document", "error");
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  if (loading) {
    return (
      <main className="container section page-gap">
        <div className="loading">Loading profile...</div>
      </main>
    );
  }

  return (
    <main className="container section page-gap">
      <div className="driver-profile">
        <h1>My Profile</h1>
        
        {/* Profile Status */}
        <div className="profile-status">
          <div className={`status-badge ${profile?.isVerified ? "verified" : "pending"}`}>
            {profile?.isVerified ? "✅ Verified" : "⏳ Pending Verification"}
          </div>
          <div className={`status-badge ${profile?.status}`}>
            {profile?.status === "available" ? "🟢 Online" : 
             profile?.status === "busy" ? "🔴 Busy" : "⚫ Offline"}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Vehicle Type</label>
            <select
              value={form.vehicleType}
              onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
            >
              <option value="bike">Bike</option>
              <option value="scooter">Scooter</option>
              <option value="car">Car</option>
              <option value="van">Van</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Vehicle Number</label>
            <input
              type="text"
              value={form.vehicleNumber}
              onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
              required
            />
          </div>
          
          <div className="form-group">
            <label>License Number</label>
            <input
              type="text"
              value={form.licenseNumber}
              onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
              required
            />
          </div>
          
          <button type="submit" className="btn" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>

        {/* Documents Section */}
        <div className="documents-section">
          <h2>Documents</h2>
          <p className="muted">Upload your documents for verification</p>
          
          <div className="documents-list">
            <div className="document-item">
              <div className="document-info">
                <h4>Driving License</h4>
                <span className={profile?.documents?.licenseImage ? "uploaded" : "not-uploaded"}>
                  {profile?.documents?.licenseImage ? "✅ Uploaded" : "❌ Not uploaded"}
                </span>
              </div>
              <button 
                className="btn btn-sm" 
                onClick={() => handleDocumentUpload("license")}
              >
                {profile?.documents?.licenseImage ? "Update" : "Upload"}
              </button>
            </div>
            
            <div className="document-item">
              <div className="document-info">
                <h4>Vehicle Image</h4>
                <span className={profile?.documents?.vehicleImage ? "uploaded" : "not-uploaded"}>
                  {profile?.documents?.vehicleImage ? "✅ Uploaded" : "❌ Not uploaded"}
                </span>
              </div>
              <button 
                className="btn btn-sm" 
                onClick={() => handleDocumentUpload("vehicle")}
              >
                {profile?.documents?.vehicleImage ? "Update" : "Upload"}
              </button>
            </div>
            
            <div className="document-item">
              <div className="document-info">
                <h4>Vehicle Insurance</h4>
                <span className={profile?.documents?.insuranceImage ? "uploaded" : "not-uploaded"}>
                  {profile?.documents?.insuranceImage ? "✅ Uploaded" : "❌ Not uploaded"}
                </span>
              </div>
              <button 
                className="btn btn-sm" 
                onClick={() => handleDocumentUpload("insurance")}
              >
                {profile?.documents?.insuranceImage ? "Update" : "Upload"}
              </button>
            </div>
          </div>
        </div>

        {/* Performance Stats */}
        <div className="performance-section">
          <h2>Performance</h2>
          <div className="stats-row">
            <div className="stat">
              <span className="label">Total Deliveries</span>
              <span className="value">{profile?.totalDeliveries || 0}</span>
            </div>
            <div className="stat">
              <span className="label">Rating</span>
              <span className="value">⭐ {profile?.rating?.toFixed(1) || "5.0"}</span>
            </div>
            <div className="stat">
              <span className="label">Total Earnings</span>
              <span className="value">₹{profile?.totalEarnings || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
