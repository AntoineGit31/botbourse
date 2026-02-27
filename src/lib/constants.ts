import type { Horizon, Region, Sector, AssetType } from "./types";

export const HORIZONS: { value: Horizon; label: string; description: string }[] = [
    { value: "short", label: "Short-term", description: "~30 days — LightGBM classifier" },
    { value: "medium", label: "Medium-term", description: "~12 months — LightGBM regressor" },
    { value: "long", label: "Long-term", description: "~3 years — Heuristic scoring" },
];

export const REGIONS: { value: Region | "all"; label: string }[] = [
    { value: "all", label: "All Regions" },
    { value: "US", label: "United States" },
    { value: "Europe", label: "Europe" },
    { value: "World", label: "Global" },
    { value: "Asia", label: "Asia" },
];

export const SECTORS: { value: Sector | "all"; label: string }[] = [
    { value: "all", label: "All Sectors" },
    { value: "Technology", label: "Technology" },
    { value: "Healthcare", label: "Healthcare" },
    { value: "Finance", label: "Finance" },
    { value: "Energy", label: "Energy" },
    { value: "Consumer", label: "Consumer" },
    { value: "Industrials", label: "Industrials" },
    { value: "Materials", label: "Materials" },
    { value: "Utilities", label: "Utilities" },
    { value: "Communication", label: "Communication" },
    { value: "Diversified", label: "Diversified" },
];

export const ASSET_TYPES: { value: AssetType | "all"; label: string }[] = [
    { value: "all", label: "All Types" },
    { value: "stock", label: "Stocks" },
    { value: "etf", label: "ETFs" },
];

export const CHART_PERIODS = [
    { value: "1D", label: "1D" },
    { value: "1W", label: "1W" },
    { value: "1M", label: "1M" },
    { value: "6M", label: "6M" },
    { value: "1Y", label: "1Y" },
    { value: "5Y", label: "5Y" },
] as const;

export const DISCLAIMER_TEXT =
    "BotBourse provides model-generated market analysis for informational purposes only. This is not investment advice. Past performance and model estimates do not guarantee future results.";

export const MODEL_VERSION = "Model v1.0 — LightGBM";
