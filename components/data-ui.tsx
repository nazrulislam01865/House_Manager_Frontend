"use client";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { useResource } from "@/lib/use-resource";
import type { Page } from "@/lib/models";
import { Button, Field, Empty } from "./ui";
import { ApiError } from "@/lib/api";
export function ResourceState({
  loading,
  error,
  children,
}: {
  loading: boolean;
  error: string;
  children: ReactNode;
}) {
  if (error)
    return (
      <div className="card error" role="alert">
        {error}{" "}
        <Button variant="soft" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  if (loading)
    return (
      <div className="card muted" aria-busy="true">
        Loading records…
      </div>
    );
  return <>{children}</>;
}
export function Pagination({
  meta,
  onPage,
}: {
  meta?: Page<unknown>["meta"];
  onPage: (n: number) => void;
}) {
  if (!meta || meta.pages <= 1) return null;
  return (
    <div className="pagination row">
      <Button
        variant="soft"
        disabled={meta.page <= 1}
        onClick={() => onPage(meta.page - 1)}
      >
        Previous
      </Button>
      <span>
        {meta.page} / {meta.pages} · {meta.total} records
      </span>
      <Button
        variant="soft"
        disabled={meta.page >= meta.pages}
        onClick={() => onPage(meta.page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
export function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((x) => (
              <th key={x}>{x}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <Empty>No records found.</Empty>}
    </div>
  );
}
export function RecordSelect({
  endpoint,
  label,
  name,
  defaultValue = "",
  required = false,
  onChange,
}: {
  endpoint: string;
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  onChange?: (id: string) => void;
}) {
  const [selected, setSelected] = useState(defaultValue);
  const selectRef = useRef<HTMLSelectElement>(null);
  useEffect(() => setSelected(defaultValue), [defaultValue]);
  useEffect(() => {
    const form = selectRef.current?.form;
    if (!form) return;
    const onReset = () => {
      setSelected(defaultValue);
      onChange?.(defaultValue);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [defaultValue, onChange]);
  const r = useResource<
    Page<{
      id: string;
      name?: string;
      number?: string;
      houseName?: string;
      residentName?: string;
      active?: boolean;
    }>
  >(endpoint + (endpoint.includes("?") ? "&" : "?") + "limit=100");
  const available = (r.data?.data || []).filter(
    (item) =>
      !(label.toLowerCase().includes("vacant") ||
        label.toLowerCase().includes("destination")) || !item.residentName,
  );
  return (
    <Field label={label}>
      <select
        ref={selectRef}
        name={name}
        required={required}
        value={selected}
        aria-label={label}
        onChange={(event) => {
          setSelected(event.target.value);
          onChange?.(event.target.value);
        }}
      >
        <option value="">{r.loading ? "Loading…" : `Select ${label.toLowerCase()}`}</option>
        {available.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name || (item.houseName ? item.houseName + " · " : "") + item.number}
            {item.residentName ? " · Occupied" : ""}
          </option>
        ))}
      </select>
      {r.error && <small className="error" role="alert">{r.error}</small>}
      {!r.loading && r.data && !r.error && available.length === 0 && (
        <small className="muted">No available {label.toLowerCase()} records.</small>
      )}
      {r.data && r.data.meta.total > 100 && (
        <small className="muted">Showing the first 100 results. Narrower selection will require server-side lookup.</small>
      )}
    </Field>
  );
}
const validationLabels: Record<string, string> = {
  name: "Full name",
  phone: "Mobile number",
  nid: "NID number",
  password: "App password",
  roomId: "Vacant room",
  houseId: "House",
  startDate: "Move-in date",
  rentMinor: "Monthly rent",
  managerIds: "Assign manager",
};
export function useAction(onSuccess?: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  async function run(
    work: () => Promise<unknown>,
    message = "Saved successfully",
  ) {
    if (busy) return;
    setBusy(true);
    setError("");
    setSuccess("");
    setFieldErrors({});
    try {
      await work();
      setSuccess(message);
      onSuccess?.();
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors && Object.keys(e.fieldErrors).length > 0) {
        setFieldErrors(e.fieldErrors);
      } else {
        setError((e as Error).message);
      }
      return false;
    } finally {
      setBusy(false);
    }
  }
  return {
    busy,
    error,
    success,
    fieldErrors,
    fieldError: (name: string) => fieldErrors[name]?.join(". ") || "",
    run,
    feedback: (
      <>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {Object.keys(fieldErrors).length > 0 && (
          <div className="error" role="alert">
            <p>Please correct the following:</p>
            <ul>
              {Object.entries(fieldErrors).flatMap(([name, messages]) =>
                messages.map((message, index) => (
                  <li key={`${name}-${index}`}>
                    <strong>{validationLabels[name] || name}:</strong> {message}
                  </li>
                )),
              )}
            </ul>
          </div>
        )}
        {success && (
          <p className="green-text" role="status">
            {success}
          </p>
        )}
      </>
    ),
  };
}
export const formValue = (d: FormData, k: string) =>
  String(d.get(k) || "").trim();
