import { describe, expect, it } from "vitest";
import {
  deadStockValue,
  mapBreachImpact,
  mrpBreachImpact,
  severityFromImpact,
  undercutImpact,
} from "../src/math";

describe("pricing math", () => {
  it("handles breach cases", () => {
    expect(mapBreachImpact(100, 90, 5)).toBe(50);
    expect(mrpBreachImpact(120, 100, 2)).toBe(40);
    expect(undercutImpact(150, 100, 10)).toBe(500);
    expect(deadStockValue(25, 10)).toBe(250);
  });

  it("handles no-breach cases", () => {
    expect(mapBreachImpact(100, 100, 5)).toBe(0);
    expect(mrpBreachImpact(120, 130, 2)).toBe(0);
    expect(undercutImpact(100, 110, 10)).toBe(0);
  });

  it("rounds to 2 decimals", () => {
    expect(mapBreachImpact(100.11, 99.99, 3)).toBe(0.36);
    expect(undercutImpact(100.5, 99.995, 7)).toBe(3.53);
  });

  it("maps severity from impact", () => {
    expect(severityFromImpact(999.99)).toBe("LOW");
    expect(severityFromImpact(1000)).toBe("MED");
    expect(severityFromImpact(9999)).toBe("MED");
    expect(severityFromImpact(10000)).toBe("HIGH");
  });
});
