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

const PATTERNS: { re: RegExp; to: (m: RegExpExecArray) => string }[] = [
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
