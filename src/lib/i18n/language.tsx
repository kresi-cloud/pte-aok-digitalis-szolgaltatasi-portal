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
];

export function translate(text: string, lang: Lang): string {
  if (lang === "hu") return text;
  const raw = text;
  const trimmed = raw.trim();
  if (!trimmed) return raw;
  const direct = DICT[trimmed];
  if (direct !== undefined) return raw.replace(trimmed, direct);

  // composite strings joined by common separators
  for (const sep of SEPARATORS) {
    if (trimmed.includes(sep)) {
      const parts = trimmed.split(sep);
      const mapped = parts.map((p) => DICT[p.trim()] ?? p.trim());
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
