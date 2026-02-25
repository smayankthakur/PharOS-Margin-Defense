import { describe, expect, it } from "vitest";

import {
  deadStockValue,
  mapBreachImpact,
  mrpBreachImpact,
  severityFromImpact,
  undercutImpact,
} from "../src/pricing";

describe("pricing engine", () => {
  it("breach cases", () => {
    expect(mapBreachImpact(100, 80, 2)).toBe(40);
    expect(mrpBreachImpact(120, 100, 1)).toBe(20);
    expect(undercutImpact(90, 80, 10)).toBe(100);
    expect(deadStockValue(55, 3)).toBe(165);
  });

  it("no breach returns zero", () => {
    expect(mapBreachImpact(100, 100, 2)).toBe(0);
    expect(mrpBreachImpact(120, 150, 2)).toBe(0);
    expect(undercutImpact(90, 95, 10)).toBe(0);
  });

  it("rounding is deterministic", () => {
    expect(mapBreachImpact(100.1, 99.99, 3)).toBe(0.33);
    expect(undercutImpact(101.005, 100.5, 7)).toBe(3.53);
  });

  it("severity mapping", () => {
    expect(severityFromImpact(999.99)).toBe("LOW");
    expect(severityFromImpact(1000)).toBe("MED");
    expect(severityFromImpact(9999.99)).toBe("MED");
    expect(severityFromImpact(10000)).toBe("HIGH");
  });
});
