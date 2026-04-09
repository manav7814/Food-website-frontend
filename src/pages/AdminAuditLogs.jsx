import { useContext, useEffect, useState } from "react";
import API from "../api/client";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function AdminAuditLogs() {
  const { user } = useContext(AuthContext);
  const { addToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({
    action: "",
    entityType: "",
    startDate: "",
    endDate: "",
    page: 1,
    limit: 50
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  useEffect(() => {
    if (isAdmin) {
      loadLogs();
      loadSummary();
    }
  }, [isAdmin, filters.action, filters.entityType, filters.startDate, filters.endDate, filters.page]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.action) params.append("action", filters.action);
      if (filters.entityType) params.append("entityType", filters.entityType);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      params.append("page", filters.page);
      params.append("limit", filters.limit);
      
      const { data } = await API.get(`/api/admin/audit-logs?${params}`);
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (err) {
      addToast("Failed to load audit logs", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const { data } = await API.get("/api/admin/audit-logs/summary");
      setSummary(data);
    } catch (err) {
      console.error("Failed to load summary", err);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters({ ...filters, [name]: value, page: 1 });
  };

  const getActionBadge = (action) => {
    const badges = {
      CREATE: { class: "badge-create", color: "#10b981" },
      UPDATE: { class: "badge-update", color: "#3b82f6" },
      DELETE: { class: "badge-delete", color: "#ef4444" },
      LOGIN: { class: "badge-login", color: "#8b5cf6" },
      LOGOUT: { class: "badge-logout", color: "#6b7280" },
      MAINTENANCE_MODE: { class: "badge-maintenance", color: "#f59e0b" },
      BROADCAST_NOTIFICATION: { class: "badge-broadcast", color: "#ec4899" },
      ROLE_CHANGE: { class: "badge-role", color: "#14b8a6" },
      BANNER_CHANGE: { class: "badge-banner", color: "#f97316" },
      OFFER_CHANGE: { class: "badge-offer", color: "#06b6d4" },
      CATEGORY_VISIBILITY: { class: "badge-category", color: "#84cc16" }
    };
    const badge = badges[action] || { class: "", color: "#6b7280" };
    return <span className={`badge ${badge.class}`}>{action.replace(/_/g, " ")}</span>;
  };

  const getEntityBadge = (entityType) => {
    return <span className="badge badge-entity">{entityType}</span>;
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  if (!user) {
    return (
      <main className="container section page-gap">
        <p className="error">Please login as admin to view audit logs.</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="container section page-gap">
        <p className="error">Only admin can view audit logs.</p>
      </main>
    );
  }

  return (
    <main className="container page-gap">
      <section className="section">
        <h2>Audit Logs</h2>
        <p className="muted">
          Track all administrative actions and changes made in the system.
        </p>
      </section>

      {/* Summary Cards */}
      {summary && (
        <section className="section">
          <div className="summary-grid">
            <article className="card stat-card">
              <h4>Total Logs</h4>
              <p className="stat-value">{summary.totalLogs}</p>
            </article>
            <article className="card">
              <h4>By Action</h4>
              <div className="summary-list">
                {summary.byAction.map((item) => (
                  <div key={item._id} className="summary-item">
                    <span>{item._id || "Unknown"}</span>
                    <span className="summary-count">{item.count}</span>
                  </div>
                ))}
              </div>
            </article>
            <article className="card">
              <h4>By Entity</h4>
              <div className="summary-list">
                {summary.byEntityType.map((item) => (
                  <div key={item._id} className="summary-item">
                    <span>{item._id || "Unknown"}</span>
                    <span className="summary-count">{item.count}</span>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      )}

      {/* Filters */}
      <section className="section">
        <article className="card">
          <h4>Filters</h4>
          <div className="filter-grid">
            <div className="form-group">
              <label>Action</label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange("action", e.target.value)}
              >
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
                <option value="MAINTENANCE_MODE">Maintenance Mode</option>
                <option value="BROADCAST_NOTIFICATION">Broadcast Notification</option>
                <option value="ROLE_CHANGE">Role Change</option>
                <option value="BANNER_CHANGE">Banner Change</option>
                <option value="OFFER_CHANGE">Offer Change</option>
                <option value="CATEGORY_VISIBILITY">Category Visibility</option>
              </select>
            </div>
            <div className="form-group">
              <label>Entity Type</label>
              <select
                value={filters.entityType}
                onChange={(e) => handleFilterChange("entityType", e.target.value)}
              >
                <option value="">All Entities</option>
                <option value="USER">User</option>
                <option value="DRIVER">Driver</option>
                <option value="ORDER">Order</option>
                <option value="MENU_ITEM">Menu Item</option>
                <option value="RESTAURANT">Restaurant</option>
                <option value="BANNER">Banner</option>
                <option value="OFFER">Offer</option>
                <option value="SYSTEM">System</option>
                <option value="ROLE">Role</option>
              </select>
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
              />
            </div>
          </div>
        </article>
      </section>

      {/* Logs Table */}
      <section className="section">
        <article className="card">
          {loading ? (
            <p>Loading audit logs...</p>
          ) : logs.length === 0 ? (
            <p className="muted">No audit logs found.</p>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>Description</th>
                      <th>Performed By</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log._id}>
                        <td>
                          <div className="timestamp">
                            <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                            <span className="muted">{new Date(log.createdAt).toLocaleTimeString()}</span>
                          </div>
                        </td>
                        <td>{getActionBadge(log.action)}</td>
                        <td>{getEntityBadge(log.entityType)}</td>
                        <td className="description-cell">{log.description}</td>
                        <td>
                          <div className="user-cell">
                            <span>{log.performedByName}</span>
                            <span className="muted">{log.performedByRole}</span>
                          </div>
                        </td>
                        <td>
                          {(log.previousValue || log.newValue) && (
                            <button
                              className="btn btn-small"
                              onClick={() => alert(`Previous: ${formatValue(log.previousValue)}\nNew: ${formatValue(log.newValue)}`)}
                            >
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="pagination">
                  <button
                    className="btn btn-small"
                    disabled={filters.page === 1}
                    onClick={() => handleFilterChange("page", filters.page - 1)}
                  >
                    Previous
                  </button>
                  <span className="page-info">
                    Page {filters.page} of {pagination.pages} ({pagination.total} total)
                  </span>
                  <button
                    className="btn btn-small"
                    disabled={filters.page === pagination.pages}
                    onClick={() => handleFilterChange("page", filters.page + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </article>
      </section>

      <style>{`
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }
        
        .stat-card {
          text-align: center;
        }
        
        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #4f46e5;
        }
        
        .summary-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem;
          background: #f9fafb;
          border-radius: 4px;
        }
        
        .summary-count {
          font-weight: 600;
        }
        
        .filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        
        .form-group select,
        .form-group input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .badge {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          white-space: nowrap;
        }
        
        .badge-create { background: #d1fae5; color: #065f46; }
        .badge-update { background: #dbeafe; color: #1e40af; }
        .badge-delete { background: #fee2e2; color: #991b1b; }
        .badge-login { background: #ede9fe; color: #5b21b6; }
        .badge-logout { background: #f3f4f6; color: #374151; }
        .badge-maintenance { background: #fef3c7; color: #92400e; }
        .badge-broadcast { background: #fce7f3; color: #9d174d; }
        .badge-role { background: #ccfbf1; color: #0f766e; }
        .badge-banner { background: #ffedd5; color: #c2410c; }
        .badge-offer { background: #cffafe; color: #155e75; }
        .badge-category { background: #ecfccb; color: #3f6212; }
        .badge-entity { background: #e5e7eb; color: #374151; }
        
        .timestamp {
          display: flex;
          flex-direction: column;
          font-size: 0.875rem;
        }
        
        .description-cell {
          max-width: 250px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .user-cell {
          display: flex;
          flex-direction: column;
          font-size: 0.875rem;
        }
        
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #eee;
        }
        
        .page-info {
          font-size: 0.875rem;
        }
      `}</style>
    </main>
  );
}
