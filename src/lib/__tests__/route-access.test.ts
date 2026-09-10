import { describe, expect, it } from "bun:test";
import { canOpenRoute, ROUTE_ROLES, type GuardedRoute } from "../route-access";

const ROUTES = Object.keys(ROUTE_ROLES) as GuardedRoute[];

describe("útvonal-hozzáférés", () => {
  it("igénylő egyetlen védett oldalt sem nyithat meg", () => {
    for (const r of ROUTES) expect(canOpenRoute(r, "igenylo")).toBe(false);
  });

  it("a dékán minden védett oldalra beléphet (betekintés)", () => {
    for (const r of ROUTES) expect(canOpenRoute(r, "dekan")).toBe(true);
  });

  it("adminisztráció és jogosultságkezelés csak adminnak és dékánnak", () => {
    for (const r of ["/adminisztracio", "/jogosultsagok"] as const) {
      expect(canOpenRoute(r, "admin")).toBe(true);
      expect(canOpenRoute(r, "vezeto")).toBe(false);
      expect(canOpenRoute(r, "ugyintezo")).toBe(false);
    }
  });

  it("a szolgáltatási munkatér a szolgáltatási csapaté", () => {
    expect(canOpenRoute("/munkater", "ugyintezo")).toBe(true);
    expect(canOpenRoute("/munkater", "szolgaltatasgazda")).toBe(true);
    expect(canOpenRoute("/munkater", "vezeto")).toBe(false);
    expect(canOpenRoute("/munkater", "jovahagyo")).toBe(false);
  });

  it("a vezetői áttekintés a vezetésé és a szolgáltatásgazdáé", () => {
    expect(canOpenRoute("/vezetoi-attekintes", "vezeto")).toBe(true);
    expect(canOpenRoute("/vezetoi-attekintes", "gazdasagi_vezeto")).toBe(true);
    expect(canOpenRoute("/vezetoi-attekintes", "it_referens")).toBe(false);
  });
});
