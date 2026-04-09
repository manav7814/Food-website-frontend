import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (text, type = "info") => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, text, type }]);
      setTimeout(() => dismissToast(id), 3000);
    },
    [dismissToast]
  );

  const value = useMemo(() => ({ addToast, dismissToast }), [addToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            className={`toast toast-${toast.type}`}
            onClick={() => dismissToast(toast.id)}
            type="button"
          >
            {toast.text}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
}
