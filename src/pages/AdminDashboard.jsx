import { useContext, useEffect, useState } from "react";
import API from "../api/client";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatINR } from "../utils/currency";
import { OrdersIcon, UsersIcon, CarIcon, CheckIcon, BoltIcon } from "../components/Icons";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState("monthly");
  const [refreshInterval, setRefreshInterval] = useState(null);
  const { addToast } = useToast();

  const isAdmin = user?.role === "admin";

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const { data } = await API.get(`/admin/dashboard-stats?period=${period}`);
      setStats(data);
    } catch (err) {
      console.error("Failed to load dashboard stats", err);
      setError(err.response?.data?.message || "Failed to load dashboard statistics");
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (isAdmin) {
      loadDashboardStats();
    }
  }, [isAdmin, period]);

  // Real-time refresh for active deliveries (every 30 seconds)
  useEffect(() => {
    if (isAdmin) {
      const interval = setInterval(() => {
        loadDashboardStats();
      }, 30000);
      setRefreshInterval(interval);
      
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  // Chart configurations
  const revenueChartData = {
    labels: stats?.revenue?.last30Days?.slice(-14).map(d => 
      new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    ) || [],
    datasets: [
      {
        label: "Revenue",
        data: stats?.revenue?.last30Days?.slice(-14).map(d => d.revenue) || [],
        borderColor: "#4f46e5",
        backgroundColor: "rgba(79, 70, 229, 0.1)",
        fill: true,
        tension: 0.4
      }
    ]
  };

  const ordersChartData = {
    labels: stats?.revenue?.last30Days?.slice(-14).map(d => 
      new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    ) || [],
    datasets: [
      {
        label: "Orders",
        data: stats?.revenue?.last30Days?.slice(-14).map(d => d.orders) || [],
        backgroundColor: "#10b981",
        borderRadius: 4
      }
    ]
  };

  const monthlyRevenueChartData = {
    labels: stats?.revenue?.monthly?.map(m => m.month) || [],
    datasets: [
      {
        label: "Monthly Revenue",
        data: stats?.revenue?.monthly?.map(m => m.revenue) || [],
        backgroundColor: [
          "rgba(79, 70, 229, 0.8)",
          "rgba(16, 185, 129, 0.8)",
          "rgba(245, 158, 11, 0.8)",
          "rgba(239, 68, 68, 0.8)",
          "rgba(236, 72, 153, 0.8)",
          "rgba(99, 102, 241, 0.8)"
        ],
        borderRadius: 8
      }
    ]
  };

  const orderStatusChartData = {
    labels: ["Completed", "Cancelled", "Pending/Active"],
    datasets: [
      {
        data: [
          stats?.orders?.completed || 0,
          stats?.orders?.cancelled || 0,
          (stats?.orders?.total || 0) - (stats?.orders?.completed || 0) - (stats?.orders?.cancelled || 0)
        ],
        backgroundColor: ["#10b981", "#ef4444", "#f59e0b"],
        borderWidth: 0
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.05)"
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  if (!user) {
    return (
      <main className="container section page-gap">
        <p className="error">Please login as admin to view dashboard.</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="container section page-gap">
        <p className="error">Only admin can view dashboard.</p>
      </main>
    );
  }

  return (
    <main className="container page-gap">
      <section className="section">
        <div className="dashboard-header">
          <h2>Admin Dashboard</h2>
          <div className="dashboard-controls">
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <button className="btn" onClick={loadDashboardStats}>
              Refresh
            </button>
          </div>
        </div>
        {error && <p className="error">{error}</p>}
      </section>

      {loading ? (
        <section className="section">
          <p>Loading dashboard...</p>
        </section>
      ) : stats && (
        <>
          {/* Key Metrics Cards */}
          <section className="section">
            <div className="card-grid">
              <article className="card stat-card">
                <div className="stat-icon revenue-icon">₹</div>
                <div className="stat-content">
                  <h4>Total Revenue</h4>
                  <p className="stat-value">{formatINR(stats.revenue?.total || 0)}</p>
                  <p className="stat-period">{period}: {formatINR(stats.revenue?.period || 0)}</p>
                </div>
              </article>
              
              <article className="card stat-card">
                <div className="stat-icon orders-icon"><OrdersIcon size={32} /></div>
                <div className="stat-content">
                  <h4>Total Orders</h4>
                  <p className="stat-value">{stats.orders?.total || 0}</p>
                  <p className="stat-period">{period}: {stats.orders?.period || 0}</p>
                </div>
              </article>
              
              <article className="card stat-card">
                <div className="stat-icon users-icon"><UsersIcon size={32} /></div>
                <div className="stat-content">
                  <h4>Total Users</h4>
                  <p className="stat-value">{stats.users?.total || 0}</p>
                  <p className="stat-period">Customers</p>
                </div>
              </article>
              
              <article className="card stat-card">
                <div className="stat-icon drivers-icon"><CarIcon size={32} /></div>
                <div className="stat-content">
                  <h4>Total Drivers</h4>
                  <p className="stat-value">{stats.drivers?.total || 0}</p>
                  <p className="stat-period">Active Drivers</p>
                </div>
              </article>
              
              <article className="card stat-card">
                <div className="stat-icon completion-icon"><CheckIcon size={32} /></div>
                <div className="stat-content">
                  <h4>Completion Rate</h4>
                  <p className="stat-value">{stats.orders?.completionRate || 0}%</p>
                  <p className="stat-period">
                    {stats.orders?.completed || 0} completed / {stats.orders?.cancelled || 0} cancelled
                  </p>
                </div>
              </article>
              
              <article className="card stat-card active-delivery">
                <div className="stat-icon active-icon"><BoltIcon size={32} /></div>
                <div className="stat-content">
                  <h4>Active Deliveries</h4>
                  <p className="stat-value">{stats.activeDeliveries?.count || 0}</p>
                  <p className="stat-period">Real-time</p>
                </div>
              </article>
            </div>
          </section>

          {/* Revenue & Orders Charts */}
          <section className="section">
            <div className="chart-grid">
              <article className="card chart-card">
                <h3>Revenue Trend (Last 14 Days)</h3>
                <div className="chart-container">
                  <Line data={revenueChartData} options={chartOptions} />
                </div>
              </article>
              
              <article className="card chart-card">
                <h3>Orders Trend (Last 14 Days)</h3>
                <div className="chart-container">
                  <Bar data={ordersChartData} options={chartOptions} />
                </div>
              </article>
            </div>
          </section>

          {/* Monthly Revenue & Order Status */}
          <section className="section">
            <div className="chart-grid">
              <article className="card chart-card">
                <h3>Monthly Revenue</h3>
                <div className="chart-container">
                  <Bar data={monthlyRevenueChartData} options={chartOptions} />
                </div>
              </article>
              
              <article className="card chart-card">
                <h3>Order Status Distribution</h3>
                <div className="chart-container doughnut-container">
                  <Doughnut 
                    data={orderStatusChartData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: "bottom"
                        }
                      }
                    }} 
                  />
                </div>
              </article>
            </div>
          </section>

          {/* Top Selling Items */}
          <section className="section">
            <article className="card">
              <h3>Top Selling Items</h3>
              {stats.topSellingItems && stats.topSellingItems.length > 0 ? (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Item Name</th>
                        <th>Total Quantity</th>
                        <th>Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.topSellingItems.map((item, index) => (
                        <tr key={item.itemId || index}>
                          <td>{index + 1}</td>
                          <td><span className="cell-content">{item.name}</span></td>
                          <td>{item.totalQuantity}</td>
                          <td>{formatINR(item.totalRevenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted">No data available</p>
              )}
            </article>
          </section>

          {/* Most Active Drivers */}
          <section className="section">
            <article className="card">
              <h3>Most Active Drivers</h3>
              {stats.mostActiveDrivers && stats.mostActiveDrivers.length > 0 ? (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Driver Name</th>
                        <th>Phone</th>
                        <th>Total Deliveries</th>
                        <th>Total Earnings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.mostActiveDrivers.map((driver, index) => (
                        <tr key={driver.driverId || index}>
                          <td>{index + 1}</td>
                          <td><span className="cell-content">{driver.driverName}</span></td>
                          <td>{driver.driverPhone}</td>
                          <td>{driver.totalDeliveries}</td>
                          <td>{formatINR(driver.totalEarnings)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted">No data available</p>
              )}
            </article>
          </section>

          {/* Cancelled Orders Report */}
          <section className="section">
            <article className="card">
              <h3>Cancelled Orders Report</h3>
              <div className="cancelled-summary">
                <div className="cancelled-stat">
                  <span className="cancelled-count">{stats.cancelledOrdersReport?.total || 0}</span>
                  <span className="cancelled-label">Total Cancelled</span>
                </div>
                <div className="cancelled-stat">
                  <span className="cancelled-count">{stats.cancelledOrdersReport?.periodTotal || 0}</span>
                  <span className="cancelled-label">{period} Cancelled</span>
                </div>
              </div>
              
              {stats.cancelledOrdersReport?.recent && stats.cancelledOrdersReport.recent.length > 0 && (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Reason</th>
                        <th>Cancelled At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.cancelledOrdersReport.recent.map((order) => (
                        <tr key={order._id}>
                          <td>#{order._id.slice(-6)}</td>
                          <td><span className="cell-content">{order.userName}</span></td>
                          <td>{formatINR(order.totalPrice)}</td>
                          <td><span className="cell-content break-word">{order.rejectReason || "No reason"}</span></td>
                          <td>{new Date(order.cancelledAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          </section>

          {/* Real-time Active Deliveries */}
          <section className="section">
            <article className="card">
              <div className="active-deliveries-header">
                <h3>Real-time Active Deliveries</h3>
                <span className="live-indicator">● Live</span>
              </div>
              {stats.activeDeliveries?.orders && stats.activeDeliveries.orders.length > 0 ? (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Status</th>
                        <th>Customer</th>
                        <th>Driver</th>
                        <th>Amount</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.activeDeliveries.orders.map((order) => (
                        <tr key={order._id}>
                          <td>#{order._id.slice(-6)}</td>
                          <td>
                            <span className={`status status-${order.status}`}>
                              {order.status?.replace("_", " ")}
                            </span>
                          </td>
                          <td><span className="cell-content">{order.customerName}</span></td>
                          <td><span className="cell-content">{order.driverName}</span></td>
                          <td>{formatINR(order.totalPrice)}</td>
                          <td>{new Date(order.createdAt).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted">No active deliveries at the moment</p>
              )}
            </article>
          </section>
        </>
      )}
    </main>
  );
}
