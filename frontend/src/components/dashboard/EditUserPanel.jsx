import { useEffect, useState } from "react";
import SlideOver from "../ui/SlideOver";
import Input from "../ui/Input";
import Button from "../ui/Button";
import Alert from "../ui/Alert";
import { api, ApiError, fieldErrorsFromDetail, messageFromDetail } from "../../lib/api";

const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;

function formFromUser(user) {
  if (!user) return null;
  return {
    first_name: user.first_name,
    last_name: user.last_name,
    phone: user.phone,
    city: user.city,
    age: String(user.age),
    type: user.type,
  };
}

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

  return errors;
}

export default function EditUserPanel({ user, isOpen, onClose, onSaved }) {
  const [form, setForm] = useState(() => formFromUser(user));
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Re-seed the form whenever a *different* user is opened for editing —
  // not on every render, so in-progress edits aren't clobbered by e.g. a
  // parent re-render from an unrelated table refresh.
  useEffect(() => {
    if (user) {
      setForm(formFromUser(user));
      setFieldErrors({});
      setFormError("");
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user || !form) return null;

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const roleChanged = form.type !== user.type;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const updated = await api.put(`/users/${user.id}`, {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        city: form.city,
        age: Number(form.age),
        type: form.type,
      });
      onSaved(updated);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFormError(messageFromDetail(err.detail));
      } else if (err instanceof ApiError && err.status === 422) {
        setFieldErrors((prev) => ({ ...prev, ...fieldErrorsFromDetail(err.detail) }));
      } else if (err instanceof ApiError && err.status === 404) {
        setFormError("This user no longer exists.");
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SlideOver isOpen={isOpen} onClose={onClose} ariaLabel="Edit user">
      <div className="flex items-center justify-between border-b border-fog px-6 py-5">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Edit user</h2>
          <p className="text-sm text-slate">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-lg p-1.5 text-slate transition-colors hover:bg-fog hover:text-ink"
        >
          &times;
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex flex-1 flex-col gap-5 px-6 py-6">
          {formError && <Alert variant="danger">{formError}</Alert>}

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="edit-first-name"
              label="First name"
              value={form.first_name}
              onChange={setField("first_name")}
              error={fieldErrors.first_name}
            />
            <Input
              id="edit-last-name"
              label="Last name"
              value={form.last_name}
              onChange={setField("last_name")}
              error={fieldErrors.last_name}
            />
          </div>

          <Input
            id="edit-phone"
            label="Phone"
            value={form.phone}
            onChange={setField("phone")}
            error={fieldErrors.phone}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="edit-city"
              label="City"
              value={form.city}
              onChange={setField("city")}
              error={fieldErrors.city}
            />
            <Input
              id="edit-age"
              label="Age"
              type="number"
              min="1"
              max="120"
              value={form.age}
              onChange={setField("age")}
              error={fieldErrors.age}
            />
          </div>

          {/* The one place a role change is allowed at all — deliberately
              heavier chrome than a plain <select> for a privileged action. */}
          <div>
            <p className="text-sm font-medium text-ink">Account type</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {["client", "admin"].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, type: role }))}
                  className={`rounded-xl border-2 px-4 py-3 text-left transition-colors motion-reduce:transition-none ${
                    form.type === role
                      ? "border-vault bg-vault/5"
                      : "border-fog hover:border-slate/40"
                  }`}
                >
                  <span className="block text-sm font-semibold capitalize text-ink">{role}</span>
                  <span className="block text-xs text-slate">
                    {role === "admin"
                      ? "Full access to users and platform data"
                      : "Standard account access only"}
                  </span>
                </button>
              ))}
            </div>
            {roleChanged && (
              <p className="mt-2 text-xs font-medium text-brass">
                This changes what {user.first_name} can access.
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 border-t border-fog px-6 py-5">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
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
    </SlideOver>
  );
}
