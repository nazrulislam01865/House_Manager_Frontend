"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LayoutGrid,
  Users,
  UserRound,
  Database,
  Zap,
  Settings,
  Menu,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
const nav = [
  ["/", "Overview", LayoutGrid],
  ["/houses", "Houses", Home],
  ["/managers", "Managers", Users],
  ["/residents", "Residents", UserRound],
  ["/rent", "Rent", Database],
  ["/electricity", "Electricity", Zap],
  ["/settings", "Settings", Settings],
] as const;
export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <div className="app-shell">
      <button
        className="mobile-menu"
        aria-label="Toggle navigation"
        onClick={() => setOpen(!open)}
      >
        <Menu />
      </button>
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link className="brand" href="/">
          <Home />
          <span>HouseLedger</span>
        </Link>
        <div className="workspace-label">Admin workspace</div>
        <nav>
          {nav.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={
                (href === "/" ? path === "/" : path.startsWith(href))
                  ? "active"
                  : ""
              }
            >
              <Icon />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <Link href="/settings" className="account">
          <span className="avatar">
            <UserRound />
          </span>
          <span>
            <small>Admin</small>
            <strong>{user.name}</strong>
          </span>
        </Link>
      </aside>
      <main>{children}</main>
    </div>
  );
}
