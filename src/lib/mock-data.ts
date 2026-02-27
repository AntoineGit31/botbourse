import type {
    Asset,
    MarketIndex,
    Prediction,
    WatchlistItem,
    OHLCData,
} from "./types";

// ─── Market Indices ───

export const MOCK_INDICES: MarketIndex[] = [
    { name: "S&P 500", ticker: "SPX", value: 5987.32, change: 23.47, changePercent: 0.39 },
    { name: "NASDAQ", ticker: "IXIC", value: 19234.81, change: -42.13, changePercent: -0.22 },
    { name: "CAC 40", ticker: "FCHI", value: 7891.64, change: 34.12, changePercent: 0.43 },
    { name: "DAX", ticker: "GDAXI", value: 22413.50, change: 112.30, changePercent: 0.50 },
    { name: "MSCI World", ticker: "MXWO", value: 3412.78, change: 8.92, changePercent: 0.26 },
    { name: "Euro Stoxx 50", ticker: "SX5E", value: 5234.19, change: -12.87, changePercent: -0.25 },
    { name: "FTSE 100", ticker: "UKX", value: 8612.43, change: 19.78, changePercent: 0.23 },
    { name: "Nikkei 225", ticker: "N225", value: 38921.67, change: -187.32, changePercent: -0.48 },
];

// ─── Assets (Stocks + ETFs) ───

export const MOCK_ASSETS: Asset[] = [
    // US Stocks
    {
        ticker: "AAPL", name: "Apple Inc.", assetType: "stock", exchange: "NASDAQ",
        sector: "Technology", region: "US", currency: "USD",
        price: 182.34, change: 2.18, changePercent: 1.21,
        marketCap: 2830000000000, peRatio: 28.4, dividendYield: 0.0055, volume: 54200000,
        aiProfile: "Apple designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories. The company also provides a growing suite of digital services including the App Store, Apple Music, iCloud, and Apple Pay.",
        aiOpportunities: "Services segment continues to grow as a high-margin revenue stream. Strong ecosystem lock-in and brand loyalty. Expanding presence in emerging markets with localized offerings.",
        aiRisks: "Heavy dependence on iPhone revenue (~52% of total). Supply chain concentration in Greater China. Regulatory pressure on App Store fees in the EU and globally.",
    },
    {
        ticker: "MSFT", name: "Microsoft Corp.", assetType: "stock", exchange: "NASDAQ",
        sector: "Technology", region: "US", currency: "USD",
        price: 415.62, change: 5.34, changePercent: 1.30,
        marketCap: 3090000000000, peRatio: 34.2, dividendYield: 0.0072, volume: 23100000,
        aiProfile: "Microsoft develops and licenses software, cloud infrastructure (Azure), productivity tools (Office 365), and enterprise solutions. The company has expanded aggressively into AI services and gaming.",
        aiOpportunities: "Azure cloud growth remains strong with AI workload adoption. Copilot integration across Office suite drives enterprise upselling. Gaming division benefits from Activision Blizzard acquisition.",
        aiRisks: "Premium valuation assumes sustained high growth. Increasing capital expenditure on AI infrastructure. Competitive pressure from AWS and Google Cloud.",
    },
    {
        ticker: "NVDA", name: "NVIDIA Corp.", assetType: "stock", exchange: "NASDAQ",
        sector: "Technology", region: "US", currency: "USD",
        price: 876.43, change: -12.87, changePercent: -1.45,
        marketCap: 2160000000000, peRatio: 62.1, dividendYield: 0.0002, volume: 38900000,
        aiProfile: "NVIDIA designs GPUs and system-on-chip units for gaming, professional visualization, data centers, and automotive markets. The company has become the dominant supplier of AI training and inference hardware.",
        aiOpportunities: "Data center revenue driven by enterprise AI adoption. CUDA ecosystem creates a deep competitive moat. Networking segment (Mellanox) supports end-to-end AI infrastructure sales.",
        aiRisks: "Extremely elevated valuation with high expectations priced in. Customer concentration risk — major hyperscalers could develop in-house chips. Export restrictions to China impact addressable market.",
    },
    {
        ticker: "AMZN", name: "Amazon.com Inc.", assetType: "stock", exchange: "NASDAQ",
        sector: "Consumer", region: "US", currency: "USD",
        price: 198.73, change: 3.42, changePercent: 1.75,
        marketCap: 2050000000000, peRatio: 58.9, dividendYield: 0, volume: 47800000,
        aiProfile: "Amazon operates in e-commerce, cloud computing (AWS), digital advertising, and consumer electronics. AWS remains the primary profit engine while the retail segment focuses on efficiency improvements.",
        aiOpportunities: "AWS margin expansion through higher-value AI services. Advertising segment approaching $50B run rate. Logistics network efficiency improving operating margins.",
        aiRisks: "Retail margins remain thin despite improvements. Regulatory scrutiny on marketplace practices. Heavy ongoing capex for fulfillment and data centers.",
    },
    {
        ticker: "JPM", name: "JPMorgan Chase & Co.", assetType: "stock", exchange: "NYSE",
        sector: "Finance", region: "US", currency: "USD",
        price: 213.87, change: -1.23, changePercent: -0.57,
        marketCap: 614000000000, peRatio: 12.1, dividendYield: 0.0214, volume: 8700000,
        aiProfile: "JPMorgan Chase is the largest US bank by assets, providing investment banking, commercial banking, asset management, and consumer financial services globally.",
        aiOpportunities: "Net interest income benefits from elevated rate environment. Investment banking pipeline recovering from 2023 lows. Strong capital position allows continued buybacks.",
        aiRisks: "Credit quality deterioration in commercial real estate exposure. Fee revenue sensitive to market volatility. Regulatory capital requirements may tighten further.",
    },
    {
        ticker: "JNJ", name: "Johnson & Johnson", assetType: "stock", exchange: "NYSE",
        sector: "Healthcare", region: "US", currency: "USD",
        price: 157.92, change: 0.84, changePercent: 0.53,
        marketCap: 380000000000, peRatio: 16.8, dividendYield: 0.0298, volume: 6200000,
        aiProfile: "Johnson & Johnson is a diversified healthcare company operating in pharmaceuticals and medical devices following the Kenvue consumer health spin-off.",
        aiOpportunities: "Pharmaceutical pipeline focused on immunology and oncology. MedTech segment benefits from surgical procedure volume recovery. Dividend aristocrat status attracts income investors.",
        aiRisks: "Patent cliff on key drugs (Stelara) in coming years. Ongoing talc litigation liability. Generic competition in established pharmaceutical portfolio.",
    },
    {
        ticker: "XOM", name: "Exxon Mobil Corp.", assetType: "stock", exchange: "NYSE",
        sector: "Energy", region: "US", currency: "USD",
        price: 104.28, change: -2.31, changePercent: -2.17,
        marketCap: 438000000000, peRatio: 13.2, dividendYield: 0.0342, volume: 14300000,
        aiProfile: "ExxonMobil is an integrated oil and gas company involved in exploration, production, refining, and chemical manufacturing. The Pioneer Natural Resources acquisition expanded its Permian Basin position.",
        aiOpportunities: "Low-cost Permian Basin production provides margin resilience. Strong free cash flow supports dividends and buybacks. Carbon capture and hydrogen projects position for energy transition.",
        aiRisks: "Earnings highly sensitive to crude oil and natural gas prices. Long-term demand uncertainty from electrification trends. ESG-related divestment pressure from institutional investors.",
    },
    // European Stocks
    {
        ticker: "ASML", name: "ASML Holding NV", assetType: "stock", exchange: "Euronext",
        sector: "Technology", region: "Europe", currency: "EUR",
        price: 712.30, change: 8.45, changePercent: 1.20,
        marketCap: 280000000000, peRatio: 38.7, dividendYield: 0.0068, volume: 1800000,
        aiProfile: "ASML is the sole manufacturer of extreme ultraviolet (EUV) lithography systems essential for producing advanced semiconductor chips. The company holds a monopoly position in this critical technology.",
        aiOpportunities: "EUV monopoly ensures pricing power and order book visibility. Rising chip complexity drives demand for newer High-NA EUV systems. Semiconductor capex cycle remains supportive through 2026.",
        aiRisks: "Geopolitical risks — export restrictions to China reduce addressable market. High customer concentration (TSMC, Samsung, Intel). Cyclicality of semiconductor capital equipment spending.",
    },
    {
        ticker: "MC.PA", name: "LVMH Moet Hennessy", assetType: "stock", exchange: "Euronext",
        sector: "Consumer", region: "Europe", currency: "EUR",
        price: 698.50, change: -14.20, changePercent: -1.99,
        marketCap: 349000000000, peRatio: 22.5, dividendYield: 0.0178, volume: 920000,
        aiProfile: "LVMH is the global leader in luxury goods, operating 75+ prestigious brands across fashion (Louis Vuitton, Dior), wines & spirits (Hennessy, Moet), and selective retailing (Sephora).",
        aiOpportunities: "Aspirational demand in emerging middle class markets. Brand portfolio diversification reduces single-brand risk. Pricing power in luxury segment remains robust.",
        aiRisks: "Consumer spending slowdown in China and US impacts top-tier luxury. Currency headwinds from strong EUR. Succession planning for long-serving leadership.",
    },
    {
        ticker: "SAP", name: "SAP SE", assetType: "stock", exchange: "XETRA",
        sector: "Technology", region: "Europe", currency: "EUR",
        price: 236.40, change: 3.87, changePercent: 1.66,
        marketCap: 290000000000, peRatio: 42.3, dividendYield: 0.0089, volume: 3400000,
        aiProfile: "SAP is the leading enterprise software company in Europe, providing ERP, supply chain management, and business analytics solutions. The company is in the midst of a cloud-first transformation.",
        aiOpportunities: "Cloud revenue growth accelerating as customers migrate from on-premise. AI integration into business processes (Joule copilot). High switching costs create durable revenue base.",
        aiRisks: "Cloud transition dilutes margins in the short term. Competition from Salesforce, Oracle, and Workday in specific verticals. Large restructuring program impacts near-term profitability.",
    },
    // ETFs
    {
        ticker: "IWDA.AS", name: "iShares Core MSCI World", assetType: "etf", exchange: "Euronext",
        sector: "Diversified", region: "World", currency: "EUR",
        price: 89.42, change: 0.34, changePercent: 0.38,
        indexTracked: "MSCI World", ter: 0.0020, domicile: "Ireland", etfCategory: "Equity World",
        aiProfile: "Tracks the MSCI World Index, providing broad exposure to large and mid-cap equities across 23 developed markets. Holds approximately 1,500 constituents with heavy US weighting (~70%).",
        aiOpportunities: "Low-cost core portfolio building block. Broad diversification reduces single-stock risk. Automatic rebalancing captures market-cap weighted growth.",
        aiRisks: "Heavy concentration in US equities and technology sector. No emerging market exposure. Currency risk for EUR-based investors (underlying assets predominantly USD-denominated).",
    },
    {
        ticker: "VUSA.AS", name: "Vanguard S&P 500", assetType: "etf", exchange: "Euronext",
        sector: "Diversified", region: "US", currency: "EUR",
        price: 96.78, change: 0.41, changePercent: 0.43,
        indexTracked: "S&P 500", ter: 0.0007, domicile: "Ireland", etfCategory: "Equity US Large Cap",
        aiProfile: "Replicates the S&P 500 Index, the benchmark for US large-cap equity performance. Extremely low cost with full physical replication of all 500 constituents.",
        aiOpportunities: "Lowest TER among European-domiciled S&P 500 ETFs. Full US large-cap exposure in a single position. High liquidity and tight bid-ask spreads.",
        aiRisks: "Concentrated in US market only. Top-heavy — top 10 holdings represent ~35% of the index. No currency hedging for EUR investors.",
    },
    {
        ticker: "EIMI.AS", name: "iShares Core MSCI EM", assetType: "etf", exchange: "Euronext",
        sector: "Diversified", region: "Asia", currency: "EUR",
        price: 28.34, change: -0.42, changePercent: -1.46,
        indexTracked: "MSCI Emerging Markets IMI", ter: 0.0018, domicile: "Ireland", etfCategory: "Equity Emerging Markets",
        aiProfile: "Provides broad exposure to large, mid, and small-cap equities across 24 emerging markets. Heavy weighting toward China (~25%), India (~20%), and Taiwan (~18%).",
        aiOpportunities: "Demographic tailwinds in India and Southeast Asia. Valuation discount relative to developed markets. Increasing domestic consumption in major emerging economies.",
        aiRisks: "Political and regulatory risk in China. Currency volatility in emerging market economies. Lower corporate governance standards relative to developed markets.",
    },
    {
        ticker: "PANW", name: "Palo Alto Networks", assetType: "stock", exchange: "NASDAQ",
        sector: "Technology", region: "US", currency: "USD",
        price: 187.92, change: 4.23, changePercent: 2.30,
        marketCap: 124000000000, peRatio: 48.6, dividendYield: 0, volume: 5100000,
        aiProfile: "Palo Alto Networks is a cybersecurity company providing next-generation firewalls, cloud security (Prisma), and security operations (Cortex) solutions to enterprises and governments.",
        aiOpportunities: "Platformization strategy driving multi-product adoption. Cybersecurity spending remains non-discretionary. AI-powered threat detection differentiates offerings.",
        aiRisks: "Elevated valuation relative to earnings. Free product bundling strategy pressures near-term revenue recognition. Intense competition from CrowdStrike, Fortinet, and Zscaler.",
    },
    {
        ticker: "NOVO-B.CO", name: "Novo Nordisk A/S", assetType: "stock", exchange: "OMX",
        sector: "Healthcare", region: "Europe", currency: "DKK",
        price: 742.80, change: -18.60, changePercent: -2.44,
        marketCap: 490000000000, peRatio: 35.2, dividendYield: 0.0112, volume: 3200000,
        aiProfile: "Novo Nordisk is a global healthcare company specializing in diabetes care and obesity treatment. The company leads the GLP-1 receptor agonist market with Ozempic and Wegovy.",
        aiOpportunities: "Obesity market estimated to reach $100B+ by 2030. Wegovy supply expansion underway. Pipeline includes next-generation oral GLP-1 and amycretin (dual-action).",
        aiRisks: "Competitive pressure from Eli Lilly (Mounjaro/Zepbound) and emerging entrants. Manufacturing capacity constraints limit near-term growth. Political scrutiny on drug pricing in US market.",
    },
];

// ─── Predictions ───

export const MOCK_PREDICTIONS: Prediction[] = [
    // Short-term opportunities
    { ticker: "MSFT", name: "Microsoft Corp.", assetType: "stock", sector: "Technology", region: "US", horizon: "short", expectedReturn: 0.042, riskScore: 2, confidence: 0.72, confidenceLevel: "high", trendLabel: "bullish", modelVersion: "v0.1-alpha", predictedAt: "2026-02-25" },
    { ticker: "ASML", name: "ASML Holding NV", assetType: "stock", sector: "Technology", region: "Europe", horizon: "short", expectedReturn: 0.038, riskScore: 3, confidence: 0.64, confidenceLevel: "medium", trendLabel: "bullish", modelVersion: "v0.1-alpha", predictedAt: "2026-02-25" },
    { ticker: "PANW", name: "Palo Alto Networks", assetType: "stock", sector: "Technology", region: "US", horizon: "short", expectedReturn: 0.035, riskScore: 3, confidence: 0.61, confidenceLevel: "medium", trendLabel: "bullish", modelVersion: "v0.1-alpha", predictedAt: "2026-02-25" },
    { ticker: "JPM", name: "JPMorgan Chase & Co.", assetType: "stock", sector: "Finance", region: "US", horizon: "short", expectedReturn: 0.028, riskScore: 2, confidence: 0.68, confidenceLevel: "high", trendLabel: "bullish", modelVersion: "v0.1-alpha", predictedAt: "2026-02-25" },
    { ticker: "VUSA.AS", name: "Vanguard S&P 500", assetType: "etf", sector: "Diversified", region: "US", horizon: "short", expectedReturn: 0.022, riskScore: 1, confidence: 0.74, confidenceLevel: "high", trendLabel: "bullish", modelVersion: "v0.1-alpha", predictedAt: "2026-02-25" },
    { ticker: "SAP", name: "SAP SE", assetType: "stock", sector: "Technology", region: "Europe", horizon: "short", expectedReturn: 0.019, riskScore: 2, confidence: 0.58, confidenceLevel: "medium", trendLabel: "bullish", modelVersion: "v0.1-alpha", predictedAt: "2026-02-25" },
    // Short-term risks
    { ticker: "NVDA", name: "NVIDIA Corp.", assetType: "stock", sector: "Technology", region: "US", horizon: "short", expectedReturn: -0.031, riskScore: 4, confidence: 0.56, confidenceLevel: "medium", trendLabel: "bearish", modelVersion: "v0.1-alpha", predictedAt: "2026-02-25" },
    { ticker: "NOVO-B.CO", name: "Novo Nordisk A/S", assetType: "stock", sector: "Healthcare", region: "Europe", horizon: "short", expectedReturn: -0.048, riskScore: 4, confidence: 0.52, confidenceLevel: "medium", trendLabel: "bearish", modelVersion: "v0.1-alpha", predictedAt: "2026-02-25" },
    { ticker: "MC.PA", name: "LVMH Moet Hennessy", assetType: "stock", sector: "Consumer", region: "Europe", horizon: "short", expectedReturn: -0.027, riskScore: 3, confidence: 0.49, confidenceLevel: "low", trendLabel: "bearish", modelVersion: "v0.1-alpha", predictedAt: "2026-02-25" },
    { ticker: "EIMI.AS", name: "iShares Core MSCI EM", assetType: "etf", sector: "Diversified", region: "Asia", horizon: "short", expectedReturn: -0.019, riskScore: 4, confidence: 0.44, confidenceLevel: "low", trendLabel: "bearish", modelVersion: "v0.1-alpha", predictedAt: "2026-02-25" },
    // Medium-term
    { ticker: "AAPL", name: "Apple Inc.", assetType: "stock", sector: "Technology", region: "US", horizon: "medium", expectedReturn: 0.125, riskScore: 2, confidence: 0.61, confidenceLevel: "medium", trendLabel: "bullish", modelVersion: "v0.1-alpha", predictedAt: "2026-02-25" },
    { ticker: "IWDA.AS", name: "iShares Core MSCI World", assetType: "etf", sector: "Diversified", region: "World", horizon: "medium", expectedReturn: 0.089, riskScore: 1, confidence: 0.68, confidenceLevel: "high", trendLabel: "bullish", modelVersion: "v0.1-alpha", predictedAt: "2026-02-25" },
    { ticker: "MSFT", name: "Microsoft Corp.", assetType: "stock", sector: "Technology", region: "US", horizon: "medium", expectedReturn: 0.145, riskScore: 2, confidence: 0.65, confidenceLevel: "high", trendLabel: "bullish", modelVersion: "v0.1-alpha", predictedAt: "2026-02-25" },
    { ticker: "ASML", name: "ASML Holding NV", assetType: "stock", sector: "Technology", region: "Europe", horizon: "medium", expectedReturn: 0.112, riskScore: 3, confidence: 0.57, confidenceLevel: "medium", trendLabel: "bullish", modelVersion: "v0.1-alpha", predictedAt: "2026-02-25" },
    { ticker: "XOM", name: "Exxon Mobil Corp.", assetType: "stock", sector: "Energy", region: "US", horizon: "medium", expectedReturn: -0.082, riskScore: 4, confidence: 0.53, confidenceLevel: "medium", trendLabel: "bearish", modelVersion: "v0.1-alpha", predictedAt: "2026-02-25" },
    { ticker: "NVDA", name: "NVIDIA Corp.", assetType: "stock", sector: "Technology", region: "US", horizon: "medium", expectedReturn: 0.087, riskScore: 5, confidence: 0.42, confidenceLevel: "low", trendLabel: "neutral", modelVersion: "v0.1-alpha", predictedAt: "2026-02-25" },
    // Long-term
    { ticker: "IWDA.AS", name: "iShares Core MSCI World", assetType: "etf", sector: "Diversified", region: "World", horizon: "long", expectedReturn: 0.074, riskScore: 1, confidence: 0.71, confidenceLevel: "high", trendLabel: "bullish", modelVersion: "v0.1-alpha", predictedAt: "2026-02-25" },
    { ticker: "MSFT", name: "Microsoft Corp.", assetType: "stock", sector: "Technology", region: "US", horizon: "long", expectedReturn: 0.098, riskScore: 2, confidence: 0.58, confidenceLevel: "medium", trendLabel: "bullish", modelVersion: "v0.1-alpha", predictedAt: "2026-02-25" },
    { ticker: "VUSA.AS", name: "Vanguard S&P 500", assetType: "etf", sector: "Diversified", region: "US", horizon: "long", expectedReturn: 0.082, riskScore: 2, confidence: 0.65, confidenceLevel: "medium", trendLabel: "bullish", modelVersion: "v0.1-alpha", predictedAt: "2026-02-25" },
];

// ─── AI Watchlist ───

export const MOCK_WATCHLIST: WatchlistItem[] = [
    {
        ticker: "NVDA", name: "NVIDIA Corp.", horizon: "short",
        signalPrimary: "Volatility regime shift",
        signalSecondary: "Options implied vol +40% vs 20d avg",
        explanation: "Conditional variance from GARCH model exceeds 2x its 60-day average. Implied volatility surge suggests the market is pricing in a significant near-term move — direction uncertain.",
        detectedAt: "2026-02-25",
    },
    {
        ticker: "MC.PA", name: "LVMH Moet Hennessy", horizon: "medium",
        signalPrimary: "Sector rotation signal",
        signalSecondary: "European luxury underperforming vs consumer staples",
        explanation: "European luxury sector return has diverged more than 2 standard deviations from broad market over the trailing 20 sessions. Historical patterns suggest a potential mean-reversion or continuation depending on macro catalysts.",
        detectedAt: "2026-02-25",
    },
    {
        ticker: "XOM", name: "Exxon Mobil Corp.", horizon: "short",
        signalPrimary: "Volume anomaly detected",
        signalSecondary: "5d avg volume 3.2x above 60d average",
        explanation: "Unusual volume concentration without corresponding price breakout. This pattern historically precedes directional moves within 5-10 trading sessions.",
        detectedAt: "2026-02-24",
    },
    {
        ticker: "EIMI.AS", name: "iShares Core MSCI EM", horizon: "medium",
        signalPrimary: "Trend reversal candidate",
        signalSecondary: "Price approaching 200-day MA from below",
        explanation: "Price is within 1.2% of the 200-day moving average with RSI at 62 — neutral zone. A sustained break above could signal a medium-term trend change for emerging market equities.",
        detectedAt: "2026-02-25",
    },
];

// ─── Fake OHLC data generator ───

export function generateMockOHLC(days: number, basePrice: number): OHLCData[] {
    const data: OHLCData[] = [];
    let price = basePrice;
    const now = new Date();

    for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        const volatility = 0.015 + Math.random() * 0.01;
        const drift = (Math.random() - 0.48) * volatility;
        const open = price;
        const close = price * (1 + drift);
        const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
        const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);

        data.push({
            time: date.toISOString().split("T")[0],
            open: parseFloat(open.toFixed(2)),
            high: parseFloat(high.toFixed(2)),
            low: parseFloat(low.toFixed(2)),
            close: parseFloat(close.toFixed(2)),
            volume: Math.floor(10000000 + Math.random() * 50000000),
        });

        price = close;
    }

    return data;
}
