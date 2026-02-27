import type { ConfidenceLevel, Horizon } from "./types";

/**
 * Formats a number as a percentage with sign.
 * e.g. 0.042 → "+4.20%", -0.031 → "-3.10%"
 */
export function formatReturn(value: number): string {
    const pct = (value * 100).toFixed(2);
    return value >= 0 ? `+${pct}%` : `${pct}%`;
}

/**
 * Formats a number as a compact dollar/euro value.
 * e.g. 2830000000000 → "$2.83T"
 */
export function formatMarketCap(value: number): string {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
}

/**
 * Formats a price with appropriate decimal places.
 */
export function formatPrice(price: number, currency = "USD"): string {
    const symbol = currency === "EUR" ? "\u20AC" : currency === "DKK" ? "kr" : "$";
    return `${symbol}${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formats a change percentage for display.
 */
export function formatChangePercent(value: number): string {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
}

/**
 * Formats volume with compact notation.
 */
export function formatVolume(volume: number): string {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(0)}K`;
    return volume.toString();
}

/**
 * Returns the horizon display label with timeframe.
 */
export function getHorizonLabel(horizon: Horizon): string {
    switch (horizon) {
        case "short": return "30 days";
        case "medium": return "12 months";
        case "long": return "3-5 years (ann.)";
    }
}

/**
 * Returns the CSS variable name for a trend color.
 */
export function getTrendColor(trend: "bullish" | "neutral" | "bearish"): string {
    switch (trend) {
        case "bullish": return "var(--accent)";
        case "bearish": return "var(--negative)";
        case "neutral": return "var(--neutral-accent)";
    }
}

/**
 * Returns Tailwind classes for confidence level.
 */
export function getConfidenceDisplay(level: ConfidenceLevel): { label: string; className: string } {
    switch (level) {
        case "high":
            return { label: "High", className: "text-accent" };
        case "medium":
            return { label: "Medium", className: "text-secondary" };
        case "low":
            return { label: "Low", className: "text-muted" };
    }
}
