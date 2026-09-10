import { parseCsv, toCsv } from "./csv";
import type { EmployeeTier, OrgUnit, RoleKey, User } from "./types";
import { ROLE_LABELS } from "./types";

/**
 * Teljes szervezeti taglista frissítése CSV-ből – tervezés (tiszta függvény).
 *
 * A CSV sorai a meglévő felhasználókkal dolgozói azonosító, annak hiányában
 * e-mail alapján párosulnak. Egyezés → frissítés; ismeretlen → létrehozás; a
 * CSV-ből hiányzó felhasználó → inaktiválás (megmarad az előzményekben, de
 * eltűnik a választókból). Törlés nincs: igények, jóváhagyások és a napló
 * hivatkoznak a felhasználókra.
 */

export const MEMBER_CSV_COLUMNS = [
  "Dolgozói azonosító",
  "Név",
  "E-mail",
  "Beosztás",
  "Szervezeti egység",
  "Vezető azonosító",
  "Szerepkörök",
  "Besorolás",
] as const;

type Col = "employeeId" | "name" | "email" | "title" | "orgUnit" | "manager" | "roles" | "tier";

const HEADER_ALIASES: Record<Col, string[]> = {
  employeeId: [
    "dolgozoi azonosito",
    "dolgozoi_azonosito",
    "azonosito",
    "employeeid",
    "employee id",
    "id",
  ],
  name: ["nev", "name", "teljes nev", "full name"],
  email: ["e-mail", "email", "e-mail cim", "email address"],
  title: ["beosztas", "title", "position", "munkakor"],
  orgUnit: [
    "szervezeti egyseg",
    "szervezeti_egyseg",
    "egyseg",
    "org unit",
    "organisational unit",
    "organizational unit",
    "unit",
  ],
  manager: [
    "vezeto azonosito",
    "vezeto",
    "vezeto e-mail",
    "manager",
    "manager id",
    "manager email",
  ],
  roles: ["szerepkorok", "szerepkor", "roles", "role"],
  tier: ["besorolas", "munkavallaloi besorolas", "tier", "employee tier"],
};

const TIER_ALIASES: Record<string, EmployeeTier> = {
  alkalmazotti: "alkalmazotti",
  staff: "alkalmazotti",
  vezetoi: "vezetoi",
  management: "vezetoi",
  felsovezetoi: "felsovezetoi",
  "senior management": "felsovezetoi",
};

export function normalizeKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[*:]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface ParsedMemberRow {
  line: number;
  employeeId: string;
  name: string;
  email: string;
  title: string;
  orgUnitId: string;
  managerRef: string;
  roles: RoleKey[] | null; // null = az oszlop üres/hiányzik → meglévő szerepkörök maradnak
  tier: EmployeeTier | null;
}

export interface MemberRowError {
  line: number;
  message: string;
}

export interface MemberFieldChange {
  field:
    | "name"
    | "title"
    | "email"
    | "employeeId"
    | "orgUnitId"
    | "managerId"
    | "roles"
    | "employeeTier";
  from: string;
  to: string;
}

export interface MemberUpdate {
  userId: string;
  name: string;
  patch: Partial<
    Pick<
      User,
      "name" | "title" | "email" | "employeeId" | "orgUnitId" | "managerId" | "employeeTier"
    >
  >;
  roles: RoleKey[] | null;
  changes: MemberFieldChange[];
  reactivate: boolean;
}

export interface MemberCreate {
  tempId: string;
  input: Omit<User, "id" | "initials">;
  managerRef: string;
}

export interface MemberImportPlan {
  totalRows: number;
  errors: MemberRowError[];
  creates: MemberCreate[];
  updates: MemberUpdate[];
  unchanged: string[]; // userId
  deactivate: { userId: string; name: string }[];
  /** Az importot végző admin sosem inaktiválódik; ha hiányzik a listából, figyelmeztetés. */
  warnings: string[];
}

interface PlanInput {
  csvText: string;
  users: User[]; // hatályos lista (felülírásokkal), active jelzéssel
  orgUnits: OrgUnit[];
  actorUserId: string;
}

function mapHeader(header: string[]): Partial<Record<Col, number>> {
  const map: Partial<Record<Col, number>> = {};
  header.forEach((h, i) => {
    const key = normalizeKey(h);
    for (const [col, aliases] of Object.entries(HEADER_ALIASES) as [Col, string[]][]) {
      if (map[col] === undefined && aliases.includes(key)) map[col] = i;
    }
  });
  return map;
}

const ROLE_BY_LABEL: Record<string, RoleKey> = Object.fromEntries(
  (Object.entries(ROLE_LABELS) as [RoleKey, string][]).flatMap(([k, label]) => [
    [normalizeKey(label), k],
    [normalizeKey(k), k],
  ]),
);

function parseRoles(raw: string, line: number, errors: MemberRowError[]): RoleKey[] | null {
  const s = raw.trim();
  if (!s) return null;
  const out: RoleKey[] = [];
  for (const part of s.split(/[|;,/]+/)) {
    const k = normalizeKey(part);
    if (!k) continue;
    const role = ROLE_BY_LABEL[k];
    if (!role) errors.push({ line, message: `Ismeretlen szerepkör: „${part.trim()}”` });
    else if (!out.includes(role)) out.push(role);
  }
  return out;
}

export function planMemberImport({
  csvText,
  users,
  orgUnits,
  actorUserId,
}: PlanInput): MemberImportPlan {
  const errors: MemberRowError[] = [];
  const warnings: string[] = [];
  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    return {
      totalRows: 0,
      errors: [{ line: 1, message: "A fájl üres." }],
      creates: [],
      updates: [],
      unchanged: [],
      deactivate: [],
      warnings,
    };
  }
  const header = mapHeader(rows[0]!);
  const missing = (["name", "email", "title", "orgUnit"] as Col[]).filter(
    (c) => header[c] === undefined,
  );
  if (missing.length > 0 || (header.employeeId === undefined && header.email === undefined)) {
    const labels: Record<Col, string> = {
      employeeId: "Dolgozói azonosító",
      name: "Név",
      email: "E-mail",
      title: "Beosztás",
      orgUnit: "Szervezeti egység",
      manager: "Vezető azonosító",
      roles: "Szerepkörök",
      tier: "Besorolás",
    };
    return {
      totalRows: rows.length - 1,
      errors: [
        {
          line: 1,
          message: `Hiányzó oszlop(ok) a fejlécben: ${missing.map((c) => labels[c]).join(", ")}. Elvárt fejléc: ${MEMBER_CSV_COLUMNS.join("; ")}`,
        },
      ],
      creates: [],
      updates: [],
      unchanged: [],
      deactivate: [],
      warnings,
    };
  }

  const unitByKey = new Map<string, OrgUnit>();
  for (const o of orgUnits) {
    unitByKey.set(normalizeKey(o.name), o);
    unitByKey.set(o.id, o);
  }
  const byEmployeeId = new Map(
    users.filter((u) => u.employeeId).map((u) => [u.employeeId.trim().toLowerCase(), u]),
  );
  const byEmail = new Map(users.map((u) => [u.email.trim().toLowerCase(), u]));

  const parsed: ParsedMemberRow[] = [];
  const seenKeys = new Set<string>();
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]!;
    const line = r + 1;
    const cell = (c: Col) => (header[c] === undefined ? "" : (row[header[c]!] ?? "").trim());
    const employeeId = cell("employeeId");
    const name = cell("name");
    const email = cell("email").toLowerCase();
    const title = cell("title");
    const unitRaw = cell("orgUnit");
    if (!name) errors.push({ line, message: "Hiányzó név." });
    if (!email) errors.push({ line, message: "Hiányzó e-mail cím." });
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.push({ line, message: `Érvénytelen e-mail cím: „${email}”` });
    if (!title) errors.push({ line, message: "Hiányzó beosztás." });
    const unit = unitRaw
      ? (unitByKey.get(normalizeKey(unitRaw)) ?? unitByKey.get(unitRaw))
      : undefined;
    if (!unitRaw) errors.push({ line, message: "Hiányzó szervezeti egység." });
    else if (!unit)
      errors.push({
        line,
        message: `Ismeretlen szervezeti egység: „${unitRaw}” (a névnek pontosan egyeznie kell az organogram szerinti listával)`,
      });
    const key = (employeeId || email).toLowerCase();
    if (key) {
      if (seenKeys.has(key))
        errors.push({
          line,
          message: `Ismétlődő sor: „${employeeId || email}” már szerepel a fájlban.`,
        });
      seenKeys.add(key);
    }
    const roles = parseRoles(cell("roles"), line, errors);
    const tierRaw = cell("tier");
    const tier = tierRaw ? (TIER_ALIASES[normalizeKey(tierRaw)] ?? null) : null;
    if (tierRaw && !tier)
      errors.push({
        line,
        message: `Ismeretlen besorolás: „${tierRaw}” (alkalmazotti / vezetői / felsővezetői)`,
      });
    parsed.push({
      line,
      employeeId,
      name,
      email,
      title,
      orgUnitId: unit?.id ?? "",
      managerRef: cell("manager"),
      roles,
      tier,
    });
  }

  // párosítás
  const matched = new Map<string, ParsedMemberRow>(); // userId -> sor
  const creates: MemberCreate[] = [];
  for (const p of parsed) {
    const existing =
      (p.employeeId && byEmployeeId.get(p.employeeId.toLowerCase())) || byEmail.get(p.email);
    if (existing) {
      if (matched.has(existing.id))
        errors.push({
          line: p.line,
          message: `Több sor is ugyanarra a felhasználóra mutat: ${existing.name}.`,
        });
      matched.set(existing.id, p);
    } else {
      creates.push({
        tempId: `new-${p.line}`,
        managerRef: p.managerRef,
        input: {
          name: p.name,
          title: p.title,
          email: p.email,
          employeeId: p.employeeId || `PTE-${String(100000 + p.line).slice(-5)}`,
          orgUnitId: p.orgUnitId,
          roles: p.roles ?? ["igenylo"],
          managerId: undefined,
          employeeTier: p.tier ?? undefined,
        },
      });
    }
  }

  // vezető feloldása (azonosító vagy e-mail; a fájlban vagy a rendszerben)
  const resolveManager = (ref: string, line: number): string | undefined => {
    const k = ref.trim().toLowerCase();
    if (!k) return undefined;
    const u = byEmployeeId.get(k) ?? byEmail.get(k);
    if (u) return u.id;
    const inFile = parsed.find((x) => x.employeeId.toLowerCase() === k || x.email === k);
    if (inFile) {
      const c = creates.find((c) => c.input.email === inFile.email);
      if (c) return c.tempId;
      const m = [...matched.entries()].find(([, row]) => row === inFile);
      if (m) return m[0];
    }
    errors.push({ line, message: `Ismeretlen vezető: „${ref}” (dolgozói azonosító vagy e-mail)` });
    return undefined;
  };

  const updates: MemberUpdate[] = [];
  const unchanged: string[] = [];
  for (const [userId, p] of matched) {
    const u = users.find((x) => x.id === userId)!;
    const patch: MemberUpdate["patch"] = {};
    const changes: MemberFieldChange[] = [];
    const set = (
      field: MemberFieldChange["field"] & keyof MemberUpdate["patch"],
      from: string | undefined,
      to: string | undefined,
    ) => {
      if ((from ?? "") === (to ?? "")) return;
      (patch as Record<string, unknown>)[field] = to;
      changes.push({ field, from: from ?? "—", to: to ?? "—" });
    };
    set("name", u.name, p.name);
    set("title", u.title, p.title);
    set("email", u.email.toLowerCase(), p.email);
    if (p.employeeId) set("employeeId", u.employeeId, p.employeeId);
    set("orgUnitId", u.orgUnitId, p.orgUnitId);
    if (p.managerRef) set("managerId", u.managerId, resolveManager(p.managerRef, p.line));
    if (p.tier && p.tier !== (u.employeeTier ?? "alkalmazotti"))
      set("employeeTier", u.employeeTier ?? "alkalmazotti", p.tier);
    let roles: RoleKey[] | null = null;
    if (
      p.roles &&
      (p.roles.length !== u.roles.length || p.roles.some((r) => !u.roles.includes(r)))
    ) {
      roles = p.roles;
      changes.push({ field: "roles", from: u.roles.join(", "), to: p.roles.join(", ") });
    }
    const reactivate = u.active === false;
    if (changes.length === 0 && !reactivate) unchanged.push(userId);
    else updates.push({ userId, name: u.name, patch, roles, changes, reactivate });
  }
  for (const c of creates)
    if (c.managerRef)
      c.input.managerId = resolveManager(
        c.managerRef,
        parsed.find((p) => p.email === c.input.email)!.line,
      );

  const deactivate = users
    .filter((u) => u.active !== false && !matched.has(u.id))
    .filter((u) => {
      if (u.id === actorUserId) {
        warnings.push(
          "A saját fiókja nem szerepel a fájlban – az importot végző admin nem inaktiválható, ezért kihagytuk.",
        );
        return false;
      }
      return true;
    })
    .map((u) => ({ userId: u.id, name: u.name }));

  return { totalRows: parsed.length, errors, creates, updates, unchanged, deactivate, warnings };
}

/** A hatályos taglista CSV-ként (sablon: ezt szerkesztve tölthető vissza). */
export function buildMemberCsv(users: User[], orgUnits: OrgUnit[]): string {
  const unitName = (id: string) => orgUnits.find((o) => o.id === id)?.name ?? "";
  const byId = new Map(users.map((u) => [u.id, u]));
  const tierLabel: Record<EmployeeTier, string> = {
    alkalmazotti: "alkalmazotti",
    vezetoi: "vezetői",
    felsovezetoi: "felsővezetői",
  };
  return toCsv([
    [...MEMBER_CSV_COLUMNS],
    ...users
      .filter((u) => u.active !== false)
      .map((u) => [
        u.employeeId,
        u.name,
        u.email,
        u.title,
        unitName(u.orgUnitId),
        u.managerId ? (byId.get(u.managerId)?.employeeId ?? "") : "",
        u.roles.map((r) => ROLE_LABELS[r]).join(" | "),
        tierLabel[u.employeeTier ?? "alkalmazotti"],
      ]),
  ]);
}
