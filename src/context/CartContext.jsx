import { createContext, useMemo, useState } from "react";

export const CartContext = createContext();

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  const addToCart = (item) => {
    setItems((prev) => {
      const found = prev.find((p) => p._id === item._id);
      if (found) {
        return prev.map((p) => (p._id === item._id ? { ...p, quantity: p.quantity + 1 } : p));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setItems((prev) => prev.filter((p) => p._id !== id));
  };

  const increaseQuantity = (id) => {
    setItems((prev) => prev.map((item) => (item._id === id ? { ...item, quantity: item.quantity + 1 } : item)));
  };

  const decreaseQuantity = (id) => {
    setItems((prev) =>
      prev
        .map((item) => (item._id === id ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => setItems([]);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{ items, addToCart, removeFromCart, increaseQuantity, decreaseQuantity, clearCart, total }}
    >
      {children}
    </CartContext.Provider>
  );
}
