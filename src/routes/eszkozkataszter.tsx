import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeading } from "@/components/page-heading";
import { lookup, useStore, ORG_UNITS } from "@/lib/store";
import { LOCATION_KIND_LABELS } from "@/lib/asset-types";
import {
  ASSET_CATEGORIES,
  ASSET_LOCATIONS,
  ASSET_MODELS,
  ASSET_RESPONSIBILITIES,
  HARDWARE_STANDARDS,
  LIFECYCLE_POLICIES,
  REFERENCE_PRICES,
  TODAY,
} from "@/lib/asset-data";
import {
  ageDistribution,
  assetLookup,
  huf,
  hufShort,
  lifecycleEnd,
  lifecycleStatus,
  meetsStandard,
  osSupportEnd,
  priceIsStale,
  replacementPriority,
  yearsSince,
} from "@/lib/asset-logic";
import { LifecycleBadge, PriorityBadge, StatTile } from "@/components/asset-bits";
import { PRICE_SOURCE_LABELS } from "@/lib/asset-types";

export const Route = createFileRoute("/eszkozkataszter")({
  head: () => ({
    meta: [
      { title: "Eszközkataszter – ÁOK Digitális Szolgáltatási Portál" },
      {
        name: "description",
        content:
          "Intézményi hardverkataszter: teljes eszközállomány, életciklus-státusz, korfa, hardverstandardok és referenciaárak a PTE ÁOK számára.",
      },
      { property: "og:title", content: "Eszközkataszter – ÁOK Digitális Szolgáltatási Portál" },
      {
        property: "og:description",
        content: "Kari hardverállomány, életciklus-státuszok, standardok és referenciaárak egy nézetben.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CataloguePage,
});

function CataloguePage() {
  const { assets } = useStore();
  const [q, setQ] = useState("");
  const [unit, setUnit] = useState("mind");
  const [cat, setCat] = useState("mind");
  const [status, setStatus] = useState("mind");
  const [usage, setUsage] = useState("mind");

  const filtered = useMemo(
    () =>
      assets.filter((a) => {
        if (unit !== "mind" && a.orgUnitId !== unit) return false;
        if (cat !== "mind" && a.categoryKey !== cat) return false;
        if (usage !== "mind" && a.usage !== usage) return false;
        if (status !== "mind" && lifecycleStatus(a) !== status) return false;
        if (q.trim()) {
          const hay = `${a.inventoryNo} ${a.deviceId} ${a.serial} ${assetLookup.modelLabel(a.modelKey)} ${
            lookup.userName(a.assignedUserId ?? a.custodianUserId)
          }`.toLowerCase();
          if (!hay.includes(q.trim().toLowerCase())) return false;
        }
        return true;
      }),
    [assets, q, unit, cat, status, usage],
  );

  const totalValue = filtered.reduce((s, a) => s + a.purchaseValue, 0);
  const dueSoon = filtered.filter((a) =>
    ["cserere_erett", "cserere_tervezendo", "tamogatasbol_kifutott", "selejtezesre_var"].includes(
      lifecycleStatus(a),
    ),
  );
  const outOfWarranty = filtered.filter((a) => Date.parse(a.warrantyEnd) < Date.parse(TODAY));
  const nonStandard = filtered.filter((a) => !meetsStandard(a).ok);
  const ages = ageDistribution(filtered);
  const maxAge = Math.max(1, ...ages.map((a) => a.count));

  return (
    <div className="space-y-6">
      <div>
        <PageHeading
          title="Intézményi eszközkataszter"
          description="A kar teljes informatikai eszközállománya egy nyilvántartásban: személyi használatú és közös eszközök, műszaki adatok, életciklus-státusz, hardverstandardok és tervezési referenciaárak. Az életciklus-státusz a szervezeti életciklus-politikából és az eszköz állapotából számítódik, nem beégetett szabályból."
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile label="Nyilvántartott eszköz" value={filtered.length} hint={`${assets.length} db a teljes kataszterben`} />
        <StatTile label="Bruttó beszerzési érték" value={hufShort(totalValue)} hint="Szűrt állományra" />
        <StatTile label="Cserére tervezendő" value={dueSoon.length} tone="warn" hint="Életciklus-vég közeledik vagy lejárt" />
        <StatTile label="Garancián kívül" value={outOfWarranty.length} hint="Lejárt gyártói garancia" />
        <StatTile label="Standardtól eltérő" value={nonStandard.length} tone={nonStandard.length > 0 ? "danger" : "default"} hint="Nem felel meg a minimumnak" />
      </div>

      <Tabs defaultValue="allomany">
        <TabsList className="flex-wrap">
          <TabsTrigger value="allomany">Eszközállomány</TabsTrigger>
          <TabsTrigger value="kozos">Közös eszközök</TabsTrigger>
          <TabsTrigger value="korfa">Korfa és megoszlás</TabsTrigger>
          <TabsTrigger value="standardok">Hardverstandardok</TabsTrigger>
          <TabsTrigger value="arak">Referenciaárak</TabsTrigger>
          <TabsTrigger value="helyisegek">Helyiségek</TabsTrigger>
          <TabsTrigger value="felelossegek">Eszközfelelősségek</TabsTrigger>
        </TabsList>

        <TabsContent value="allomany" className="space-y-4">
          <section className="card-surface grid gap-3 p-4 md:grid-cols-5">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="kat-q">Keresés</Label>
              <Input
                id="kat-q"
                value={q}
                maxLength={80}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Leltári szám, gyári szám, modell, használó"
              />
            </div>
            <FilterSelect id="kat-unit" label="Szervezeti egység" value={unit} onChange={setUnit}
              options={[["mind", "Mind"], ...ORG_UNITS.map((o) => [o.id, o.name] as [string, string])]} />
            <FilterSelect id="kat-cat" label="Kategória" value={cat} onChange={setCat}
              options={[["mind", "Mind"], ...ASSET_CATEGORIES.map((c) => [c.key, c.label] as [string, string])]} />
            <FilterSelect id="kat-status" label="Életciklus-státusz" value={status} onChange={setStatus}
              options={[
                ["mind", "Mind"],
                ["uj", "Új"],
                ["normal", "Normál használat"],
                ["kozep", "Életciklus közepe"],
                ["cserere_tervezendo", "Cserére tervezendő"],
                ["cserere_erett", "Cserére érett"],
                ["tamogatasbol_kifutott", "Támogatásból kifutott"],
                ["selejtezesre_var", "Selejtezésre vár"],
              ]} />
            <FilterSelect id="kat-usage" label="Használat" value={usage} onChange={setUsage}
              options={[["mind", "Mind"], ["szemelyi", "Személyi"], ["kozos", "Közös"]]} />
          </section>

          <AssetTable assets={filtered.slice(0, 80)} />
          {filtered.length > 80 && (
            <p className="text-sm text-muted-foreground">
              {filtered.length} találatból az első 80 látható – szűkítse a szűrőket.
            </p>
          )}
        </TabsContent>

        <TabsContent value="kozos" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Közös használatú eszközök szervezeti egységenként, kijelölt eszközfelelőssel. A felelős
            igazolja vissza a leltári adatokat, nem a személyi használó.
          </p>
          {ORG_UNITS.map((o) => {
            const list = assets.filter((a) => a.usage === "kozos" && a.orgUnitId === o.id);
            if (!list.length) return null;
            return (
              <section key={o.id} className="card-surface p-5">
                <h2 className="font-display text-base font-semibold">{o.name}</h2>
                <p className="text-sm text-muted-foreground">
                  Leltárfelelős: {lookup.userName(list[0]!.inventoryResponsibleId)} · {list.length} közös eszköz
                </p>
                <div className="mt-3">
                  <AssetTable assets={list} compact />
                </div>
              </section>
            );
          })}
        </TabsContent>

        <TabsContent value="korfa" className="space-y-4">
          <section className="card-surface p-5">
            <h2 className="font-display text-base font-semibold">Eszközkorfa</h2>
            <div className="mt-4 space-y-2">
              {ages.map((a) => (
                <div key={a.bucket} className="flex items-center gap-3">
                  <span className="w-20 text-xs text-muted-foreground">{a.bucket}</span>
                  <div className="h-5 flex-1 rounded bg-secondary">
                    <div
                      className="h-5 rounded bg-primary"
                      style={{ width: `${(a.count / maxAge) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-sm font-medium">{a.count}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card-surface p-5">
            <h2 className="font-display text-base font-semibold">Megoszlás kategória szerint</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2">Kategória</th>
                    <th className="py-2">Darab</th>
                    <th className="py-2">Átlagéletkor</th>
                    <th className="py-2">Cserére érett</th>
                    <th className="py-2">Beszerzési érték</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ASSET_CATEGORIES.map((c) => {
                    const list = filtered.filter((a) => a.categoryKey === c.key);
                    if (!list.length) return null;
                    const avg = list.reduce((s, a) => s + yearsSince(a.commissionDate), 0) / list.length;
                    const due = list.filter((a) =>
                      ["cserere_erett", "tamogatasbol_kifutott", "selejtezesre_var"].includes(lifecycleStatus(a)),
                    ).length;
                    return (
                      <tr key={c.key}>
                        <td className="py-2 font-medium">{c.label}</td>
                        <td className="py-2">{list.length}</td>
                        <td className="py-2">{avg.toFixed(1)} év</td>
                        <td className="py-2">{due}</td>
                        <td className="py-2">{hufShort(list.reduce((s, a) => s + a.purchaseValue, 0))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card-surface p-5">
            <h2 className="font-display text-base font-semibold">Életciklus-politikák</h2>
            <p className="text-sm text-muted-foreground">
              A politikák szervezeti szinten konfigurálhatók; eszközszinten felülírhatók indoklással.
            </p>
            <ul className="mt-3 grid gap-3 md:grid-cols-2">
              {LIFECYCLE_POLICIES.map((p) => (
                <li key={p.key} className="rounded-md border border-border bg-secondary/40 p-3">
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.minYears}–{p.maxYears} év · tervezési érték: {p.plannedYears} év
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{p.note}</p>
                </li>
              ))}
            </ul>
          </section>
        </TabsContent>

        <TabsContent value="standardok" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            A standard hardverprofilok határozzák meg, milyen konfiguráció szerezhető be az egyes
            felhasználói profilokhoz. A tervezés ezekhez a profilokhoz rendelt referenciaárral számol.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {HARDWARE_STANDARDS.map((s) => {
              const price = assetLookup.price(s.referencePriceId);
              return (
                <section key={s.key} className="card-surface p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="font-display text-base font-semibold">{s.label}</h2>
                    <Badge variant="secondary">{assetLookup.categoryLabel(s.categoryKey)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{s.userProfile} · {s.intendedUse}</p>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted-foreground">Minimum</dt>
                      <dd>
                        {s.minSpec.cores} mag · {s.minSpec.ramGb} GB · {s.minSpec.storage}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Javasolt</dt>
                      <dd>
                        {s.preferredSpec.cpu} · {s.preferredSpec.ramGb} GB · {s.preferredSpec.storage}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Tervezett élettartam</dt>
                      <dd>{s.lifecycleYears} év</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Referenciaár (nettó)</dt>
                      <dd>{price ? huf(price.netPrice) : "—"}</dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Jóváhagyott modellek: {s.approvedModels.map((m) => assetLookup.modelLabel(m)).join(", ")}
                  </p>
                </section>
              );
            })}
          </div>

          <section className="card-surface p-5">
            <h2 className="font-display text-base font-semibold">Modellkatalógus</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2">Modell</th>
                    <th className="py-2">Kategória</th>
                    <th className="py-2">Processzor</th>
                    <th className="py-2">Memória</th>
                    <th className="py-2">Tároló</th>
                    <th className="py-2">Operációs rendszer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ASSET_MODELS.map((m) => (
                    <tr key={m.key}>
                      <td className="py-2 font-medium">{m.manufacturer} {m.model}</td>
                      <td className="py-2">{assetLookup.categoryLabel(m.categoryKey)}</td>
                      <td className="py-2">
                        {m.spec.processor ? `${m.spec.processor.name} (${m.spec.processor.generation})` : "—"}
                      </td>
                      <td className="py-2">
                        {m.spec.memory ? `${m.spec.memory.capacityGb} GB ${m.spec.memory.type}` : "—"}
                      </td>
                      <td className="py-2">
                        {m.spec.storage ? `${m.spec.storage.capacity} ${m.spec.storage.type}` : "—"}
                      </td>
                      <td className="py-2">{m.spec.os ? `${m.spec.os} ${m.spec.osVersion ?? ""}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="arak" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            A tervezés referenciaárakkal dolgozik. Minden árnál látszik a forrás és az árinformáció
            dátuma; a 6 hónapnál régebbi árak felülvizsgálatra kerülnek jelölésre.
          </p>
          <section className="card-surface overflow-x-auto p-5">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2">Megnevezés</th>
                  <th className="py-2">Nettó ár</th>
                  <th className="py-2">Bruttó ár</th>
                  <th className="py-2">Ár forrása</th>
                  <th className="py-2">Árinformáció dátuma</th>
                  <th className="py-2">Érvényesség</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {REFERENCE_PRICES.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 font-medium">{p.label}</td>
                    <td className="py-2">{huf(p.netPrice)}</td>
                    <td className="py-2">{huf(p.netPrice * (1 + p.vatRate))}</td>
                    <td className="py-2">
                      {PRICE_SOURCE_LABELS[p.source]}
                      <span className="block text-xs text-muted-foreground">{p.supplier}</span>
                    </td>
                    <td className="py-2">
                      {p.priceDate}
                      {priceIsStale(p) && (
                        <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                          felülvizsgálandó
                        </span>
                      )}
                    </td>
                    <td className="py-2">{p.validUntil}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </TabsContent>

        <TabsContent value="helyisegek" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Helyiségleltár: minden szervezeti egységhez tartozó iroda, műhely és labor, a hozzájuk
            rendelt munkatársakkal és az ott nyilvántartott eszközök számával.
          </p>
          <div className="card-surface overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Épület</th>
                  <th className="px-3 py-2">Helyiség</th>
                  <th className="px-3 py-2">Típus</th>
                  <th className="px-3 py-2">Szervezeti egység</th>
                  <th className="px-3 py-2">Munkatársak</th>
                  <th className="px-3 py-2 text-right">Eszköz</th>
                </tr>
              </thead>
              <tbody>
                {ASSET_LOCATIONS.map((l) => {
                  const unit = ORG_UNITS.find((o) => o.id === l.orgUnitId);
                  const count = assets.filter((a) => a.locationId === l.id).length;
                  return (
                    <tr key={l.id} className="border-t border-border/60">
                      <td className="px-3 py-2">{l.building}</td>
                      <td className="px-3 py-2 font-medium">{l.room}</td>
                      <td className="px-3 py-2">
                        <Badge variant="secondary" className="font-normal">
                          {LOCATION_KIND_LABELS[l.kind]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">{unit?.name ?? l.orgUnitId}</td>
                      <td className="px-3 py-2">
                        {(l.primaryUserIds ?? []).length === 0
                          ? "—"
                          : (l.primaryUserIds ?? []).map((u) => lookup.userName(u)).join(", ")}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="felelossegek" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Az eszközgazdálkodás felelősségei elkülönülnek – nem vonhatók össze egyetlen
            „adminisztrátor” szerepbe.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {ASSET_RESPONSIBILITIES.map((r) => (
              <section key={r.key} className="card-surface p-5">
                <h2 className="font-display text-base font-semibold">{r.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {r.userIds.map((u) => (
                    <Badge key={u} variant="secondary" className="font-normal">
                      {lookup.userName(u)}
                    </Badge>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function AssetTable({ assets, compact }: { assets: ReturnType<typeof useStore>["assets"]; compact?: boolean }) {
  return (
    <div className="card-surface overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Leltári szám</th>
            <th className="px-4 py-3">Eszköz</th>
            {!compact && <th className="px-4 py-3">Szervezeti egység</th>}
            <th className="px-4 py-3">Használó / felelős</th>
            <th className="px-4 py-3">Üzembe helyezés</th>
            <th className="px-4 py-3">Életciklus vége</th>
            <th className="px-4 py-3">Státusz</th>
            <th className="px-4 py-3">Prioritás</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {assets.map((a) => {
            const os = osSupportEnd(a);
            return (
              <tr key={a.id} className="hover:bg-secondary/50">
                <td className="px-4 py-3">
                  <Link to="/eszkoz/$id" params={{ id: a.id }} className="font-medium text-primary hover:underline">
                    {a.inventoryNo}
                  </Link>
                  <span className="block text-xs text-muted-foreground">{a.deviceId}</span>
                </td>
                <td className="px-4 py-3">
                  {assetLookup.modelLabel(a.modelKey)}
                  <span className="block text-xs text-muted-foreground">
                    {assetLookup.categoryLabel(a.categoryKey)} · {a.usage === "kozos" ? "közös" : "személyi"}
                    {os && Date.parse(os) < Date.parse(TODAY) ? " · OS támogatás lejárt" : ""}
                  </span>
                </td>
                {!compact && <td className="px-4 py-3">{lookup.unit(a.orgUnitId)}</td>}
                <td className="px-4 py-3">{lookup.userName(a.assignedUserId ?? a.custodianUserId)}</td>
                <td className="px-4 py-3">{a.commissionDate}</td>
                <td className="px-4 py-3">{lifecycleEnd(a)}</td>
                <td className="px-4 py-3">
                  <LifecycleBadge status={lifecycleStatus(a)} />
                </td>
                <td className="px-4 py-3">
                  <PriorityBadge priority={replacementPriority(a)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}