"use client";
import Link from "next/link";
import { useState } from "react";
import { Home, BedDouble, Users, Database, Zap, Plus } from "lucide-react";
import { Card } from "@/components/ui";
import { MonthSelect } from "@/components/filters";
import { useResource } from "@/lib/use-resource";
import { ResourceState, DataTable, Pagination } from "@/components/data-ui";
import { currentMonth, money } from "@/lib/api";
import type { Dashboard, Page } from "@/lib/models";
type Row = {
  id: string;
  name: string;
  managers: string;
  rooms: number;
  rentRemaining: string;
  electricityRemaining: string;
};
export function Overview() {
  const [month, setMonth] = useState(currentMonth());
  const [page, setPage] = useState(1);
  const stats = useResource<Dashboard>("/dashboard?month=" + month);
  const houses = useResource<Page<Row>>(
    `/reports/houses?month=${month}&page=${page}`,
  );
  return (
    <>
      <header className="topbar">
        <h2>Overview</h2>
        <MonthSelect value={month} onChange={setMonth} />
      </header>
      <div className="overview-intro">
        <h1>Your houses, at a glance</h1>
        <p>Rent and electricity are tracked separately.</p>
      </div>
      <ResourceState loading={stats.loading} error={stats.error}>
        {stats.data && (
          <>
            <div className="stats four">
              {[
                [Home, "Houses", stats.data.houses],
                [BedDouble, "Rooms", stats.data.rooms],
                [Users, "Occupied", stats.data.occupied],
                [BedDouble, "Vacant", stats.data.vacant],
              ].map(([Icon, label, n]) => {
                const I = Icon as typeof Home;
                return (
                  <Card className="stat" key={String(label)}>
                    <span className="stat-icon">
                      <I />
                    </span>
                    <div>
                      <b>{String(label)}</b>
                      <strong>{String(n)}</strong>
                    </div>
                  </Card>
                );
              })}
            </div>
            <div className="ledger-grid">
              {(["rent", "electricity"] as const).map((type) => {
                const s = stats.data![type],
                  I = type === "rent" ? Database : Zap;
                return (
                  <Card className="ledger-card" key={type}>
                    <h2>
                      <span className="stat-icon">
                        <I />
                      </span>
                      {type === "rent" ? "Rent" : "Electricity"}
                    </h2>
                    <div className="ledger-values">
                      <div>
                        <span>{type === "rent" ? "Expected" : "Billed"}</span>
                        <b>{money(s.amountMinor)}</b>
                      </div>
                      <div>
                        <span>Collected</span>
                        <b className="green-text">{money(s.paidMinor)}</b>
                      </div>
                      <div>
                        <span>Remaining</span>
                        <b className="amber-text">{money(s.remainingMinor)}</b>
                      </div>
                    </div>
                    <Link
                      className="button primary"
                      href={`/${type}?month=${month}`}
                    >
                      View {type}
                    </Link>
                  </Card>
                );
              })}
            </div>
            <Card className="house-summary">
              <div className="section-heading">
                <h2>Collection by house</h2>
                <Link className="button primary" href="/houses">
                  <Plus />
                  Add house
                </Link>
              </div>
              <ResourceState loading={houses.loading} error={houses.error}>
                <DataTable
                  headers={[
                    "House",
                    "Manager",
                    "Rooms",
                    "Rent remaining",
                    "Electricity remaining",
                  ]}
                  rows={
                    houses.data?.data.map((h) => [
                      <Link
                        key={h.id}
                        className="strong"
                        href={"/houses/" + h.id}
                      >
                        {h.name}
                      </Link>,
                      h.managers,
                      h.rooms,
                      <span key="r" className="badge partial">
                        {money(h.rentRemaining)}
                      </span>,
                      <span key="e" className="badge partial">
                        {money(h.electricityRemaining)}
                      </span>,
                    ]) || []
                  }
                />
                <Pagination meta={houses.data?.meta} onPage={setPage} />
              </ResourceState>
            </Card>
            <Card className="attention">
              <h2>Needs attention</h2>
              <Link href={"/rent?month=" + month}>
                {stats.data.rent.due} rooms have rent due
              </Link>
              <Link href={"/electricity?month=" + month}>
                {stats.data.electricity.due} electricity bills need collection
              </Link>
            </Card>
          </>
        )}
      </ResourceState>
    </>
  );
}
