import { useRef, useState } from "react";
import { Download, FileUp, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ORG_UNITS, lookup, useStore } from "@/lib/store";
import {
  MEMBER_CSV_COLUMNS,
  buildMemberCsv,
  planMemberImport,
  type MemberImportPlan,
} from "@/lib/member-import";
import { ROLE_LABELS } from "@/lib/types";

const FIELD_LABELS: Record<string, string> = {
  name: "Név",
  title: "Beosztás",
  email: "E-mail",
  employeeId: "Dolgozói azonosító",
  orgUnitId: "Szervezeti egység",
  managerId: "Vezető",
  roles: "Szerepkörök",
  employeeTier: "Besorolás",
};

/** Teljes taglista frissítése CSV-ből – előnézettel, indoklással, naplózva. */
export function MemberImportCard({ canManage }: { canManage: boolean }) {
  const store = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [plan, setPlan] = useState<MemberImportPlan | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const downloadTemplate = () => {
    const csv = buildMemberCsv(store.users, ORG_UNITS);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `taglista-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const p = planMemberImport({
        csvText: text,
        users: store.users,
        orgUnits: ORG_UNITS,
        actorUserId: store.currentUser.id,
      });
      if (text.includes("\uFFFD")) {
        p.errors.unshift({
          line: 1,
          message:
            "A fájl nem UTF-8 kódolású (ékezetek sérültek). Mentse újra „CSV UTF-8” formátumban.",
        });
      }
      setFileName(file.name);
      setPlan(p);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setPlan(null);
    setFileName("");
    setReason("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const apply = () => {
    if (!plan || plan.errors.length > 0 || reason.trim().length < 5 || !canManage) return;
    const ev = store.applyMemberImport(plan, reason.trim(), fileName);
    toast.success("Taglista frissítve", {
      description: `${ev.created} új, ${ev.updated} módosított, ${ev.deactivated} inaktivált, ${ev.reactivated} újraaktivált felhasználó.`,
    });
    reset();
  };

  const changedUpdates = plan?.updates.filter((u) => u.changes.length > 0 || u.reactivate) ?? [];
  const nothingToDo =
    plan &&
    plan.errors.length === 0 &&
    plan.creates.length === 0 &&
    changedUpdates.length === 0 &&
    plan.deactivate.length === 0;

  return (
    <section className="rounded-md border border-border bg-card" aria-labelledby="taglista-csv">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5">
        <div>
          <h2 id="taglista-csv" className="font-display text-lg font-semibold">
            Taglista frissítése CSV-ből
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            A fájl sorai dolgozói azonosító (ennek hiányában e-mail) alapján párosulnak a meglévő
            felhasználókkal: egyezésnél frissítés, új sornál létrehozás. Aki nem szerepel a fájlban,
            inaktiválódik – az előzményekben megmarad, a választókból eltűnik. Törlés nincs.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Elvárt fejléc:{" "}
            <code className="rounded bg-muted px-1">{MEMBER_CSV_COLUMNS.join("; ")}</code> ·
            elválasztó pontosvessző vagy vessző · UTF-8
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-1.5" onClick={downloadTemplate}>
            <Download className="size-4" aria-hidden="true" /> Aktuális lista letöltése (.csv)
          </Button>
          <Button
            className="gap-1.5"
            disabled={!canManage || busy}
            onClick={() => fileRef.current?.click()}
          >
            <FileUp className="size-4" aria-hidden="true" /> CSV kiválasztása
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            aria-label="CSV fájl kiválasztása"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </div>
      </div>

      {plan && (
        <div className="space-y-4 p-5" data-testid="member-import-preview">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{fileName}</span>
            <span className="text-muted-foreground">· {plan.totalRows} sor</span>
            <Badge variant="secondary">{plan.creates.length} új</Badge>
            <Badge variant="secondary">{changedUpdates.length} módosul</Badge>
            <Badge variant="secondary">{plan.unchanged.length} változatlan</Badge>
            <Badge variant={plan.deactivate.length ? "destructive" : "secondary"}>
              {plan.deactivate.length} inaktiválás
            </Badge>
            {plan.errors.length > 0 && (
              <Badge variant="destructive">{plan.errors.length} hiba</Badge>
            )}
          </div>

          {plan.warnings.map((w) => (
            <p key={w} className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
              {w}
            </p>
          ))}

          {plan.errors.length > 0 && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
              <p className="text-sm font-medium">
                A frissítés nem hajtható végre, amíg a fájl hibás. Javítsa a sorokat, majd töltse
                fel újra.
              </p>
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm">
                {plan.errors.slice(0, 50).map((e, i) => (
                  <li key={i}>
                    <span className="font-mono text-xs text-muted-foreground">{e.line}. sor</span>{" "}
                    {e.message}
                  </li>
                ))}
                {plan.errors.length > 50 && (
                  <li className="text-muted-foreground">… és még {plan.errors.length - 50}</li>
                )}
              </ul>
            </div>
          )}

          {plan.errors.length === 0 &&
            (changedUpdates.length > 0 ||
              plan.creates.length > 0 ||
              plan.deactivate.length > 0) && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Művelet</TableHead>
                      <TableHead>Felhasználó</TableHead>
                      <TableHead>Változás</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.creates.map((c) => (
                      <TableRow key={c.tempId}>
                        <TableCell>
                          <Badge>Új</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="block font-medium">{c.input.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {c.input.email}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {c.input.title} · {lookup.unit(c.input.orgUnitId)} ·{" "}
                          {c.input.roles.map((r) => ROLE_LABELS[r]).join(", ")}
                        </TableCell>
                      </TableRow>
                    ))}
                    {changedUpdates.map((u) => (
                      <TableRow key={u.userId}>
                        <TableCell>
                          <Badge variant="secondary">
                            {u.reactivate ? "Újraaktiválás" : "Módosítás"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{u.name}</TableCell>
                        <TableCell className="text-sm">
                          {u.changes.map((ch) => (
                            <span key={ch.field} className="block">
                              {FIELD_LABELS[ch.field] ?? ch.field}:{" "}
                              <span className="text-muted-foreground line-through">
                                {ch.field === "orgUnitId" ? lookup.unit(ch.from) : ch.from}
                              </span>{" "}
                              → {ch.field === "orgUnitId" ? lookup.unit(ch.to) : ch.to}
                            </span>
                          ))}
                        </TableCell>
                      </TableRow>
                    ))}
                    {plan.deactivate.map((d) => (
                      <TableRow key={d.userId}>
                        <TableCell>
                          <Badge variant="destructive">Inaktiválás</Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{d.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          Nem szerepel a fájlban
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

          {nothingToDo && (
            <p className="text-sm text-muted-foreground">
              A fájl megegyezik a jelenlegi taglistával – nincs mit frissíteni.
            </p>
          )}

          {plan.errors.length === 0 && !nothingToDo && (
            <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
              <div className="min-w-64 flex-1 space-y-1.5">
                <Label htmlFor="mi-reason">Indoklás *</Label>
                <Input
                  id="mi-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Pl. HR-kivonat 2026. szeptember"
                  disabled={!canManage}
                />
              </div>
              <Button
                className="gap-1.5"
                disabled={!canManage || reason.trim().length < 5}
                onClick={apply}
              >
                <Upload className="size-4" aria-hidden="true" /> Frissítés végrehajtása
              </Button>
              <Button variant="ghost" onClick={reset}>
                Mégse
              </Button>
            </div>
          )}
        </div>
      )}

      {(store.memberImports ?? []).length > 0 && (
        <div className="border-t border-border p-5">
          <h3 className="text-sm font-medium">Korábbi frissítések</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {(store.memberImports ?? []).slice(0, 5).map((ev) => (
              <li key={ev.id}>
                {ev.at} · {lookup.userName(ev.actorId)} · {ev.fileName} · {ev.created} új,{" "}
                {ev.updated} módosított, {ev.deactivated} inaktivált, {ev.reactivated} újraaktivált
                · {ev.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
