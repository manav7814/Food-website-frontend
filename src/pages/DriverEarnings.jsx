import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/client";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatINR } from "../utils/currency";
import { MoneyIcon, TrendingUpIcon, TrendingDownIcon, GiftIcon } from "../components/Icons";

export default function DriverEarnings() {
  const { user } = useContext(AuthContext);
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("daily");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== "driver") {
      navigate("/driver/login");
      return;
    }
    loadEarnings();
  }, [user, period]);

  const loadEarnings = async () => {
    try {
      setLoading(true);
      const { data } = await API.get(`/drivers/earnings?period=${period}`);
      setEarnings(data);
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to load earnings", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      addToast("Please enter a valid amount", "error");
      return;
    }
    if (amount > (earnings?.walletBalance || 0)) {
      addToast("Insufficient balance", "error");
      return;
    }

    setWithdrawing(true);
    try {
      await API.post("/drivers/withdraw", { amount, upiId: "", bankAccount: "" });
      addToast("Withdrawal request submitted successfully!", "success");
      setWithdrawAmount("");
      loadEarnings();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to submit withdrawal", "error");
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <main className="container section page-gap">
        <div className="loading">Loading earnings...</div>
      </main>
    );
  }

  return (
    <main className="container section page-gap">
      <div className="driver-earnings">
        <h1>My Earnings</h1>

        {/* Period Filter */}
        <div className="period-tabs">
          <button 
            className={`tab ${period === "daily" ? "active" : ""}`}
            onClick={() => setPeriod("daily")}
          >
            Today
          </button>
          <button 
            className={`tab ${period === "weekly" ? "active" : ""}`}
            onClick={() => setPeriod("weekly")}
          >
            This Week
          </button>
          <button 
            className={`tab ${period === "all" ? "active" : ""}`}
            onClick={() => setPeriod("all")}
          >
            All Time
          </button>
        </div>

        {/* Balance Cards */}
        <div className="balance-cards">
          <div className="balance-card primary">
            <div className="balance-icon"><MoneyIcon size={32} /></div>
            <div className="balance-info">
              <h3>Wallet Balance</h3>
              <p className="balance-amount">{formatINR(earnings?.walletBalance || 0)}</p>
            </div>
          </div>
          
          <div className="balance-card">
            <div className="balance-icon"><TrendingUpIcon size={32} /></div>
            <div className="balance-info">
              <h3>{period === "daily" ? "Today's" : period === "weekly" ? "This Week's" : "Total"} Earnings</h3>
              <p className="balance-amount">{formatINR(earnings?.periodEarnings || 0)}</p>
            </div>
          </div>
          
          <div className="balance-card">
            <div className="balance-icon"><GiftIcon size={32} /></div>
            <div className="balance-info">
              <h3>Bonuses</h3>
              <p className="balance-amount">{formatINR(earnings?.bonuses || 0)}</p>
            </div>
          </div>
          
          <div className="balance-card">
            <div className="balance-icon"><TrendingDownIcon size={32} /></div>
            <div className="balance-info">
              <h3>Penalties</h3>
              <p className="balance-amount">{formatINR(earnings?.penalties || 0)}</p>
            </div>
          </div>
        </div>

        {/* Withdrawal Form */}
        <div className="withdrawal-section">
          <h2>Withdraw Funds</h2>
          <form onSubmit={handleWithdraw} className="withdraw-form">
            <div className="form-group">
              <label>Amount to withdraw</label>
              <input
                type="number"
                placeholder="Enter amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                min="1"
                max={earnings?.walletBalance || 0}
              />
              <p className="muted">Available: {formatINR(earnings?.walletBalance || 0)}</p>
            </div>
            <button 
              type="submit" 
              className="btn"
              disabled={withdrawing || (earnings?.walletBalance || 0) <= 0}
            >
              {withdrawing ? "Processing..." : "Request Withdrawal"}
            </button>
          </form>
        </div>

        {/* Pending Withdrawal */}
        {earnings?.withdrawalRequests?.some(w => w.status === "pending") && (
          <div className="pending-withdrawal">
            <h3>⏳ Pending Withdrawal Requests</h3>
            {earnings.withdrawalRequests
              .filter(w => w.status === "pending")
              .map((req, idx) => (
                <div key={idx} className="withdrawal-request">
                  <span>{formatINR(req.amount)}</span>
                  <span className="pending">Pending</span>
                </div>
              ))}
          </div>
        )}

        {/* Earnings History */}
        <div className="earnings-history">
          <h2>Earnings History</h2>
          {earnings?.earningsHistory?.length === 0 ? (
            <p className="muted">No earnings yet.</p>
          ) : (
            <div className="history-list">
              {earnings?.earningsHistory?.slice(0, 20).map((item, idx) => (
                <div key={idx} className="history-item">
                  <div className="history-info">
                    <span className="history-desc">{item.description || item.type}</span>
                    <span className="history-date">
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`history-amount ${item.amount >= 0 ? "positive" : "negative"}`}>
                    {item.amount >= 0 ? "+" : ""}{formatINR(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
