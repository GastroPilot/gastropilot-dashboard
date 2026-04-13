import { describe, expect, it } from "vitest";
import { resolveFinanceRange } from "@/lib/finance/date-range";

describe("resolveFinanceRange", () => {
  const referenceDate = new Date("2026-04-11T10:00:00.000Z");

  it("returns a 30 day window for preset 30d", () => {
    const range = resolveFinanceRange({ preset: "30d" }, referenceDate);

    expect(range.fromDate).toBe("2026-03-13");
    expect(range.toDate).toBe("2026-04-11");
    expect(range.fromIso).toBe("2026-03-13T00:00:00Z");
    expect(range.toIso).toBe("2026-04-11T23:59:59Z");
  });

  it("uses custom dates when preset is custom", () => {
    const range = resolveFinanceRange(
      {
        preset: "custom",
        customStartDate: "2026-02-01",
        customEndDate: "2026-02-05",
      },
      referenceDate
    );

    expect(range.fromDate).toBe("2026-02-01");
    expect(range.toDate).toBe("2026-02-05");
  });

  it("swaps custom range when start is after end", () => {
    const range = resolveFinanceRange(
      {
        preset: "custom",
        customStartDate: "2026-04-10",
        customEndDate: "2026-04-01",
      },
      referenceDate
    );

    expect(range.fromDate).toBe("2026-04-01");
    expect(range.toDate).toBe("2026-04-10");
  });
});
