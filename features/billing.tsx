"use client";
import { useEffect, useState } from "react";
import {
  Card,
  Button,
  Field,
  Badge,
  Modal,
  Note,
  statusOf,
} from "@/components/ui";
import {
  ResourceState,
  DataTable,
  Pagination,
  RecordSelect,
  useAction,
  formValue as value,
} from "@/components/data-ui";
import { MonthSelect, HouseSelect } from "@/components/filters";
import { useResource } from "@/lib/use-resource";
import {
  api,
  write,
  financialWrite,
  money,
  toMinor,
  currentMonth,
  currentDate,
} from "@/lib/api";
import type { Bill, Room, Page, Dashboard, Payment } from "@/lib/models";
type Preview = {
  previous: string;
  current: string;
  usage: string;
  rate: string;
  amountMinor: string;
  previousReadingId: string;
  tariffId: string;
  meter: string;
};
export function Billing({ type }: { type: "rent" | "electricity" }) {
  const [month, setMonth] = useState(currentMonth());
  const [house, setHouse] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("All");
  const [selected, setSelected] = useState("");
  const [modal, setModal] = useState("");
  const [payment, setPayment] = useState<{
    amountMinor: string;
    method: string;
    receivedAt: string;
  }>();
  const [receipt, setReceipt] = useState<Payment>();
  const [preview, setPreview] = useState<Preview>();
  const [entry, setEntry] = useState<Record<string, string>>();
  const [entryHouse, setEntryHouse] = useState("");
  const [amount, setAmount] = useState("");
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setMonth(p.get("month") || currentMonth());
    setHouse(p.get("house") || "");
    setStatus(p.get("status") || "All");
  }, []);
  const suffix = `month=${month}&page=${page}&status=${status}${house ? "&houseId=" + house : ""}`;
  const list = useResource<Page<Bill>>("/" + type + "/bills?" + suffix);
  const stats = useResource<Dashboard>(
    `/dashboard?month=${month}${house ? "&houseId=" + house : ""}`,
  );
  const collections = useResource<Page<Payment>>(
    `/collections?type=${type}&month=${month}${house ? "&houseId=" + house : ""}`,
  );
  const bill =
    list.data?.data.find((b) => b.id === selected) || list.data?.data[0];
  const refresh = () => {
    list.refresh();
    stats.refresh();
    collections.refresh();
  };
  const a = useAction(refresh);
  function open(name: string) {
    setModal(name);
    setPreview(undefined);
    if (name === "payment")
      setAmount(bill ? String(Number(bill.remainingMinor) / 100) : "");
  }
  const paymentForm = bill && (
    <form
      className="payment-form"
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        setPayment({
          amountMinor: toMinor(value(d, "amount")),
          method: value(d, "method"),
          receivedAt: value(d, "date"),
        });
        setModal("confirm");
      }}
    >
      <div className="payment-fields">
        <Field label="Amount received (BDT)">
          <input
            name="amount"
            type="number"
            required
            min="0.01"
            step="0.01"
            max={Number(bill.remainingMinor) / 100}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Method">
          <select name="method">
            <option>Cash</option>
            <option>Bank transfer</option>
            <option>bKash</option>
            <option>Nagad</option>
          </select>
        </Field>
        <Field label="Date">
          <input
            name="date"
            type="date"
            required
            defaultValue={currentDate()}
            max={currentDate()}
          />
        </Field>
      </div>
      <div className="payment-footer">
        <Note>This records {type} only.</Note>
        <Button disabled={BigInt(bill.remainingMinor) <= BigInt(0)}>
          Confirm {type} payment
        </Button>
      </div>
    </form>
  );
  const totals = stats.data?.[type];
  return (
    <>
      <div className="section-heading billing-heading">
        <h1>{type === "rent" ? "Rent collections" : "Electricity bills"}</h1>
        <div className="row">
          <MonthSelect
            value={month}
            onChange={(v) => {
              setMonth(v);
              setPage(1);
            }}
          />
          <HouseSelect
            value={house}
            onChange={(v) => {
              setHouse(v);
              setPage(1);
            }}
          />
        </div>
      </div>
      <div className="row actions-wrap admin-tools">
        {type === "rent" ? (
          <Button onClick={() => open("run")}>Generate monthly rent</Button>
        ) : (
          <>
            <Button onClick={() => open("issue")}>
              Enter reading / generate bill
            </Button>
            <Button variant="soft" onClick={() => open("baseline")}>
              Set meter baseline
            </Button>
            <Button variant="soft" onClick={() => open("rate")}>
              Rate settings
            </Button>
          </>
        )}
      </div>
      <ResourceState
        loading={stats.loading || list.loading}
        error={stats.error || list.error}
      >
        <div className={type === "electricity" ? "electricity-layout" : ""}>
          <div>
            <div className="stats three">
              {totals &&
                [
                  [type === "rent" ? "Expected" : "Billed", totals.amountMinor],
                  ["Collected", totals.paidMinor],
                  ["Remaining", totals.remainingMinor],
                ].map(([label, n]) => (
                  <Card key={label} className="stat">
                    <div>
                      <b>{label}</b>
                      <strong>{money(n)}</strong>
                    </div>
                  </Card>
                ))}
            </div>
            {type === "rent" && (
              <div className="tabs">
                {["All", "Paid", "Partial", "Unpaid"].map((s) => (
                  <Button
                    key={s}
                    variant={s === status ? "primary" : "soft"}
                    onClick={() => {
                      setStatus(s);
                      setPage(1);
                    }}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            )}
            <Card
              className={
                type === "electricity" ? "electricity-list" : "bill-list"
              }
            >
              <p className="showing">
                Showing {list.data?.data.length || 0} of{" "}
                {list.data?.meta.total || 0} bills
              </p>
              <DataTable
                headers={
                  type === "rent"
                    ? [
                        "Resident",
                        "Room",
                        "Rent",
                        "Collected",
                        "Remaining",
                        "Status",
                        "Action",
                      ]
                    : ["Room", "Meter", "Usage", "Bill", "Status", "Action"]
                }
                rows={
                  list.data?.data.map((b) => [
                    ...(type === "rent"
                      ? [
                          b.residentName,
                          b.roomNumber,
                          money(b.amountMinor),
                          money(b.paidMinor),
                          money(b.remainingMinor),
                        ]
                      : [
                          b.roomNumber,
                          b.meter || "—",
                          (b.usage || "0") + " kWh",
                          money(b.amountMinor),
                        ]),
                    <Badge
                      key="s"
                      status={statusOf(
                        Number(b.amountMinor),
                        Number(b.paidMinor),
                      )}
                    />,
                    <Button
                      key="a"
                      variant="soft"
                      onClick={() => {
                        setSelected(b.id);
                        setAmount(String(Number(b.remainingMinor) / 100));
                      }}
                    >
                      Select
                    </Button>,
                  ]) || []
                }
              />
              <Pagination meta={list.data?.meta} onPage={setPage} />
            </Card>
            {type === "rent" && bill && (
              <Card className="record-payment">
                <h2>Record rent payment</h2>
                <div className="selected-summary">
                  <span>
                    {bill.residentName} · Room {bill.roomNumber}
                  </span>
                  <span>{month}</span>
                  <span className="badge partial">
                    Remaining {money(bill.remainingMinor)}
                  </span>
                </div>
                {paymentForm}
                <Button variant="soft" onClick={() => open("correct")}>
                  Correct bill
                </Button>
              </Card>
            )}
          </div>
          {type === "electricity" && (
            <div>
              <Card className="selected-bill">
                <b>Selected bill</b>
                {bill ? (
                  <>
                    <h2>Room {bill.roomNumber}</h2>
                    <p>{bill.residentName}</p>
                    <dl>
                      {[
                        ["Meter", bill.meter],
                        ["Previous", bill.previous + " kWh"],
                        ["Current", bill.current + " kWh"],
                        ["Usage", bill.usage + " kWh"],
                        ["Rate", bill.rate + " BDT / kWh"],
                        ["Total", money(bill.amountMinor)],
                        ["Collected", money(bill.paidMinor)],
                        ["Remaining", money(bill.remainingMinor)],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <dt>{k}</dt>
                          <dd>{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="row">
                      <Button
                        disabled={BigInt(bill.remainingMinor) <= BigInt(0)}
                        onClick={() => open("payment")}
                      >
                        Record payment
                      </Button>
                      <Button variant="soft" onClick={() => open("correct")}>
                        Correct reading
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="muted">No bill selected.</p>
                )}
              </Card>
              <RateList house={house} key={a.success} />
            </div>
          )}
        </div>
      </ResourceState>
      <Card>
        <h2>Recent {type} collections</h2>
        <ResourceState loading={collections.loading} error={collections.error}>
          <DataTable
            headers={["Receipt", "Resident", "Amount", "Status", "Action"]}
            rows={
              collections.data?.data.map((p) => [
                p.receiptNumber,
                p.residentName,
                money(p.amountMinor),
                p.kind === "REVERSAL"
                  ? "Reversal"
                  : p.reversed
                    ? "Reversed"
                    : "Posted",
                <div className="row" key="a">
                  <Button
                    variant="soft"
                    onClick={async () => {
                      setReceipt(await api<Payment>("/receipts/" + p.id));
                      setModal("receipt");
                    }}
                  >
                    Receipt
                  </Button>
                  {p.kind === "PAYMENT" && !p.reversed && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setReceipt(p);
                        open("reverse");
                      }}
                    >
                      Reverse
                    </Button>
                  )}
                </div>,
              ]) || []
            }
          />
        </ResourceState>
      </Card>
      {a.feedback}
      {modal === "payment" && bill && (
        <Modal title="Record electricity payment" onClose={() => setModal("")}>
          <p>
            Room {bill.roomNumber} · {bill.residentName} · Meter {bill.meter}
          </p>
          {paymentForm}
        </Modal>
      )}
      {modal === "confirm" && bill && payment && (
        <Modal title={`Confirm ${type} payment`} onClose={() => setModal("")}>
          <p>
            {bill.residentName} · Room {bill.roomNumber} · {month}
          </p>
          <h2>{money(payment.amountMinor)}</h2>
          <p>
            {payment.method} · {payment.receivedAt}
          </p>
          <Note>This payment applies to {type} only.</Note>
          {a.feedback}
          <Button
            disabled={a.busy}
            onClick={async () => {
              await a.run(async () => {
                const result = await financialWrite<{ id: string }>(
                  "/" + type + "/bills/" + bill.id + "/payments",
                  payment,
                );
                setPayment(undefined);
                setAmount("");
                setModal("");
                try {
                  setReceipt(await api<Payment>("/receipts/" + result.id));
                  setModal("receipt");
                } catch {
                  /* The collection is committed. The receipt remains available in Recent collections. */
                }
              }, "Payment saved");
            }}
          >
            Confirm payment
          </Button>
        </Modal>
      )}
      {modal === "receipt" && receipt && (
        <Modal title="Payment receipt" onClose={() => setModal("")}>
          <div className="receipt">
            <h2>HouseLedger</h2>
            <p>{receipt.receiptNumber}</p>
            <p>
              {receipt.residentName} · {receipt.houseName} · Room{" "}
              {receipt.roomNumber}
            </p>
            <dl>
              {[
                ["Ledger", receipt.type],
                ["Amount", money(receipt.amountMinor)],
                ["Method", receipt.method],
                ["Received date", receipt.receivedAt],
                ["Status", receipt.reversed ? "Reversed" : receipt.kind],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <Button onClick={() => window.print()}>Print receipt</Button>
          </div>
        </Modal>
      )}
      {modal === "reverse" && receipt && (
        <Modal title="Reverse collection" onClose={() => setModal("")}>
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const reason = value(new FormData(e.currentTarget), "reason");
              const ok = await a.run(
                () =>
                  financialWrite("/payments/" + receipt.id + "/reversal", {
                    reason,
                  }),
                "Payment reversed",
              );
              if (ok) setModal("");
            }}
          >
            <p>
              Restore {money(receipt.amountMinor)} to this bill’s remaining
              balance.
            </p>
            <Field label="Reason">
              <input name="reason" required minLength={5} />
            </Field>
            {a.feedback}
            <Button variant="danger" disabled={a.busy}>
              Confirm reversal
            </Button>
          </form>
        </Modal>
      )}
      {modal === "run" && (
        <Modal title="Generate monthly rent" onClose={() => setModal("")}>
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              const ok = await a.run(
                () =>
                  financialWrite("/rent/bill-runs", {
                    houseId: value(d, "house"),
                    month: value(d, "month"),
                    dueDay: Number(value(d, "day")),
                  }),
                "Monthly rent generated",
              );
              if (ok) setModal("");
            }}
          >
            <RecordSelect
              label="House"
              name="house"
              endpoint="/houses"
              required
            />
            <Field label="Billing month">
              <input type="month" name="month" defaultValue={month} required />
            </Field>
            <Field label="Agreed due day (1–28)">
              <input type="number" name="day" min="1" max="28" required />
            </Field>
            <Note>
              Only full-month eligible tenancies are billed. Running again does
              not create duplicate bills.
            </Note>
            {a.feedback}
            <Button disabled={a.busy}>Generate rent bills</Button>
          </form>
        </Modal>
      )}
      {modal === "rate" && (
        <Modal title="Add electricity rate" onClose={() => setModal("")}>
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              const ok = await a.run(
                () =>
                  write("/tariffs", {
                    houseId: value(d, "house"),
                    effectiveFrom: value(d, "date"),
                    rate: value(d, "rate"),
                  }),
                "Rate saved",
              );
              if (ok) setModal("");
            }}
          >
            <RecordSelect
              label="House"
              name="house"
              endpoint="/houses"
              required
            />
            <Field label="Effective date">
              <input name="date" type="date" required />
            </Field>
            <Field label="BDT per kWh">
              <input name="rate" type="number" min="0" step="0.0001" required />
            </Field>
            <Note>
              Use the first of a month. Existing bills keep their saved rate.
            </Note>
            {a.feedback}
            <Button disabled={a.busy}>Save rate</Button>
          </form>
        </Modal>
      )}
      {["baseline", "issue"].includes(modal) && (
        <Modal
          title={
            modal === "baseline"
              ? "Set first meter reading"
              : "Generate electricity bill"
          }
          onClose={() => setModal("")}
        >
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              if (modal === "baseline") {
                const ok = await a.run(
                  () =>
                    write("/meter-readings/baseline", {
                      roomId: value(d, "room"),
                      date: value(d, "date"),
                      reading: value(d, "current"),
                    }),
                  "Baseline saved",
                );
                if (ok) setModal("");
                return;
              }
              const body = {
                roomId: value(d, "room"),
                month: value(d, "month"),
                readAt: value(d, "date"),
                current: value(d, "current"),
              };
              setEntry(body);
              await a.run(
                async () =>
                  setPreview(
                    await write<Preview>("/electricity/previews", body),
                  ),
                "Preview calculated",
              );
            }}
          >
            <RecordSelect
              endpoint="/houses"
              label="House"
              name="house"
              required
              onChange={setEntryHouse}
            />
            {entryHouse && (
              <RecordSelect
                key={entryHouse}
                endpoint={"/rooms?houseId=" + entryHouse}
                label="Meter room"
                name="room"
                required
              />
            )}
            {modal === "issue" && (
              <Field label="Bill month">
                <input
                  type="month"
                  name="month"
                  defaultValue={month}
                  required
                />
              </Field>
            )}
            <Field label="Reading date">
              <input type="date" name="date" required />
            </Field>
            <Field label="Cumulative meter reading (kWh)">
              <input
                type="number"
                name="current"
                min="0"
                step="0.001"
                required
              />
            </Field>
            {a.feedback}
            <Button disabled={a.busy}>
              {modal === "baseline" ? "Save baseline" : "Calculate preview"}
            </Button>
          </form>
          {preview && entry && (
            <div>
              <dl>
                <div>
                  <dt>Usage</dt>
                  <dd>{preview.usage} kWh</dd>
                </div>
                <div>
                  <dt>Saved rate</dt>
                  <dd>{preview.rate} BDT / kWh</dd>
                </div>
                <div>
                  <dt>Total</dt>
                  <dd>{money(preview.amountMinor)}</dd>
                </div>
              </dl>
              <Button
                disabled={a.busy}
                onClick={async () => {
                  const ok = await a.run(
                    () =>
                      financialWrite("/electricity/bills", {
                        ...entry,
                        previousReadingId: preview.previousReadingId,
                        tariffId: preview.tariffId,
                      }),
                    "Electricity bill generated",
                  );
                  if (ok) setModal("");
                }}
              >
                Issue this bill
              </Button>
            </div>
          )}
        </Modal>
      )}
      {modal === "correct" && bill && (
        <Modal
          title={
            type === "rent"
              ? "Correct rent bill"
              : "Correct electricity reading"
          }
          onClose={() => setModal("")}
        >
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget),
                body = {
                  version: bill.version,
                  reason: value(d, "reason"),
                  ...(type === "rent"
                    ? { amountMinor: toMinor(value(d, "value")) }
                    : { current: value(d, "value") }),
                };
              const ok = await a.run(
                () =>
                  financialWrite("/bills/" + bill.id + "/corrections", body),
                "Replacement bill issued",
              );
              if (ok) setModal("");
            }}
          >
            <Field
              label={
                type === "rent"
                  ? "Correct amount (BDT)"
                  : "Correct cumulative reading (kWh)"
              }
            >
              <input
                name="value"
                type="number"
                min="0"
                step={type === "rent" ? "0.01" : "0.001"}
                required
              />
            </Field>
            <Field label="Reason">
              <input name="reason" required minLength={5} />
            </Field>
            <Note>
              Reverse all collections first. The original bill remains in
              history.
            </Note>
            {a.feedback}
            <Button disabled={a.busy}>Issue replacement</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
function RateList({ house }: { house: string }) {
  const r = useResource<
    Page<{ id: string; houseName: string; effectiveFrom: string; rate: string }>
  >("/tariffs?limit=5" + (house ? "&houseId=" + house : ""));
  return (
    <Card className="rate-settings">
      <h2>Rate settings</h2>
      <ResourceState loading={r.loading} error={r.error}>
        {r.data?.data.map((t) => (
          <p key={t.id}>
            {t.houseName} · BDT {t.rate} / kWh
            <br />
            <small>Effective {t.effectiveFrom}</small>
          </p>
        ))}
        {!r.data?.data.length && <p>No rates configured.</p>}
      </ResourceState>
      <Note>Existing bills keep their saved rate.</Note>
    </Card>
  );
}
