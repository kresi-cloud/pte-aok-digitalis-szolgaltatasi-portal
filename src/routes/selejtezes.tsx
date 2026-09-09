import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeading } from "@/components/page-heading";
import { useViewOnly } from "@/lib/access";
import { ViewOnlyNotice } from "@/components/view-only-notice";
import { StatTile } from "@/components/asset-bits";
import { useStore, lookup } from "@/lib/store";
import { assetLookup, huf, lifecycleStatus, yearsSince } from "@/lib/asset-logic";
import { NEXT_FINANCIAL_YEAR } from "@/lib/asset-data";
import { LIFECYCLE_LABELS, SCRAP_STATUS_LABELS, type Asset, type ScrapProposal } from "@/lib/asset-types";
import { buildScrapList, isPersonalUse, type ScrapListSummary } from "@/lib/scrap-list";
import { FileSpreadsheet } from "lucide-react";

export const Route = createFileRoute("/selejtezes")({
  head: () => ({
    meta: [
      { title: "Éves selejtezési javaslat – ÁOK Digitális Szolgáltatási Portál" },
      {
        name: "description",
        content:
          "Az IT eszközmenedzser éves selejtezési javaslatot állít össze az életciklus végén járó eszközökből, amelyet a gazdasági vezető hagy jóvá.",
      },
      {
        property: "og:title",
        content: "Éves selejtezési javaslat – ÁOK Digitális Szolgáltatási Portál",
      },
      {
        property: "og:description",
        content: "Selejtezésre javasolt eszközök összeállítása és gazdasági vezetői jóváhagyása.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ScrapPage,
});

function holderLabel(a: Asset) {
  const personal = isPersonalUse(a);
  const id = personal ? a.assignedUserId : (a.custodianUserId ?? a.inventoryResponsibleId ?? a.assignedUserId);
  const name = id ? lookup.user(id)?.name : undefined;
  if (!name) return "—";
  return personal ? name : `${name} (leltárfelelős)`;
}

function assetLabel(a: Asset) {
  const m = assetLookup.model(a.modelKey);
  return `${m ? `${m.manufacturer} ${m.model}` : a.modelKey} · ${a.inventoryNo}`;
}

async function exportXlsx(summary: ScrapListSummary, approverName?: string) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const headerRows = [
    ["Selejtlista"],
    ["Javaslat megnevezése", summary.proposal.title],
    ["Év", summary.proposal.year],
    ["Gazdasági vezetői jóváhagyás dátuma", summary.proposal.decidedAt ?? "—"],
    ["Jóváhagyó", approverName ?? "—"],
    [],
  ];

  const dataRows = summary.rows.map((r) => ({
    "Eszköz megnevezése": r.name,
    "Leltári szám": r.inventoryNo,
    "Munkavállaló neve": r.employeeLabel,
    "Aktiválás dátuma": r.activationDate,
    "Kivonás dátuma": r.disposalDate,
    "Beszerzéskori bruttó érték (Ft)": r.grossPurchaseValue,
    "Bruttó könyv szerinti érték (Ft)": r.bookValue,
    "Értékvesztés": r.note,
  }));

  const totals = [
    [],
    [
      "Összesen",
      `${summary.totalCount} tétel`,
      "",
      "",
      "",
      summary.totalGross,
      summary.totalBook,
      "",
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([]);
  XLSX.utils.sheet_add_aoa(ws, headerRows, { origin: "A1" });
  XLSX.utils.sheet_add_json(ws, dataRows, { origin: "A7", skipHeader: false });
  XLSX.utils.sheet_add_aoa(ws, totals, { origin: -1 });

  const cols = [
    { wch: 42 },
    { wch: 22 },
    { wch: 32 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 26 },
    { wch: 28 },
  ];
  ws["!cols"] = cols;

  const ftFmt = '# ##0" Ft"';
  const dataStart = 7; // Excel row 7 = data header
  for (let r = dataStart + 1; r <= dataStart + dataRows.length; r++) {
    const grossCell = XLSX.utils.encode_cell({ r: r - 1, c: 5 });
    const bookCell = XLSX.utils.encode_cell({ r: r - 1, c: 6 });
    if (ws[grossCell]) ws[grossCell].z = ftFmt;
    if (ws[bookCell]) ws[bookCell].z = ftFmt;
  }
  const totalRow = dataStart + dataRows.length + 1;
  const grossTotalCell = XLSX.utils.encode_cell({ r: totalRow - 1, c: 5 });
  const bookTotalCell = XLSX.utils.encode_cell({ r: totalRow - 1, c: 6 });
  if (ws[grossTotalCell]) ws[grossTotalCell].z = ftFmt;
  if (ws[bookTotalCell]) ws[bookTotalCell].z = ftFmt;

  ws["F7"].z = ftFmt;
  ws["G7"].z = ftFmt;

  ws["A1"].s = { font: { bold: true, sz: 14 } };
  ws["A2"].s = { font: { bold: true } };
  ws["A3"].s = { font: { bold: true } };
  ws["A4"].s = { font: { bold: true } };
  ws["A5"].s = { font: { bold: true } };

  const headerRange = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  const lastRow = headerRange.e.r;
  for (let c = 0; c <= headerRange.e.c; c++) {
    const cell = XLSX.utils.encode_cell({ r: 6, c });
    if (ws[cell]) ws[cell].s = { font: { bold: true }, fill: { patternType: "solid", fgColor: { rgb: "E2E8F0" } } };
  }
  const totalCellA = XLSX.utils.encode_cell({ r: lastRow, c: 0 });
  if (ws[totalCellA]) ws[totalCellA].s = { font: { bold: true } };

  XLSX.utils.book_append_sheet(wb, ws, "Selejtlista");
  const fileName = `selejtlista-${summary.proposal.year}-${summary.proposal.id}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

function ScrapListTable({ summary, isFinance, viewOnly }: { summary: ScrapListSummary; isFinance: boolean; viewOnly: boolean }) {
  return (
    <div className="space-y-3">
      <div className="max-h-96 overflow-auto rounded-sm border border-border">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-secondary text-xs tracking-wide uppercase">
            <tr>
              <th className="px-3 py-2">Eszköz megnevezése</th>
              <th className="px-3 py-2">Leltári szám</th>
              <th className="px-3 py-2">Munkavállaló</th>
              <th className="px-3 py-2">Aktiválás</th>
              <th className="px-3 py-2">Kivonás</th>
              <th className="px-3 py-2 text-right">Bruttó beszerzési érték</th>
              <th className="px-3 py-2 text-right">Könyv szerinti érték</th>
              <th className="px-3 py-2">Értékvesztés</th>
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((r) => (
              <tr key={r.assetId} className="border-t border-border">
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">{r.inventoryNo}</td>
                <td className="px-3 py-2">{r.employeeLabel}</td>
                <td className="px-3 py-2">{r.activationDate}</td>
                <td className="px-3 py-2">{r.disposalDate}</td>
                <td className="px-3 py-2 text-right">{huf(r.grossPurchaseValue)}</td>
                <td className="px-3 py-2 text-right">{r.fullyDepreciated ? "0 Ft" : huf(r.bookValue)}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.note}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-border bg-secondary/30 font-semibold">
              <td className="px-3 py-2" colSpan={5}>
                Összesen ({summary.totalCount} tétel)
              </td>
              <td className="px-3 py-2 text-right">{huf(summary.totalGross)}</td>
              <td className="px-3 py-2 text-right">{huf(summary.totalBook)}</td>
              <td className="px-3 py-2" />
            </tr>
          </tbody>
        </table>
      </div>

      {isFinance && !viewOnly && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            exportXlsx(summary, summary.proposal.decidedBy ? lookup.user(summary.proposal.decidedBy)?.name : undefined).catch(
              () => toast.error("Export sikertelen"),
            );
          }}
        >
          <FileSpreadsheet className="mr-2 size-4" />
          Selejtlista exportálása (.xlsx)
        </Button>
      )}
    </div>
  );
}

function ProposalCard({
  p,
  isPlanner,
  isFinance,
  viewOnly,
  assets,
}: {
  p: ScrapProposal;
  isPlanner: boolean;
  isFinance: boolean;
  viewOnly: boolean;
  assets: Asset[];
}) {
  const [comment, setComment] = useState("");
  const summary = useMemo(() => buildScrapList(p, assets, (id) => lookup.user(id)), [p, assets]);
  const store = useStore();

  return (
    <article key={p.id} className="card-surface space-y-3 p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold">{p.title}</h3>
          <p className="text-xs text-muted-foreground">
            {p.year} · {p.assetIds.length} eszköz · készítette:{" "}
            {lookup.user(p.createdBy)?.name ?? "—"} ({p.createdAt})
          </p>
        </div>
        <span
          className={
            p.status === "jovahagyva"
              ? "rounded-sm bg-accent/15 px-2 py-1 text-xs font-semibold text-accent-foreground"
              : p.status === "visszakuldve"
                ? "rounded-sm bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive"
                : "rounded-sm bg-secondary px-2 py-1 text-xs font-semibold"
          }
        >
          {SCRAP_STATUS_LABELS[p.status]}
        </span>
      </header>
      <p className="text-sm">{p.reason}</p>

      {p.status === "jovahagyva" ? (
        <ScrapListTable summary={summary} isFinance={isFinance} viewOnly={viewOnly} />
      ) : (
        <ul className="grid gap-1 text-xs text-muted-foreground md:grid-cols-2">
          {p.assetIds.map((id) => {
            const a = assets.find((x) => x.id === id);
            return <li key={id}>{a ? assetLabel(a) : id}</li>;
          })}
        </ul>
      )}

      {(p.history ?? []).length > 0 && (
        <ul className="space-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
          {(p.history ?? []).map((h, i) => (
            <li key={i}>
              {h.at} · {lookup.user(h.actorId)?.name ?? "—"} – {h.action}
              {h.comment ? ` – ${h.comment}` : ""}
            </li>
          ))}
        </ul>
      )}

      {isPlanner && (p.status === "tervezes" || p.status === "visszakuldve") && !viewOnly && (
        <Button
          size="sm"
          onClick={() => {
            store.submitScrapProposal(p.id);
            toast.success("Beküldve gazdasági vezetői jóváhagyásra");
          }}
        >
          Beküldés gazdasági jóváhagyásra
        </Button>
      )}

      {isFinance && p.status === "gazdasagi_jovahagyasra_var" && !viewOnly && (
        <div className="space-y-2 border-t border-border pt-3">
          <Textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Gazdasági vezetői megjegyzés (opcionális)"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                store.decideScrapProposal(p.id, "jovahagyva", comment || undefined);
                toast.success("Selejtezési javaslat jóváhagyva");
              }}
            >
              Jóváhagyom
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                store.decideScrapProposal(p.id, "visszakuldve", comment || undefined);
                toast("Javaslat visszaküldve átdolgozásra");
              }}
            >
              Átdolgozásra visszaküldöm
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}

function ScrapPage() {
  const store = useStore();
  const viewOnly = useViewOnly("selejtezes");
  const role = store.activeRole;
  const isPlanner = role === "eszkozmenedzser";
  const isFinance = role === "gazdasagi_vezeto";
  const allowed = ["eszkozmenedzser", "gazdasagi_vezeto", "dekan"].includes(role);

  const [title, setTitle] = useState(`${NEXT_FINANCIAL_YEAR}. évi selejtezési javaslat`);
  const [reason, setReason] = useState(
    "Életciklus végét elért, gazdaságosan nem javítható IT eszközök selejtezése.",
  );
  const [picked, setPicked] = useState<string[]>([]);

  const candidates = useMemo(
    () =>
      store.assets
        .filter((a) => a.active)
        .filter((a) => {
          const st = lifecycleStatus(a);
          return (
            st === "selejtezesre_var" ||
            st === "tamogatasbol_kifutott" ||
            st === "cserere_erett" ||
            a.condition === "hibas"
          );
        })
        .slice(0, 60),
    [store.assets],
  );

  const proposals = store.scrapProposals ?? [];

  if (!allowed) {
    return (
      <div className="card-surface mx-auto max-w-2xl space-y-3 p-6">
        <h1 className="font-display text-xl font-semibold">Selejtezési javaslat</h1>
        <p className="text-sm text-muted-foreground">
          Ez a felület az IT eszközmenedzser és a gazdasági vezető számára érhető el.
        </p>
      </div>
    );
  }

  const pickedValue = candidates
    .filter((a) => picked.includes(a.id))
    .reduce((s, a) => s + a.purchaseValue, 0);

  return (
    <div className="space-y-8">
      <header>
        <PageHeading
          title="Selejtezési javaslat"
          description={`Az IT eszközmenedzser éves selejtezési javaslatot állít össze az életciklus végét elért eszközökből, amelyet a gazdasági vezető hagy jóvá. Tervezési év: ${NEXT_FINANCIAL_YEAR}.`}
        />
        {viewOnly && <ViewOnlyNotice />}
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Selejtezésre javasolható eszköz" value={String(candidates.length)} />
        <StatTile
          label="Jóváhagyásra vár"
          value={String(
            proposals.filter((p) => p.status === "gazdasagi_jovahagyasra_var").length,
          )}
        />
        <StatTile label="Kijelölt eszközök bruttó értéke" value={huf(pickedValue)} />
      </div>

      {isPlanner && !viewOnly && (
        <section className="card-surface space-y-4 p-5">
          <h2 className="font-display text-base font-semibold">Új javaslat összeállítása</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Megnevezés</span>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Indoklás</span>
              <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
          </div>

          <div className="max-h-96 overflow-auto rounded-sm border border-border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-secondary text-xs tracking-wide uppercase">
                <tr>
                  <th className="px-3 py-2" />
                  <th className="px-3 py-2">Eszköz</th>
                  <th className="px-3 py-2">Kor</th>
                  <th className="px-3 py-2">Állapot</th>
                  <th className="px-3 py-2">Szervezeti egység</th>
                  <th className="px-3 py-2">Munkavállaló</th>
                  <th className="px-3 py-2">Használat / helyiség</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <Checkbox
                        checked={picked.includes(a.id)}
                        onCheckedChange={(v) =>
                          setPicked((prev) =>
                            v === true ? [...prev, a.id] : prev.filter((x) => x !== a.id),
                          )
                        }
                        aria-label="Eszköz kijelölése selejtezésre"
                      />
                    </td>
                    <td className="px-3 py-2">{assetLabel(a)}</td>
                    <td className="px-3 py-2">{Math.max(0, yearsSince(a.purchaseDate)).toFixed(1)} év</td>
                    <td className="px-3 py-2 text-xs">{LIFECYCLE_LABELS[lifecycleStatus(a)]}</td>
                    <td className="px-3 py-2 text-xs">{lookup.unit(a.orgUnitId)}</td>
                    <td className="px-3 py-2 text-xs">{holderLabel(a)}</td>
                    <td className="px-3 py-2 text-xs">
                      {isPersonalUse(a)
                        ? "Személyes használat"
                        : assetLookup.locationLabel(a.locationId)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button
            disabled={picked.length === 0 || !title.trim()}
            onClick={() => {
              store.createScrapProposal({
                year: NEXT_FINANCIAL_YEAR,
                title: title.trim(),
                reason: reason.trim(),
                assetIds: picked,
              });
              setPicked([]);
              toast.success("Selejtezési javaslat létrehozva");
            }}
          >
            Javaslat létrehozása ({picked.length} eszköz)
          </Button>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-display text-base font-semibold">Javaslatok</h2>
        {proposals.length === 0 && (
          <p className="text-sm text-muted-foreground">Még nincs selejtezési javaslat.</p>
        )}
        {proposals.map((p) => (
          <ProposalCard
            key={p.id}
            p={p}
            isPlanner={isPlanner}
            isFinance={isFinance}
            viewOnly={viewOnly}
            assets={store.assets}
          />
        ))}
      </section>
    </div>
  );
}
