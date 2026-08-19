import { useEffect, useState } from "react";
import Card from "../ui/Card";
import Skeleton from "../ui/Skeleton";

function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target == null) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setValue(target);
      return;
    }

    let raf;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3; // ease-out cubic
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

// Extends the Seal Mark's tick-ring motif into data: a horizontal dial
// with the same brass tick marks, a marker at the actual average.
function AgeDial({ averageAge }) {
  const max = 120; // matches the backend's own age validation ceiling
  const ticks = [0, 30, 60, 90, 120];
  const pct = averageAge == null ? 0 : Math.min(100, (averageAge / max) * 100);

  return (
    <div className="mt-4">
      <div className="relative h-1.5 rounded-full bg-fog">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-vault/25 motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brass shadow motion-safe:transition-[left] motion-safe:duration-700 motion-safe:ease-out"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[10px] text-slate">
        {ticks.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  );
}

function TopCitiesBars({ cities }) {
  if (!cities.length) {
    return <p className="mt-4 text-sm text-slate">No city data yet.</p>;
  }
  const max = Math.max(...cities.map((c) => c.count));

  return (
    <div className="mt-4 flex flex-col gap-2.5">
      {cities.map((c, i) => (
        <div key={c.city} className="flex items-center gap-3">
          <span className="w-20 shrink-0 truncate text-xs text-ink" title={c.city}>
            {c.city}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-fog">
            <div
              className={`h-full rounded-full motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out ${
                i === 0 ? "bg-brass" : "bg-vault"
              }`}
              style={{ width: `${(c.count / max) * 100}%` }}
            />
          </div>
          <span className="w-6 shrink-0 text-right font-mono text-xs text-ink">{c.count}</span>
        </div>
      ))}
    </div>
  );
}

const cardTransition =
  "transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:duration-0";

export default function StatsStrip({ stats, isLoading, entered }) {
  const activeUsers = useCountUp(isLoading ? null : (stats?.count?.total_active_users ?? 0));

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-9 w-16" />
          </Card>
        ))}
      </div>
    );
  }

  const averageAge = stats?.averageAge?.average_age;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card
        className={`${cardTransition} ${entered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
        style={{ transitionDelay: entered ? "0ms" : "0ms" }}
      >
        <p className="text-xs font-medium uppercase tracking-tight text-slate">Active Users</p>
        <p className="mt-2 font-mono text-4xl font-semibold text-ink">{activeUsers}</p>
      </Card>

      <Card
        className={`${cardTransition} ${entered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
        style={{ transitionDelay: entered ? "80ms" : "0ms" }}
      >
        <p className="text-xs font-medium uppercase tracking-tight text-slate">Average Age</p>
        <p className="mt-2 font-mono text-4xl font-semibold text-ink">
          {averageAge != null ? averageAge : "—"}
        </p>
        <AgeDial averageAge={averageAge} />
      </Card>

      <Card
        className={`${cardTransition} ${entered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
        style={{ transitionDelay: entered ? "160ms" : "0ms" }}
      >
        <p className="text-xs font-medium uppercase tracking-tight text-slate">Top Cities</p>
        <TopCitiesBars cities={stats?.topCities?.top_cities ?? []} />
      </Card>
    </div>
  );
}
