import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, setAuthToken } from "../lib/api";

const AuthContext = createContext(null);

// Only the raw token goes to sessionStorage (never localStorage — and
// never the user object, which could go stale). On mount, if a token is
// present we re-validate it against GET /users/me rather than trusting it,
// so a token that's expired or belongs to a since-deleted user gets
// dropped instead of producing a broken "logged in" state.
const SESSION_KEY = "vaultkeep.token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyToken = useCallback((next) => {
    setToken(next);
    setAuthToken(next);
    if (next) {
      sessionStorage.setItem(SESSION_KEY, next);
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) {
      setIsLoading(false);
      return;
    }
    setAuthToken(stored);
    api
      .get("/users/me")
      .then((me) => {
        setToken(stored);
        setUser(me);
      })
      .catch(() => {
        applyToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, [applyToken]);

  const login = useCallback(
    async (email, password) => {
      const { access_token } = await api.post(
        "/login",
        { email, password },
        { auth: false }
      );
      applyToken(access_token);
      const me = await api.get("/users/me");
      setUser(me);
      return me;
    },
    [applyToken]
  );

  const register = useCallback(async (payload) => {
    return api.post("/register", payload, { auth: false });
  }, []);

  const logout = useCallback(() => {
    applyToken(null);
    setUser(null);
  }, [applyToken]);

  // Lets a page that already has the fresh PUT /users/me response (e.g.
  // Profile, after a save) push it straight into shared state, so the nav
  // bar's displayed name etc. update immediately without a second fetch.
  const updateUser = useCallback((next) => {
    setUser(next);
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user),
    // TODO: once the admin dashboard phase adds role-gated nav items /
    // routes, this is the flag they should key off of.
    isAdmin: user?.type === "admin",
    isLoading,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
