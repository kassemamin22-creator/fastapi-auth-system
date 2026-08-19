import Badge from "../ui/Badge";
import Skeleton from "../ui/Skeleton";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const thClass =
  "px-4 py-3 text-left text-xs font-medium uppercase tracking-tight text-slate first:pl-6 last:pr-6";
const tdClass = "px-4 py-3 text-sm text-ink first:pl-6 last:pr-6";

function SkeletonRow({ index }) {
  return (
    <tr>
      <td className={tdClass} colSpan={7}>
        <Skeleton className="h-4 w-full" style={{ animationDelay: `${index * 40}ms` }} />
      </td>
    </tr>
  );
}

export default function UsersTable({
  users,
  isLoading,
  entered,
  removingId,
  highlightId,
  currentUserId,
  hasActiveFilters,
  onEdit,
  onDelete,
}) {
  const columns = ["Name", "Email", "Phone", "City", "Type", "Status", "Created", ""];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="border-b border-fog bg-mist">
          <tr>
            {columns.map((col) => (
              <th key={col} className={thClass}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-fog">
          {isLoading &&
            Array.from({ length: 6 }, (_, i) => <SkeletonRow key={i} index={i} />)}

          {!isLoading && users.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-6 py-16 text-center">
                <p className="text-sm font-medium text-ink">
                  {hasActiveFilters ? "No users match these filters." : "No users yet."}
                </p>
                <p className="mt-1 text-sm text-slate">
                  {hasActiveFilters
                    ? "Try adjusting or clearing your filters."
                    : "Registered users will show up here."}
                </p>
              </td>
            </tr>
          )}

          {!isLoading &&
            users.map((user, i) => {
              const isRemoving = removingId === user.id;
              const isHighlighted = highlightId === user.id;
              const isSelf = user.id === currentUserId;

              return (
                <tr
                  key={user.id}
                  className={`transition-all motion-reduce:transition-none ${
                    isRemoving
                      ? "duration-250 -translate-x-2 opacity-0"
                      : entered
                        ? "duration-300 translate-y-0 opacity-100"
                        : "duration-300 translate-y-1 opacity-0"
                  } ${isHighlighted ? "bg-brass/10" : "hover:bg-mist/60"}`}
                  style={{
                    transitionDelay: !isRemoving ? `${Math.min(i * 25, 250)}ms` : "0ms",
                  }}
                >
                  <td className={tdClass}>
                    <span className="font-medium">
                      {user.first_name} {user.last_name}
                    </span>
                    {isSelf && <span className="ml-2 text-xs text-slate">(you)</span>}
                  </td>
                  <td className={`${tdClass} text-slate`}>{user.email}</td>
                  <td className={`${tdClass} text-slate`}>{user.phone}</td>
                  <td className={`${tdClass} text-slate`}>{user.city}</td>
                  <td className={tdClass}>
                    <Badge variant={user.type === "admin" ? "brass" : "default"}>
                      {user.type}
                    </Badge>
                  </td>
                  <td className={tdClass}>
                    <Badge variant="success">active</Badge>
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-slate`}>
                    {dateFormatter.format(new Date(user.created_at))}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-right`}>
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(user)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-vault transition-colors hover:bg-vault/10"
                      >
                        Edit
                      </button>
                      <span
                        title={isSelf ? "You can't remove your own account here." : undefined}
                      >
                        <button
                          type="button"
                          onClick={() => onDelete(user)}
                          disabled={isSelf}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:text-slate/50 disabled:hover:bg-transparent"
                        >
                          Remove
                        </button>
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
