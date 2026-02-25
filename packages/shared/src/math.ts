import { Severity } from "./schemas";

export function mapBreachImpact(map: number, soldPrice: number, qty: number): number {
  if (soldPrice >= map) return 0;
  return round2(Math.max(0, (map - soldPrice) * qty));
}

export function mrpBreachImpact(mrp: number, soldPrice: number, qty: number): number {
  if (soldPrice >= mrp) return 0;
  return round2(Math.max(0, (mrp - soldPrice) * qty));
}

export function undercutImpact(targetPrice: number, competitorPrice: number, forecastQty = 10): number {
  if (competitorPrice >= targetPrice) return 0;
  return round2(Math.max(0, (targetPrice - competitorPrice) * forecastQty));
}

export function deadStockValue(cost: number, onHandQty: number): number {
  return round2(Math.max(0, cost * onHandQty));
}

export function severityFromImpact(impact: number): Severity {
  if (impact < 1000) return "LOW";
  if (impact < 10000) return "MED";
  return "HIGH";
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
