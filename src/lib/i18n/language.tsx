import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { EN_DICT } from "./dictionary";
import { EN_OVERRIDES } from "./overrides";

const DICT: Record<string, string> = { ...EN_DICT, ...EN_OVERRIDES };

export type Lang = "hu" | "en";
const STORAGE_KEY = "pte-portal-lang";

interface LanguageCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (hu: string) => string;
}

const Ctx = createContext<LanguageCtx | null>(null);

export function readStoredLang(): Lang {
  if (typeof window === "undefined") return "hu";
  return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "hu";
}

const SEPARATORS = [" · ", " – ", " — ", " | ", " / ", " → ", ", "];

const HU_MONTHS_EN: Record<string, string> = {
  január: "January",
  február: "February",
  március: "March",
  április: "April",
  május: "May",
  június: "June",
  július: "July",
  augusztus: "August",
  szeptember: "September",
  október: "October",
  november: "November",
  december: "December",
};

/** „2026. szeptember 8.” → „8 September 2026”; más alak változatlan. */
function huDate(text: string): string {
  const m = /^(\d{4})\. (\p{L}+) (\d{1,2})\.$/u.exec(text.trim());
  if (!m) return text;
  const month = HU_MONTHS_EN[m[2]!];
  return month ? `${m[3]} ${month} ${m[1]}` : text;
}

const PATTERNS: { re: RegExp; to: (m: RegExpExecArray) => string }[] = [
  // lépés-határidők (D3/D6/D7)
  { re: /^(\d{4})\. (\p{L}+) (\d{1,2})\.$/u, to: (m) => huDate(m[0]) },
  { re: /^Lejárt: (\d+) munkanapja$/, to: (m) => `Overdue by ${m[1]} working days` },
  {
    re: /^Határidő közeleg: (\d+) munkanap$/,
    to: (m) => `Deadline approaching: ${m[1]} working days left`,
  },
  { re: /^(\d+) munkanapja vár$/, to: (m) => `waiting ${m[1]} working days` },
  { re: /^· határidő (\S+)$/, to: (m) => `· due ${m[1]}` },
  {
    re: /^(\d+) munkanap \((.+) óta\)$/,
    to: (m) => `${m[1]} working days (since ${huDate(m[2]!)})`,
  },
  {
    re: /^Lépés határideje \((\d+) munkanap\)$/,
    to: (m) => `Step deadline (${m[1]} working days)`,
  },
  {
    re: /^Lejárt a lépés határideje \((.+)\): (\d+) munkanapja túllépve\. A felelős és a szakmai felügyelet jelzést kapott; a döntés a felelősnél marad\.$/,
    to: (m) =>
      `The step deadline (${huDate(m[1]!)}) passed ${m[2]} working days ago. The responsible person and professional supervision were notified; the decision stays with the responsible person.`,
  },
  {
    re: /^Emlékeztető: a lépés határideje (.+), (\d+) munkanap van hátra\.$/,
    to: (m) => `Reminder: the step deadline is ${huDate(m[1]!)}, ${m[2]} working days left.`,
  },
  { re: /^Lejárt határidő: (.+)$/, to: (m) => `Deadline passed: ${huDate(m[1]!)}` },
  {
    re: /^(\d+) munkanapja vár \((\d+) munkanap késés\)$/,
    to: (m) => `waiting ${m[1]} working days (${m[2]} working days late)`,
  },
  { re: /^átl\. (\d+) mn$/, to: (m) => `avg. ${m[1]} wd` },
  // ütemezés-eltérés és kiemelés (D9/D10)
  { re: /^Kiemelve \((\d+)\. kör\) – átdolgozás$/, to: (m) => `Flagged (round ${m[1]}) – rework` },
  { re: /^Kiemelve \((\d+)\. kör\)$/, to: (m) => `Flagged (round ${m[1]})` },
  {
    re: /^Kiemelt tétel \((\d+)\. kör\) – átdolgozás az eszközmenedzsernél$/,
    to: (m) => `Flagged item (round ${m[1]}) – rework at the asset manager`,
  },
  { re: /^Jóváhagyom \((\d+) tétel kiemelve\)$/, to: (m) => `Approve (${m[1]} items flagged)` },
  {
    re: /^Ütemezés eltér a kérttől: (.+) → (.+)$/,
    to: (m) =>
      `Scheduling differs from the request: ${DICT[m[1]!] ?? m[1]} → ${DICT[m[2]!] ?? m[2]}`,
  },
  { re: /^Átdolgozás: (.+)$/, to: (m) => `Rework: ${m[1]}` },
  { re: /^Indoklás: (.+)$/, to: (m) => `Justification: ${m[1]}` },
  {
    re: /^az IT eszközmenedzser a kért ütemezéstől \((.+)\) eltérően sorolta be: (.+)\.$/,
    to: (m) =>
      `the IT asset manager scheduled it differently from the requested timing (${DICT[m[1]!] ?? m[1]}): ${DICT[m[2]!] ?? m[2]}.`,
  },
  {
    re: /^a gazdasági vezető kiemelte a tételt \((\d+)\. kör\): (.+)$/,
    to: (m) => `the finance director flagged the item (round ${m[1]}): ${m[2]}`,
  },
  {
    re: /^a kiemelt tétel átdolgozva \((.*)\), a gazdasági vezető döntésére vár\.$/,
    to: (m) =>
      `the flagged item has been reworked (${m[1]}) and awaits the finance director's decision.`,
  },
  {
    re: /^(.+): a kiemelt tétel újra beküldve$/,
    to: (m) => `${m[1]}: flagged item resubmitted`,
  },
  // költségkeret-küszöb és akadály (D1/D5/D11)
  {
    re: /^Kerettúllépés \+(\d+)% – jóváhagyásra vár$/,
    to: (m) => `Budget exceeded by ${m[1]}% – awaiting approval`,
  },
  {
    re: /^Kerettúllépés \+(\d+)% – elutasítva$/,
    to: (m) => `Budget exceeded by ${m[1]}% – rejected`,
  },
  { re: /^Kerettúllépés \+(\d+)%$/, to: (m) => `Budget exceeded by ${m[1]}%` },
  { re: /^Kereten belül \(\+(\d+)%\)$/, to: (m) => `Within budget (+${m[1]}%)` },
  {
    re: /^Kerettúllépés \(\+(\d+)%\) – szervezeti jóváhagyásra vár$/,
    to: (m) => `Budget exceeded (+${m[1]}%) – awaiting organisational approval`,
  },
  {
    re: /^Költségkeret-túllépés jóváhagyása \(\+(\d+)%\)$/,
    to: (m) => `Approval of budget overrun (+${m[1]}%)`,
  },
  {
    re: /^jóváhagyott (.+) Ft · (tervezett|tényleges) (.+) Ft$/,
    to: (m) => `approved ${m[1]} HUF · ${m[2] === "tervezett" ? "planned" : "actual"} ${m[3]} HUF`,
  },
  {
    re: /^Helyettesítő modell: (.+) → (.+)$/,
    to: (m) => `Substitute model: ${m[1]} → ${m[2]}`,
  },
  { re: /^Beszerzés meghiúsult: (.+)$/, to: (m) => `Procurement failed: ${m[1]}` },
  // rendelés és részteljesítés (D12/D16) – a „ · ” és „ – ” elválasztók mentén darabolt részek
  { re: /^Rendelés: (.+)$/, to: (m) => `Order: ${m[1]}` },
  { re: /^rendelésszám: (.+)$/, to: (m) => `order number: ${m[1]}` },
  { re: /^várható érkezés: (.+)$/, to: (m) => `expected arrival: ${huDate(m[1]!)}` },
  { re: /^bruttó egységár: (.+)$/, to: (m) => `gross unit price: ${m[1]}` },
  {
    re: /^Leltárba véve beérkezéskor: (.+) \(raktáron\)$/,
    to: (m) => `Taken into inventory on arrival: ${m[1]} (in stock)`,
  },
  {
    re: /^Beérkezett: (\d+)\/(\d+) db \((.*)\)$/,
    to: (m) => `Received: ${m[1]}/${m[2]} pcs (${m[3]!.replace(/ db/g, " pcs")})`,
  },
  { re: /^(\d+)\/(\d+)\. darab$/, to: (m) => `piece ${m[1]}/${m[2]}` },
  {
    re: /^Eszköz beérkezett a beszerzésből \((\d+)\/(\d+)\. darab\)$/,
    to: (m) => `Device arrived from procurement (piece ${m[1]}/${m[2]})`,
  },
  {
    re: /^Átvételre váró eszköz: (.+)$/,
    to: (m) => `Device awaiting acceptance: ${m[1]}`,
  },
  {
    re: /^Beérkezett – átadásra \((\d+)\/(\d+) db\)$/,
    to: (m) => `Received – for handover (${m[1]}/${m[2]} pcs)`,
  },
  {
    re: /^(.+) – (\d+)\/(\d+)\. darab$/,
    to: (m) => `${DICT[m[1]!] ?? m[1]} – piece ${m[2]}/${m[3]}`,
  },
  {
    re: /^Leltárba véve beérkezéskor: (.+) \(raktáron\) – átadáskor kerül az igénylőhöz\.$/,
    to: (m) =>
      `Taken into inventory on arrival: ${m[1]} (in stock) – assigned to the requester at handover.`,
  },
  {
    re: /^Rendelés: (.+) · rendelésszám: (.+) · várható érkezés: (.+)$/,
    to: (m) => `Order: ${m[1]} · order number: ${m[2]} · expected arrival: ${huDate(m[3]!)}`,
  },
  {
    re: /^Beérkezett: (\d+)\/(\d+) db – minden beérkezett darab leltári számot kapott, a kari IT referens készíti elő az átadásra\.$/,
    to: (m) =>
      `Received: ${m[1]}/${m[2]} pcs – every received piece got an inventory number; the faculty IT liaison is preparing the handover.`,
  },
  { re: /^Beérkezett: (\d+)\/(\d+) db$/, to: (m) => `Received: ${m[1]}/${m[2]} pcs` },
  {
    re: /^Részteljesítés – (\d+)\/(\d+) db átvéve, a többi beszerzés alatt$/,
    to: (m) => `Partial delivery – ${m[1]}/${m[2]} pcs accepted, the rest under procurement`,
  },
  {
    re: /^Rendelés: (.+) · (.+) · várható érkezés: (\S+)$/,
    to: (m) => `Order: ${m[1]} · ${m[2]} · expected arrival: ${m[3]}`,
  },
  { re: /^(\d+) lejárt$/, to: (m) => `${m[1]} overdue` },
  {
    re: /^Ha (\d+) munkanapon belül nem igazolja vissza és kifogást sem jelez, az ügy automatikusan lezárul\.$/,
    to: (m) =>
      `If you neither confirm receipt nor raise an objection within ${m[1]} working days, the case closes automatically.`,
  },
  { re: /^(.+) felelőse$/, to: (m) => `Owner of ${DICT[m[1]!.trim()] ?? m[1]}` },
  { re: /^(.+) előrehaladása$/, to: (m) => `Progress of ${DICT[m[1]!.trim()] ?? m[1]}` },
  // vezetői KPI: "8 összes igény"
  { re: /^(\d+) összes igény$/, to: (m) => `${m[1]} requests in total` },
  // igénycímek a demóadatokban: "Nyomtató igénylés – HP LaserJet …"
  {
    re: /^(.+) igénylés – (.+)$/,
    to: (m) => `${DICT[m[1]!.trim()] ?? m[1]} request – ${m[2]}`,
  },
  // évszámos / negyedéves / darabszámos kifejezések
  { re: /^Értesítések \((\d+) olvasatlan\)$/, to: (m) => `Notifications (${m[1]} unread)` },
  { re: /^(\d+) db a teljes kataszterben$/, to: (m) => `${m[1]} in the full registry` },
  { re: /^(\d{4})\. gazdasági év$/, to: (m) => `${m[1]} financial year` },
  { re: /^(\d{4})\. évi keret$/, to: (m) => `${m[1]} budget` },
  {
    re: /^(\d{4})\. (I|II|III|IV)\. negyedév$/,
    to: (m) => `${m[1]} Q${{ I: 1, II: 2, III: 3, IV: 4 }[m[2]!]}`,
  },
  {
    re: /^(\d{4})\. évi selejtezési javaslat – (\d+)\. ütem$/,
    to: (m) => `${m[1]} scrapping proposal – phase ${m[2]}`,
  },
  { re: /^(.+) leterheltsége$/, to: (m) => `Workload of ${m[1]}` },
  { re: /^Inaktívak mutatása \((\d+)\)$/, to: (m) => `Show inactive (${m[1]})` },
  { re: /^(\d+)\. sor$/, to: (m) => `Row ${m[1]}` },
  { re: /^… és még (\d+)$/, to: (m) => `… and ${m[1]} more` },
  { re: /^(.+) \(leltárfelelős\)$/, to: (m) => `${m[1]} (inventory officer)` },
  {
    re: /^(.+) termékkör törlése$/,
    to: (m) => `Delete product group ${DICT[m[1]!.trim()] ?? m[1]}`,
  },
  { re: /^(.+) aktív$/, to: (m) => `${DICT[m[1]!.trim()] ?? m[1]} active` },
  {
    re: /^(\d+) folyamatban lévő igény hivatkozik rá – amíg ezek le nem zárulnak, nem távolítható el a beszerezhető eszközök közül\.$/,
    to: (m) =>
      `${m[1]} request(s) in progress reference it – it cannot be removed from the available devices until they are closed.`,
  },
];

// Utolsó lépcső: mondatba ágyazott, önállóan ismert kifejezések (szerepkörök,
// lépésnevek) cseréje, ha a szöveg egészére nem volt találat.
// Pl. "1. Szervezeti jóváhagyó – Dr. Rédei T. · 2. Szolgáltatásgazda – Dobrossy T."
const PHRASES: [RegExp, string][] = [
  "Szervezeti jóváhagyó",
  "Szolgáltatási ügyintéző",
  "Szolgáltatásgazda",
  "Kari vezető",
  "Gazdasági vezető",
  "IT eszközmenedzser",
  "Kari IT referens",
  "Beszerző",
  "Igénylő",
  "Dékán",
]
  .filter((p) => DICT[p])
  .sort((a, b) => b.length - a.length)
  .map((p) => [new RegExp(`(?<![\\p{L}])${p}(?![\\p{L}])`, "gu"), DICT[p]!]);

function translatePart(part: string): string {
  const direct = DICT[part];
  if (direct !== undefined) return direct;
  for (const p of PATTERNS) {
    const m = p.re.exec(part);
    if (m) return p.to(m);
  }
  const m = /^(.*?)([.:!?…]+)$/.exec(part);
  if (m && DICT[m[1]!]) return DICT[m[1]!]! + m[2];
  return part;
}

export function translate(text: string, lang: Lang): string {
  if (lang === "hu") return text;
  const raw = text;
  const trimmed = raw.trim();
  if (!trimmed) return raw;
  const direct = DICT[trimmed];
  if (direct !== undefined) return raw.replace(trimmed, direct);

  // composite strings joined by common separators – a darabok a szótáron
  // túl a mintákon is átmennek („Beszerzési terv – 2027. gazdasági év")
  for (const sep of SEPARATORS) {
    if (trimmed.includes(sep)) {
      const parts = trimmed.split(sep);
      const mapped = parts.map((p) => translatePart(p.trim()));
      if (mapped.some((m, i) => m !== parts[i]!.trim())) {
        return raw.replace(trimmed, mapped.join(sep));
      }
    }
  }

  for (const p of PATTERNS) {
    const m = p.re.exec(trimmed);
    if (m) return raw.replace(trimmed, p.to(m));
  }

  // trailing punctuation tolerance
  const m = /^(.*?)([.:!?…]+)$/.exec(trimmed);
  if (m && DICT[m[1]!]) return raw.replace(trimmed, DICT[m[1]!]! + m[2]);

  // phrase-level fallback
  let phrased = trimmed;
  for (const [re, en] of PHRASES) phrased = phrased.replace(re, en);
  if (phrased !== trimmed) return raw.replace(trimmed, phrased);

  return raw;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("hu");

  useEffect(() => {
    const stored = readStoredLang();
    setLangState(stored);
    document.documentElement.lang = stored;
  }, []);

  const setLang = useCallback((l: Lang) => {
    window.localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l;
    // full reload keeps every rendered string consistent with the chosen language
    window.location.reload();
  }, []);

  const t = useCallback((hu: string) => translate(hu, lang), [lang]);

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useLanguage() {
  const ctx = useContext(Ctx);
  if (!ctx) return { lang: "hu" as Lang, setLang: () => {}, t: (s: string) => s };
  return ctx;
}
