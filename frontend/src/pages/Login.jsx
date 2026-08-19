import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import SealMark from "../components/ui/SealMark";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

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
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Show the backend's own message — it's already the deliberately
        // generic "incorrect email or password" (never reveals which).
        setFormError(err.detail);
      } else {
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
