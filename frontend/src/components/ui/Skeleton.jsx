export default function Skeleton({ className = "", style }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-fog motion-reduce:animate-none ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}
