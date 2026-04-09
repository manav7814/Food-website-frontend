import { useContext, useEffect, useState } from "react";
import API from "../api/client";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { formatINR } from "../utils/currency";
import DeliveryLocation from "../components/DeliveryLocation";

const fallbackDishImage =
  "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80";

export default function Cart() {
  const { user } = useContext(AuthContext);
  const { items, removeFromCart, increaseQuantity, decreaseQuantity, clearCart, total } =
    useContext(CartContext);
  const [deliveryData, setDeliveryData] = useState({
    address: "",
    coordinates: null,
    city: "",
    distanceKm: null,
    isWithinDeliveryArea: false,
    isAddressSelected: false
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    cardExpiry: "",
    cardCvv: "",
    cardName: ""
  });
  const [upiId, setUpiId] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const { addToast } = useToast();
const [restaurantConfig, setRestaurantConfig] = useState({
    lat: Number(import.meta.env.VITE_RESTAURANT_LAT || 23.0225),
    lng: Number(import.meta.env.VITE_RESTAURANT_LNG || 72.5714),
    radiusKm: Number(import.meta.env.VITE_DELIVERY_RADIUS_KM || 30)
  });

  // Offers state
  const [availableOffers, setAvailableOffers] = useState([]);
  const [appliedOffer, setAppliedOffer] = useState(null);
  const [offerCode, setOfferCode] = useState("");
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [applyingOffer, setApplyingOffer] = useState(false);

  useEffect(() => {
    const loadDeliveryConfig = async () => {
      try {
        const { data } = await API.get("/restaurants/delivery-config");
        setRestaurantConfig((prev) => ({
          lat: Number.isFinite(Number(data.lat)) ? Number(data.lat) : prev.lat,
          lng: Number.isFinite(Number(data.lng)) ? Number(data.lng) : prev.lng,
          radiusKm:
            Number.isFinite(Number(data.radiusKm)) && Number(data.radiusKm) > 0
              ? Number(data.radiusKm)
              : prev.radiusKm
        }));
      } catch {
        // Fallback to env values.
      }
    };
    loadDeliveryConfig();
  }, []);

  // Fetch available offers
  useEffect(() => {
    const loadOffers = async () => {
      try {
        const { data } = await API.get("/offers");
        setAvailableOffers(data);
      } catch (error) {
        console.error("Failed to load offers:", error);
      } finally {
        setLoadingOffers(false);
      }
    };
    loadOffers();
  }, []);

  // Calculate discount
  const calculateDiscount = (offer) => {
    if (!offer) return 0;
    let discount = 0;
    if (offer.discountType === "percentage") {
      discount = (total * offer.discountValue) / 100;
      if (offer.maxDiscountValue) {
        discount = Math.min(discount, offer.maxDiscountValue);
      }
    } else {
      discount = offer.discountValue;
    }
    return discount;
  };

  // Apply offer from available list
  const handleApplyOffer = async (offer) => {
    setApplyingOffer(true);
    try {
      const { data } = await API.post("/offers/validate", {
        code: offer.code,
        orderValue: total
      });
      
      if (data.valid) {
        setAppliedOffer(data.offer);
        setOfferCode(offer.code);
        addToast(`Offer "${offer.code}" applied successfully!`, "success");
      }
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to apply offer", "error");
    } finally {
      setApplyingOffer(false);
    }
  };

  // Apply offer by code
  const handleApplyOfferByCode = async (e) => {
    e.preventDefault();
    if (!offerCode.trim()) return;
    
    setApplyingOffer(true);
    try {
      const { data } = await API.post("/offers/validate", {
        code: offerCode,
        orderValue: total
      });
      
      if (data.valid) {
        setAppliedOffer(data.offer);
        addToast(`Offer "${data.offer.code}" applied successfully!`, "success");
      }
    } catch (error) {
      addToast(error.response?.data?.message || "Invalid offer code", "error");
    } finally {
      setApplyingOffer(false);
    }
  };

  // Remove applied offer
  const handleRemoveOffer = () => {
    setAppliedOffer(null);
    setOfferCode("");
    addToast("Offer removed", "info");
  };

  // Calculate totals
  const discount = appliedOffer ? calculateDiscount(appliedOffer) : 0;
  const finalTotal = Math.max(0, total - discount);

  const placeOrder = async () => {
    if (!user) {
      addToast("Please login before placing an order.", "error");
      return;
    }

    if (!deliveryData.isAddressSelected || !deliveryData.address.trim()) {
      addToast("Please select your address from autocomplete suggestions.", "error");
      return;
    }

    if (!deliveryData.isWithinDeliveryArea) {
      addToast(
        `Out of Delivery Area. Delivery is available within ${restaurantConfig.radiusKm} km only.`,
        "error"
      );
      return;
    }

try {
      const payload = {
        items: items.map((item) => ({
          menuItem: item._id,
          name: item.name,
          price: Number(item.price),
          quantity: item.quantity
        })),
        address: deliveryData.address,
        userLocation: {
          lat: deliveryData.coordinates?.lat,
          lng: deliveryData.coordinates?.lng
        },
        deliveryLocation: {
          latitude: deliveryData.coordinates?.lat,
          longitude: deliveryData.coordinates?.lng
        },
        restaurantLocation: {
          lat: restaurantConfig.lat,
          lng: restaurantConfig.lng
        },
        // Include offer details if applied
        ...(appliedOffer && {
          offer: {
            code: appliedOffer.code,
            discount: discount
          }
        })
      };

      const { data } = await API.post("/orders", payload);
      // Use discounted total for the order
      const orderWithDiscount = {
        ...data,
        totalPrice: finalTotal
      };
      setCurrentOrder(orderWithDiscount);
      setShowPaymentModal(true);
    } catch (error) {
      addToast(error.response?.data?.message || "Could not place order.", "error");
    }
  };

  const processPayment = async () => {
    if (!currentOrder) return;

    setProcessingPayment(true);
    try {
      let paymentPayload = {
        orderId: currentOrder._id,
        paymentMethod
      };

      if (paymentMethod === "card") {
        if (!cardDetails.cardNumber || !cardDetails.cardExpiry || !cardDetails.cardCvv) {
          addToast("Please fill in all card details", "error");
          setProcessingPayment(false);
          return;
        }
        paymentPayload = {
          ...paymentPayload,
          cardNumber: cardDetails.cardNumber.replace(/\s/g, ""),
          cardExpiry: cardDetails.cardExpiry,
          cardCvv: cardDetails.cardCvv
        };
      } else if (paymentMethod === "upi") {
        if (!upiId) {
          addToast("Please enter your UPI ID", "error");
          setProcessingPayment(false);
          return;
        }
        paymentPayload = { ...paymentPayload, upiId };
      }

      const { data } = await API.post("/payments", paymentPayload);

      if (data.status === "completed") {
        clearCart();
        setDeliveryData({
          address: "",
          coordinates: null,
          city: "",
          distanceKm: null,
          isWithinDeliveryArea: false,
          isAddressSelected: false
        });
setShowPaymentModal(false);
        setCurrentOrder(null);
        setCardDetails({ cardNumber: "", cardExpiry: "", cardCvv: "", cardName: "" });
        setUpiId("");
        // Clear offer state after successful order
        setAppliedOffer(null);
        setOfferCode("");
        
        if (paymentMethod === "cod") {
          addToast("Order placed with Cash on Delivery. Pay when receiving your order!", "success");
        } else {
          addToast("Payment successful! Order confirmed.", "success");
        }
      }
    } catch (error) {
      addToast(error.response?.data?.message || "Payment failed. Please try again.", "error");
    } finally {
      setProcessingPayment(false);
    }
  };

  const closePaymentModal = () => {
    if (!processingPayment) {
      setShowPaymentModal(false);
      addToast("Order placed but payment pending. You can pay from orders page.", "info");
    }
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(" ") : value;
  };

  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  return (
    <main className="container section page-gap">
      <div className="section-head">
        <h2>Shopping Cart</h2>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <h3>Your cart is empty</h3>
          <p>Add menu items from the home page to place an order.</p>
        </div>
      ) : (
        <section className="checkout-layout">
          <div className="cart-list">
            {items.map((item) => (
              <article key={item._id} className="cart-item">
                <div className="cart-item-image">
                  <img 
                    src={item.image || fallbackDishImage} 
                    alt={item.name}
                    onError={(e) => {
                      e.currentTarget.src = fallbackDishImage;
                    }}
                  />
                </div>
                <div className="cart-item-details">
                  <h4>{item.name}</h4>
                  <p className="muted">
                    {formatINR(item.price)} x {item.quantity} {item.unit}
                  </p>
                </div>
                <div className="qty-actions">
                  <button className="btn btn-secondary" onClick={() => decreaseQuantity(item._id)}>
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button className="btn btn-secondary" onClick={() => increaseQuantity(item._id)}>
                    +
                  </button>
                  <button className="btn btn-secondary" onClick={() => removeFromCart(item._id)}>
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>

          <aside className="summary-card">
            <h3>Order Summary</h3>
            <p className="summary-row">
              <span>Items</span>
              <strong>{items.length}</strong>
            </p>
<p className="summary-row">
              <span>Subtotal</span>
              <strong>{formatINR(total)}</strong>
            </p>
            
            {/* Offers Section */}
            {!loadingOffers && availableOffers.length > 0 && !appliedOffer && (
              <div className="offers-section">
                <h4>Available Offers</h4>
                <div className="available-offers">
                  {availableOffers.map((offer) => (
                    <div key={offer._id} className="offer-item">
                      <div className="offer-info">
                        <code>{offer.code}</code>
                        <span className="offer-name">{offer.name}</span>
                        <span className="offer-discount">
                          {offer.discountType === "percentage" 
                            ? `${offer.discountValue}% OFF` 
                            : `₹${offer.discountValue} OFF`
                          }
                        </span>
                      </div>
                      <button 
                        className="btn btn-small" 
                        onClick={() => handleApplyOffer(offer)}
                        disabled={applyingOffer}
                      >
                        Apply
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Offer Code Input */}
            {!appliedOffer && (
              <form className="offer-input-form" onSubmit={handleApplyOfferByCode}>
                <input
                  type="text"
                  placeholder="Enter coupon code"
                  value={offerCode}
                  onChange={(e) => setOfferCode(e.target.value.toUpperCase())}
                  disabled={applyingOffer}
                />
                <button type="submit" className="btn btn-small" disabled={applyingOffer || !offerCode.trim()}>
                  {applyingOffer ? "..." : "Apply"}
                </button>
              </form>
            )}
            
            {/* Applied Offer Display */}
            {appliedOffer && (
              <div className="applied-offer">
                <div className="applied-offer-info">
                  <span className="applied-offer-code">{appliedOffer.code}</span>
                  <span className="applied-offer-name">{appliedOffer.name}</span>
                  <span className="applied-offer-discount">-{formatINR(discount)}</span>
                </div>
                <button className="btn btn-small btn-danger" onClick={handleRemoveOffer}>
                  Remove
                </button>
              </div>
            )}
            
            {discount > 0 && (
              <p className="summary-row discount-row">
                <span>Discount</span>
                <strong>-{formatINR(discount)}</strong>
              </p>
            )}
            
            <p className="summary-row total-row">
              <span>Total</span>
              <strong>{formatINR(finalTotal)}</strong>
            </p>
            <DeliveryLocation
              restaurantLocation={{ lat: restaurantConfig.lat, lng: restaurantConfig.lng }}
              deliveryRadiusKm={restaurantConfig.radiusKm}
              value={deliveryData}
              onChange={setDeliveryData}
            />
            <button className="btn" onClick={placeOrder}>
              Place Order
            </button>
          </aside>
        </section>
      )}

      {/* Payment Modal */}
      {showPaymentModal && currentOrder && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Complete Payment</h3>
              <button className="modal-close" onClick={closePaymentModal} disabled={processingPayment}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="payment-order-summary">
                <p>
                  <strong>Order ID:</strong> {currentOrder._id.slice(-8)}
                </p>
                <p>
                  <strong>Amount to Pay:</strong> {formatINR(currentOrder.totalPrice)}
                </p>
              </div>

              <div className="payment-methods">
                <h4>Select Payment Method</h4>
                <div className="payment-options">
                  <label className={`payment-option ${paymentMethod === "card" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={paymentMethod === "card"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <span className="payment-icon">💳</span>
                    <span>Credit/Debit Card</span>
                  </label>
                  <label className={`payment-option ${paymentMethod === "upi" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="upi"
                      checked={paymentMethod === "upi"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <span className="payment-icon">📱</span>
                    <span>UPI</span>
                  </label>
                  <label className={`payment-option ${paymentMethod === "netbanking" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="netbanking"
                      checked={paymentMethod === "netbanking"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <span className="payment-icon">🏦</span>
                    <span>Net Banking</span>
                  </label>
                  <label className={`payment-option ${paymentMethod === "wallet" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="wallet"
                      checked={paymentMethod === "wallet"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <span className="payment-icon">👛</span>
                    <span>Wallet</span>
                  </label>
                  <label className={`payment-option ${paymentMethod === "cod" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === "cod"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <span className="payment-icon">💵</span>
                    <span>Cash on Delivery</span>
                  </label>
                </div>
              </div>

              {paymentMethod === "card" && (
                <div className="card-details">
                  <h4>Card Details</h4>
                  <p className="hint">Use card starting with 4000 for successful payment (demo)</p>
                  <input
                    type="text"
                    placeholder="Card Number"
                    value={cardDetails.cardNumber}
                    onChange={(e) =>
                      setCardDetails((prev) => ({
                        ...prev,
                        cardNumber: formatCardNumber(e.target.value)
                      }))
                    }
                    maxLength={19}
                  />
                  <div className="card-row">
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={cardDetails.cardExpiry}
                      onChange={(e) =>
                        setCardDetails((prev) => ({
                          ...prev,
                          cardExpiry: formatExpiry(e.target.value)
                        }))
                      }
                      maxLength={5}
                    />
                    <input
                      type="password"
                      placeholder="CVV"
                      value={cardDetails.cardCvv}
                      onChange={(e) =>
                        setCardDetails((prev) => ({
                          ...prev,
                          cardCvv: e.target.value.replace(/\D/g, "").slice(0, 4)
                        }))
                      }
                      maxLength={4}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Name on Card"
                    value={cardDetails.cardName}
                    onChange={(e) =>
                      setCardDetails((prev) => ({
                        ...prev,
                        cardName: e.target.value
                      }))
                    }
                  />
                </div>
              )}

              {paymentMethod === "upi" && (
                <div className="upi-details">
                  <h4>UPI Payment</h4>
                  <p className="hint">Enter your UPI ID (e.g., name@upi)</p>
                  <input
                    type="text"
                    placeholder="UPI ID"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                  />
                </div>
              )}

              {paymentMethod === "netbanking" && (
                <div className="netbanking-details">
                  <h4>Net Banking</h4>
                  <p className="hint">Select your bank</p>
                  <select>
                    <option value="">Select Bank</option>
                    <option value="sbi">State Bank of India</option>
                    <option value="hdfc">HDFC Bank</option>
                    <option value="icici">ICICI Bank</option>
                    <option value="axis">Axis Bank</option>
                    <option value="yesbank">Yes Bank</option>
                  </select>
                </div>
              )}

              {paymentMethod === "wallet" && (
                <div className="wallet-details">
                  <h4>Wallet</h4>
                  <p className="hint">Demo wallet - payment will succeed</p>
                  <select>
                    <option value="">Select Wallet</option>
                    <option value="paytm">Paytm</option>
                    <option value="amazon">Amazon Pay</option>
                    <option value="mobi">MobiKwik</option>
                  </select>
                </div>
              )}

              {paymentMethod === "cod" && (
                <div className="cod-details">
                  <h4>Cash on Delivery</h4>
                  <div className="cod-info">
                    <p>💵 Pay with cash when your order is delivered</p>
                    <p className="hint">No online payment required. Simply pay the delivery person upon receipt of your order.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn"
                onClick={processPayment}
                disabled={processingPayment}
              >
                {processingPayment 
                  ? "Processing..." 
                  : paymentMethod === "cod" 
                    ? "Confirm COD Order" 
                    : `Pay ${formatINR(currentOrder.totalPrice)}`
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
