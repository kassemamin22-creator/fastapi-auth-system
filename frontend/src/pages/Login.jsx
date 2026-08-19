import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError, messageFromDetail } from "../lib/api";
import SealMark from "../components/ui/SealMark";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { login, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // /dashboard is admin-only — a client landing there would just bounce
    // straight back out via RequireAdmin's own redirect, with a toast that
    // makes no sense for a perfectly normal login.
    if (isAuthenticated) navigate(isAdmin ? "/dashboard" : "/profile", { replace: true });
  }, [isAuthenticated, isAdmin, navigate]);

  const validate = () => {
    const errors = {};
    if (!email.trim()) errors.email = "Email is required.";
    else if (!EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address.";
    if (!password) errors.password = "Password is required.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const me = await login(email, password);
      navigate(me.type === "admin" ? "/dashboard" : "/profile");
    } catch (err) {
      if (err instanceof ApiError) {
        // Covers every backend/network failure with its own accurate
        // message: 401 gets the backend's deliberately generic "incorrect
        // email or password" (never reveals which); a 422 gets its
        // specific field message(s); a network failure or unreachable API
        // gets api.js's own clear "Could not reach the server..." message;
        // any other status still shows whatever the server actually said
        // instead of a one-size-fits-all string that hides what happened.
        setFormError(messageFromDetail(err.detail));
      } else {
        // A non-ApiError here means something threw before/outside the
        // fetch layer entirely (a genuine unexpected JS error) — this is
        // the only case that should ever fall back to a generic message.
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <SealMark size={48} className="mb-4" />
          <h1 className="font-display text-2xl font-semibold text-ink">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-slate">Sign in to your Vaultkeep account.</p>
        </div>

        {formError && (
          <Alert variant="danger" className="mb-6">
            {formError}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <Input
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
          />
          <Input
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
          />
          <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="font-medium text-vault hover:underline">
            Create one
          </Link>
        </p>
      </Card>
    </div>
  );
}
