"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, write, ApiError } from "./api";
import type { User } from "./models";
const Context = createContext<{
  user: User;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
} | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function refresh() {
    setUser(await api<User>("/me"));
  }
  useEffect(() => {
    const expired = () => setUser(undefined);
    window.addEventListener("houseledger:session-expired", expired);
    return () =>
      window.removeEventListener("houseledger:session-expired", expired);
  }, []);
  useEffect(() => {
    refresh()
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401)) setError(e.message);
      })
      .finally(() => setLoading(false));
  }, []);
  async function logout() {
    await write("/auth/logout", {});
    setUser(undefined);
  }
  if (loading)
    return (
      <div className="auth-screen">
        <p>Connecting to HouseLedger…</p>
      </div>
    );
  if (!user)
    return (
      <div className="auth-screen">
        <section className="card auth-card">
          <h1>HouseLedger</h1>
          <p>Sign in to your admin workspace.</p>
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              const d = new FormData(e.currentTarget);
              setLoading(true);
              try {
                await write("/auth/web/login", {
                  identifier: d.get("identifier"),
                  password: d.get("password"),
                });
                await refresh();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setLoading(false);
              }
            }}
          >
            <label className="field">
              <span>Admin username or mobile number</span>
              <input name="identifier" type="text" autoComplete="username" required placeholder="admin or 01XXXXXXXXX" />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary">Sign in</button>
          </form>
          <p className="muted">
            Sign in with the administrator credentials configured during database setup.
          </p>
        </section>
      </div>
    );
  return (
    <Context.Provider value={{ user, refresh, logout }}>
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const c = useContext(Context);
  if (!c) throw Error("AuthProvider required");
  return c;
}
