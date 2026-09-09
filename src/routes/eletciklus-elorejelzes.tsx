import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lookup, ORG_UNITS, useStore } from "@/lib/store";
import { ASSET_CATEGORIES, NEXT_FINANCIAL_YEAR, SOFTWARE_PRODUCTS } from "@/lib/asset-data";
import {
  assetLookup,
  forecastByYear,
  huf,
  hufShort,
  licenceStatus,
  lifecycleEnd,
} from "@/lib/asset-logic";
import { LicenceBadge, StatTile } from "@/components/asset-bits";
import { PageHeading } from "@/components/page-heading";

export const Route = createFileRoute("/eletciklus-elorejelzes")({
  head: () => ({
    meta: [
      { title: "Életciklus-előrejelzés – ÁOK Digitális Szolgáltatási Portál" },
      {
        name: "description",
        content:
          "Többéves eszközcsere- és licencmegújítási előrejelzés: csúcsévek, becsült forrásigény, kategória- és egységszintű bontás.",
      },
      { property: "og:title", content: "Életciklus-előrejelzés – ÁOK Digitális Szolgáltatási Portál" },
      {
        property: "og:description",
        content: "Több évre előre látható eszközcsere-igény és becsült költség.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForecastPage,
});

function ForecastPage() {
  const store = useStore();
  const [years, setYears] = useState(5);
  const span = Math.min(10, Math.max(2, years));

  const rows = useMemo(
    () => forecastByYear(store.assets, NEXT_FINANCIAL_YEAR, span),
    [store.assets, span],
  );
  const max = Math.max(1, ...rows.map((r) => r.estimatedCost));
  const peak = rows.reduce((a, b) => (b.count > a.count ? b : a), rows[0]!);
  const total = rows.reduce((s, r) => s + r.estimatedCost, 0);

  const licenceRows = useMemo(() => {
    const map = new Map<number, { count: number; cost: number }>();
    for (const l of store.licences) {
      const end = l.licenceEnd ?? l.renewalDate;
      if (!end) continue;
      const y = Number(end.slice(0, 4));
      const cur = map.get(y) ?? { count: 0, cost: 0 };
      map.set(y, { count: cur.count + 1, cost: cur.cost + (l.annualCost || l.purchaseValue) });
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [store.licences]);

  return (
    <div className="space-y-6">
      <div>
        <PageHeading
          title="Életciklus-előrejelzés"
          description="Több évre előre mutatja, hány eszköz életciklusa jár le, mekkora forrásigény várható, és hol keletkeznek csereszempontú csúcsévek. Az előrejelzés évi 3% árváltozási feltételezéssel számol; a becslés tervezési célú, nem kötelezettségvállalás."
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Vizsgált időtáv" value={`${span} év`} hint={`${NEXT_FINANCIAL_YEAR}–${NEXT_FINANCIAL_YEAR + span - 1}`} />
        <StatTile label="Érintett eszköz" value={rows.reduce((s, r) => s + r.count, 0)} />
        <StatTile label="Becsült teljes forrásigény" value={hufShort(total)} />
        <StatTile label="Csúcsév" value={`${peak.year}`} tone="warn" hint={`${peak.count} eszköz · ${hufShort(peak.estimatedCost)}`} />
      </div>

      <div className="card-surface max-w-xs p-4">
        <Label htmlFor="years">Előrejelzési időtáv (év)</Label>
        <Input
          id="years"
          type="number"
          min={2}
          max={10}
          value={years}
          onChange={(e) => setYears(Number(e.target.value) || 5)}
          className="mt-1.5"
        />
      </div>

      <Tabs defaultValue="hardver">
        <TabsList className="flex-wrap">
          <TabsTrigger value="hardver">Hardver-előrejelzés</TabsTrigger>
          <TabsTrigger value="egyseg">Egységszintű bontás</TabsTrigger>
          <TabsTrigger value="szoftver">Szoftver és támogatás</TabsTrigger>
        </TabsList>

        <TabsContent value="hardver" className="space-y-4">
          <section className="card-surface p-5">
            <h2 className="font-display text-base font-semibold">Éves forrásigény</h2>
            <div className="mt-4 space-y-3">
              {rows.map((r) => (
                <div key={r.year} className="flex items-center gap-3">
                  <span className="w-12 text-sm font-medium">{r.year}</span>
                  <div className="h-6 flex-1 rounded bg-secondary">
                    <div
                      className="grid h-6 place-items-start rounded bg-primary"
                      style={{ width: `${Math.max(3, (r.estimatedCost / max) * 100)}%` }}
                    />
                  </div>
                  <span className="w-28 text-right text-sm">{hufShort(r.estimatedCost)}</span>
                  <span className="w-16 text-right text-xs text-muted-foreground">{r.count} db</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card-surface overflow-x-auto p-5">
            <h2 className="font-display text-base font-semibold">Kategória szerinti bontás</h2>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2">Év</th>
                  {ASSET_CATEGORIES.map((c) => (
                    <th key={c.key} className="py-2">
                      {c.label}
                    </th>
                  ))}
                  <th className="py-2">Becsült nettó</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.year}>
                    <td className="py-2 font-medium">{r.year}</td>
                    {ASSET_CATEGORIES.map((c) => (
                      <td key={c.key} className="py-2">
                        {r.byCategory[c.key] ?? "—"}
                      </td>
                    ))}
                    <td className="py-2">{huf(r.estimatedCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </TabsContent>

        <TabsContent value="egyseg">
          <section className="card-surface overflow-x-auto p-5">
            <h2 className="font-display text-base font-semibold">Szervezeti egységenkénti csereigény</h2>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2">Egység</th>
                  {rows.map((r) => (
                    <th key={r.year} className="py-2">
                      {r.year}
                    </th>
                  ))}
                  <th className="py-2">Összesen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ORG_UNITS.map((o) => {
                  const perYear = rows.map(
                    (r) =>
                      store.assets.filter(
                        (a) => a.orgUnitId === o.id && Number(lifecycleEnd(a).slice(0, 4)) === r.year,
                      ).length,
                  );
                  const sum = perYear.reduce((s, n) => s + n, 0);
                  if (!sum) return null;
                  return (
                    <tr key={o.id}>
                      <td className="py-2 font-medium">{o.name}</td>
                      {perYear.map((n, i) => (
                        <td key={rows[i]!.year} className="py-2">
                          {n || "—"}
                        </td>
                      ))}
                      <td className="py-2 font-medium">{sum}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </TabsContent>

        <TabsContent value="szoftver" className="space-y-4">
          <section className="card-surface p-5">
            <h2 className="font-display text-base font-semibold">Licencmegújítási előrejelzés</h2>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2">Év</th>
                  <th className="py-2">Megújítandó licencek</th>
                  <th className="py-2">Becsült éves költség</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {licenceRows.map(([year, v]) => (
                  <tr key={year}>
                    <td className="py-2 font-medium">{year}</td>
                    <td className="py-2">{v.count}</td>
                    <td className="py-2">{huf(v.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card-surface p-5">
            <h2 className="font-display text-base font-semibold">Kockázatos licencek</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {store.licences
                .filter((l) => ["lejart", "lejarathoz_kozel", "megujitas_szukseges", "nem_hasznalt"].includes(licenceStatus(l)))
                .map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
                    <div>
                      <p className="font-medium">
                        {assetLookup.productName(l.productKey)} {l.version}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lookup.userName(l.assignedUserId)} · {lookup.unit(l.orgUnitId)} · lejárat:{" "}
                        {l.licenceEnd ?? "nincs megadva"} · éves díj: {huf(l.annualCost)}
                      </p>
                    </div>
                    <LicenceBadge status={licenceStatus(l)} />
                  </li>
                ))}
            </ul>
          </section>

          <section className="card-surface overflow-x-auto p-5">
            <h2 className="font-display text-base font-semibold">Gyártói támogatás vége verziónként</h2>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2">Termék</th>
                  <th className="py-2">Gyártó</th>
                  <th className="py-2">Verziók és támogatás vége</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {SOFTWARE_PRODUCTS.map((p) => (
                  <tr key={p.key}>
                    <td className="py-2 font-medium">{p.name}</td>
                    <td className="py-2">{p.manufacturer}</td>
                    <td className="py-2 text-muted-foreground">
                      {Object.entries(p.supportEnd)
                        .map(([v, d]) => `${v}: ${d}`)
                        .join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}