"use client";
import { Card, Button, Field } from "@/components/ui";
import {
  ResourceState,
  Pagination,
  useAction,
  formValue as value,
} from "@/components/data-ui";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/use-resource";
import { write } from "@/lib/api";
import type { Page } from "@/lib/models";
export function Settings() {
  const { user, refresh, logout } = useAuth();
  const [page, setPage] = useState(1);
  const activity = useResource<
    Page<{ id: string; action: string; createdAt: string }>
  >("/activity?page=" + page);
  const a = useAction(() => {
    void refresh();
    activity.refresh();
  });
  return (
    <>
      <h1>Settings</h1>
      <p className="subtitle">Manage your admin workspace.</p>
      <div className="split">
        <Card>
          <h2>Admin profile</h2>
          <form
            className="stack"
            key={user.version}
            onSubmit={async (e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              await a.run(() =>
                write(
                  "/me/profile",
                  { name: value(d, "name"), version: user.version },
                  "PATCH",
                ),
              );
            }}
          >
            <Field label="Full name">
              <input name="name" required defaultValue={user.name} />
            </Field>
            <Field label="Mobile number">
              <input readOnly value={user.phone} />
            </Field>
            <Field label="Workspace">
              <input readOnly value={user.organizationName || ""} />
            </Field>
            <Field label="Admin username">
              <input readOnly value={user.username || "Not configured (mobile login available)"} />
            </Field>
            <Field label="Currency">
              <input readOnly value={user.currency || ""} />
            </Field>
            <Field label="Timezone">
              <input readOnly value={user.timezone || ""} />
            </Field>
            {a.feedback}
            <Button disabled={a.busy}>Save changes</Button>
            <Button
              type="button"
              variant="soft"
              onClick={() => a.run(logout, "Signed out")}
            >
              Sign out
            </Button>
          </form>
        </Card>
        <Card>
          <h2>Recent activity</h2>
          <ResourceState loading={activity.loading} error={activity.error}>
            {activity.data?.data.map((x) => (
              <p className="audit" key={x.id}>
                {new Date(x.createdAt).toLocaleString()} · {x.action}
              </p>
            ))}
            {!activity.data?.data.length && (
              <p className="muted">No activity yet.</p>
            )}
            <Pagination meta={activity.data?.meta} onPage={setPage} />
          </ResourceState>
        </Card>
      </div>
    </>
  );
}
