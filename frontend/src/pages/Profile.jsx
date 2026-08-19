import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api, ApiError, fieldErrorsFromDetail, messageFromDetail } from "../lib/api";
import SealMark from "../components/ui/SealMark";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import Badge from "../components/ui/Badge";
import FullPageLoader from "../components/ui/FullPageLoader";

const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "long",
  day: "numeric",
});

function formToPayload(form) {
  // Only send what's actually editable — no email, no type/role, ever.
  // Password is included only if the user actually typed one ("leave
  // blank to keep current password"): PUT /users/me treats an omitted key
  // as unset, not as "clear this field".
  const payload = {
    first_name: form.first_name,
    last_name: form.last_name,
    phone: form.phone,
    city: form.city,
    age: Number(form.age),
  };
  if (form.password) payload.password = form.password;
  return payload;
}

// Mirrors the backend's own rules for these fields (see
// app/schemas/user.py UserUpdateSelf) — email/type aren't here because
// this form can't touch them at all.
function validate(form) {
  const errors = {};
  if (!form.first_name.trim()) errors.first_name = "First name is required.";
  if (!form.last_name.trim()) errors.last_name = "Last name is required.";
  if (!form.city.trim()) errors.city = "City is required.";

  if (!form.phone.trim()) errors.phone = "Phone is required.";
  else if (!PHONE_PATTERN.test(form.phone))
    errors.phone = "Use digits only, 7–15 characters (an optional leading + is fine).";

  const age = Number(form.age);
  if (!form.age) errors.age = "Age is required.";
  else if (!Number.isInteger(age) || age < 1 || age > 120)
    errors.age = "Age must be a whole number between 1 and 120.";

  // Password is optional here — only validated if the user typed something.
  if (form.password) {
    if (form.password.length < 8) errors.password = "Use at least 8 characters.";
    else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password))
      errors.password = "Include at least one letter and one number.";

    if (form.confirmPassword !== form.password)
      errors.confirmPassword = "Passwords don't match.";
  }

  return errors;
}

function formFromUser(user) {
  return {
    first_name: user.first_name,
    last_name: user.last_name,
    phone: user.phone,
    city: user.city,
    age: String(user.age),
    password: "",
    confirmPassword: "",
  };
}

export default function Profile() {
  const { updateUser } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [mode, setMode] = useState("view"); // "view" | "edit"
  // Drives the one deliberate micro-interaction on this page: a brief
  // fade + rise whenever the view/edit content swaps, including right
  // after a successful save (so "saved" and "back to view" read as one
  // continuous, satisfying motion instead of two unrelated events).
  const [entered, setEntered] = useState(true);

  const [form, setForm] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Guards against a slow request resolving after this page has already
  // been left (e.g. the user saves, then immediately logs out before the
  // PUT response arrives). Without this, the late .then() would still call
  // updateUser() and unconditionally revive `user` in AuthContext — which
  // flips isAuthenticated back to true after an explicit logout and can
  // bounce Login's "already authenticated" redirect straight back in,
  // silently masking whatever actually happened (e.g. a failed re-login).
  const isMountedRef = useRef(true);
  useEffect(() => {
    // Explicitly set true on every (re-)run, not just at useRef's initial
    // value — StrictMode mounts, unmounts, and remounts each component
    // once in dev to surface exactly this class of bug. Without resetting
    // here, the simulated unmount's cleanup would leave this stuck false
    // forever after the real remount, permanently dropping every state
    // update (symptom: the page never leaves its loading state).
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    api
      .get("/users/me")
      .then((me) => {
        if (isMountedRef.current) setProfile(me);
      })
      .catch(() => {
        if (isMountedRef.current) {
          setLoadError("Couldn't load your profile. Please try again.");
        }
      });
  }, []);

  useEffect(() => {
    setEntered(false);
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [mode]);

  const startEditing = () => {
    setForm(formFromUser(profile));
    setFieldErrors({});
    setFormError("");
    setMode("edit");
  };

  const cancelEditing = () => {
    setMode("view");
  };

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
      const updated = await api.put("/users/me", formToPayload(form));
      if (!isMountedRef.current) return;
      setProfile(updated);
      updateUser(updated);
      showToast("Profile updated.", "success");
      setMode("view");
    } catch (err) {
      if (!isMountedRef.current) return;
      if (err instanceof ApiError && err.status === 409) {
        setFormError(messageFromDetail(err.detail));
      } else if (err instanceof ApiError && err.status === 422) {
        setFieldErrors((prev) => ({ ...prev, ...fieldErrorsFromDetail(err.detail) }));
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      if (isMountedRef.current) setIsSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Alert variant="danger">{loadError}</Alert>
      </div>
    );
  }

  if (!profile) {
    return <FullPageLoader />;
  }

  const transitionClass = `transition-all duration-300 ease-out ${
    entered ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
  }`;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Card>
        <div className="mb-8 flex flex-col items-center text-center">
          <SealMark size={48} className="mb-4" />
          <h1 className="font-display text-2xl font-semibold text-ink">Your profile</h1>
          <p className="mt-1 text-sm text-slate">{profile.email}</p>
        </div>

        {mode === "view" ? (
          <div className={transitionClass}>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              <ProfileField label="First name" value={profile.first_name} />
              <ProfileField label="Last name" value={profile.last_name} />
              <ProfileField label="Email" value={profile.email} />
              <ProfileField label="Phone" value={profile.phone} />
              <ProfileField label="City" value={profile.city} />
              <ProfileField label="Age" value={profile.age} />
              <div>
                <dt className="text-xs font-medium uppercase tracking-tight text-slate">
                  Account type
                </dt>
                <dd className="mt-1">
                  <Badge variant={profile.type === "admin" ? "brass" : "default"}>
                    {profile.type}
                  </Badge>
                </dd>
              </div>
              <ProfileField
                label="Member since"
                value={dateFormatter.format(new Date(profile.created_at))}
              />
            </dl>

            <Button onClick={startEditing} className="mt-8 w-full">
              Edit profile
            </Button>
          </div>
        ) : (
          <div className={transitionClass}>
            {formError && (
              <Alert variant="danger" className="mb-6">
                {formError}
              </Alert>
            )}

            {/* Email and account type aren't inputs at all here — the
                backend has no self-service way to change either, and the
                form shouldn't imply otherwise. */}
            <p className="mb-5 text-sm text-slate">
              Editing <span className="font-medium text-ink">{profile.email}</span>. Email
              and account type can't be changed here.
            </p>

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

              <div className="grid gap-5 sm:grid-cols-2">
                <Input
                  id="phone"
                  label="Phone"
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
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Leave blank to keep current password"
                  value={form.password}
                  onChange={setField("password")}
                  error={fieldErrors.password}
                />
                <Input
                  id="confirmPassword"
                  label="Confirm new password"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={setField("confirmPassword")}
                  error={fieldErrors.confirmPassword}
                />
              </div>

              <div className="mt-2 flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={cancelEditing}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSubmitting} className="flex-1">
                  {isSubmitting ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </Card>
    </div>
  );
}

function ProfileField({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-tight text-slate">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}
