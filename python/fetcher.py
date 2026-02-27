"""
BotBourse Data Fetcher

Fetches historical OHLC data and fundamental info from yfinance
for all assets in the universe. Outputs JSON files to public/data/.
"""

import json
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path

import yfinance as yf
import pandas as pd
import numpy as np

from config import (
    STOCKS, ETFS, INDICES, ALL_TICKERS,
    DATA_DIR, PRICES_DIR,
    HISTORY_PERIOD,
)


def fetch_asset_info(ticker: str, meta: dict, asset_type: str) -> dict:
    """Fetch fundamental data for a single asset from yfinance."""
    try:
        stock = yf.Ticker(ticker)
        info = stock.info or {}

        base = {
            "ticker": ticker,
            "name": meta.get("name", info.get("shortName", ticker)),
            "assetType": asset_type,
            "exchange": meta.get("exchange", info.get("exchange", "")),
            "sector": meta.get("sector", info.get("sector", "Diversified")),
            "region": meta.get("region", "US"),
            "currency": info.get("currency", "USD"),
            "price": info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose", 0),
            "change": info.get("regularMarketChange", 0) or 0,
            "changePercent": info.get("regularMarketChangePercent", 0) or 0,
        }

        if asset_type == "stock":
            base.update({
                "marketCap": info.get("marketCap"),
                "peRatio": _safe_round(info.get("trailingPE") or info.get("forwardPE")),
                "dividendYield": _safe_round(info.get("dividendYield"), 4),
                "volume": info.get("regularMarketVolume") or info.get("volume"),
            })
        else:  # ETF
            base.update({
                "indexTracked": meta.get("index_tracked", ""),
                "ter": meta.get("ter"),
                "domicile": meta.get("domicile", ""),
                "etfCategory": meta.get("category", ""),
            })

        return base

    except Exception as e:
        print(f"  [!] Error fetching info for {ticker}: {e}")
        # Return minimal fallback
        return {
            "ticker": ticker,
            "name": meta.get("name", ticker),
            "assetType": asset_type,
            "exchange": meta.get("exchange", ""),
            "sector": meta.get("sector", "Diversified"),
            "region": meta.get("region", "US"),
            "currency": "USD",
            "price": 0,
            "change": 0,
            "changePercent": 0,
        }


def fetch_prices(ticker: str, period: str = HISTORY_PERIOD) -> pd.DataFrame:
    """Fetch OHLC history for a single ticker."""
    try:
        stock = yf.Ticker(ticker)
        df = stock.history(period=period, auto_adjust=True)

        if df.empty:
            print(f"  [!] No price data for {ticker}")
            return pd.DataFrame()

        df = df.reset_index()
        df = df.rename(columns={
            "Date": "time",
            "Open": "open",
            "High": "high",
            "Low": "low",
            "Close": "close",
            "Volume": "volume",
        })

        # Ensure time is a string in YYYY-MM-DD
        df["time"] = pd.to_datetime(df["time"]).dt.strftime("%Y-%m-%d")

        return df[["time", "open", "high", "low", "close", "volume"]]

    except Exception as e:
        print(f"  [!] Error fetching prices for {ticker}: {e}")
        return pd.DataFrame()


def fetch_indices() -> list:
    """Fetch current values for major indices."""
    results = []
    for ticker, meta in INDICES.items():
        try:
            idx = yf.Ticker(ticker)
            info = idx.info or {}

            # Try multiple fields for price
            value = (
                info.get("regularMarketPrice")
                or info.get("previousClose")
                or 0
            )
            change = info.get("regularMarketChange", 0) or 0
            change_pct = info.get("regularMarketChangePercent", 0) or 0

            results.append({
                "name": meta["name"],
                "ticker": ticker.replace("^", ""),
                "value": round(value, 2),
                "change": round(change, 2),
                "changePercent": round(change_pct, 2),
            })
            time.sleep(0.3)

        except Exception as e:
            print(f"  [!] Error fetching index {ticker}: {e}")
            results.append({
                "name": meta["name"],
                "ticker": ticker.replace("^", ""),
                "value": 0,
                "change": 0,
                "changePercent": 0,
            })

    return results


def run_fetcher():
    """Main fetch pipeline."""
    timestamp = datetime.now(timezone.utc).isoformat()
    print(f"\n{'='*60}")
    print(f"  BotBourse Data Fetcher")
    print(f"  Started: {timestamp}")
    print(f"{'='*60}\n")

    # ── 1. Fetch indices ──
    print("[1/3] Fetching market indices...")
    indices = fetch_indices()
    _write_json(DATA_DIR / "indices.json", indices)
    print(f"  -> {len(indices)} indices saved\n")

    # ── 2. Fetch asset info ──
    print("[2/3] Fetching asset metadata...")
    assets = []

    for ticker, meta in STOCKS.items():
        print(f"  Fetching {ticker}...")
        asset = fetch_asset_info(ticker, meta, "stock")
        assets.append(asset)
        time.sleep(0.5)  # Rate limit

    for ticker, meta in ETFS.items():
        print(f"  Fetching {ticker}...")
        asset = fetch_asset_info(ticker, meta, "etf")
        assets.append(asset)
        time.sleep(0.5)

    _write_json(DATA_DIR / "assets.json", assets)
    print(f"  -> {len(assets)} assets saved\n")

    # ── 3. Fetch price history ──
    print("[3/3] Fetching price history (this may take a few minutes)...")
    success = 0
    errors = 0

    for ticker in ALL_TICKERS:
        print(f"  Fetching prices for {ticker}...", end=" ")
        df = fetch_prices(ticker)

        if not df.empty:
            # Save as JSON array
            safe_ticker = ticker.replace(".", "_").replace("^", "")
            records = df.round(4).to_dict(orient="records")
            _write_json(PRICES_DIR / f"{safe_ticker}.json", records)
            print(f"({len(records)} days)")
            success += 1
        else:
            print("SKIPPED")
            errors += 1

        time.sleep(0.5)  # Rate limit

    print(f"\n  -> {success} tickers fetched, {errors} errors")

    # ── Save metadata ──
    _write_json(DATA_DIR / "meta.json", {
        "lastFetchedAt": timestamp,
        "assetCount": len(assets),
        "indexCount": len(indices),
        "priceHistoryPeriod": HISTORY_PERIOD,
    })

    print(f"\n{'='*60}")
    print(f"  Data fetch complete!")
    print(f"  Output: {DATA_DIR}")
    print(f"{'='*60}\n")


# ─── Helpers ───

def _safe_round(value, decimals=2):
    """Safely round a value that might be None, Infinity, or NaN."""
    if value is None:
        return None
    try:
        f = float(value)
        if not np.isfinite(f):
            return None
        return round(f, decimals)
    except (ValueError, TypeError):
        return None


def _sanitize(obj):
    """Recursively replace Infinity/NaN with None in dicts and lists."""
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_sanitize(v) for v in obj]
    elif isinstance(obj, float):
        if not np.isfinite(obj):
            return None
        return obj
    return obj


def _write_json(path: Path, data):
    """Write data to a JSON file, sanitizing non-finite floats."""
    sanitized = _sanitize(data)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(sanitized, f, ensure_ascii=False, default=str)


if __name__ == "__main__":
    run_fetcher()
