import { useEffect, useState } from "react";
import Input from "../ui/Input";
import Button from "../ui/Button";

const EMPTY = { city: "", type: "", first_name: "", last_name: "", email: "" };

const FIELD_LABELS = {
  city: "City",
  type: "Type",
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
};

export default function UserFilters({ appliedFilters, onApply }) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(appliedFilters);

  // Re-sync the draft to whatever's actually applied whenever the panel
  // opens, so it never shows stale edits from a previous open-then-abandon.
  useEffect(() => {
    if (isOpen) setDraft(appliedFilters);
  }, [isOpen, appliedFilters]);

  const activeEntries = Object.entries(appliedFilters).filter(([, v]) => v);

  const setField = (key) => (e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }));

  const handleApply = (e) => {
    e.preventDefault();
    onApply(draft);
    setIsOpen(false);
  };

  const handleClearAll = () => {
    setDraft(EMPTY);
    onApply(EMPTY);
    setIsOpen(false);
  };

  const removeChip = (key) => {
    const next = { ...appliedFilters, [key]: "" };
    onApply(next);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setIsOpen((v) => !v)}
          className="gap-1.5"
        >
          Filters
          {activeEntries.length > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-vault text-xs font-semibold text-mist">
              {activeEntries.length}
            </span>
          )}
        </Button>

        {!isOpen &&
          activeEntries.map(([key, value]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 rounded-full bg-fog px-3 py-1 text-xs font-medium text-ink"
            >
              {FIELD_LABELS[key]}: {value}
              <button
                type="button"
                onClick={() => removeChip(key)}
                aria-label={`Remove ${FIELD_LABELS[key]} filter`}
                className="text-slate hover:text-danger"
              >
                &times;
              </button>
            </span>
          ))}

        {!isOpen && activeEntries.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs font-medium text-slate hover:text-danger"
          >
            Clear all
          </button>
        )}
      </div>

      {isOpen && (
        <form
          onSubmit={handleApply}
          className="mt-3 grid grid-cols-1 gap-4 rounded-xl border border-fog bg-white p-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          <Input id="filter-city" label="City" value={draft.city} onChange={setField("city")} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="filter-type" className="text-sm font-medium text-ink">
              Type
            </label>
            <select
              id="filter-type"
              value={draft.type}
              onChange={setField("type")}
              className="rounded-xl border border-fog bg-white px-3.5 py-2.5 text-sm text-ink focus:border-vault focus:outline-none focus:ring-2 focus:ring-vault/30"
            >
              <option value="">Any</option>
              <option value="client">Client</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Input
            id="filter-email"
            label="Email"
            value={draft.email}
            onChange={setField("email")}
          />
          <Input
            id="filter-first-name"
            label="First name"
            value={draft.first_name}
            onChange={setField("first_name")}
          />
          <Input
            id="filter-last-name"
            label="Last name"
            value={draft.last_name}
            onChange={setField("last_name")}
          />

          <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-1">
            <Button type="submit" className="flex-1">
              Apply
            </Button>
            <Button type="button" variant="secondary" onClick={handleClearAll}>
              Clear all
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
