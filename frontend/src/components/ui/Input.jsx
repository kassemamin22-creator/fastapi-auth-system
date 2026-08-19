export default function Input({ label, error, id, className = "", ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <input
        id={id}
        aria-invalid={Boolean(error)}
        className={`rounded-xl border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-slate/60 transition-colors focus:outline-none focus:ring-2 focus:ring-vault/30 ${
          error ? "border-danger focus:border-danger" : "border-fog focus:border-vault"
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
