import { useEffect, useRef } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider, useToast } from "./context/ToastContext";
import Shell from "./components/layout/Shell";
import FullPageLoader from "./components/ui/FullPageLoader";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";

function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  // Guards against firing the toast twice under StrictMode's dev-only
  // mount->unmount->remount cycle — the ref itself survives that cycle
  // (only effects are re-invoked, not component state), so this correctly
  // fires once per real mount.
  const hasNotifiedRef = useRef(false);

  useEffect(() => {
    if (!isAdmin && !hasNotifiedRef.current) {
      hasNotifiedRef.current = true;
      showToast("Admin access required.", "danger");
    }
  }, [isAdmin, showToast]);

  if (!isAdmin) return <Navigate to="/profile" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <RequireAdmin>
                <Dashboard />
              </RequireAdmin>
            </RequireAuth>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <Profile />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
