# BotBourse — Implementation Plan

## 0. Project Identity

| Key | Value |
|---|---|
| **Name** | BotBourse |
| **Tagline** | "Model-driven market views for stocks & ETFs" |
| **Tone** | Informational, cautious, data-grounded — never advisory |
| **Stack** | Next.js 14+ (App Router) / TypeScript / Tailwind v4 / Supabase (Postgres) / Python (model pipeline) |
| **Deploy** | Vercel (frontend + API routes) · Supabase (DB + Auth) · Railway or Render (Python jobs) |

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      VERCEL                             │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Next.js App (App Router)                         │  │
│  │  ├── /market          → Market Overview page      │  │
│  │  ├── /asset/[ticker]  → Asset Detail page         │  │
│  │  ├── /predictions     → AI Predictions Dashboard  │  │
│  │  └── /api/*           → API Routes (thin layer)   │  │
│  └─────────────────┬─────────────────────────────────┘  │
│                    │ queries                             │
└────────────────────┼────────────────────────────────────┘
                     ▼
          ┌─────────────────────┐
          │  SUPABASE (Postgres) │
          │  ├── assets          │
          │  ├── daily_prices    │
          │  ├── predictions     │
          │  ├── risk_scores     │
          │  ├── ai_watchlist    │
          │  └── model_metadata  │
          └─────────┬───────────┘
                    ▲ writes
          ┌─────────┴───────────┐
          │  PYTHON PIPELINE    │
          │  (Railway / Render) │
          │  ├── data_fetcher   │  ← Market Data API (Twelve Data / Polygon)
          │  ├── feature_eng    │
          │  ├── model_train    │
          │  ├── model_predict  │
          │  └── db_writer      │
          └─────────────────────┘
              Runs: daily cron
```

### Data Flow (daily cycle)

1. **05:00 UTC** — Python `data_fetcher` pulls latest OHLC + fundamentals from market API.
2. **05:15 UTC** — `feature_eng` computes technical indicators, rolling stats, sector aggregates.
3. **05:30 UTC** — `model_predict` runs trained models, outputs predictions per asset × horizon.
4. **05:45 UTC** — `db_writer` upserts results into `predictions`, `risk_scores`, `ai_watchlist`.
5. **On-demand** — Next.js API routes query Supabase, frontend renders ranked lists.

---

## 2. Database Schema (Supabase / Postgres)

### 2.1 `assets`
```sql
CREATE TABLE assets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker        TEXT UNIQUE NOT NULL,        -- e.g. "AAPL", "IWDA.AS"
  name          TEXT NOT NULL,
  asset_type    TEXT NOT NULL CHECK (asset_type IN ('stock', 'etf')),
  exchange      TEXT,                        -- e.g. "NASDAQ", "Euronext"
  sector        TEXT,                        -- e.g. "Technology", "Healthcare"
  region        TEXT,                        -- e.g. "US", "Europe", "World"
  currency      TEXT DEFAULT 'USD',
  -- Stock-specific
  market_cap    BIGINT,
  pe_ratio      NUMERIC(10,2),
  dividend_yield NUMERIC(6,4),
  -- ETF-specific
  index_tracked TEXT,                        -- e.g. "MSCI World"
  ter           NUMERIC(6,4),               -- Total Expense Ratio
  domicile      TEXT,                        -- e.g. "Ireland", "Luxembourg"
  etf_category  TEXT,                        -- e.g. "Equity World", "Sector Tech"
  -- AI summary (precomputed)
  ai_profile    TEXT,                        -- 2-3 sentence profile
  ai_opportunities TEXT,                     -- Key drivers
  ai_risks      TEXT,                        -- Key risks
  -- Metadata
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_assets_type ON assets(asset_type);
CREATE INDEX idx_assets_region ON assets(region);
CREATE INDEX idx_assets_sector ON assets(sector);
```

### 2.2 `daily_prices`
```sql
CREATE TABLE daily_prices (
  id        BIGSERIAL PRIMARY KEY,
  ticker    TEXT NOT NULL REFERENCES assets(ticker),
  date      DATE NOT NULL,
  open      NUMERIC(12,4),
  high      NUMERIC(12,4),
  low       NUMERIC(12,4),
  close     NUMERIC(12,4),
  volume    BIGINT,
  UNIQUE(ticker, date)
);
CREATE INDEX idx_prices_ticker_date ON daily_prices(ticker, date DESC);
```

### 2.3 `predictions`
```sql
CREATE TABLE predictions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker          TEXT NOT NULL REFERENCES assets(ticker),
  horizon         TEXT NOT NULL CHECK (horizon IN ('short', 'medium', 'long')),
  -- short = ~30 days, medium = ~12 months, long = ~3-5 years
  expected_return NUMERIC(8,4),              -- e.g. 0.042 = +4.2%
  risk_score      SMALLINT CHECK (risk_score BETWEEN 1 AND 5),
  confidence      NUMERIC(4,2) CHECK (confidence BETWEEN 0 AND 1),
  trend_label     TEXT CHECK (trend_label IN ('bullish', 'neutral', 'bearish')),
  -- Ranking helpers
  opportunity_rank INT,                      -- rank within horizon+filters
  -- Metadata
  model_version   TEXT,
  predicted_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ticker, horizon, predicted_at::date)
);
CREATE INDEX idx_pred_horizon ON predictions(horizon, opportunity_rank);
CREATE INDEX idx_pred_ticker ON predictions(ticker);
```

### 2.4 `ai_watchlist`
```sql
CREATE TABLE ai_watchlist (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker          TEXT NOT NULL REFERENCES assets(ticker),
  horizon         TEXT NOT NULL,
  signal_primary  TEXT NOT NULL,              -- e.g. "Volatility regime shift"
  signal_secondary TEXT,                      -- e.g. "Sector rotation detected"
  explanation     TEXT,                       -- 1-2 sentence AI-generated note
  detected_at     TIMESTAMPTZ DEFAULT now()
);
```

### 2.5 `model_metadata`
```sql
CREATE TABLE model_metadata (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version   TEXT NOT NULL,
  horizon         TEXT NOT NULL,
  trained_at      TIMESTAMPTZ,
  backtest_sharpe NUMERIC(6,3),
  backtest_mae    NUMERIC(6,4),
  feature_set     JSONB,                     -- list of features used
  notes           TEXT
);
```

---

## 3. Market Data API Selection

### Recommended: **Twelve Data** (primary) + **Yahoo Finance** (fallback/enrichment)

| Criteria | Twelve Data | Alpha Vantage | Polygon |
|---|---|---|---|
| Free tier | 800 req/day, 8/min | 25 req/day (very limited) | 5 req/min, limited history |
| OHLC history | 30+ years | Good | Excellent but paid |
| Fundamentals | Yes (P/E, market cap, etc.) | Limited | Stocks only, paid |
| ETF data | Basic | Very limited | Limited |
| European stocks | Yes | Partial | US-focused |
| Price | Free → $29/mo starter | Free → $49/mo | Free → $29/mo |

**Recommendation:** Start with **Twelve Data free tier** for daily batch fetching. Supplement with `yfinance` Python library (free, no key) for bulk historical data and ETF metadata. Upgrade Twelve Data when you need intraday or higher rate limits.

**Why not Finnhub?** Good for news/sentiment later, but weaker on historical OHLC depth and ETF-specific data.

---

## 4. Modeling Strategy

### 4.1 Short-term (~30 days): Momentum + Mean-Reversion Classifier

**Approach:** Gradient Boosting (LightGBM) classification model.

| Component | Detail |
|---|---|
| **Target** | Sign of 30-day forward return (positive / negative / flat) — 3-class |
| **Features** | RSI(14), MACD signal, 5/20/50 MA crossovers, 20-day rolling vol, 5-day return, volume ratio (5d/20d avg), sector relative strength |
| **Expected return** | Mean 30-day return of assets in the same predicted class (from historical data) |
| **Risk score** | Composite of: 20-day annualized vol (40%), max drawdown last 60 days (30%), beta to benchmark (30%) |
| **Confidence** | Model's predicted probability for the winning class. Bucketed: <0.45 = low, 0.45–0.65 = medium, >0.65 = high |
| **Realism** | Short-term prediction is inherently noisy. Expect ~55–58% directional accuracy at best. Present as "model lean", not certainty. |

**Training:** Walk-forward validation. Retrain monthly on expanding window of last 3–5 years. ~500 assets × 1,000 trading days = manageable dataset.

### 4.2 Medium-term (~12 months): Factor-Based Regression

**Approach:** LightGBM regression on 12-month forward return.

| Component | Detail |
|---|---|
| **Target** | 12-month forward log-return (continuous) |
| **Features** | Trailing 12m momentum, trailing 3m momentum, P/E ratio, dividend yield, earnings growth (if available), sector z-score, 1Y rolling vol, market cap bucket |
| **Risk score** | Same composite formula, but using 1Y vol window and 1Y max drawdown |
| **Confidence** | Based on prediction interval width from quantile regression. Narrow interval = high confidence. |
| **Realism** | Factor investing has decades of academic support (momentum, value, quality). Accuracy will be moderate but the ranking should have some signal. |

**Training:** Annual retrain. Cross-sectional model (predict across all assets at each point in time). Use purged k-fold to avoid lookahead.

### 4.3 Long-term (~3–5 years): Fundamental Heuristic + Simple Model

**Approach:** Rule-based scoring + lightweight regression.

| Component | Detail |
|---|---|
| **Scoring factors** | Sector long-term growth estimates (macro), valuation (P/E relative to sector median), dividend history, diversification (for ETFs: region breadth, # holdings) |
| **Method** | Weighted composite score, not a complex ML model — long-term prediction with ML on limited data is unreliable. Be honest about this. |
| **Confidence** | Always "low" or "medium" — long-term is inherently speculative. Label it as "structural view" rather than prediction. |
| **Realism** | This is more of an "informed perspective" than a prediction. Frame it accordingly. |

### 4.4 Watchlist Detection (Regime Signals)

| Signal | Detection Method |
|---|---|
| **Volatility regime shift** | GARCH(1,1) conditional variance > 2× its 60-day average |
| **Trend reversal candidate** | Price crosses 200-day MA while RSI is in extreme zone (>70 or <30) |
| **Sector rotation** | Asset's sector return diverges >2σ from market return over trailing 20 days |
| **Volume anomaly** | 5-day avg volume > 3× 60-day avg volume |

These are simple, interpretable signals. The "AI" labeling comes from the automated detection and ranking — no complex NLP needed at this stage.

### 4.5 Honest Uncertainty Framing

**Critical principle:** The model will be wrong often. Frame everything as:

- "The model's current estimate" (not "prediction")
- Show confidence level prominently
- Include a persistent disclaimer bar
- Use language like: *"Based on historical patterns and quantitative signals. Not investment advice."*

---

## 5. API Routes (Next.js App Router)

```
/api/market/indices          → GET  → Key index data (S&P 500, CAC 40, etc.)
/api/market/overview         → GET  → Paginated asset list with filters
/api/market/movers           → GET  → Top gainers / losers today

/api/asset/[ticker]          → GET  → Full asset detail + latest predictions
/api/asset/[ticker]/prices   → GET  → Historical OHLC (query: period=1M|6M|1Y|5Y)

/api/predictions             → GET  → Ranked predictions (query: horizon, region, sector, type)
/api/predictions/watchlist   → GET  → AI watchlist items

/api/meta/disclaimer         → GET  → Legal disclaimer text
/api/meta/model-info         → GET  → Current model version + last update timestamp
```

All routes are thin layers querying Supabase via the `@supabase/supabase-js` client.

---

## 6. Frontend Design (Mapped to SKILL.md)

### 6.1 Global Design Tokens

| Token | Value | SKILL.md Rule |
|---|---|---|
| **Font stack** | `Geist` (headers) + `Geist Mono` (numbers/data) | Rule 1: Anti-Slop, Technical UI |
| **Base palette** | Zinc-950 background, Zinc-900 surfaces, Zinc-100 text | Rule 2: Neutral base |
| **Accent** | Emerald-500 (`#10b981`) — single accent | Rule 2: Max 1 accent, <80% sat |
| **Negative accent** | Rose-500 (`#f43f5e`) — for losses/bearish | Functional color, not decorative |
| **Layout** | Asymmetric grids, left-aligned hero, fractional columns | Rule 3 + Variance 8 |
| **Shadows** | Tinted to zinc hue, diffusion style | Rule 4 |
| **Motion** | `transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1)`, staggered load-ins | Motion 6 |
| **Borders** | `border-white/10` + inner shadow for glass panels | Section 4: Liquid Glass |
| **Icons** | `@phosphor-icons/react` exclusively, strokeWidth 1.5 | Section 2: Anti-Emoji |
| **Full-height** | `min-h-[100dvh]` | Viewport Stability |
| **Grids** | CSS Grid with fractional units | Grid over Flex-Math |
| **Mobile** | Single column `w-full px-4 py-8` below 768px | Mobile Override |

### 6.2 Page: `/` (Landing / Home)

**Layout:** Split-screen hero (text left 60%, live data ticker right 40%).

- Left: Large `text-4xl md:text-6xl tracking-tighter` headline: *"Quantitative market views. Updated daily."*
- Subline in `text-base text-zinc-400 leading-relaxed max-w-[65ch]`
- Two CTAs: "View Predictions" (primary, emerald) and "Browse Markets" (ghost)
- Right: Animated mini-preview of the predictions dashboard (staggered reveal of 3-4 asset rows)
- Bottom: Persistent disclaimer bar in `text-xs text-zinc-500`

### 6.3 Page: `/market` (Market Overview)

**Layout:**
```
┌─────────────────────────────────────────────┐
│  Indices Bar (horizontal scroll)            │
│  [S&P 500 +0.4%] [CAC 40 -0.2%] [...]      │
├──────────────────────┬──────────────────────┤
│  Filter Bar          │                      │
│  [Region ▾] [Type ▾] [Sector ▾] [Search]   │
├──────────────────────┴──────────────────────┤
│                                             │
│  Asset Table (asymmetric grid)              │
│  ┌─────────────────────────────────────┐    │
│  │ Ticker  Name    Price  Change  Sect │    │
│  │ AAPL    Apple   $182   +1.2%   Tech │    │
│  │ ...                                 │    │
│  └─────────────────────────────────────┘    │
│                                             │
├─────────────────────────────────────────────┤
│  2-col zig-zag: Top Gainers │ Top Losers    │
└─────────────────────────────────────────────┘
```

- **Indices bar:** Horizontal scroll strip with live index cards (no 3-equal cards — use a horizontal carousel instead)
- **Asset table:** Clean `divide-y` rows, no card wrappers per Rule 4. Monospace for all numbers.
- **Top Gainers / Losers:** 2-column asymmetric layout (60/40 split), not 3-equal cards.
- **States:** Skeleton shimmer during load, composed empty state if filters yield 0 results, inline error banners.

### 6.4 Page: `/asset/[ticker]` (Asset Detail)

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  Breadcrumb: Market › AAPL                      │
├───────────────────────────┬─────────────────────┤
│  LEFT (65%)               │  RIGHT (35%)        │
│                           │                     │
│  Asset Name + Ticker      │  Model Signals Box  │
│  Price + Change           │  ┌───────────────┐  │
│                           │  │ Short: +2.1%  │  │
│  ┌─────────────────────┐  │  │ Medium: +8.4% │  │
│  │  Price Chart         │  │  │ Long: +6.2%/y │  │
│  │  [1D][1W][1M][1Y]   │  │  │ Risk: ●●●○○  │  │
│  └─────────────────────┘  │  │ Conf: Medium  │  │
│                           │  └───────────────┘  │
│  Key Metrics (grid)       │                     │
│  ┌────┬────┬────┬────┐    │  AI Summary Panel   │
│  │MCap│ P/E│Vol │Div │    │  (frosted glass)    │
│  └────┴────┴────┴────┘    │                     │
├───────────────────────────┴─────────────────────┤
│  Disclaimer bar                                 │
└─────────────────────────────────────────────────┘
```

- **Chart:** Lightweight charting library (e.g. `lightweight-charts` by TradingView — free, performant, SSR-friendly).
- **Model Signals:** Frosted glass panel with `backdrop-blur-xl` + `border-white/10` + inner shadow.
- **Metrics:** `border-t` separated blocks, not individual cards.
- **AI Summary:** Structured as Profile / Opportunities / Risks with `divide-y` separators.

### 6.5 Page: `/predictions` (Core AI Dashboard)

**This is the star page.** Layout inspired by a "command center" aesthetic.

```
┌─────────────────────────────────────────────────────────┐
│  HEADER: "Model Room" + Last updated timestamp          │
│  Persistent disclaimer strip                            │
├─────────────────────────────────────────────────────────┤
│  FILTER BAR                                             │
│  [Short ● Medium ○ Long ○]  [Region ▾] [Type ▾] [Sect] │
├──────────────────────────────┬──────────────────────────┤
│  TOP OPPORTUNITIES (65%)     │  AI WATCHLIST (35%)      │
│                              │                          │
│  Ranked list, staggered      │  Frosted glass panel     │
│  reveal on load:             │                          │
│                              │  ┌────────────────────┐  │
│  1. MSFT  +4.2% (30d)       │  │ TSLA               │  │
│     Risk: ●●○○○  Conf: High │  │ "Vol regime shift"  │  │
│     Bullish                  │  │ Short-term          │  │
│                              │  ├────────────────────┤  │
│  2. ASML  +3.8% (30d)       │  │ LVMH               │  │
│     Risk: ●●●○○  Conf: Med  │  │ "Sector rotation"   │  │
│     Bullish                  │  │ Medium-term         │  │
│                              │  └────────────────────┘  │
│  3. ...                      │                          │
│                              │                          │
├──────────────────────────────┴──────────────────────────┤
│  ELEVATED RISK / HEADWINDS                              │
│  (2-column asymmetric layout, 55/45)                    │
│                                                         │
│  Assets with expected negative outlook                  │
│  Similar structure to Top Opportunities but             │
│  rose-tinted accents, bearish labels                    │
├─────────────────────────────────────────────────────────┤
│  Model Transparency Bar                                 │
│  "Model v0.2 · Trained on 5Y data · Last run: today"   │
│  [Learn how the model works →]                          │
└─────────────────────────────────────────────────────────┘
```

**Key UX decisions:**
- **No chat.** Structured, ranked, scannable.
- Horizon selector uses segmented control (not dropdown) — always visible.
- Top Opportunities list uses staggered fade-in (`animation-delay: calc(var(--index) * 80ms)`).
- Each row is clickable → navigates to `/asset/[ticker]`.
- Watchlist panel uses Liquid Glass treatment.
- "Elevated Risk" section uses `border-t` separation (not separate card), rose accent for bearish items.
- Model transparency footer builds trust.

---

## 7. Regulatory Safeguards (Built into UI)

### 7.1 Persistent Disclaimer Strip
Every page includes a sticky, subtle bar:
> *"BotBourse provides model-generated market analysis for informational purposes only. This is not investment advice. Past performance and model estimates do not guarantee future results."*

### 7.2 Language Rules (enforced in all AI-generated text)

| Do | Don't |
|---|---|
| "The model estimates..." | "You should buy..." |
| "Historical patterns suggest..." | "This stock will..." |
| "According to quantitative signals..." | "Guaranteed return of..." |
| "Risk factors include..." | "Safe investment" |
| "Expected return (model estimate)" | "Predicted profit" |

### 7.3 Legal Page (`/legal`)
- Full disclaimer of non-advisory nature
- Explanation of model methodology (high-level)
- AMF/MiFID compliance note: *"This platform does not constitute a regulated investment service under MiFID II or AMF guidelines."*
- Data source attribution

---

## 8. Phased Build Order

### Phase 1: Foundation (Week 1–2)
- [ ] Initialize Next.js project with TypeScript + Tailwind v4
- [ ] Set up Supabase project, create database tables
- [ ] Install and configure: `@phosphor-icons/react`, `geist` font, `framer-motion`
- [ ] Build global layout: Nav, Footer, Disclaimer strip, Dark theme
- [ ] Build `/market` page with mock data (indices bar, asset table, gainers/losers)
- [ ] Build `/asset/[ticker]` page with mock data (chart placeholder, metrics, signals box)

### Phase 2: Data Pipeline (Week 2–3)
- [ ] Python project: `data_fetcher` using `yfinance` + Twelve Data
- [ ] Fetch and store OHLC history for ~200 assets (top US + EU stocks + major ETFs)
- [ ] Populate `assets` table with metadata
- [ ] Build `feature_eng` module: technical indicators, rolling stats
- [ ] Connect Next.js API routes to Supabase (replace mock data)

### Phase 3: Models (Week 3–5)
- [ ] Train short-term LightGBM classifier (30-day directional)
- [ ] Train medium-term LightGBM regressor (12-month return)
- [ ] Build long-term scoring heuristic
- [ ] Implement risk score computation
- [ ] Implement confidence calibration
- [ ] Build watchlist signal detection (GARCH, MA cross, volume anomaly)
- [ ] Write `model_predict` + `db_writer` pipeline
- [ ] Set up daily cron job (Railway / Render)

### Phase 4: Predictions Dashboard (Week 5–6)
- [ ] Build `/predictions` page with live data
- [ ] Implement filter bar (horizon, region, sector, type)
- [ ] Build Top Opportunities ranked list
- [ ] Build Elevated Risk section
- [ ] Build AI Watchlist panel
- [ ] Add model transparency footer
- [ ] Polish: staggered animations, skeleton loaders, error states

### Phase 5: Polish & Deploy (Week 6–7)
- [ ] Responsive mobile layouts (single column collapse)
- [ ] SEO: meta tags, Open Graph, sitemap
- [ ] Legal page with full disclaimers
- [ ] Performance audit (Lighthouse, bundle size)
- [ ] Deploy to Vercel
- [ ] Set up monitoring (error tracking, uptime)

### Phase 6: Enhancements (Post-MVP)
- [ ] User accounts + personal watchlists (Supabase Auth)
- [ ] News/sentiment integration (Finnhub or NewsAPI)
- [ ] Backtesting transparency page ("How the model performed historically")
- [ ] Crypto extension
- [ ] Email alerts for watchlist signals

---

## 9. File Structure (Next.js Project)

```
botbourse/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (nav, footer, disclaimer)
│   │   ├── page.tsx                # Landing page
│   │   ├── market/
│   │   │   └── page.tsx            # Market Overview
│   │   ├── asset/
│   │   │   └── [ticker]/
│   │   │       └── page.tsx        # Asset Detail
│   │   ├── predictions/
│   │   │   └── page.tsx            # AI Predictions Dashboard
│   │   ├── legal/
│   │   │   └── page.tsx            # Legal / Disclaimer
│   │   └── api/
│   │       ├── market/
│   │       │   ├── indices/route.ts
│   │       │   ├── overview/route.ts
│   │       │   └── movers/route.ts
│   │       ├── asset/
│   │       │   └── [ticker]/
│   │       │       ├── route.ts
│   │       │       └── prices/route.ts
│   │       └── predictions/
│   │           ├── route.ts
│   │           └── watchlist/route.ts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── DisclaimerStrip.tsx
│   │   ├── market/
│   │   │   ├── IndicesBar.tsx
│   │   │   ├── AssetTable.tsx
│   │   │   └── MoversPanel.tsx
│   │   ├── asset/
│   │   │   ├── PriceChart.tsx       # 'use client' — TradingView lightweight-charts
│   │   │   ├── MetricsGrid.tsx
│   │   │   ├── ModelSignals.tsx
│   │   │   └── AiSummary.tsx
│   │   ├── predictions/
│   │   │   ├── FilterBar.tsx        # 'use client'
│   │   │   ├── OpportunitiesList.tsx
│   │   │   ├── RiskList.tsx
│   │   │   ├── WatchlistPanel.tsx
│   │   │   └── ModelFooter.tsx
│   │   └── ui/
│   │       ├── Badge.tsx
│   │       ├── RiskDots.tsx
│   │       ├── TrendLabel.tsx
│   │       ├── SkeletonRow.tsx
│   │       ├── EmptyState.tsx
│   │       └── GlassPanel.tsx
│   ├── lib/
│   │   ├── supabase.ts             # Supabase client
│   │   ├── types.ts                # TypeScript interfaces
│   │   └── constants.ts            # Filter options, horizons, etc.
│   └── styles/
│       └── globals.css             # Tailwind directives + custom properties
├── python/                          # Separate Python project
│   ├── fetcher/
│   ├── features/
│   ├── models/
│   ├── pipeline.py
│   └── requirements.txt
├── tailwind.config.ts
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## 10. Key Technical Decisions & Rationale

| Decision | Rationale |
|---|---|
| **Supabase over raw Postgres** | Free tier is generous (500MB, 50K rows). Built-in Row Level Security if we add auth later. JS client integrates cleanly with Next.js. |
| **Batch predictions, not real-time** | Daily predictions are sufficient for the horizons (30d/12m/5y). Avoids complexity of real-time ML inference. Frontend just reads pre-computed rows. |
| **LightGBM over deep learning** | Tabular data, limited rows (~500 assets × ~1000 days). Gradient boosting dominates tabular. Fast to train, easy to deploy. |
| **lightweight-charts over Recharts** | TradingView's library is purpose-built for financial charts. Candlestick, volume, time axis are native. 40KB gzipped. |
| **Server Components by default** | Most pages are data display. Only interactive bits (chart, filter bar, magnetic buttons) are client components. Better performance, SEO. |
| **No auth in MVP** | Reduces complexity. Add Supabase Auth in Phase 6 for personal watchlists. |
| **Dark theme only (initially)** | Financial dashboards are overwhelmingly dark-themed. Zinc-950 base aligns with SKILL.md's neutral palette. Avoids maintaining two themes in MVP. |
