"use client";
import { useEffect, useState } from "react";
import {
  Card,
  Button,
  Field,
  SearchField,
  Modal,
  Badge,
  Note,
} from "@/components/ui";
import {
  ResourceState,
  DataTable,
  Pagination,
  RecordSelect,
  useAction,
  formValue as value,
} from "@/components/data-ui";
import { HouseSelect } from "@/components/filters";
import { useResource } from "@/lib/use-resource";
import { write, money, toMinor, currentMonth } from "@/lib/api";
import type { Manager, Resident, Page } from "@/lib/models";
function ManagerForm({
  manager,
  onSaved,
}: {
  manager?: Manager;
  onSaved: () => void;
}) {
  const a = useAction(onSaved);
  return (
    <form
      className="stack"
      key={manager?.id || "new"}
      onSubmit={async (e) => {
        e.preventDefault();
        const f = e.currentTarget,
          d = new FormData(f);
        const body = {
          name: value(d, "name"),
          phone: value(d, "phone"),
          nid: value(d, "nid"),
          ...(value(d, "password") ? { password: value(d, "password") } : {}),
        };
        const ok = await a.run(
          () =>
            write(
              manager ? "/managers/" + manager.id : "/managers",
              manager
                ? { ...body, active: manager.active, version: manager.version }
                : body,
              manager ? "PATCH" : "POST",
            ),
          "Manager saved",
        );
        if (ok && !manager) f.reset();
      }}
    >
      <h2>{manager ? "Edit manager" : "Add manager"}</h2>
      <Field label="Full name">
        <input name="name" required defaultValue={manager?.name} />
      </Field>
      <Field label="Mobile number">
        <input
          name="phone"
          type="tel"
          required
          inputMode="tel"
          pattern="(?:\+880|0)1[3-9][0-9]{8}"
          title="Enter a valid Bangladesh mobile number (013–019) or +8801XXXXXXXXX"
          placeholder="01XXXXXXXXX"
          defaultValue={manager?.phone}
        />
      </Field>
      <Field label="NID number">
        <input name="nid" required inputMode="numeric" pattern="(?:[0-9]{10}|[0-9]{13}|[0-9]{17})" maxLength={17} defaultValue={manager?.nid || ""} placeholder="10, 13 or 17 digit NID" autoComplete="off" />
      </Field>
      <Field label={manager ? "New app password (optional)" : "App password"}>
        <input name="password" type="password" minLength={8} maxLength={8} inputMode="numeric" pattern="[0-9]{8}" title="Enter exactly 8 numeric digits" required={!manager} autoComplete="new-password" placeholder={manager ? "Leave blank to keep current PIN; enter 8 digits to change" : "Exactly 8 numeric digits"} />
      </Field>
      <div className="access-summary">
        <h3>Access summary</h3>
        <p>Mobile app sign-in uses the manager’s phone and app password.</p>
        <p>House access is assigned separately. Unassigned managers have no house access.</p>
      </div>
      <Note>
        Assign houses later from the house detail page. The 8-digit app PIN is securely hashed and never displayed again.
      </Note>
      {a.feedback}
      <div className="form-actions">
        <Button type="reset" variant="soft">
          Cancel
        </Button>
        <Button disabled={a.busy}>
          {a.busy ? "Saving…" : manager ? "Save changes" : "Create manager"}
        </Button>
      </div>
    </form>
  );
}
export function Managers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Manager>();
  const [edit, setEdit] = useState<Manager>();
  const [confirm, setConfirm] = useState(false);
  const list = useResource<Page<Manager>>(
    `/managers?search=${encodeURIComponent(search)}&page=${page}`,
  );
  const a = useAction(() => {
    list.refresh();
    setConfirm(false);
    setSelected(undefined);
  });
  return (
    <>
      <h1>Managers</h1>
      <p className="subtitle">Create manager app accounts and assign house access separately.</p>
      <div className="split people-layout">
        <Card className="people-list">
          <SearchField
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search managers…"
          />
          <ResourceState loading={list.loading} error={list.error}>
            <DataTable
              headers={["Name", "NID", "Assigned house", "Status", "Action"]}
              rows={
                list.data?.data.map((m) => [
                  <b key="name">{m.name}</b>,
                  m.nid ? `••••${m.nid.slice(-4)}` : "Not added",
                  m.houses.map((h) => h.name).join(", ") || "Unassigned",
                  <Badge key="s" status={m.active ? "Active" : "Inactive"} />,
                  <Button key="a" onClick={() => setSelected(m)}>
                    Manage
                  </Button>,
                ]) || []
              }
            />
            <Pagination meta={list.data?.meta} onPage={setPage} />
          </ResourceState>
        </Card>
        <div className="stack">
          <Card>
            <ManagerForm onSaved={list.refresh} />
          </Card>
          {selected && (
            <Card>
              <h2>{selected.name}</h2>
              <p>{selected.phone} · NID ending {selected.nid?.slice(-4) || "—"}</p>
              <div className="row actions-wrap">
                <Button variant="outline" onClick={() => setEdit(selected)}>
                  Edit details
                </Button>
                {selected.houses.map((h) => (
                  <a
                    className="button soft"
                    key={h.id}
                    href={"/houses/" + h.id}
                  >
                    Manage assignment
                  </a>
                ))}
                <Button variant="outline" onClick={() => setConfirm(true)}>
                  {selected.active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
      {edit && (
        <Modal title="Manager profile" onClose={() => setEdit(undefined)}>
          <ManagerForm
            manager={edit}
            onSaved={() => {
              setEdit(undefined);
              setSelected(undefined);
              list.refresh();
            }}
          />
        </Modal>
      )}
      {confirm && selected && (
        <Modal
          title={`${selected.active ? "Deactivate" : "Activate"} ${selected.name}?`}
          onClose={() => setConfirm(false)}
        >
          <p>
            Records and assignments retain their history. Deactivation removes
            access.
          </p>
          {a.feedback}
          <Button
            disabled={a.busy}
            variant="danger"
            onClick={() =>
              a.run(() =>
                write(
                  "/managers/" + selected.id,
                  {
                    name: selected.name,
                    phone: selected.phone,
                    ...(selected.nid ? { nid: selected.nid } : {}),
                    active: !selected.active,
                    version: selected.version,
                  },
                  "PATCH",
                ),
              )
            }
          >
            Confirm
          </Button>
        </Modal>
      )}
    </>
  );
}
export function Residents() {
  const [house, setHouse] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [roomHouse, setRoomHouse] = useState("");
  const [prefill, setPrefill] = useState("");
  const [edit, setEdit] = useState<Resident>();
  const [modal, setModal] = useState("");
  const list = useResource<Page<Resident>>(
    `/residents?search=${encodeURIComponent(search)}&page=${page}${house ? "&houseId=" + house : ""}`,
  );
  const a = useAction(() => {
    list.refresh();
    setEdit(undefined);
    setModal("");
  });
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setRoomHouse(p.get("house") || "");
    setPrefill(p.get("room") || "");
  }, []);
  return (
    <>
      <h1>Residents</h1>
      <div className="split residents-layout">
        <Card className="people-list">
          <h2>Residents</h2>
          <div className="filter-grid">
            <Field label="House">
              <HouseSelect
                value={house}
                onChange={(v) => {
                  setHouse(v);
                  setPage(1);
                }}
              />
            </Field>
            <Field label="Search">
              <SearchField
                value={search}
                onChange={(v) => {
                  setSearch(v);
                  setPage(1);
                }}
                placeholder="Search name or room"
              />
            </Field>
          </div>
          <ResourceState loading={list.loading} error={list.error}>
            <DataTable
              headers={["Name", "House / Room", "Rent", "Status", "Action"]}
              rows={
                list.data?.data.map((r) => [
                  r.name,
                  r.roomNumber
                    ? `${r.houseName} / ${r.roomNumber}`
                    : "No current tenancy",
                  r.rentMinor ? money(r.rentMinor) : "—",
                  <Badge
                    key="s"
                    status={r.tenancyId ? "Occupied" : "Inactive"}
                  />,
                  <Button key="a" variant="soft" onClick={() => setEdit(r)}>
                    Manage
                  </Button>,
                ]) || []
              }
            />
            <Pagination meta={list.data?.meta} onPage={setPage} />
          </ResourceState>
        </Card>
        <Card className="resident-form">
          <form
            className="stack full-form"
            key={edit?.id || "new"}
            onSubmit={async (e) => {
              e.preventDefault();
              const f = e.currentTarget,
                d = new FormData(f);
              const identity = {
                name: value(d, "name"),
                phone: value(d, "phone"),
              };
              const ok = await a.run(
                () =>
                  write(
                    edit ? "/residents/" + edit.id : "/residents",
                    edit
                      ? { ...identity, version: edit.version }
                      : {
                          ...identity,
                          roomId: value(d, "room"),
                          startDate: value(d, "date"),
                          rentMinor: toMinor(value(d, "rent")),
                        },
                    edit ? "PATCH" : "POST",
                  ),
                "Resident saved",
              );
              if (ok) f.reset();
            }}
          >
            <h2>{edit ? "Manage resident" : "Add resident"}</h2>
            <Field label="Full name">
              <input name="name" defaultValue={edit?.name} required />
            </Field>
            <Field label="Mobile number">
              <input
                name="phone"
                type="tel"
                inputMode="tel"
                pattern="(?:\+880|0)1[3-9][0-9]{8}"
                title="Enter a valid Bangladesh mobile number (013–019) or +8801XXXXXXXXX"
                defaultValue={edit?.phone}
                required
              />
            </Field>
            {!edit ? (
              <>
                <RecordSelect
                  label="House"
                  name="house"
                  endpoint="/houses"
                  required
                  onChange={setRoomHouse}
                  defaultValue={roomHouse}
                />
                {roomHouse && (
                  <RecordSelect
                    key={roomHouse}
                    label="Vacant room"
                    name="room"
                    endpoint={"/rooms?houseId=" + roomHouse}
                    required
                    defaultValue={prefill}
                  />
                )}
                <Field label="Monthly rent (BDT)">
                  <input
                    name="rent"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                  />
                </Field>
                <Field label="Move-in date">
                  <input
                    name="date"
                    type="date"
                    defaultValue={currentMonth() + "-01"}
                    required
                  />
                </Field>
                <Note>
                  Choose a vacant room. Meter linking belongs to the room.
                  Month-boundary occupancy is required.
                </Note>
                <p className="muted">Created by admin</p>
              </>
            ) : (
              <>
                <Note>
                  {edit.houseName || "No current room"}{" "}
                  {edit.roomNumber ? "· Room " + edit.roomNumber : ""} · Meter{" "}
                  {edit.meter || "not linked"}
                </Note>
                {!edit.tenancyId && (
                  <div className="row actions-wrap">
                    <Button
                      type="button"
                      variant="soft"
                      disabled={!edit.active}
                      onClick={() => setModal("allocate")}
                    >
                      Allocate room
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={a.busy}
                      onClick={() =>
                        a.run(() =>
                          write(
                            "/residents/" + edit.id,
                            {
                              name: edit.name,
                              phone: edit.phone,
                              version: edit.version,
                              active: !edit.active,
                            },
                            "PATCH",
                          ),
                        )
                      }
                    >
                      {edit.active
                        ? "Deactivate account"
                        : "Reactivate account"}
                    </Button>
                  </div>
                )}
                {edit.tenancyId && (
                  <div className="row actions-wrap">
                    <Button
                      type="button"
                      variant="soft"
                      onClick={() => setModal("terms")}
                    >
                      Change rent
                    </Button>
                    <Button
                      type="button"
                      variant="soft"
                      onClick={() => setModal("move")}
                    >
                      Move room
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setModal("end")}
                    >
                      End tenancy
                    </Button>
                  </div>
                )}
              </>
            )}
            {a.feedback}
            <div className="form-actions">
              <Button
                variant="soft"
                type="reset"
                onClick={() => setEdit(undefined)}
              >
                Cancel
              </Button>
              <Button disabled={a.busy}>
                {edit ? "Save profile" : "Create resident"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
      {modal === "allocate" && edit && !edit.tenancyId && (
        <Modal title="Allocate existing resident" onClose={() => setModal("")}>
          <ResidentAllocation
            residentId={edit.id}
            onSaved={() => {
              setModal("");
              setEdit(undefined);
              list.refresh();
            }}
          />
        </Modal>
      )}
      {modal && edit?.tenancyId && (
        <Modal
          title={
            modal === "terms"
              ? "Change rent"
              : modal === "move"
                ? "Move resident"
                : "End tenancy"
          }
          onClose={() => setModal("")}
        >
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget),
                day = value(d, "date");
              const body =
                modal === "terms"
                  ? {
                      effectiveFrom: day,
                      amountMinor: toMinor(value(d, "rent")),
                    }
                  : modal === "move"
                    ? {
                        effectiveDate: day,
                        roomId: value(d, "room"),
                        rentMinor: toMinor(value(d, "rent")),
                      }
                    : { endDate: day, reason: value(d, "reason") };
              await a.run(() =>
                write(
                  "/tenancies/" +
                    edit.tenancyId +
                    "/" +
                    (modal === "terms" ? "rent-terms" : modal),
                  body,
                ),
              );
            }}
          >
            {modal === "move" && (
              <RecordSelect
                name="room"
                label="Destination room"
                endpoint="/rooms"
                required
              />
            )}
            <Field label="Effective date">
              <input name="date" type="date" required />
            </Field>
            {modal !== "end" ? (
              <Field label="Monthly rent (BDT)">
                <input name="rent" type="number" min="0" step="0.01" required />
              </Field>
            ) : (
              <Field label="Reason">
                <input name="reason" required />
              </Field>
            )}
            <Note>
              Use the first day of a month. Complete final meter billing before
              moving or ending a tenancy. Existing bills remain with their
              original tenancy.
            </Note>
            {a.feedback}
            <Button disabled={a.busy}>Confirm change</Button>
          </form>
        </Modal>
      )}
    </>
  );
}

function ResidentAllocation({
  residentId,
  onSaved,
}: {
  residentId: string;
  onSaved: () => void;
}) {
  const a = useAction(onSaved);
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        await a.run(
          () =>
            write("/tenancies", {
              residentId,
              roomId: value(d, "room"),
              startDate: value(d, "date"),
              rentMinor: toMinor(value(d, "rent")),
            }),
          "Room allocated",
        );
      }}
    >
      <RecordSelect
        label="Destination room"
        name="room"
        endpoint="/rooms"
        required
      />
      <Field label="Start date">
        <input name="date" type="date" required />
      </Field>
      <Field label="Monthly rent (BDT)">
        <input name="rent" type="number" min="0" step="0.01" required />
      </Field>
      <Note>
        Use a month-boundary date. Previous tenancy bills stay with their
        original tenancy.
      </Note>
      {a.feedback}
      <Button disabled={a.busy}>Allocate room</Button>
    </form>
  );
}
