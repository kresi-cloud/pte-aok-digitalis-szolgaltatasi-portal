/**
 * Központi dátumszolgáltató.
 *
 * Normál módban a helyi aktuális dátum, vezetőségi demómódban a
 * determinisztikus demódátum. Minden dátum helyi idő szerint, ISO
 * (YYYY-MM-DD) formátumban készül, így nincs időzóna miatti egynapos
 * eltérés (a `toISOString()` UTC-re vált, ezért nem használjuk).
 */

export const DEMO_DATE = "2026-09-01";
export const DEMO_FLAG_KEY = "aok-demo-mode";
export const DEMO_FLAG_VALUE = "leadership";

let demoClock = false;

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Demóóra be- vagy kikapcsolása (a demómód kezeli). */
export function setDemoClock(on: boolean): void {
  demoClock = on;
}

export function isDemoClock(): boolean {
  return demoClock;
}

/** Az alkalmazás „mai” dátuma. */
export function todayIso(now: Date = new Date()): string {
  return demoClock ? DEMO_DATE : toIsoDate(now);
}

/** Két ISO dátum közötti egész napok száma (időzónafüggetlen). */
export function daysBetween(fromIso: string, toIsoStr: string): number {
  const a = Date.parse(`${fromIso}T00:00:00Z`);
  const b = Date.parse(`${toIsoStr}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

const HU_MONTHS = [
  "január",
  "február",
  "március",
  "április",
  "május",
  "június",
  "július",
  "augusztus",
  "szeptember",
  "október",
  "november",
  "december",
];

/** Magyar dátumformátum: „2026. szeptember 1.” */
export function formatHuDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${y}. ${HU_MONTHS[m - 1]} ${d}.`;
}

// A demómód a modul betöltésekor is érvényes legyen (pl. a modulszintű
// TODAY konstansoknál), ezért a jelzést azonnal beolvassuk.
if (typeof window !== "undefined") {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("demo");
    const stored = window.localStorage.getItem(DEMO_FLAG_KEY);
    if (fromUrl === DEMO_FLAG_VALUE || stored === DEMO_FLAG_VALUE) demoClock = true;
  } catch {
    // A tárolóhoz való hozzáférés hiánya nem akadályozhatja az indulást.
  }
}
