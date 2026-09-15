import { describe, expect, test } from "bun:test";
import { translate } from "../i18n/language";

const en = (s: string) => translate(s, "en");

describe("angol fordítás – összetett, futásidőben képzett szövegek", () => {
  test("magyar módban változatlan", () => {
    expect(translate("Vissza", "hu")).toBe("Vissza");
  });

  test("rövid felületi szavak", () => {
    expect(en("Vissza")).toBe("Back");
    expect(en("Igen")).toBe("Yes");
    expect(en("Nem")).toBe("No");
    expect(en("Folyamat")).toBe("Process");
  });

  test("pénznem, darabszám, napok csak számmal", () => {
    expect(en("690 000 Ft")).toBe("690 000 HUF");
    expect(en("67.2 M Ft")).toBe("67.2 M HUF");
    expect(en("690 eFt keret")).toBe("690 kHUF budget");
    expect(en("Dell Latitude 5540 (2023) · 1 db")).toBe("Dell Latitude 5540 (2023) · 1 pc");
    expect(en("Kijelző igénylés – Dell P2725H (2 db)")).toBe(
      "Display request – Dell P2725H (2 pcs)",
    );
    expect(en("0 nap")).toBe("0 days");
  });

  test("sablon az egész szövegre, elválasztókkal és mondatokkal", () => {
    expect(
      en(
        "Dell Latitude 5540 (2023): a beszerzés elindult – szállító: Keretszerződéses Szállító Kft., rendelésszám: PO-2026-0900, várható érkezés: 2026. október 13.",
      ),
    ).toBe(
      "Dell Latitude 5540 (2023): procurement started – supplier: Keretszerződéses Szállító Kft., order number: PO-2026-0900, expected arrival: 13 October 2026",
    );
    expect(
      en(
        "Lejárt: 21 munkanapja. Mióta vár: 26 munkanap (2026. augusztus 7. óta) · Határidő: 2026. augusztus 14.",
      ),
    ).toBe(
      "Overdue by 21 working days. Waiting for: 26 working days (since 7 August 2026) · Deadline: 14 August 2026",
    );
    expect(en("Teendő: Átvétel visszaigazolása és ügy lezárása · határidő 2026-08-26")).toBe(
      "To do: Confirm receipt and close the case · due 2026-08-26",
    );
    expect(en("Az igényt átvettük, jelenlegi állapot: Beszerzési tervsor összeállítása.")).toBe(
      "We have received the request, current status: Compiling the procurement plan item.",
    );
  });

  test("felhasználói szabad szöveg (adat) érintetlen marad", () => {
    const note = "Pályázati forrásból pótolható, a csere nem halasztható.";
    expect(en(`${note} (helyettesként, Prof. Dr. Vajkai G. helyett)`)).toBe(
      `${note} (as substitute, on behalf of Prof. Dr. Vajkai G.)`,
    );
  });

  test("bevezető jel és sorszám", () => {
    expect(en("· IT besorolás")).toBe("· IT classification");
    expect(en("– folyamatban")).toBe("– in progress");
    expect(en("Döntésre vár: 1. Szervezeti jóváhagyó – Dr. Rédei T.")).toBe(
      "Awaiting decision: 1. Organizational approver – Dr. Rédei T.",
    );
  });
});
