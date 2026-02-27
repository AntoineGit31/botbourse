// ─── Asset types ───

export type AssetType = "stock" | "etf";
export type Region = "US" | "Europe" | "World" | "Asia";
export type Sector =
  | "Technology"
  | "Healthcare"
  | "Finance"
  | "Energy"
  | "Consumer"
  | "Industrials"
  | "Materials"
  | "Utilities"
  | "Real Estate"
  | "Communication"
  | "Diversified";

export interface Asset {
  ticker: string;
  name: string;
  assetType: AssetType;
  exchange: string;
  sector: Sector;
  region: Region;
  currency: string;
  price: number;
  change: number;       // absolute change
  changePercent: number; // percentage change
  // Stock-specific
  marketCap?: number;
  peRatio?: number;
  dividendYield?: number;
  volume?: number;
  // ETF-specific
  indexTracked?: string;
  ter?: number;
  domicile?: string;
  etfCategory?: string;
  // AI summary
  aiProfile?: string;
  aiOpportunities?: string;
  aiRisks?: string;
}

// ─── Prediction types ───

export type Horizon = "short" | "medium" | "long";
export type TrendLabel = "bullish" | "neutral" | "bearish";
export type ConfidenceLevel = "low" | "medium" | "high";

export interface Prediction {
  ticker: string;
  name: string;
  assetType: AssetType;
  sector: Sector;
  region: Region;
  horizon: Horizon;
  expectedReturn: number;      // e.g. 0.042 = +4.2%
  riskScore: 1 | 2 | 3 | 4 | 5;
  confidence: number;          // 0 to 1
  confidenceLevel: ConfidenceLevel;
  trendLabel: TrendLabel;
  modelVersion?: string;
  predictedAt?: string;         // ISO date
}

// ─── Watchlist ───

export interface WatchlistItem {
  ticker: string;
  name: string;
  horizon: Horizon;
  signalPrimary: string;
  signalSecondary?: string;
  explanation: string;
  detectedAt?: string;
}

// ─── Index data ───

export interface MarketIndex {
  name: string;
  ticker: string;
  value: number;
  change: number;
  changePercent: number;
}

// ─── OHLC data for charts ───

export interface OHLCData {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}
