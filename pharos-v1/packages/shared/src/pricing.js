"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapBreachImpact = mapBreachImpact;
exports.mrpBreachImpact = mrpBreachImpact;
exports.undercutImpact = undercutImpact;
exports.deadStockValue = deadStockValue;
exports.severityFromImpact = severityFromImpact;
function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}
function mapBreachImpact(map, soldPrice, qty) {
    return round2(Math.max(0, (map - soldPrice) * qty));
}
function mrpBreachImpact(mrp, soldPrice, qty) {
    return round2(Math.max(0, (mrp - soldPrice) * qty));
}
function undercutImpact(targetPrice, competitorPrice, forecastQty = 10) {
    return round2(Math.max(0, (targetPrice - competitorPrice) * forecastQty));
}
function deadStockValue(cost, onHandQty) {
    return round2(Math.max(0, cost * onHandQty));
}
// Deterministic thresholds: LOW < 1000, MED 1000-9999.99, HIGH >= 10000
function severityFromImpact(impact) {
    if (impact < 1000)
        return "LOW";
    if (impact < 10000)
        return "MED";
    return "HIGH";
}
