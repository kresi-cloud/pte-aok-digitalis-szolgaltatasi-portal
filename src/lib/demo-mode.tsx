import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { DEMO_DATE, DEMO_FLAG_KEY, DEMO_FLAG_VALUE, isDemoClock, setDemoClock } from "./clock";

/**
 * Vezetőségi demómód. A `?demo=leadership` query paraméterrel kapcsolható be,
 * és a böngésző tárolójában marad aktív, amíg a felhasználó ki nem lép belőle.
 */

interface DemoModeValue {
  demo: boolean;
  demoDate: string;
  enterDemo: () => void;
  exitDemo: () => void;
}

const DemoModeContext = createContext<DemoModeValue | null>(null);

function readInitial(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("demo");
    if (fromUrl === DEMO_FLAG_VALUE) {
      window.localStorage.setItem(DEMO_FLAG_KEY, DEMO_FLAG_VALUE);
      return true;
    }
    return window.localStorage.getItem(DEMO_FLAG_KEY) === DEMO_FLAG_VALUE;
  } catch {
    return isDemoClock();
  }
}

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [demo, setDemo] = useState<boolean>(() => {
    const on = readInitial();
    setDemoClock(on);
    return on;
  });

  const enterDemo = useCallback(() => {
    try {
      window.localStorage.setItem(DEMO_FLAG_KEY, DEMO_FLAG_VALUE);
    } catch {
      /* tárolóhiba nem akadályozhatja a demót */
    }
    setDemoClock(true);
    setDemo(true);
  }, []);

  const exitDemo = useCallback(() => {
    try {
      window.localStorage.removeItem(DEMO_FLAG_KEY);
    } catch {
      /* tárolóhiba nem akadályozhatja a kilépést */
    }
    setDemoClock(false);
    setDemo(false);
  }, []);

  const value = useMemo(
    () => ({ demo, demoDate: DEMO_DATE, enterDemo, exitDemo }),
    [demo, enterDemo, exitDemo],
  );

  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode(): DemoModeValue {
  return (
    useContext(DemoModeContext) ?? {
      demo: false,
      demoDate: DEMO_DATE,
      enterDemo: () => {},
      exitDemo: () => {},
    }
  );
}
