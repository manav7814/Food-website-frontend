import { useContext, useEffect, useMemo, useState } from "react";
import API from "../api/client";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatINR } from "../utils/currency";

export default function AdminFinancial() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("revenue");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [period, setPeriod] = useState("monthly");
  
  // Data states
  const [revenueData, setRevenueData] = useState(null);
  const [commissionData, setCommissionData] = useState(null);
  const [payoutData, setPayoutData] = useState(null);
  const [gstData, setGstData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  
  const { addToast } = useToast();
  const isAdmin = user?.role === "admin";

  // Load dashboard data on mount
  useEffect(() => {
    if (isAdmin) {
      loadDashboard();
    }
  }, [isAdmin]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/financial/dashboard");
      setDashboardData(data);
    } catch (err) {
      console.error("Failed to load dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  const loadRevenue = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);
      if (period) params.append("period", period);
      
      const { data } = await API.get(`/financial/revenue?${params.toString()}`);
      setRevenueData(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load revenue data");
    } finally {
      setLoading(false);
    }
  };

  const loadCommissions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);
      
      const { data } = await API.get(`/financial/driver-commissions?${params.toString()}`);
      setCommissionData(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load commission data");
    } finally {
      setLoading(false);
    }
  };

  const loadPayouts = async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/financial/payouts");
      setPayoutData(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load payout data");
    } finally {
      setLoading(false);
    }
  };

  const loadGST = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);
      
      const { data } = await API.get(`/financial/gst?${params.toString()}`);
      setGstData(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load GST data");
    } finally {
      setLoading(false);
    }
  };

  // Load data when tab changes
  useEffect(() => {
    if (!isAdmin) return;
    
    switch (activeTab) {
      case "revenue":
        loadRevenue();
        break;
      case "commissions":
        loadCommissions();
        break;
      case "payouts":
        loadPayouts();
        break;
      case "gst":
        loadGST();
        break;
      default:
        break;
    }
  }, [activeTab, dateRange, period, isAdmin]);

  const handleApproveWithdrawal = async (driverId, withdrawalId) => {
    if (!confirm("Are you sure you want to approve this withdrawal?")) return;
    
    try {
      await API.post(`/financial/withdrawals/${driverId}/${withdrawalId}/approve`);
      addToast("Withdrawal approved successfully!", "success");
      loadPayouts();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to approve withdrawal", "error");
    }
  };

  const handleRejectWithdrawal = async (driverId, withdrawalId) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (!reason) return;
    
    try {
      await API.post(`/financial/withdrawals/${driverId}/${withdrawalId}/reject`, { reason });
      addToast("Withdrawal rejected!", "success");
      loadPayouts();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to reject withdrawal", "error");
    }
  };

  const exportReport = async (type) => {
    try {
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);
      
      const response = await API.get(`/financial/export/${type}?${params.toString()}`, {
        responseType: "blob"
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${type}_report_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      addToast(`${type} report downloaded!`, "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to export report", "error");
    }
  };

  if (!user) {
    return (
      <main className="container section page-gap">
        <p className="error">Please login as admin to view financial data.</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="container section page-gap">
        <p className="error">Only admin can view financial data.</p>
      </main>
    );
  }

  return (
    <main className="container page-gap">
      <section className="section">
        <h2>Financial Management</h2>
        {error && <p className="error">{error}</p>}
        
        {/* Date Range Filter */}
        <div className="menu-toolbar">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            placeholder="Start Date"
          />
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            placeholder="End Date"
          />
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => { setActiveTab("dashboard"); loadDashboard(); }}
          >
            Dashboard
          </button>
          <button 
            className={`tab ${activeTab === "revenue" ? "active" : ""}`}
            onClick={() => setActiveTab("revenue")}
          >
            Revenue
          </button>
          <button 
            className={`tab ${activeTab === "commissions" ? "active" : ""}`}
            onClick={() => setActiveTab("commissions")}
          >
            Driver Commissions
          </button>
          <button 
            className={`tab ${activeTab === "payouts" ? "active" : ""}`}
            onClick={() => setActiveTab("payouts")}
          >
            Payouts
          </button>
          <button 
            className={`tab ${activeTab === "gst" ? "active" : ""}`}
            onClick={() => setActiveTab("gst")}
          >
            GST Reports
          </button>
          <button 
            className={`tab ${activeTab === "export" ? "active" : ""}`}
            onClick={() => setActiveTab("export")}
          >
            Export
          </button>
        </div>
      </section>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <section className="section">
          <h3>Financial Overview</h3>
          {loading && <p>Loading...</p>}
          {dashboardData && (
            <div className="card-grid">
              <article className="card">
                <div className="card-content">
                  <h4>Monthly Revenue</h4>
                  <p className="stat-value">{formatINR(dashboardData.revenue.currentMonth)}</p>
                  <p className={`stat-change ${dashboardData.revenue.growth >= 0 ? "positive" : "negative"}`}>
                    {dashboardData.revenue.growth >= 0 ? "↑" : "↓"} {Math.abs(dashboardData.revenue.growth).toFixed(1)}% from last month
                  </p>
                </div>
              </article>
              <article className="card">
                <div className="card-content">
                  <h4>Total Orders</h4>
                  <p className="stat-value">{dashboardData.orders.currentMonth}</p>
                  <p className={`stat-change ${dashboardData.orders.growth >= 0 ? "positive" : "negative"}`}>
                    {dashboardData.orders.growth >= 0 ? "↑" : "↓"} {Math.abs(dashboardData.orders.growth).toFixed(1)}% from last month
                  </p>
                </div>
              </article>
              <article className="card">
                <div className="card-content">
                  <h4>Platform Commission</h4>
                  <p className="stat-value">{formatINR(dashboardData.commission.currentMonth)}</p>
                  <p className="muted">Rate: {dashboardData.commission.rate}%</p>
                </div>
              </article>
              <article className="card">
                <div className="card-content">
                  <h4>Driver Earnings</h4>
                  <p className="stat-value">{formatINR(dashboardData.driverEarnings.currentMonth)}</p>
                  <p className="muted">This month</p>
                </div>
              </article>
              <article className="card">
                <div className="card-content">
                  <h4>Pending Withdrawals</h4>
                  <p className="stat-value">{formatINR(dashboardData.pendingWithdrawals)}</p>
                  <p className="muted">Awaiting approval</p>
                </div>
              </article>
              <article className="card">
                <div className="card-content">
                  <h4>Avg Order Value</h4>
                  <p className="stat-value">{formatINR(dashboardData.averageOrderValue)}</p>
                  <p className="muted">Per order</p>
                </div>
              </article>
            </div>
          )}
        </section>
      )}

      {/* Revenue Tab */}
      {activeTab === "revenue" && (
        <section className="section">
          <h3>Revenue Breakdown</h3>
          {loading && <p>Loading...</p>}
          {revenueData && (
            <>
              <div className="card-grid">
                <article className="card">
                  <div className="card-content">
                    <h4>Total Revenue</h4>
                    <p className="stat-value">{formatINR(revenueData.totalRevenue)}</p>
                  </div>
                </article>
                <article className="card">
                  <div className="card-content">
                    <h4>Net Revenue</h4>
                    <p className="stat-value">{formatINR(revenueData.netRevenue)}</p>
                    <p className="muted">After driver earnings</p>
                  </div>
                </article>
                <article className="card">
                  <div className="card-content">
                    <h4>Platform Commission</h4>
                    <p className="stat-value">{formatINR(revenueData.platformCommission)}</p>
                  </div>
                </article>
                <article className="card">
                  <div className="card-content">
                    <h4>Total Orders</h4>
                    <p className="stat-value">{revenueData.totalOrders}</p>
                  </div>
                </article>
              </div>
              
              <h4>Revenue by Payment Method</h4>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Payment Method</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(revenueData.revenueByPaymentMethod || {}).map(([method, amount]) => (
                    <tr key={method}>
                      <td>{method.toUpperCase()}</td>
                      <td>{formatINR(amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>
      )}

      {/* Commissions Tab */}
      {activeTab === "commissions" && (
        <section className="section">
          <h3>Driver Commissions</h3>
          {loading && <p>Loading...</p>}
          {commissionData && (
            <>
              <div className="card-grid">
                <article className="card">
                  <div className="card-content">
                    <h4>Total Drivers</h4>
                    <p className="stat-value">{commissionData.summary.totalDrivers}</p>
                  </div>
                </article>
                <article className="card">
                  <div className="card-content">
                    <h4>Total Deliveries</h4>
                    <p className="stat-value">{commissionData.summary.totalDeliveries}</p>
                  </div>
                </article>
                <article className="card">
                  <div className="card-content">
                    <h4>Total Commission</h4>
                    <p className="stat-value">{formatINR(commissionData.summary.totalCommission)}</p>
                  </div>
                </article>
                <article className="card">
                  <div className="card-content">
                    <h4>Total Driver Earnings</h4>
                    <p className="stat-value">{formatINR(commissionData.summary.totalDriverEarnings)}</p>
                  </div>
                </article>
              </div>
              
              <h4>Driver Commission Details</h4>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>Phone</th>
                    <th>Deliveries</th>
                    <th>Order Value</th>
                    <th>Commission</th>
                    <th>Driver Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {commissionData.drivers.map((driver) => (
                    <tr key={driver.driverId}>
                      <td>{driver.driverName}</td>
                      <td>{driver.driverPhone}</td>
                      <td>{driver.totalDeliveries}</td>
                      <td>{formatINR(driver.totalOrderValue)}</td>
                      <td>{formatINR(driver.totalCommission)}</td>
                      <td>{formatINR(driver.totalDriverEarnings)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>
      )}

      {/* Payouts Tab */}
      {activeTab === "payouts" && (
        <section className="section">
          <h3>Payout Management</h3>
          {loading && <p>Loading...</p>}
          {payoutData && (
            <>
              <div className="card-grid">
                <article className="card">
                  <div className="card-content">
                    <h4>Pending</h4>
                    <p className="stat-value">{payoutData.summary.pending}</p>
                    <p className="muted">{formatINR(payoutData.summary.totalPendingAmount)}</p>
                  </div>
                </article>
                <article className="card">
                  <div className="card-content">
                    <h4>Approved</h4>
                    <p className="stat-value">{payoutData.summary.approved}</p>
                    <p className="muted">{formatINR(payoutData.summary.totalApprovedAmount)}</p>
                  </div>
                </article>
                <article className="card">
                  <div className="card-content">
                    <h4>Rejected</h4>
                    <p className="stat-value">{payoutData.summary.rejected}</p>
                    <p className="muted">{formatINR(payoutData.summary.totalRejectedAmount)}</p>
                  </div>
                </article>
              </div>
              
              <h4>Withdrawal Requests</h4>
              {payoutData.withdrawals.length === 0 ? (
                <p className="muted">No withdrawal requests found.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Driver</th>
                      <th>Phone</th>
                      <th>Amount</th>
                      <th>Bank/UPI</th>
                      <th>Status</th>
                      <th>Requested</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payoutData.withdrawals.map((withdrawal) => (
                      <tr key={withdrawal._id}>
                        <td>{withdrawal.driverName}</td>
                        <td>{withdrawal.driverPhone}</td>
                        <td>{formatINR(withdrawal.amount)}</td>
                        <td>{withdrawal.bankAccount || withdrawal.upiId || "N/A"}</td>
                        <td>
                          <span className={`status status-${withdrawal.status === "approved" ? "confirmed" : withdrawal.status === "pending" ? "pending" : "cancelled"}`}>
                            {withdrawal.status}
                          </span>
                        </td>
                        <td>{new Date(withdrawal.requestedAt).toLocaleDateString()}</td>
                        <td>
                          {withdrawal.status === "pending" && (
                            <div className="admin-actions">
                              <button 
                                className="btn btn-secondary"
                                onClick={() => handleApproveWithdrawal(withdrawal.driverId, withdrawal._id)}
                              >
                                Approve
                              </button>
                              <button 
                                className="btn btn-ghost"
                                onClick={() => handleRejectWithdrawal(withdrawal.driverId, withdrawal._id)}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </section>
      )}

      {/* GST Tab */}
      {activeTab === "gst" && (
        <section className="section">
          <h3>GST Reports</h3>
          {loading && <p>Loading...</p>}
          {gstData && (
            <>
              <div className="card-grid">
                <article className="card">
                  <div className="card-content">
                    <h4>Total Amount</h4>
                    <p className="stat-value">{formatINR(gstData.summary.totalAmount)}</p>
                  </div>
                </article>
                <article className="card">
                  <div className="card-content">
                    <h4>Base Amount</h4>
                    <p className="stat-value">{formatINR(gstData.summary.baseAmount)}</p>
                  </div>
                </article>
                <article className="card">
                  <div className="card-content">
                    <h4>Total GST</h4>
                    <p className="stat-value">{formatINR(gstData.summary.totalGST)}</p>
                    <p className="muted">Rate: {gstData.summary.gstRate}%</p>
                  </div>
                </article>
                <article className="card">
                  <div className="card-content">
                    <h4>CGST</h4>
                    <p className="stat-value">{formatINR(gstData.summary.cgst)}</p>
                    <p className="muted">9%</p>
                  </div>
                </article>
                <article className="card">
                  <div className="card-content">
                    <h4>SGST</h4>
                    <p className="stat-value">{formatINR(gstData.summary.sgst)}</p>
                    <p className="muted">9%</p>
                  </div>
                </article>
              </div>
              
              <h4>GST Invoices</h4>
              {gstData.invoices.length === 0 ? (
                <p className="muted">No invoices found for the selected period.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Invoice No</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Base Amount</th>
                      <th>GST</th>
                      <th>Payment Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gstData.invoices.slice(0, 50).map((invoice) => (
                      <tr key={invoice.invoiceNumber}>
                        <td>{invoice.invoiceNumber}</td>
                        <td>{new Date(invoice.date).toLocaleDateString()}</td>
                        <td>{formatINR(invoice.amount)}</td>
                        <td>{formatINR(invoice.baseAmount)}</td>
                        <td>{formatINR(invoice.gstAmount)}</td>
                        <td>{invoice.paymentMethod}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {gstData.invoices.length > 50 && (
                <p className="muted">Showing first 50 of {gstData.invoices.length} invoices. Export to see all.</p>
              )}
            </>
          )}
        </section>
      )}

      {/* Export Tab */}
      {activeTab === "export" && (
        <section className="section">
          <h3>Export Reports</h3>
          <p className="muted">Download reports in CSV format for the selected date range.</p>
          
          <div className="card-grid">
            <article className="card">
              <div className="card-content">
                <h4>Revenue Report</h4>
                <p className="muted">Complete revenue breakdown with order details</p>
                <button className="btn" onClick={() => exportReport("revenue")}>
                  Export CSV
                </button>
              </div>
            </article>
            <article className="card">
              <div className="card-content">
                <h4>Commission Report</h4>
                <p className="muted">Driver commissions and earnings breakdown</p>
                <button className="btn" onClick={() => exportReport("commissions")}>
                  Export CSV
                </button>
              </div>
            </article>
            <article className="card">
              <div className="card-content">
                <h4>Payout Report</h4>
                <p className="muted">All withdrawal requests and their status</p>
                <button className="btn" onClick={() => exportReport("payouts")}>
                  Export CSV
                </button>
              </div>
            </article>
            <article className="card">
              <div className="card-content">
                <h4>GST Report</h4>
                <p className="muted">GST details with invoice-wise breakdown</p>
                <button className="btn" onClick={() => exportReport("gst")}>
                  Export CSV
                </button>
              </div>
            </article>
          </div>
        </section>
      )}
    </main>
  );
}
