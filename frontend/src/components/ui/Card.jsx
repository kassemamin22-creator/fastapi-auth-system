export default function Card({ className = "", children, ...props }) {
  return (
    <div
      className={`rounded-xl border border-fog bg-white p-6 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
