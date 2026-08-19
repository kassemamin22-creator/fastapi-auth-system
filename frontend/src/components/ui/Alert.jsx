const VARIANTS = {
  danger: "bg-danger/10 border-danger/30 text-danger",
  success: "bg-success/10 border-success/30 text-success",
  info: "bg-vault/10 border-vault/30 text-vault",
};

export default function Alert({ variant = "danger", className = "", children }) {
  return (
    <div
      role="alert"
      className={`rounded-xl border px-4 py-3 text-sm ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
