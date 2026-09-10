import { describe, expect, it } from "bun:test";
import { buildMemberCsv, planMemberImport } from "../member-import";
import type { OrgUnit, User } from "../types";

const UNITS: OrgUnit[] = [
  { id: "ou-dekani", name: "Dékáni Hivatal", type: "hivatal" },
  { id: "ou-elettani", name: "Élettani Intézet", type: "intezet" },
];
const u = (o: Partial<User> & Pick<User, "id" | "name" | "email">): User => ({
  title: "munkatárs",
  employeeId: "",
  orgUnitId: "ou-dekani",
  roles: ["igenylo"],
  initials: "XX",
  ...o,
});
const USERS: User[] = [
  u({
    id: "u-admin",
    name: "Admin Á.",
    email: "admin@aok.pte.hu",
    employeeId: "PTE-1",
    roles: ["admin"],
  }),
  u({
    id: "u-kis",
    name: "Kis Anna",
    email: "kis.anna@aok.pte.hu",
    employeeId: "PTE-2",
    orgUnitId: "ou-elettani",
  }),
  u({ id: "u-nagy", name: "Nagy Béla", email: "nagy.bela@aok.pte.hu", employeeId: "PTE-3" }),
];
const HEAD =
  "Dolgozói azonosító;Név;E-mail;Beosztás;Szervezeti egység;Vezető azonosító;Szerepkörök;Besorolás";
const plan = (csv: string) =>
  planMemberImport({ csvText: csv, users: USERS, orgUnits: UNITS, actorUserId: "u-admin" });

describe("taglista-frissítés CSV-ből", () => {
  it("egyezés azonosító szerint: frissítés csak a változott mezőkkel; hiányzó felhasználó inaktiválás", () => {
    const p = plan(
      `${HEAD}\nPTE-1;Admin Á.;admin@aok.pte.hu;munkatárs;Dékáni Hivatal;;Admin;\nPTE-2;Kis Anna;kis.anna@aok.pte.hu;adjunktus;Dékáni Hivatal;PTE-1;;\n`,
    );
    expect(p.errors).toEqual([]);
    expect(p.creates).toHaveLength(0);
    expect(p.unchanged).toEqual(["u-admin"]);
    expect(p.updates).toHaveLength(1);
    const up = p.updates[0]!;
    expect(up.userId).toBe("u-kis");
    expect(up.patch).toEqual({ title: "adjunktus", orgUnitId: "ou-dekani", managerId: "u-admin" });
    expect(up.roles).toBeNull();
    expect(p.deactivate).toEqual([{ userId: "u-nagy", name: "Nagy Béla" }]);
  });

  it("azonosító nélkül e-mail szerint párosít; új sor létrehozás alap szerepkörrel", () => {
    const p = plan(
      `Név,E-mail,Beosztás,Szervezeti egység\nKis Anna,KIS.ANNA@aok.pte.hu,adjunktus,Élettani Intézet\nÚj Ember,uj.ember@aok.pte.hu,tanársegéd,Élettani Intézet\n`,
    );
    expect(p.errors).toEqual([]);
    expect(p.updates.map((x) => x.userId)).toEqual(["u-kis"]);
    expect(p.creates).toHaveLength(1);
    expect(p.creates[0]!.input).toMatchObject({
      name: "Új Ember",
      roles: ["igenylo"],
      orgUnitId: "ou-elettani",
    });
  });

  it("szerepkörök címkével vagy kulccsal, változás naplózható", () => {
    const p = plan(
      `${HEAD}\nPTE-2;Kis Anna;kis.anna@aok.pte.hu;munkatárs;Élettani Intézet;;Szervezeti jóváhagyó | igenylo;vezetői\n`,
    );
    expect(p.errors).toEqual([]);
    expect(p.updates[0]!.roles).toEqual(["jovahagyo", "igenylo"]);
    expect(p.updates[0]!.patch.employeeTier).toBe("vezetoi");
  });

  it("hibák soronként: ismeretlen egység, rossz e-mail, ismétlődés, ismeretlen szerepkör; a fejléc hiánya", () => {
    const p = plan(
      `${HEAD}\nPTE-9;X Y;nem-email;munkatárs;Nincs Ilyen Egység;;varázsló;\nPTE-9;X Y;x@aok.pte.hu;munkatárs;Dékáni Hivatal;;;\n`,
    );
    const msgs = p.errors.map((e) => `${e.line}: ${e.message}`);
    expect(msgs.some((m) => m.startsWith("2: Érvénytelen e-mail"))).toBe(true);
    expect(msgs.some((m) => m.startsWith("2: Ismeretlen szervezeti egység"))).toBe(true);
    expect(msgs.some((m) => m.startsWith("2: Ismeretlen szerepkör"))).toBe(true);
    expect(msgs.some((m) => m.startsWith("3: Ismétlődő sor"))).toBe(true);
    expect(plan("Név;Beosztás\nA;B\n").errors[0]!.message).toContain("Hiányzó oszlop");
  });

  it("az importot végző admin sosem inaktiválódik", () => {
    const p = plan(`${HEAD}\nPTE-2;Kis Anna;kis.anna@aok.pte.hu;munkatárs;Élettani Intézet;;;\n`);
    expect(p.deactivate.map((d) => d.userId)).toEqual(["u-nagy"]);
    expect(p.warnings[0]).toContain("saját fiókja");
  });

  it("inaktív felhasználó a listában → újraaktiválás", () => {
    const users = USERS.map((x) => (x.id === "u-nagy" ? { ...x, active: false } : x));
    const p = planMemberImport({
      csvText: `${HEAD}\nPTE-1;Admin Á.;admin@aok.pte.hu;munkatárs;Dékáni Hivatal;;Admin;\nPTE-3;Nagy Béla;nagy.bela@aok.pte.hu;munkatárs;Dékáni Hivatal;;;\n`,
      users,
      orgUnits: UNITS,
      actorUserId: "u-admin",
    });
    expect(p.updates.find((x) => x.userId === "u-nagy")?.reactivate).toBe(true);
  });

  it("a sablon-export visszatölthető változtatás nélkül", () => {
    const csv = buildMemberCsv(USERS, UNITS);
    const p = plan(csv);
    expect(p.errors).toEqual([]);
    expect(p.creates).toHaveLength(0);
    expect(p.updates).toHaveLength(0);
    expect(p.deactivate).toHaveLength(0);
    expect(p.unchanged).toHaveLength(3);
  });
});
