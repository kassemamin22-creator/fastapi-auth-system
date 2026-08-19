const VARIANTS = {
  default: "bg-fog text-slate",
  brass: "bg-brass/15 text-brass",
  success: "bg-success/10 text-success",
  danger: "bg-danger/10 text-danger",
};

export default function Badge({ variant = "default", className = "", children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
