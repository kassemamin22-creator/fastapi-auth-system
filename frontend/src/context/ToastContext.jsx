import { createContext, useCallback, useContext, useEffect, useState } from "react";

const ToastContext = createContext(null);

const DISPLAY_MS = 4000;
const EXIT_MS = 200;

function Toast({ message, variant, isLeaving }) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const visible = entered && !isLeaving;

  return (
    <div
      role="status"
      className={`rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg transition-all duration-200 ease-out motion-reduce:transition-none motion-reduce:duration-0 ${
        variant === "success" ? "bg-success" : "bg-danger"
      } ${visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
    >
      {message}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, variant = "success") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, variant, isLeaving: false }]);

    setTimeout(() => {
      // Two-phase removal — flag as leaving so it can fade/slide out, then
      // actually drop it once that exit transition has had time to play.
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, isLeaving: true } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, EXIT_MS);
    }, DISPLAY_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} variant={t.variant} isLeaving={t.isLeaving} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
