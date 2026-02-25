import type { Severity } from "./schemas";

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function mapBreachImpact(map: number, soldPrice: number, qty: number): number {
  return round2(Math.max(0, (map - soldPrice) * qty));
}

export function mrpBreachImpact(mrp: number, soldPrice: number, qty: number): number {
  return round2(Math.max(0, (mrp - soldPrice) * qty));
}

export function undercutImpact(targetPrice: number, competitorPrice: number, forecastQty = 10): number {
  return round2(Math.max(0, (targetPrice - competitorPrice) * forecastQty));
}

export function deadStockValue(cost: number, onHandQty: number): number {
  return round2(Math.max(0, cost * onHandQty));
}

// Deterministic thresholds: LOW < 1000, MED 1000-9999.99, HIGH >= 10000
export function severityFromImpact(impact: number): Severity {
  if (impact < 1000) return "LOW";
  if (impact < 10000) return "MED";
  return "HIGH";
}
