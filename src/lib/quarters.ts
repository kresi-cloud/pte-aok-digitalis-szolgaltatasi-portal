import { todayIso } from "./clock";

const ROMAN = ["I", "II", "III", "IV"] as const;

export interface UpcomingQuarter {
  /** Tárolt érték, pl. "2027-Q1". */
  value: string;
  /** Megjelenített felirat, pl. "2027. I. negyedév". */
  label: string;
  year: number;
  quarter: 1 | 2 | 3 | 4;
}

/**
 * A megadott dátumot követő negyedévtől induló négy egymást követő negyedév.
 * Demómódban a todayIso() a determinisztikus demódátumot adja.
 */
export function upcomingQuarters(fromIso: string = todayIso()): UpcomingQuarter[] {
  const [y, m] = fromIso.split("-").map(Number);
  if (!y || !m) return [];
  // Következő negyedév indexe (0-based): az aktuális negyedév utáni.
  const currentQ = Math.floor((m - 1) / 3); // 0..3
  let year = y;
  let q = currentQ + 1;
  if (q > 3) {
    q = 0;
    year += 1;
  }
  const result: UpcomingQuarter[] = [];
  for (let i = 0; i < 4; i++) {
    const quarter = (q + 1) as 1 | 2 | 3 | 4;
    result.push({
      value: `${year}-Q${quarter}`,
      label: `${year}. ${ROMAN[q]}. negyedév`,
      year,
      quarter,
    });
    q += 1;
    if (q > 3) {
      q = 0;
      year += 1;
    }
  }
  return result;
}
