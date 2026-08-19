import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError, fieldErrorsFromDetail, messageFromDetail } from "../lib/api";
import SealMark from "../components/ui/SealMark";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  city: "",
  age: "",
  password: "",
  confirmPassword: "",
};

// Mirrors the backend's own rules (see app/schemas/user.py) so most
// mistakes get caught before a request even goes out — the backend is
// still the source of truth; its 422/409 responses are handled below too.
function validate(form) {
  const errors = {};
  if (!form.first_name.trim()) errors.first_name = "First name is required.";
  if (!form.last_name.trim()) errors.last_name = "Last name is required.";
  if (!form.city.trim()) errors.city = "City is required.";

  if (!form.email.trim()) errors.email = "Email is required.";
  else if (!EMAIL_PATTERN.test(form.email)) errors.email = "Enter a valid email address.";

  if (!form.phone.trim()) errors.phone = "Phone is required.";
  else if (!PHONE_PATTERN.test(form.phone))
    errors.phone = "Use digits only, 7–15 characters (an optional leading + is fine).";

  const age = Number(form.age);
  if (!form.age) errors.age = "Age is required.";
  else if (!Number.isInteger(age) || age < 1 || age > 120)
    errors.age = "Age must be a whole number between 1 and 120.";

  if (!form.password) errors.password = "Password is required.";
  else if (form.password.length < 8) errors.password = "Use at least 8 characters.";
  else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password))
    errors.password = "Include at least one letter and one number.";

  if (form.confirmPassword !== form.password)
    errors.confirmPassword = "Passwords don't match.";

  return errors;
}

export default function Register() {
  const { register, login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  const setField = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const { confirmPassword: _confirmPassword, ...payload } = form;
      await register({ ...payload, age: Number(payload.age) });
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFieldErrors((prev) => ({ ...prev, email: messageFromDetail(err.detail) }));
      } else if (err instanceof ApiError && err.status === 422) {
        setFieldErrors((prev) => ({ ...prev, ...fieldErrorsFromDetail(err.detail) }));
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-16">
      <Card className="w-full max-w-lg">
        <div className="mb-8 flex flex-col items-center text-center">
          <SealMark size={48} className="mb-4" />
          <h1 className="font-display text-2xl font-semibold text-ink">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-slate">
            Takes under a minute. Every account starts as a client.
          </p>
        </div>

        {formError && (
          <Alert variant="danger" className="mb-6">
            {formError}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              id="first_name"
              label="First name"
              value={form.first_name}
              onChange={setField("first_name")}
              error={fieldErrors.first_name}
            />
            <Input
              id="last_name"
              label="Last name"
              value={form.last_name}
              onChange={setField("last_name")}
              error={fieldErrors.last_name}
            />
          </div>

          <Input
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={setField("email")}
            error={fieldErrors.email}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              id="phone"
              label="Phone"
              placeholder="+15551234567"
              value={form.phone}
              onChange={setField("phone")}
              error={fieldErrors.phone}
            />
            <Input
              id="city"
              label="City"
              value={form.city}
              onChange={setField("city")}
              error={fieldErrors.city}
            />
          </div>

          <Input
            id="age"
            label="Age"
            type="number"
            min="1"
            max="120"
            value={form.age}
            onChange={setField("age")}
            error={fieldErrors.age}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              id="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={setField("password")}
              error={fieldErrors.password}
            />
            <Input
              id="confirmPassword"
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={setField("confirmPassword")}
              error={fieldErrors.confirmPassword}
            />
          </div>

          <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-vault hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
