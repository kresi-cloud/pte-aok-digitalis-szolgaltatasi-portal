import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { EN_DICT } from "./dictionary";
import { EN_OVERRIDES } from "./overrides";

import { EN_TEMPLATES } from "./templates";

const TEMPLATE_DICT: Record<string, string> = Object.fromEntries(
  EN_TEMPLATES.filter(([hu]) => !/\{\d+\}/.test(hu)),
);
const DICT: Record<string, string> = { ...EN_DICT, ...EN_OVERRIDES, ...TEMPLATE_DICT };

const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Sablonok: „{n}” helyőrzőkből minta; a befogott részek ismert kifejezésként
 * tovább fordulnak (szótár vagy rövidebb sablon), különben változatlanok maradnak.
 */
const TEMPLATE_RULES: { re: RegExp; to: (m: RegExpExecArray, depth: number) => string }[] =
  EN_TEMPLATES.filter(([hu]) => /\{\d+\}/.test(hu))
    .sort((a, b) => b[0].length - a[0].length)
    .map(([hu, en]) => {
      const order: number[] = [];
      const src = hu
        .split(/(\{\d+\})/)
        .map((piece) => {
          const ph = /^\{(\d+)\}$/.exec(piece);
          if (ph) {
            order.push(Number(ph[1]));
            return "([\\s\\S]*?)";
          }
          return escapeRe(piece);
        })
        .join("");
      const re = new RegExp(`^${src}$`);
      return {
        re,
        to: (m, depth) =>
          en.replace(/\{(\d+)\}/g, (_, n: string) => {
            const idx = order.indexOf(Number(n));
            const val = idx >= 0 ? (m[idx + 1] ?? "") : "";
            const t = val.trim();
            const out = t ? core(t, depth) : t;
            return out !== t ? val.replace(t, () => out) : val;
          }),
      };
    });

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
  const m = /^(\d{4})\. (\p{L}+) (\d{1,2})\.?$/u.exec(text.trim());
  if (!m) return text;
  const month = HU_MONTHS_EN[m[2]!];
  return month ? `${m[3]} ${month} ${m[1]}` : text;
}

/** Befogott szabad szöveg továbbfordítása (szótár, sablon, elválasztók). */
const tr = (v: string | undefined): string => {
  const t = (v ?? "").trim();
  const out = t ? core(t, 1) : t;
  return out !== t ? (v ?? "").replace(t, () => out) : (v ?? "");
};

const PATTERNS: { re: RegExp; to: (m: RegExpExecArray) => string }[] = [
  // lépés-határidők (D3/D6/D7)
  { re: /^(\d{4})\. (\p{L}+) (\d{1,2})\.?$/u, to: (m) => huDate(m[0]) },
  // pénznem, darabszám, napok – csak számmal
  { re: /^([\d\s\u00a0.,+−-]+) Ft$/, to: (m) => `${m[1]} HUF` },
  { re: /^([\d\s\u00a0.,+−-]+) M Ft$/, to: (m) => `${m[1]} M HUF` },
  { re: /^([\d\s\u00a0.,+−-]+) eFt keret$/, to: (m) => `${m[1]} kHUF budget` },
  { re: /^([\d\s\u00a0.,+−-]+) eFt$/, to: (m) => `${m[1]} kHUF` },
  { re: /^([\d\s\u00a0.,+−-]+) e Ft$/, to: (m) => `${m[1]} kHUF` },
  { re: /^([\d\s\u00a0.,+−-]+) Ft\/db$/, to: (m) => `${m[1]} HUF/pc` },
  { re: /^([\d\s\u00a0.,]+) db$/, to: (m) => (m[1] === "1" ? "1 pc" : `${m[1]} pcs`) },
  { re: /^([\d\s\u00a0.,]+) db\.$/, to: (m) => (m[1] === "1" ? "1 pc." : `${m[1]} pcs.`) },
  { re: /^(\d+) mag$/, to: (m) => `${m[1]} cores` },
  {
    re: /^(\d{4}-\d{2}-\d{2}): (\d+) db$/,
    to: (m) => `${m[1]}: ${m[2]} ${m[2] === "1" ? "pc" : "pcs"}`,
  },
  { re: /^(\d{4})\. (Q[1-4])$/, to: (m) => `${m[1]} ${m[2]}` },
  { re: /^(\d+) nap$/, to: (m) => (m[1] === "1" ? "1 day" : `${m[1]} days`) },
  { re: /^(\d+) munkanap$/, to: (m) => (m[1] === "1" ? "1 working day" : `${m[1]} working days`) },
  { re: /^(\d+) munkanapja$/, to: (m) => `${m[1]} working days ago` },
  { re: /^(\d+) munkanap késés$/, to: (m) => `${m[1]} working days late` },
  { re: /^(\d+) munkanap van hátra$/, to: (m) => `${m[1]} working days left` },
  { re: /^Lejárt: (\d+) munkanapja$/, to: (m) => `Overdue by ${tr(m[1])} working days` },
  {
    re: /^Határidő közeleg: (\d+) munkanap$/,
    to: (m) => `Deadline approaching: ${tr(m[1])} working days left`,
  },
  { re: /^(\d+) munkanapja vár$/, to: (m) => `waiting ${tr(m[1])} working days` },
  { re: /^· határidő (\S+)$/, to: (m) => `· due ${tr(m[1])}` },
  {
    re: /^(\d+) munkanap \((.+) óta\)$/,
    to: (m) => `${tr(m[1])} working days (since ${huDate(m[2]!)})`,
  },
  {
    re: /^Lépés határideje \((\d+) munkanap\)$/,
    to: (m) => `Step deadline (${tr(m[1])} working days)`,
  },
  {
    re: /^Lejárt a lépés határideje \((.+)\): (\d+) munkanapja túllépve\. A felelős és a szakmai felügyelet jelzést kapott; a döntés a felelősnél marad\.$/,
    to: (m) =>
      `The step deadline (${huDate(m[1]!)}) passed ${tr(m[2])} working days ago. The responsible person and professional supervision were notified; the decision stays with the responsible person.`,
  },
  {
    re: /^Emlékeztető: a lépés határideje (.+), (\d+) munkanap van hátra\.$/,
    to: (m) => `Reminder: the step deadline is ${huDate(m[1]!)}, ${tr(m[2])} working days left.`,
  },
  { re: /^Lejárt határidő: (.+)$/, to: (m) => `Deadline passed: ${tr(m[1])}` },
  {
    re: /^(\d+) munkanapja vár \((\d+) munkanap késés\)$/,
    to: (m) => `waiting ${tr(m[1])} working days (${tr(m[2])} working days late)`,
  },
  { re: /^átl\. (\d+) mn$/, to: (m) => `avg. ${tr(m[1])} wd` },
  // helyettesítés, értesítés, egység-keret (D8/D14/D15)
  { re: /^Helyettesít: (.+)$/, to: (m) => `Substituting: ${tr(m[1])}` },
  { re: /^helyettesként: (.+)$/, to: (m) => `as substitute: ${tr(m[1])}` },
  { re: /^Teendő: (.+)$/, to: (m) => `To do: ${tr(m[1])}` },
  { re: /^Beállított helyettes: (.+)$/, to: (m) => `Substitute set: ${tr(m[1])}` },
  {
    re: /^(.+) Ft · eddig felhasználva (.+) Ft · ez az igény (.+) Ft · (maradna|túllépés) (.+) Ft$/,
    to: (m) =>
      `${tr(m[1])} HUF · used so far ${tr(m[2])} HUF · this request ${tr(m[3])} HUF · ${m[4] === "maradna" ? "would remain" : "overrun"} ${tr(m[5])} HUF`,
  },
  {
    re: /^a jóváhagyáskor az egység (.+) Ft-os éves kerete kimerült \(felhasználva (.+) Ft, ez az igény (.+) Ft\)\.$/,
    to: (m) =>
      `at approval the unit's annual budget of ${tr(m[1])} HUF was exhausted (used ${tr(m[2])} HUF, this request ${tr(m[3])} HUF).`,
  },
  // ütemezés-eltérés és kiemelés (D9/D10)
  {
    re: /^Kiemelve \((\d+)\. kör\) – átdolgozás$/,
    to: (m) => `Flagged (round ${tr(m[1])}) – rework`,
  },
  { re: /^Kiemelve \((\d+)\. kör\)$/, to: (m) => `Flagged (round ${tr(m[1])})` },
  {
    re: /^Kiemelt tétel \((\d+)\. kör\) – átdolgozás az eszközmenedzsernél$/,
    to: (m) => `Flagged item (round ${tr(m[1])}) – rework at the asset manager`,
  },
  { re: /^Jóváhagyom \((\d+) tétel kiemelve\)$/, to: (m) => `Approve (${tr(m[1])} items flagged)` },
  {
    re: /^Ütemezés eltér a kérttől: (.+) → (.+)$/,
    to: (m) =>
      `Scheduling differs from the request: ${DICT[m[1]!] ?? m[1]} → ${DICT[m[2]!] ?? m[2]}`,
  },
  { re: /^Átdolgozás: (.+)$/, to: (m) => `Rework: ${tr(m[1])}` },
  { re: /^Indoklás: (.+)$/, to: (m) => `Justification: ${tr(m[1])}` },
  {
    re: /^az IT eszközmenedzser a kért ütemezéstől \((.+)\) eltérően sorolta be: (.+)\.$/,
    to: (m) =>
      `the IT asset manager scheduled it differently from the requested timing (${DICT[m[1]!] ?? m[1]}): ${DICT[m[2]!] ?? m[2]}.`,
  },
  {
    re: /^a gazdasági vezető kiemelte a tételt \((\d+)\. kör\): (.+)$/,
    to: (m) => `the finance director flagged the item (round ${tr(m[1])}): ${tr(m[2])}`,
  },
  {
    re: /^a kiemelt tétel átdolgozva \((.*)\), a gazdasági vezető döntésére vár\.$/,
    to: (m) =>
      `the flagged item has been reworked (${tr(m[1])}) and awaits the finance director's decision.`,
  },
  {
    re: /^(.+): a kiemelt tétel újra beküldve$/,
    to: (m) => `${tr(m[1])}: flagged item resubmitted`,
  },
  // költségkeret-küszöb és akadály (D1/D5/D11)
  {
    re: /^Kerettúllépés \+(\d+)% – jóváhagyásra vár$/,
    to: (m) => `Budget exceeded by ${tr(m[1])}% – awaiting approval`,
  },
  {
    re: /^Kerettúllépés \+(\d+)% – elutasítva$/,
    to: (m) => `Budget exceeded by ${tr(m[1])}% – rejected`,
  },
  { re: /^Kerettúllépés \+(\d+)%$/, to: (m) => `Budget exceeded by ${tr(m[1])}%` },
  { re: /^Kereten belül \(\+(\d+)%\)$/, to: (m) => `Within budget (+${tr(m[1])}%)` },
  {
    re: /^Kerettúllépés \(\+(\d+)%\) – szervezeti jóváhagyásra vár$/,
    to: (m) => `Budget exceeded (+${tr(m[1])}%) – awaiting organisational approval`,
  },
  {
    re: /^Költségkeret-túllépés jóváhagyása \(\+(\d+)%\)$/,
    to: (m) => `Approval of budget overrun (+${tr(m[1])}%)`,
  },
  {
    re: /^jóváhagyott (.+) Ft · (tervezett|tényleges) (.+) Ft$/,
    to: (m) =>
      `approved ${tr(m[1])} HUF · ${m[2] === "tervezett" ? "planned" : "actual"} ${tr(m[3])} HUF`,
  },
  {
    re: /^Helyettesítő modell: (.+) → (.+)$/,
    to: (m) => `Substitute model: ${tr(m[1])} → ${tr(m[2])}`,
  },
  { re: /^Beszerzés meghiúsult: (.+)$/, to: (m) => `Procurement failed: ${tr(m[1])}` },
  // rendelés és részteljesítés (D12/D16) – a „ · ” és „ – ” elválasztók mentén darabolt részek
  { re: /^Rendelés: (.+)$/, to: (m) => `Order: ${tr(m[1])}` },
  { re: /^rendelésszám: (.+)$/, to: (m) => `order number: ${tr(m[1])}` },
  { re: /^várható érkezés: (.+)$/, to: (m) => `expected arrival: ${tr(m[1])}` },
  { re: /^bruttó egységár: (.+)$/, to: (m) => `gross unit price: ${tr(m[1])}` },
  {
    re: /^Leltárba véve beérkezéskor: (.+) \(raktáron\)$/,
    to: (m) => `Taken into inventory on arrival: ${tr(m[1])} (in stock)`,
  },
  {
    re: /^Beérkezett: (\d+)\/(\d+) db \((.*)\)$/,
    to: (m) => `Received: ${tr(m[1])}/${tr(m[2])} pcs (${m[3]!.replace(/ db/g, " pcs")})`,
  },
  { re: /^(\d+)\/(\d+)\. darab$/, to: (m) => `piece ${tr(m[1])}/${tr(m[2])}` },
  {
    re: /^Eszköz beérkezett a beszerzésből \((\d+)\/(\d+)\. darab\)$/,
    to: (m) => `Device arrived from procurement (piece ${tr(m[1])}/${tr(m[2])})`,
  },
  {
    re: /^Átvételre váró eszköz: (.+)$/,
    to: (m) => `Device awaiting acceptance: ${tr(m[1])}`,
  },
  {
    re: /^Beérkezett – átadásra \((\d+)\/(\d+) db\)$/,
    to: (m) => `Received – for handover (${tr(m[1])}/${tr(m[2])} pcs)`,
  },
  {
    re: /^(.+) – (\d+)\/(\d+)\. darab$/,
    to: (m) => `${DICT[m[1]!] ?? m[1]} – piece ${tr(m[2])}/${tr(m[3])}`,
  },
  {
    re: /^Leltárba véve beérkezéskor: (.+) \(raktáron\) – átadáskor kerül az igénylőhöz\.$/,
    to: (m) =>
      `Taken into inventory on arrival: ${tr(m[1])} (in stock) – assigned to the requester at handover.`,
  },
  {
    re: /^Rendelés: (.+) · rendelésszám: (.+) · várható érkezés: (.+)$/,
    to: (m) =>
      `Order: ${tr(m[1])} · order number: ${tr(m[2])} · expected arrival: ${huDate(m[3]!)}`,
  },
  {
    re: /^Beérkezett: (\d+)\/(\d+) db – minden beérkezett darab leltári számot kapott, a kari IT referens készíti elő az átadásra\.$/,
    to: (m) =>
      `Received: ${tr(m[1])}/${tr(m[2])} pcs – every received piece got an inventory number; the faculty IT liaison is preparing the handover.`,
  },
  { re: /^Beérkezett: (\d+)\/(\d+) db$/, to: (m) => `Received: ${tr(m[1])}/${tr(m[2])} pcs` },
  {
    re: /^Részteljesítés – (\d+)\/(\d+) db átvéve, a többi beszerzés alatt$/,
    to: (m) =>
      `Partial delivery – ${tr(m[1])}/${tr(m[2])} pcs accepted, the rest under procurement`,
  },
  {
    re: /^Rendelés: (.+) · (.+) · várható érkezés: (\S+)$/,
    to: (m) => `Order: ${tr(m[1])} · ${tr(m[2])} · expected arrival: ${tr(m[3])}`,
  },
  { re: /^(\d+) lejárt$/, to: (m) => `${tr(m[1])} overdue` },
  {
    re: /^Ha (\d+) munkanapon belül nem igazolja vissza és kifogást sem jelez, az ügy automatikusan lezárul\.$/,
    to: (m) =>
      `If you neither confirm receipt nor raise an objection within ${tr(m[1])} working days, the case closes automatically.`,
  },
  { re: /^(.+) felelőse$/, to: (m) => `Owner of ${tr(m[1])}` },
  { re: /^(.+) előrehaladása$/, to: (m) => `Progress of ${tr(m[1])}` },
  // vezetői KPI: "8 összes igény"
  { re: /^(\d+) összes igény$/, to: (m) => `${tr(m[1])} requests in total` },
  // igénycímek a demóadatokban: "Nyomtató igénylés – HP LaserJet …"
  {
    re: /^(.+) igénylés – (.+)$/,
    to: (m) => `${tr(m[1])} request – ${tr(m[2])}`,
  },
  // évszámos / negyedéves / darabszámos kifejezések
  { re: /^Értesítések \((\d+) olvasatlan\)$/, to: (m) => `Notifications (${tr(m[1])} unread)` },
  { re: /^(\d+) db a teljes kataszterben$/, to: (m) => `${tr(m[1])} in the full registry` },
  { re: /^(\d{4})\. gazdasági év$/, to: (m) => `${tr(m[1])} financial year` },
  { re: /^(\d{4})\. évi keret$/, to: (m) => `${tr(m[1])} budget` },
  {
    re: /^(\d{4})\. (I|II|III|IV)\. negyedév$/,
    to: (m) => `${tr(m[1])} Q${{ I: 1, II: 2, III: 3, IV: 4 }[m[2]!]}`,
  },
  {
    re: /^(\d{4})\. évi selejtezési javaslat – (\d+)\. ütem$/,
    to: (m) => `${tr(m[1])} scrapping proposal – phase ${tr(m[2])}`,
  },
  { re: /^(.+) leterheltsége$/, to: (m) => `Workload of ${tr(m[1])}` },
  { re: /^Inaktívak mutatása \((\d+)\)$/, to: (m) => `Show inactive (${tr(m[1])})` },
  { re: /^(\d+)\. sor$/, to: (m) => `Row ${tr(m[1])}` },
  { re: /^… és még (\d+)$/, to: (m) => `… and ${tr(m[1])} more` },
  { re: /^(.+) \(leltárfelelős\)$/, to: (m) => `${tr(m[1])} (inventory officer)` },
  {
    re: /^(.+) termékkör törlése$/,
    to: (m) => `Delete product group ${tr(m[1])}`,
  },
  { re: /^(.+) aktív$/, to: (m) => `${tr(m[1])} active` },
  {
    re: /^(\d+) folyamatban lévő igény hivatkozik rá – amíg ezek le nem zárulnak, nem távolítható el a beszerezhető eszközök közül\.$/,
    to: (m) =>
      `${tr(m[1])} request(s) in progress reference it – it cannot be removed from the available devices until they are closed.`,
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

const LEADING = /^([·•–—-]|\d+\.|[a-z]\)|\(\d+\))\s+([\s\S]+)$/u;
const WRAPPED: [RegExp, string, string][] = [
  [/^\(([\s\S]+)\)$/, "(", ")"],
  [/^„([\s\S]+)”$/, "„", "”"],
  [/^“([\s\S]+)”$/, "“", "”"],
  [/^"([\s\S]+)"$/, '"', '"'],
];
/** Rövidítés vagy sorszám/dátum végén álló pont után nem kezdődik új mondat. */
const ABBREV = /(^|[\s(„"])(Dr|Prof|Ifj|Id|Kft|Zrt|Bt|Nyrt|pl|stb|kb|ún|u|sz|hó|[\p{Lu}]|\d+)\.$/u;

function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  const re = /[.!?]\s+(?=[\p{Lu}„“("])/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const end = m.index + 1;
    const piece = text.slice(start, end);
    if (ABBREV.test(piece)) continue;
    out.push(piece);
    start = end + (m[0].length - 1);
  }
  out.push(text.slice(start));
  return out.filter((p) => p.length > 0);
}

const MAX_DEPTH = 8;
const CACHE = new Map<string, string>();

function applyRules(text: string, depth: number): string | null {
  for (const p of TEMPLATE_RULES) {
    const m = p.re.exec(text);
    if (m) return p.to(m, depth);
  }
  for (const p of PATTERNS) {
    const m = p.re.exec(text);
    if (m) return p.to(m);
  }
  return null;
}

/** Trimmelt szöveg fordítása; ha nincs találat, változatlanul tér vissza. */
function core(text: string, depth: number): string {
  if (!text) return text;
  const direct = DICT[text];
  if (direct !== undefined) return direct;
  if (depth > MAX_DEPTH) return text;
  const cached = CACHE.get(text);
  if (cached !== undefined) return cached;
  const out = coreUncached(text, depth);
  if (CACHE.size > 20000) CACHE.clear();
  CACHE.set(text, out);
  return out;
}

function coreUncached(text: string, depth: number): string {
  const next = depth + 1;

  // 1. teljes szövegre illő minta vagy sablon (a befogott részek rekurzívan fordulnak)
  const ruled = applyRules(text, next);
  if (ruled !== null) return ruled;

  // 2. több mondat – mondatonként külön fordul
  const sentences = splitSentences(text);
  if (sentences.length > 1) {
    const mapped = sentences.map((sen) => core(sen, next));
    if (mapped.some((m, i) => m !== sentences[i])) return mapped.join(" ");
  }

  // 3. elválasztókkal összefűzött darabok – minden darab önállóan fordul
  for (const sep of SEPARATORS) {
    if (text.includes(sep)) {
      const parts = text.split(sep);
      const mapped = parts.map((part) => {
        const t = part.trim();
        const out = t ? core(t, next) : t;
        return out !== t ? part.replace(t, () => out) : part;
      });
      if (mapped.some((m, i) => m !== parts[i]!)) return mapped.join(sep);
    }
  }

  // 4. bevezető jel (·, –, sorszám), zárójel, „Címke: érték", záró írásjel
  const lead = LEADING.exec(text);
  if (lead) {
    const inner = core(lead[2]!, next);
    if (inner !== lead[2]) return `${lead[1]} ${inner}`;
  }
  for (const [re, open, close] of WRAPPED) {
    const m = re.exec(text);
    if (m) {
      const inner = core(m[1]!, next);
      if (inner !== m[1]) return `${open}${inner}${close}`;
    }
  }
  const tailParen = /^([\s\S]+?) \(([^()]+)\)$/.exec(text);
  if (tailParen) {
    const a = core(tailParen[1]!, next);
    const b = core(tailParen[2]!, next);
    if (a !== tailParen[1] || b !== tailParen[2]) return `${a} (${b})`;
  }
  const trail = /^([\s\S]*?)([.:!?…]+)$/.exec(text);
  if (trail && trail[1]) {
    const inner = core(trail[1], next);
    if (inner !== trail[1]) return inner + trail[2]!;
  }

  const labelled = /^([^:\n]{2,60}): ([\s\S]+)$/.exec(text);
  if (labelled && !/\d$/.test(labelled[1]!)) {
    const l = core(labelled[1]!, next);
    const v = core(labelled[2]!, next);
    if (l !== labelled[1] || v !== labelled[2]) return `${l}: ${v}`;
  }
  // 5. mondatba ágyazott ismert kifejezések
  let phrased = text;
  for (const [re, en] of PHRASES) phrased = phrased.replace(re, en);
  return phrased;
}

export function translate(text: string, lang: Lang): string {
  if (lang === "hu") return text;
  const trimmed = text.trim();
  if (!trimmed) return text;
  const out = core(trimmed, 0);
  return out === trimmed ? text : text.replace(trimmed, () => out);
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
