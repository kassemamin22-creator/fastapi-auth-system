import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api, buildQuery } from "../lib/api";
import SealMark from "../components/ui/SealMark";
import Pagination from "../components/ui/Pagination";
import StatsStrip from "../components/dashboard/StatsStrip";
import UserFilters from "../components/dashboard/UserFilters";
import UsersTable from "../components/dashboard/UsersTable";
import EditUserPanel from "../components/dashboard/EditUserPanel";
import DeleteUserDialog from "../components/dashboard/DeleteUserDialog";

const LIMIT = 10;
const EMPTY_FILTERS = { city: "", type: "", first_name: "", last_name: "", email: "" };

// How long the row-leave transition (UsersTable.jsx) takes — the actual
// array mutation is deferred by this long so the row visibly exits instead
// of just vanishing the instant the DELETE request resolves.
const ROW_LEAVE_MS = 260;
const HIGHLIGHT_MS = 1200;

export default function Dashboard() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [usersLoading, setUsersLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);

  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [highlightId, setHighlightId] = useState(null);

  // Flips false -> true exactly once, after the first successful load of
  // both stats and the user list — drives the coordinated page-load
  // entrance. Rows/cards added afterward (pagination, filters) render with
  // this already true, so they appear immediately with no replayed
  // animation — the choreography is a first-impression thing, not
  // something that repeats on every click.
  const [entered, setEntered] = useState(false);
  const hasEnteredRef = useRef(false);

  // Request-id guards against out-of-order async responses: React 18
  // StrictMode double-invokes mount effects in dev (harmless on its own),
  // but if that first, redundant fetch is slow enough to resolve *after* a
  // second, user-triggered fetch (e.g. applying a filter right away), its
  // stale response would otherwise land last and silently overwrite the
  // correct, newer data. Only ever apply the response from the most
  // recently *issued* request, regardless of resolution order.
  const statsRequestIdRef = useRef(0);
  const usersRequestIdRef = useRef(0);

  const fetchStats = useCallback(async () => {
    const requestId = ++statsRequestIdRef.current;
    setStatsLoading(true);
    try {
      const [count, averageAge, topCities] = await Promise.all([
        api.get("/stats/count"),
        api.get("/stats/average-age"),
        api.get("/stats/top-cities"),
      ]);
      if (requestId !== statsRequestIdRef.current) return;
      setStats({ count, averageAge, topCities });
    } catch {
      // Stats are supplementary context, not the critical path — fail
      // quietly rather than blocking the whole dashboard on it.
    } finally {
      if (requestId === statsRequestIdRef.current) setStatsLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(
    async (targetPage, filters) => {
      const requestId = ++usersRequestIdRef.current;
      setUsersLoading(true);
      try {
        const query = buildQuery({ page: targetPage, limit: LIMIT, ...filters });
        const data = await api.get(`/users${query}`);
        if (requestId !== usersRequestIdRef.current) return;
        setUsers(data.users);
        setTotal(data.total);
        setTotalPages(data.total_pages);
      } catch {
        if (requestId === usersRequestIdRef.current) {
          showToast("Couldn't load users. Please try again.", "danger");
        }
      } finally {
        if (requestId === usersRequestIdRef.current) setUsersLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchUsers(page, appliedFilters);
  }, [page, appliedFilters, fetchUsers]);

  useEffect(() => {
    if (!statsLoading && !usersLoading && !hasEnteredRef.current) {
      hasEnteredRef.current = true;
      const id = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(id);
    }
  }, [statsLoading, usersLoading]);

  const handleApplyFilters = (filters) => {
    setAppliedFilters(filters);
    setPage(1);
  };

  const handleSaved = (updatedUser) => {
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    setEditingUser(null);
    setHighlightId(updatedUser.id);
    showToast(`Saved changes for ${updatedUser.first_name} ${updatedUser.last_name}.`, "success");
    setTimeout(() => setHighlightId(null), HIGHLIGHT_MS);
    // Age/role changes can shift the stats strip (average age, counts).
    fetchStats();
  };

  const handleDeleted = (deletedUser) => {
    setDeletingUser(null);
    setRemovingId(deletedUser.id);
    showToast(`${deletedUser.first_name} ${deletedUser.last_name} has been removed.`, "success");
    setTimeout(() => {
      setUsers((prev) => prev.filter((u) => u.id !== deletedUser.id));
      setTotal((t) => Math.max(0, t - 1));
      setRemovingId(null);
      // If that was the last row on a page beyond the first, step back
      // instead of leaving the admin stranded on a now-empty page.
      setPage((p) => (users.length <= 1 && p > 1 ? p - 1 : p));
    }, ROW_LEAVE_MS);
    fetchStats();
  };

  const hasActiveFilters = Object.values(appliedFilters).some(Boolean);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <SealMark size={36} spinning={false} />
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Admin dashboard</h1>
          <p className="text-sm text-slate">Platform overview and user management.</p>
        </div>
      </div>

      <div className="mb-8">
        <StatsStrip stats={stats} isLoading={statsLoading} entered={entered} />
      </div>

      <div className="mb-4">
        <UserFilters appliedFilters={appliedFilters} onApply={handleApplyFilters} />
      </div>

      <div className="rounded-xl border border-fog bg-white">
        <UsersTable
          users={users}
          isLoading={usersLoading}
          entered={entered}
          removingId={removingId}
          highlightId={highlightId}
          currentUserId={currentUser?.id}
          hasActiveFilters={hasActiveFilters}
          onEdit={setEditingUser}
          onDelete={setDeletingUser}
        />
        {!usersLoading && users.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={LIMIT}
            onPageChange={setPage}
          />
        )}
      </div>

      <EditUserPanel
        user={editingUser}
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        onSaved={handleSaved}
      />

      <DeleteUserDialog
        user={deletingUser}
        isOpen={Boolean(deletingUser)}
        onClose={() => setDeletingUser(null)}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
