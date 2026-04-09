import { useContext, useEffect, useState } from "react";
import API from "../api/client";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function AdminRoles() {
  const { user: currentUser } = useContext(AuthContext);
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState(null);

  const isSuperAdmin = currentUser?.role === "super_admin";

  useEffect(() => {
    if (isSuperAdmin) {
      loadUsers();
    }
  }, [isSuperAdmin, filter]);

  const loadUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.append("role", filter);
      if (search) params.append("search", search);
      
      const { data } = await API.get(`/api/admin/users?${params}`);
      setUsers(data);
    } catch (err) {
      addToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadUsers();
  };

  const handleRoleChange = async (userId, newRole) => {
    if (!confirm(`Are you sure you want to change this user's role to "${newRole}"?`)) return;
    
    setUpdating(userId);
    try {
      await API.patch(`/api/admin/users/${userId}/role`, { role: newRole });
      addToast("Role updated successfully", "success");
      loadUsers();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to update role", "error");
    } finally {
      setUpdating(null);
    }
  };

  const getRoleBadge = (role) => {
    const roles = {
      super_admin: { class: "badge-super", label: "Super Admin" },
      admin: { class: "badge-admin", label: "Admin" },
      manager: { class: "badge-manager", label: "Manager" },
      customer: { class: "badge-customer", label: "Customer" }
    };
    const roleInfo = roles[role] || roles.customer;
    return <span className={`badge ${roleInfo.class}`}>{roleInfo.label}</span>;
  };

  if (!currentUser) {
    return (
      <main className="container section page-gap">
        <p className="error">Please login to view role management.</p>
      </main>
    );
  }

  if (!isSuperAdmin) {
    return (
      <main className="container section page-gap">
        <p className="error">Only Super Admin can manage roles.</p>
      </main>
    );
  }

  return (
    <main className="container page-gap">
      <section className="section">
        <h2>Role Management</h2>
        <p className="muted">
          Manage user roles and permissions. Only Super Admin can assign the Super Admin role.
        </p>
      </section>

      <section className="section">
        <div className="filters">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn">Search</button>
          </form>
          
          <div className="filter-buttons">
            <button
              className={`btn btn-small ${filter === "all" ? "btn-primary" : ""}`}
              onClick={() => setFilter("all")}
            >
              All
            </button>
            <button
              className={`btn btn-small ${filter === "super_admin" ? "btn-primary" : ""}`}
              onClick={() => setFilter("super_admin")}
            >
              Super Admins
            </button>
            <button
              className={`btn btn-small ${filter === "admin" ? "btn-primary" : ""}`}
              onClick={() => setFilter("admin")}
            >
              Admins
            </button>
            <button
              className={`btn btn-small ${filter === "manager" ? "btn-primary" : ""}`}
              onClick={() => setFilter("manager")}
            >
              Managers
            </button>
            <button
              className={`btn btn-small ${filter === "customer" ? "btn-primary" : ""}`}
              onClick={() => setFilter("customer")}
            >
              Customers
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="section">
          <p>Loading users...</p>
        </section>
      ) : users.length === 0 ? (
        <section className="section">
          <article className="card">
            <p className="muted">No users found.</p>
          </article>
        </section>
      ) : (
        <section className="section">
          <article className="card">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td>
                        <div className="user-info">
                          <span className="user-name">{user.name}</span>
                          {user._id === currentUser._id && (
                            <span className="badge badge-you">(You)</span>
                          )}
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>{getRoleBadge(user.role)}</td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        {user._id === currentUser._id ? (
                          <span className="muted">Cannot change own role</span>
                        ) : updating === user._id ? (
                          <span>Updating...</span>
                        ) : (
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user._id, e.target.value)}
                            className="role-select"
                            disabled={user.role === "super_admin" && currentUser.role !== "super_admin"}
                          >
                            <option value="customer">Customer</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}

      <style>{`
        .filters {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .search-form {
          display: flex;
          gap: 0.5rem;
        }
        
        .search-form input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .filter-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        
        .badge {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        
        .badge-super {
          background: #7c3aed;
          color: white;
        }
        
        .badge-admin {
          background: #dc2626;
          color: white;
        }
        
        .badge-manager {
          background: #2563eb;
          color: white;
        }
        
        .badge-customer {
          background: #e5e7eb;
          color: #374151;
        }
        
        .badge-you {
          background: #10b981;
          color: white;
          margin-left: 0.5rem;
        }
        
        .user-info {
          display: flex;
          align-items: center;
        }
        
        .role-select {
          padding: 0.25rem 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
        }
      `}</style>
    </main>
  );
}
