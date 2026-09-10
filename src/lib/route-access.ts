import type { RoleKey } from "./types";

/**
 * Szerepkörhöz kötött útvonalak. A fejlécmenü és az oldalak gátja ugyanebből
 * a táblából dolgozik, így a kettő nem csúszhat szét: ami a menüből hiányzik,
 * az az URL közvetlen beírásával sem nyílik meg.
 *
 * A dékán mindenhová beléphet – a delegált területeken betekintő módban
 * (lásd access.ts). A jóváhagyási sor kivétel: aki a következő jóváhagyó egy
 * igénynél, az szerepkörtől függetlenül megnyithatja (app-shell, jovahagyasok).
 */
export type GuardedRoute =
  | "/eszkozkataszter"
  | "/beszerzesek"
  | "/beszerzesi-terv"
  | "/eszkozatadas"
  | "/selejtezes"
  | "/eletciklus-elorejelzes"
  | "/jovahagyasok"
  | "/vezetoi-attekintes"
  | "/munkater"
  | "/adminisztracio"
  | "/jogosultsagok";

export const ROUTE_ROLES: Record<GuardedRoute, RoleKey[]> = {
  "/eszkozkataszter": [
    "eszkozmenedzser",
    "it_referens",
    "beszerzo",
    "gazdasagi_vezeto",
    "vezeto",
    "dekan",
    "admin",
  ],
  "/beszerzesek": ["beszerzo", "eszkozmenedzser", "gazdasagi_vezeto", "dekan"],
  "/beszerzesi-terv": ["eszkozmenedzser", "beszerzo", "gazdasagi_vezeto", "vezeto", "dekan"],
  "/eszkozatadas": ["it_referens", "eszkozmenedzser", "beszerzo", "dekan"],
  "/selejtezes": ["eszkozmenedzser", "gazdasagi_vezeto", "dekan"],
  "/eletciklus-elorejelzes": [
    "eszkozmenedzser",
    "gazdasagi_vezeto",
    "szolgaltatasgazda",
    "vezeto",
    "dekan",
  ],
  "/jovahagyasok": ["jovahagyo", "ugyintezo", "szolgaltatasgazda", "vezeto", "dekan"],
  "/vezetoi-attekintes": ["vezeto", "dekan", "szolgaltatasgazda", "gazdasagi_vezeto"],
  "/munkater": ["ugyintezo", "szolgaltatasgazda", "admin", "dekan"],
  "/adminisztracio": ["admin", "dekan"],
  "/jogosultsagok": ["admin", "dekan"],
};

export function canOpenRoute(route: GuardedRoute, role: RoleKey): boolean {
  return ROUTE_ROLES[route].includes(role);
}
