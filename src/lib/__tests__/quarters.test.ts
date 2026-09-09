import { describe, expect, it } from "bun:test";
import { upcomingQuarters } from "../quarters";
import { requestedTimingLabel } from "../types";

describe("upcomingQuarters", () => {
  it("szeptemberi dátumnál a IV. negyedévvel kezdődik", () => {
    const qs = upcomingQuarters("2026-09-01");
    expect(qs.map((q) => q.value)).toEqual(["2026-Q4", "2027-Q1", "2027-Q2", "2027-Q3"]);
    expect(qs[0]!.label).toBe("2026. IV. negyedév");
    expect(qs[1]!.label).toBe("2027. I. negyedév");
  });

  it("év végén átlép a következő évre", () => {
    const qs = upcomingQuarters("2026-11-15");
    expect(qs.map((q) => q.value)).toEqual(["2027-Q1", "2027-Q2", "2027-Q3", "2027-Q4"]);
  });

  it("év elején a II. negyedévvel kezdődik", () => {
    const qs = upcomingQuarters("2027-02-10");
    expect(qs[0]!.value).toBe("2027-Q2");
  });
});

describe("requestedTimingLabel", () => {
  it("évszámos értéket formáz", () => {
    expect(requestedTimingLabel("2027-Q1")).toBe("2027. I. negyedév");
  });
  it("régi csupasz negyedévet is kezel", () => {
    expect(requestedTimingLabel("Q3")).toBe("III. negyedév");
  });
  it("azonnalit kezel", () => {
    expect(requestedTimingLabel("azonnali")).toContain("Azonnali");
  });
});
