import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ShieldCheck, History, Lock, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { lookup, useStore } from "@/lib/store";
import { ORG_UNITS } from "@/lib/seed";
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  type EmployeeTier,
  type RoleKey,
} from "@/lib/types";
import { TIERS, TIER_LABELS } from "@/lib/product-catalog";
import { PageHeading } from "@/components/page-heading";
import { useViewOnly } from "@/lib/access";
import { ViewOnlyNotice } from "@/components/view-only-notice";

export const Route = createFileRoute("/jogosultsagok")({
  head: () => ({
    meta: [
      { title: "Jogosultságkezelés – ÁOK Digitális Szolgáltatási Portál" },
      {
        name: "description",
        content:
          "Admin felület a felhasználói szerepkörök kiosztására, visszavonására és a jogosultsági napló áttekintésére.",
      },
      { property: "og:title", content: "Jogosultságkezelés – ÁOK Portál" },
      {
        property: "og:description",
        content: "Szerepkörök kiosztása és naplózása admin jogkörrel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Permissions,
});

const ALL_ROLES: RoleKey[] = [
  "igenylo",
  "jovahagyo",
  "ugyintezo",
  "szolgaltatasgazda",
  "vezeto",
  "dekan",
  "admin",
  "beszerzo",
  "eszkozmenedzser",
  "gazdasagi_vezeto",
  "it_referens",
];

function Permissions() {
  const store = useStore();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>(store.users[0]!.id);
  const [draft, setDraft] = useState<RoleKey[] | null>(null);
  const [tierDraft, setTierDraft] = useState<(typeof TIERS)[number] | null>(null);
  const [reason, setReason] = useState("");

  const canManage = store.activeRole === "admin";
  const allowed = canManage || store.activeRole === "dekan";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return store.users;
    return store.users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        lookup.unit(u.orgUnitId).toLowerCase().includes(q),
    );
  }, [query, store.users]);

  const selected = store.users.find((u) => u.id === selectedId) ?? store.users[0]!;
  const roles = draft ?? selected.roles;
  const currentTier = selected.employeeTier ?? "alkalmazotti";
  const tier = tierDraft ?? currentTier;
  const rolesDirty =
    draft !== null &&
    (draft.length !== selected.roles.length || draft.some((r) => !selected.roles.includes(r)));
  const tierDirty = tier !== currentTier;
  const dirty = rolesDirty || tierDirty;

  function toggle(role: RoleKey, on: boolean) {
    const next = on ? [...roles, role] : roles.filter((r) => r !== role);
    setDraft(next);
  }

  function save() {
    if (!canManage || !dirty || reason.trim().length < 5) return;
    if (rolesDirty) store.setUserRoles(selected.id, roles, reason.trim());
    if (tierDirty) store.setUserTier(selected.id, tier, reason.trim());
    setDraft(null);
    setTierDraft(null);
    setReason("");
  }


  if (!allowed) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
        <div className="rounded-md border border-border bg-card p-8 text-center">
          <Lock className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <h1 className="mt-4 font-display text-2xl font-semibold">Korlátozott felület</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A felhasználói jogosultságok kiosztása kizárólag <strong>admin</strong> jogkörrel
            végezhető.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <PageHeading
            title="Jogosultságkezelés"
            titleClassName="font-display text-3xl font-semibold"
            description="A szerepköröket a kar adminja osztja ki. Minden módosítás indoklással, naplózva történik."
          />
        </div>
        <div className="flex items-center gap-3">
          {canManage && <NewUserDialog />}
          <Badge className="gap-1.5">
          <ShieldCheck className="size-3.5" aria-hidden="true" />{" "}
            {canManage ? "Admin jogkör aktív" : "Dékáni betekintés (csak olvasható)"}
          </Badge>
        </div>
      </header>

      {!canManage && <ViewOnlyNotice />}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-md border border-border bg-card">
          <div className="border-b border-border p-4">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Keresés név, e-mail vagy szervezeti egység szerint…"
              aria-label="Felhasználó keresése"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Felhasználó</TableHead>
                <TableHead>Szervezeti egység</TableHead>
                <TableHead>Szerepkörök</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id} data-state={u.id === selected.id ? "selected" : undefined}>
                  <TableCell>
                    <span className="block font-medium">{u.name}</span>
                    <span className="block text-xs text-muted-foreground">{u.email}</span>
                  </TableCell>
                  <TableCell className="text-sm">{lookup.unit(u.orgUnitId)}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <Badge key={r} variant="secondary">
                          {ROLE_LABELS[r]}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedId(u.id);
                        setDraft(null);
                        setTierDraft(null);
                        setReason("");
                      }}

                    >
                      Kezelés
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <aside className="space-y-6">
          <div className="rounded-md border border-border bg-card p-5">
            <h2 className="font-display text-lg font-semibold">{selected.name}</h2>
            <p className="text-sm text-muted-foreground">
              {selected.title} · {lookup.unit(selected.orgUnitId)}
            </p>

            <ul className="mt-5 space-y-3">
              {ALL_ROLES.map((r) => (
                <li key={r} className="flex gap-3">
                  <Checkbox
                    id={`role-${r}`}
                    checked={roles.includes(r)}
                    disabled={!canManage}
                    onCheckedChange={(v) => toggle(r, v === true)}
                  />
                  <label htmlFor={`role-${r}`} className="cursor-pointer">
                    <span className="block text-sm font-medium">{ROLE_LABELS[r]}</span>
                    <span className="block text-xs text-muted-foreground">
                      {ROLE_DESCRIPTIONS[r]}
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <div className="mt-6 border-t border-border pt-5">
              <span className="block text-sm font-medium">Munkavállalói besorolás</span>
              <p className="mt-1 text-xs text-muted-foreground">
                Meghatározza, mely termékcsomagból igényelhet eszközt. Az igénylési felületen nem
                jelenik meg.
              </p>
              <div className="mt-3 space-y-2">
                {TIERS.map((t) => (
                  <label key={t} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="employee-tier"
                      className="size-4 accent-[hsl(var(--primary))]"
                      disabled={!canManage}
                      checked={tier === t}
                      onChange={() => setTierDraft(t)}

                    />
                    {TIER_LABELS[t]}
                  </label>
                ))}
              </div>
            </div>

            <label htmlFor="reason" className="mt-5 block text-sm font-medium">
              Módosítás indoklása
            </label>
            <Input
              id="reason"
              disabled={!canManage}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Pl. munkakörváltás, dékáni utasítás száma…"
              className="mt-1.5"
            />
            <div className="mt-4 flex gap-2">
              <Button onClick={save} disabled={!canManage || !dirty || reason.trim().length < 5}>
                Jogosultság mentése
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setDraft(null);
                  setTierDraft(null);
                  setReason("");
                }}

                disabled={!dirty}
              >
                Elvetés
              </Button>
            </div>
            {dirty && reason.trim().length < 5 && (
              <p className="mt-2 text-xs text-muted-foreground">
                A mentéshez rövid indoklás szükséges.
              </p>
            )}
          </div>

          <div className="rounded-md border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <History className="size-4" aria-hidden="true" /> Jogosultsági napló
            </h2>
            {store.roleAudit.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Még nem történt jogosultság-módosítás ebben a munkamenetben.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {store.roleAudit.slice(0, 20).map((e) => (
                  <li key={e.id} className="border-l-2 border-accent pl-3 text-sm">
                    <span className="block">
                      <strong>{ROLE_LABELS[e.role]}</strong> {e.action} –{" "}
                      {lookup.userName(e.targetUserId)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {e.at} · {lookup.userName(e.actorId)} · {e.reason}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function NewUserDialog() {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [orgUnitId, setOrgUnitId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [roles, setRoles] = useState<RoleKey[]>(["igenylo"]);
  const [tier, setTier] = useState<EmployeeTier>("alkalmazotti");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setTitle("");
    setEmail("");
    setEmployeeId("");
    setOrgUnitId("");
    setManagerId("");
    setRoles(["igenylo"]);
    setTier("alkalmazotti");
    setReason("");
    setError(null);
  }

  function toggleRole(role: RoleKey, on: boolean) {
    setRoles((prev) => (on ? [...prev, role] : prev.filter((r) => r !== role)));
  }

  function submit() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!name.trim() || !title.trim() || !orgUnitId) {
      setError("A név, a beosztás és a szervezeti egység megadása kötelező.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Érvényes e-mail cím szükséges.");
      return;
    }
    if (store.users.some((u) => u.email.toLowerCase() === trimmedEmail)) {
      setError("Ezzel az e-mail címmel már létezik felhasználó.");
      return;
    }
    if (reason.trim().length < 5) {
      setError("A létrehozáshoz rövid indoklás szükséges (min. 5 karakter).");
      return;
    }
    store.addUser(
      {
        name: name.trim(),
        title: title.trim(),
        email: trimmedEmail,
        employeeId: employeeId.trim() || `PTE-${Math.floor(10000 + Math.random() * 89999)}`,
        orgUnitId,
        roles,
        managerId: managerId || undefined,
        employeeTier: tier,
      },
      reason.trim(),
    );
    setOpen(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <UserPlus className="size-4" aria-hidden="true" /> Új felhasználó
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Új felhasználó létrehozása</DialogTitle>
          <DialogDescription>
            A felhasználó azonnal megjelenik a listában, a művelet a jogosultsági naplóba kerül.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="nu-name">Név *</Label>
            <Input
              id="nu-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Pl. Kis Anna"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nu-title">Beosztás *</Label>
            <Input
              id="nu-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pl. adminisztrátor"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nu-email">E-mail cím *</Label>
            <Input
              id="nu-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kis.anna@aok.pte.hu"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nu-empid">Dolgozói azonosító</Label>
            <Input
              id="nu-empid"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="Automatikusan generálódik"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Szervezeti egység *</Label>
            <Select value={orgUnitId} onValueChange={setOrgUnitId}>
              <SelectTrigger>
                <SelectValue placeholder="Válasszon egységet…" />
              </SelectTrigger>
              <SelectContent>
                {ORG_UNITS.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Közvetlen felettes</Label>
            <Select value={managerId} onValueChange={setManagerId}>
              <SelectTrigger>
                <SelectValue placeholder="Nincs megadva" />
              </SelectTrigger>
              <SelectContent>
                {store.users
                  .filter((u) => u.roles.includes("jovahagyo") || u.roles.includes("vezeto"))
                  .map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Szerepkörök</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {ALL_ROLES.map((r) => (
              <label key={r} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={roles.includes(r)}
                  onCheckedChange={(v) => toggleRole(r, v === true)}
                />
                {ROLE_LABELS[r]}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Munkavállalói besorolás</Label>
          <div className="flex flex-wrap gap-4">
            {TIERS.map((t) => (
              <label key={t} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="nu-tier"
                  className="size-4 accent-[hsl(var(--primary))]"
                  checked={tier === t}
                  onChange={() => setTier(t)}
                />
                {TIER_LABELS[t]}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="nu-reason">Indoklás *</Label>
          <Input
            id="nu-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Pl. új munkatárs belépése, dékáni utasítás száma…"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Mégse
          </Button>
          <Button onClick={submit}>Felhasználó létrehozása</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
