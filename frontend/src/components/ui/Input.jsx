import { useState } from "react";

function EyeIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1c.45-.06.92-.1 1.4-.1 6.5 0 10.5 7 10.5 7a13.5 13.5 0 0 1-3.1 3.9M6.5 6.6C3.9 8.3 1.5 12 1.5 12s4 7 10.5 7c1.7 0 3.2-.4 4.5-1.1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

export default function Input({ label, error, id, className = "", type, ...props }) {
  const isPassword = type === "password";
  const [revealed, setRevealed] = useState(false);

  const inputEl = (
    <input
      id={id}
      type={isPassword ? (revealed ? "text" : "password") : type}
      aria-invalid={Boolean(error)}
      className={`rounded-xl border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-slate/60 transition-colors focus:outline-none focus:ring-2 focus:ring-vault/30 ${
        error ? "border-danger focus:border-danger" : "border-fog focus:border-vault"
      } ${isPassword ? "pr-10" : ""} ${className}`}
      {...props}
    />
  );

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      {isPassword ? (
        <div className="relative">
          {inputEl}
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Hide password" : "Show password"}
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-slate transition-colors hover:text-ink"
          >
            {revealed ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        </div>
      ) : (
        inputEl
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
