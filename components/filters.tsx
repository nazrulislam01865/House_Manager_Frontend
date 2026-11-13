"use client";
import { useResource } from "@/lib/use-resource";
import type { House, Page } from "@/lib/models";
export function MonthSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="month"
      aria-label="Billing month"
      className="month-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
export function HouseSelect({
  value,
  onChange,
  all = true,
}: {
  value: string;
  onChange: (v: string) => void;
  all?: boolean;
}) {
  const r = useResource<Page<House>>("/houses?limit=100");
  return (
    <div className="house-filter">
      <select
        aria-label="House"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{all ? "All houses" : "Select house"}</option>
        {r.data?.data.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name}
          </option>
        ))}
      </select>
      {r.error && <small className="error" role="alert">{r.error}</small>}
    </div>
  );
}
