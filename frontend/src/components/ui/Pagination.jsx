// Builds [1, 2, "…", 7, 8, 9, "…", 20]-style page lists instead of
// rendering every page number — collapses to ellipses once there's more
// than a handful of pages, always keeping the first/last two and a
// window around the current page visible.
function getPageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const keep = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = [...keep].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const result = [];
  let prev = null;
  for (const p of sorted) {
    if (prev !== null && p - prev > 1) result.push(`ellipsis-${p}`);
    result.push(p);
    prev = p;
  }
  return result;
}

const pageButtonBase =
  "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors motion-reduce:transition-none";

export default function Pagination({ page, totalPages, total, limit, onPageChange }) {
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);
  const pages = getPageList(page, totalPages);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-fog px-4 py-3 sm:flex-row sm:px-6">
      <p className="text-sm text-slate">
        Showing <span className="font-medium text-ink">{startItem}</span>&ndash;
        <span className="font-medium text-ink">{endItem}</span> of{" "}
        <span className="font-medium text-ink">{total}</span>
      </p>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className={`${pageButtonBase} text-ink hover:bg-fog disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
          >
            Prev
          </button>
          {pages.map((p) =>
            typeof p === "number" ? (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? "page" : undefined}
                className={`${pageButtonBase} ${
                  p === page ? "bg-vault text-mist" : "text-ink hover:bg-fog"
                }`}
              >
                {p}
              </button>
            ) : (
              <span key={p} className="px-1 text-sm text-slate">
                &hellip;
              </span>
            )
          )}
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className={`${pageButtonBase} text-ink hover:bg-fog disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
