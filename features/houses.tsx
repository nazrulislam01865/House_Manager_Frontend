"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Home, MapPin, BedDouble, Plus, Pencil, Trash2 } from "lucide-react";
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
import { useResource } from "@/lib/use-resource";
import { write, money, toMinor, major, currentDate } from "@/lib/api";
import type { House, Room, Page } from "@/lib/models";
function HouseForm({ house, onSaved }: { house?: House; onSaved: () => void }) {
  const action = useAction(onSaved);
  return (
    <form
      className="stack full-form"
      key={house?.id || "new"}
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget,
          d = new FormData(form);
        const manager = value(d, "manager");
        const body = {
          name: value(d, "name"),
          address: value(d, "address"),
          managerIds: manager
            ? [manager]
            : house?.managers.map((x) => x.id) || [],
        };
        const ok = await action.run(
          () =>
            write(
              house ? "/houses/" + house.id : "/houses",
              house ? { ...body, version: house.version } : body,
              house ? "PATCH" : "POST",
            ),
          "House saved",
        );
        if (ok && !house) form.reset();
      }}
    >
      <h2>{house ? "Edit house" : "Add house"}</h2>
      <Field label="House name">
        <input
          name="name"
          defaultValue={house?.name}
          required
          maxLength={200}
        />
      </Field>
      <Field label="Address">
        <input
          name="address"
          defaultValue={house?.address}
          required
          maxLength={200}
        />
      </Field>
      <RecordSelect
        label="Assign manager"
        name="manager"
        endpoint="/managers"
      />
      <p className="muted">
        Managers can manage only their own records in assigned houses.
      </p>
      {action.feedback}
      <div className="form-actions">
        <Button type="reset" variant="soft">
          Cancel
        </Button>
        <Button disabled={action.busy}>
          {action.busy ? "Saving…" : house ? "Save changes" : "Create house"}
        </Button>
      </div>
    </form>
  );
}
export function Houses() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<House>();
  const list = useResource<Page<House>>(
    `/houses?search=${encodeURIComponent(search)}&page=${page}`,
  );
  return (
    <>
      <div className="split houses-layout">
        <div>
          <h1>Houses</h1>
          <p className="subtitle">Manage your properties.</p>
          <div className="toolbar">
            <SearchField
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search houses…"
            />
            <Button
              onClick={() =>
                document.querySelector<HTMLInputElement>("[name=name]")?.focus()
              }
            >
              <Plus />
              Add house
            </Button>
          </div>
          <ResourceState loading={list.loading} error={list.error}>
            <div className="house-list">
              {list.data?.data.map((h) => (
                <Card className="house-card" key={h.id}>
                  <span className="house-icon">
                    <Home />
                  </span>
                  <div className="house-info">
                    <h2>{h.name}</h2>
                    <p>
                      <MapPin size={20} />
                      {h.address}
                    </p>
                    <div className="house-meta">
                      <span>
                        <BedDouble />
                        {h.roomCount} rooms
                      </span>
                      <span>
                        {h.managers.map((m) => m.name).join(", ") ||
                          "Unassigned"}
                      </span>
                    </div>
                  </div>
                  <div className="house-actions">
                    <Link className="button primary" href={"/houses/" + h.id}>
                      View house
                    </Link>
                    <Button variant="soft" onClick={() => setEdit(h)}>
                      Edit
                    </Button>
                  </div>
                </Card>
              ))}
              {!list.data?.data.length && (
                <Card>No houses yet. Create your first house.</Card>
              )}
            </div>
            <Pagination meta={list.data?.meta} onPage={setPage} />
          </ResourceState>
        </div>
        <Card className="add-house">
          <HouseForm onSaved={list.refresh} />
        </Card>
      </div>
      {edit && (
        <Modal title="House details" onClose={() => setEdit(undefined)}>
          <HouseForm
            house={edit}
            onSaved={() => {
              setEdit(undefined);
              list.refresh();
            }}
          />
        </Modal>
      )}
    </>
  );
}
function RoomForm({
  houseId,
  room,
  onSaved,
}: {
  houseId: string;
  room?: Room;
  onSaved: () => void;
}) {
  const a = useAction(onSaved);
  return (
    <form
      className="room-fields"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = e.currentTarget,
          d = new FormData(f);
        const body = {
          number: value(d, "number"),
          rentMinor: toMinor(value(d, "rent")),
        };
        const ok = await a.run(
          () =>
            write(
              room ? "/rooms/" + room.id : "/rooms",
              room
                ? { ...body, version: room.version }
                : {
                    ...body,
                    houseId,
                    meter: value(d, "meter") || undefined,
                    installedAt: currentDate(),
                  },
              room ? "PATCH" : "POST",
            ),
          "Room saved",
        );
        if (ok && !room) f.reset();
      }}
    >
      <Field label="Room number">
        <input name="number" defaultValue={room?.number} required />
      </Field>
      <Field label="Monthly rent (BDT)">
        <input
          name="rent"
          type="number"
          min="0"
          step="0.01"
          defaultValue={major(room?.rentMinor)}
          required
        />
      </Field>
      {!room && (
        <Field label="Meter number (optional)">
          <input name="meter" />
        </Field>
      )}
      <Button disabled={a.busy}>Save room</Button>
      {a.feedback}
    </form>
  );
}
export function HouseDetail({ id }: { id: string }) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("Rooms");
  const [modal, setModal] = useState("");
  const [room, setRoom] = useState<Room>();
  const [confirm, setConfirm] = useState("");
  const detail = useResource<House>("/houses/" + id);
  const rooms = useResource<Page<Room>>(`/rooms?houseId=${id}&page=${page}`);
  const refresh = () => {
    detail.refresh();
    rooms.refresh();
  };
  const a = useAction(() => {
    refresh();
    setModal("");
  });
  const h = detail.data;
  return (
    <ResourceState loading={detail.loading} error={detail.error}>
      {h && (
        <>
          <header className="topbar">
            <h2>{h.name}</h2>
          </header>
          <div className="breadcrumb">
            <Link href="/houses">Houses</Link> / {h.name}
          </div>
          <div className="section-heading">
            <div>
              <h1>{h.name}</h1>
              <p className="subtitle">{h.address}</p>
            </div>
            <div className="row">
              <Button onClick={() => setModal("edit")}>
                <Pencil />
                Edit house
              </Button>
              <Button
                variant="soft"
                onClick={() => {
                  setConfirm("");
                  setModal(h.roomCount ? "archive" : "delete");
                }}
              >
                <Trash2 />
                {h.roomCount ? "Archive" : "Delete"} house
              </Button>
            </div>
          </div>
          <div className="house-stats">
            <Card className="manager-stat">
              <div>
                <small>Managers</small>
                <strong>
                  {h.managers.map((m) => m.name).join(", ") || "Unassigned"}
                </strong>
              </div>
              <Button variant="soft" onClick={() => setModal("assign")}>
                Change manager
              </Button>
            </Card>
            {[
              ["Rooms", h.roomCount],
              ["Occupied", h.occupied],
              ["Vacant", h.roomCount - h.occupied],
            ].map(([label, n]) => (
              <Card className="stat" key={label}>
                <span className="stat-icon">
                  <BedDouble />
                </span>
                <div>
                  <strong>{n}</strong>
                  <span>{label}</span>
                </div>
              </Card>
            ))}
          </div>
          <div className="tabs">
            {["Rooms", "Residents", "Collections"].map((t) => (
              <Button
                key={t}
                variant={tab === t ? "primary" : "soft"}
                onClick={() => setTab(t)}
              >
                {t}
              </Button>
            ))}
          </div>
          <Card>
            {tab === "Collections" ? (
              <div className="ledger-grid">
                <Link className="button primary" href={"/rent?house=" + id}>
                  View rent
                </Link>
                <Link
                  className="button primary"
                  href={"/electricity?house=" + id}
                >
                  View electricity
                </Link>
              </div>
            ) : (
              <ResourceState loading={rooms.loading} error={rooms.error}>
                <DataTable
                  headers={[
                    "Room",
                    "Resident",
                    "Monthly rent",
                    "Meter",
                    "Status",
                    "Action",
                  ]}
                  rows={
                    rooms.data?.data
                      .filter((r) => tab === "Rooms" || r.residentId)
                      .map((r) => [
                        r.number,
                        r.residentName || "Unassigned",
                        money(r.rentMinor),
                        r.meter || "Not linked",
                        <Badge
                          key="s"
                          status={r.residentId ? "Occupied" : "Vacant"}
                        />,
                        <div className="row" key="a">
                          <Button
                            variant="soft"
                            onClick={() => {
                              setRoom(r);
                              setModal("room");
                            }}
                          >
                            Edit
                          </Button>
                          {!r.residentId && (
                            <Link
                              className="button soft"
                              href={`/residents?room=${r.id}&house=${id}`}
                            >
                              Assign resident
                            </Link>
                          )}
                        </div>,
                      ]) || []
                  }
                />
                <Pagination meta={rooms.data?.meta} onPage={setPage} />
              </ResourceState>
            )}
            {tab === "Rooms" && (
              <>
                <h2 className="add-room">Add room</h2>
                <RoomForm houseId={id} onSaved={refresh} />
                <Note>
                  Link a meter before electricity billing. Changing room rent
                  does not rewrite existing tenancy terms.
                </Note>
              </>
            )}
          </Card>
          {modal === "edit" && (
            <Modal title="Edit house" onClose={() => setModal("")}>
              <HouseForm
                house={h}
                onSaved={() => {
                  setModal("");
                  refresh();
                }}
              />
            </Modal>
          )}
          {modal === "assign" && (
            <Modal title="Manager assignments" onClose={() => setModal("")}>
              <p>
                Currently:{" "}
                {h.managers.map((m) => m.name).join(", ") || "Unassigned"}
              </p>
              <form
                className="stack"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const d = new FormData(e.currentTarget);
                  const manager = value(d, "manager");
                  await a.run(() =>
                    write("/houses/" + id + "/assignments", {
                      version: h.version,
                      managerIds: manager
                        ? [
                            ...new Set([
                              ...h.managers.map((m) => m.id),
                              manager,
                            ]),
                          ]
                        : [],
                    }),
                  );
                }}
              >
                <RecordSelect
                  endpoint="/managers"
                  label="Manager to add"
                  name="manager"
                />
                <Note>
                  Leave blank to remove all assignments. Existing record
                  ownership is preserved.
                </Note>
                {a.feedback}
                <Button disabled={a.busy}>Save assignment</Button>
              </form>
            </Modal>
          )}
          {modal === "room" && room && (
            <Modal
              title={"Edit room " + room.number}
              onClose={() => setModal("")}
            >
              <RoomForm
                houseId={id}
                room={room}
                onSaved={() => {
                  refresh();
                  setModal("");
                }}
              />
              <Note>
                Use tenancy rent terms to change an existing resident’s rent.
              </Note>
              <RoomMeterForm
                room={room}
                onSaved={() => {
                  refresh();
                  setModal("");
                }}
              />
              {!room.residentId && (
                <Button
                  variant="danger"
                  disabled={a.busy}
                  onClick={() =>
                    a.run(
                      () =>
                        write(
                          "/rooms/" + room.id,
                          { version: room.version },
                          "DELETE",
                        ),
                      "Unused room deleted",
                    )
                  }
                >
                  Delete unused room
                </Button>
              )}
            </Modal>
          )}
          {["delete", "archive"].includes(modal) && (
            <Modal
              title={`${modal === "delete" ? "Delete" : "Archive"} ${h.name}?`}
              onClose={() => setModal("")}
            >
              <div className="delete-icon">
                <Trash2 />
              </div>
              <p>
                {modal === "delete"
                  ? "This empty house will be permanently deleted."
                  : "The house and its history remain in the database. End current and scheduled tenancies first."}
              </p>
              <Field label={"Type " + modal.toUpperCase() + " to confirm"}>
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </Field>
              {a.feedback}
              <div className="form-actions">
                <Button variant="soft" onClick={() => setModal("")}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  disabled={a.busy || confirm !== modal.toUpperCase()}
                  onClick={async () => {
                    const ok = await a.run(() =>
                      write(
                        "/houses/" +
                          id +
                          (modal === "archive" ? "/archive" : ""),
                        { version: h.version },
                        modal === "archive" ? "POST" : "DELETE",
                      ),
                    );
                    if (ok) router.push("/houses");
                  }}
                >
                  {modal === "delete" ? "Delete" : "Archive"} house
                </Button>
              </div>
            </Modal>
          )}
        </>
      )}
    </ResourceState>
  );
}

function RoomMeterForm({ room, onSaved }: { room: Room; onSaved: () => void }) {
  const a = useAction(onSaved);
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        await a.run(
          () =>
            write(
              room.installationId
                ? "/meter-installations/" + room.installationId + "/replace"
                : "/rooms/" + room.id + "/meter-installations",
              {
                serial: value(d, "serial"),
                installedAt: value(d, "date"),
                baseline: value(d, "baseline"),
              },
            ),
          "Meter saved",
        );
      }}
    >
      <h3>{room.installationId ? "Replace meter" : "Link meter"}</h3>
      {room.installationId && (
        <Note>
          Issue the old meter’s final bill first. Replacement is supported at
          month boundaries.
        </Note>
      )}
      <Field label="Meter serial number">
        <input name="serial" required />
      </Field>
      <Field label="Installation date">
        <input name="date" type="date" required />
      </Field>
      <Field label="New meter baseline (kWh)">
        <input name="baseline" type="number" min="0" step="0.001" required />
      </Field>
      {a.feedback}
      <Button disabled={a.busy}>Save meter</Button>
    </form>
  );
}
