"use client";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { Info, Search, X } from "lucide-react";
export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "soft" | "danger" | "outline";
}) {
  return (
    <button className={`button ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="search">
      <Search size={25} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
export function Badge({ status }: { status: string }) {
  return (
    <span className={`badge ${status.toLowerCase().replaceAll(" ", "-")}`}>
      {["Active", "Occupied", "Vacant"].includes(status) && <i />}
      {status}
    </span>
  );
}
export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="note">
      <Info size={25} />
      <span>{children}</span>
    </div>
  );
}
export function Empty({
  children = "No records found.",
}: {
  children?: ReactNode;
}) {
  return <div className="empty">{children}</div>;
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const previous = useRef<HTMLElement | null>(null);
  useEffect(() => {
    setMounted(true);
    previous.current = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
      previous.current?.focus();
    };
  }, []);
  useEffect(() => {
    if (mounted)
      ref.current?.querySelector<HTMLElement>("input,select,button")?.focus();
  }, [mounted]);
  if (!mounted) return null;
  return createPortal(
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "Tab") {
          const a = ref.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled),input,select,textarea,a[href]",
          );
          if (!a?.length) return;
          const first = a[0],
            last = a[a.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={`modal card ${wide ? "wide" : ""}`}
      >
        <button className="close" aria-label="Close dialog" onClick={onClose}>
          <X />
        </button>
        <h2 id="dialog-title">{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
export const statusOf = (amount: number, paid: number) =>
  amount === 0
    ? "No charge"
    : paid >= amount
      ? "Paid"
      : paid > 0
        ? "Partial"
        : "Unpaid";
