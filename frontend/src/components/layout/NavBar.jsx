import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import SealMark from "../ui/SealMark";
import Button from "../ui/Button";

const navLinkClass = ({ isActive }) =>
  `text-sm font-medium transition-colors ${
    isActive ? "text-brass" : "text-mist/80 hover:text-mist"
  }`;

export default function NavBar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    // No explicit navigate() here — it raced RequireAuth's own guard on
    // protected routes (both fire a navigation off the same auth-state
    // change; whichever's effect commits last wins, unpredictably). If
    // logout happens on /dashboard, RequireAuth's guard already redirects
    // to /login on its own once isAuthenticated flips; if it happens on a
    // public page, there's nothing to redirect away from.
    logout();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <NavLink to="/" className="flex items-center gap-2.5">
          <SealMark size={30} />
          <span className="font-display text-lg font-semibold text-mist">
            Vaultkeep
          </span>
        </NavLink>

        <nav className="flex items-center gap-6">
          {isAuthenticated ? (
            <>
              <NavLink to="/dashboard" className={navLinkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/profile" className={navLinkClass}>
                Profile
              </NavLink>
              {/* TODO: once role-based nav is wired up (next phase), add an
                  admin-only link here (e.g. "Manage Users") gated behind
                  useAuth().isAdmin. */}
              <span className="hidden text-sm text-mist/60 sm:inline">
                {user?.first_name}
              </span>
              <Button variant="ghost" onClick={handleLogout}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navLinkClass}>
                Log in
              </NavLink>
              <Button variant="primary" onClick={() => navigate("/register")}>
                Get started
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
