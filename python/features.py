"""
BotBourse Feature Engineering

Computes technical indicators and rolling statistics from OHLC
price data. These features feed into the prediction models.
"""

import json
import math
from pathlib import Path

import pandas as pd
import numpy as np

try:
    import ta
    HAS_TA = True
except ImportError:
    HAS_TA = False
    print("[!] 'ta' library not found. Install with: pip install ta")

from config import ALL_TICKERS, PRICES_DIR, FEATURES_DIR, DATA_DIR


def compute_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute technical features from OHLC price data.
    Returns a DataFrame with the latest feature values.
    """
    if df.empty or len(df) < 50:
        return pd.DataFrame()

    df = df.copy()
    df["close"] = pd.to_numeric(df["close"], errors="coerce")
    df["high"] = pd.to_numeric(df["high"], errors="coerce")
    df["low"] = pd.to_numeric(df["low"], errors="coerce")
    df["volume"] = pd.to_numeric(df["volume"], errors="coerce")
    df = df.dropna(subset=["close"])

    if len(df) < 50:
        return pd.DataFrame()

    # ── Returns ──
    df["return_1d"] = df["close"].pct_change(1)
    df["return_5d"] = df["close"].pct_change(5)
    df["return_20d"] = df["close"].pct_change(20)
    df["return_60d"] = df["close"].pct_change(60)
    df["return_252d"] = df["close"].pct_change(252)

    # ── Moving Averages ──
    df["sma_20"] = df["close"].rolling(20).mean()
    df["sma_50"] = df["close"].rolling(50).mean()
    df["sma_200"] = df["close"].rolling(200).mean()
    df["ema_12"] = df["close"].ewm(span=12, adjust=False).mean()
    df["ema_26"] = df["close"].ewm(span=26, adjust=False).mean()

    # Price relative to moving averages
    df["price_vs_sma20"] = (df["close"] / df["sma_20"]) - 1
    df["price_vs_sma50"] = (df["close"] / df["sma_50"]) - 1
    df["price_vs_sma200"] = (df["close"] / df["sma_200"]) - 1

    # ── Volatility ──
    df["volatility_20d"] = df["return_1d"].rolling(20).std() * math.sqrt(252)
    df["volatility_60d"] = df["return_1d"].rolling(60).std() * math.sqrt(252)

    # ── Drawdown ──
    rolling_max = df["close"].cummax()
    df["drawdown"] = (df["close"] - rolling_max) / rolling_max

    # Max drawdown over last 252 days
    if len(df) >= 252:
        df["max_drawdown_1y"] = df["drawdown"].rolling(252).min()
    else:
        df["max_drawdown_1y"] = df["drawdown"].rolling(len(df)).min()

    # ── Volume features ──
    df["volume_sma_20"] = df["volume"].rolling(20).mean()
    df["volume_ratio"] = df["volume"] / df["volume_sma_20"]

    # ── Technical Indicators (using ta library) ──
    if HAS_TA:
        # RSI
        df["rsi_14"] = ta.momentum.rsi(df["close"], window=14)

        # MACD
        macd = ta.trend.MACD(df["close"])
        df["macd"] = macd.macd()
        df["macd_signal"] = macd.macd_signal()
        df["macd_histogram"] = macd.macd_diff()

        # Bollinger Bands
        bb = ta.volatility.BollingerBands(df["close"], window=20, window_dev=2)
        df["bb_upper"] = bb.bollinger_hband()
        df["bb_lower"] = bb.bollinger_lband()
        df["bb_width"] = (df["bb_upper"] - df["bb_lower"]) / df["close"]
        df["bb_position"] = (df["close"] - df["bb_lower"]) / (df["bb_upper"] - df["bb_lower"])

        # Stochastic
        stoch = ta.momentum.StochasticOscillator(df["high"], df["low"], df["close"])
        df["stoch_k"] = stoch.stoch()
        df["stoch_d"] = stoch.stoch_signal()

        # ADX
        adx = ta.trend.ADXIndicator(df["high"], df["low"], df["close"])
        df["adx"] = adx.adx()

        # ATR
        atr = ta.volatility.AverageTrueRange(df["high"], df["low"], df["close"])
        df["atr_14"] = atr.average_true_range()
    else:
        # Fallback: compute RSI manually
        delta = df["close"].diff()
        gain = delta.where(delta > 0, 0).rolling(14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
        rs = gain / loss
        df["rsi_14"] = 100 - (100 / (1 + rs))

        # MACD manual
        df["macd"] = df["ema_12"] - df["ema_26"]
        df["macd_signal"] = df["macd"].ewm(span=9, adjust=False).mean()
        df["macd_histogram"] = df["macd"] - df["macd_signal"]

    return df


def get_latest_features(df: pd.DataFrame) -> dict:
    """Extract the most recent feature values as a dict."""
    if df.empty:
        return {}

    latest = df.iloc[-1]
    result = {}

    feature_cols = [
        "return_1d", "return_5d", "return_20d", "return_60d", "return_252d",
        "sma_20", "sma_50", "sma_200",
        "price_vs_sma20", "price_vs_sma50", "price_vs_sma200",
        "volatility_20d", "volatility_60d",
        "drawdown", "max_drawdown_1y",
        "volume_ratio",
        "rsi_14", "macd", "macd_signal", "macd_histogram",
    ]

    # Add optional columns
    optional = [
        "bb_width", "bb_position", "stoch_k", "stoch_d", "adx", "atr_14"
    ]
    feature_cols.extend([c for c in optional if c in df.columns])

    for col in feature_cols:
        if col in latest.index:
            val = latest[col]
            if pd.isna(val):
                result[col] = None
            else:
                f = float(val)
                result[col] = round(f, 6) if np.isfinite(f) else None

    # Add metadata
    result["last_close"] = round(float(latest["close"]), 4)
    result["last_date"] = latest.get("time", "")

    return result


def derive_signals(features: dict, ticker: str) -> dict:
    """
    Derive simple model signals from features.
    Returns a dict with trend, risk, and confidence for each horizon.
    """
    signals = {}

    for horizon in ["short", "medium", "long"]:
        signal = _compute_horizon_signal(features, horizon)
        signal["ticker"] = ticker
        signals[horizon] = signal

    return signals


def _compute_horizon_signal(f: dict, horizon: str) -> dict:
    """Compute signal for a single horizon."""
    if not f:
        return {"trendLabel": "neutral", "expectedReturn": 0, "riskScore": 3, "confidence": 0.5, "confidenceLevel": "low"}

    rsi = f.get("rsi_14")
    macd_h = f.get("macd_histogram")
    price_vs_sma50 = f.get("price_vs_sma50")
    price_vs_sma200 = f.get("price_vs_sma200")
    vol_20 = f.get("volatility_20d")
    max_dd = f.get("max_drawdown_1y")
    ret_20d = f.get("return_20d")
    ret_60d = f.get("return_60d")
    ret_252d = f.get("return_252d")

    # ── Score computation ──
    score = 0.0
    confidence_inputs = 0
    total_weight = 0.0

    if horizon == "short":
        # Short-term: momentum + mean-reversion signals
        if rsi is not None:
            confidence_inputs += 1
            if rsi < 30:
                score += 1.5  # Oversold = opportunity
            elif rsi > 70:
                score -= 1.5  # Overbought = risk
            else:
                score += (50 - rsi) / 100

        if macd_h is not None:
            confidence_inputs += 1
            if macd_h > 0:
                score += 0.8
            else:
                score -= 0.8

        if ret_20d is not None:
            confidence_inputs += 1
            # Mild mean-reversion expectation
            if ret_20d > 0.10:
                score -= 0.5  # Overextended
            elif ret_20d < -0.10:
                score += 0.5  # Oversold bounce

        total_weight = 3.0

    elif horizon == "medium":
        # Medium-term: trend following
        if price_vs_sma50 is not None:
            confidence_inputs += 1
            score += np.clip(price_vs_sma50 * 5, -2, 2)

        if price_vs_sma200 is not None:
            confidence_inputs += 1
            score += np.clip(price_vs_sma200 * 3, -1.5, 1.5)

        if ret_60d is not None:
            confidence_inputs += 1
            score += np.clip(ret_60d * 4, -2, 2)

        total_weight = 4.0

    else:  # long
        # Long-term: structural view
        if price_vs_sma200 is not None:
            confidence_inputs += 1
            score += np.clip(price_vs_sma200 * 2, -1.5, 1.5)

        if ret_252d is not None:
            confidence_inputs += 1
            # Moderate momentum for long term
            score += np.clip(ret_252d * 2, -1.5, 1.5)

        total_weight = 3.0

    # ── Normalize score to expected return ──
    if total_weight > 0:
        normalized = score / total_weight
    else:
        normalized = 0.0

    # Map to expected return range
    if horizon == "short":
        expected_return = round(np.clip(normalized * 0.06, -0.08, 0.08), 4)
    elif horizon == "medium":
        expected_return = round(np.clip(normalized * 0.15, -0.25, 0.25), 4)
    else:
        expected_return = round(np.clip(normalized * 0.12, -0.15, 0.15), 4)

    # ── Trend label ──
    if expected_return > 0.005:
        trend = "bullish"
    elif expected_return < -0.005:
        trend = "bearish"
    else:
        trend = "neutral"

    # ── Risk score (1-5) ──
    risk_score = 3
    if vol_20 is not None:
        if vol_20 < 0.15:
            risk_score = 1
        elif vol_20 < 0.25:
            risk_score = 2
        elif vol_20 < 0.35:
            risk_score = 3
        elif vol_20 < 0.50:
            risk_score = 4
        else:
            risk_score = 5

    if max_dd is not None and max_dd < -0.30:
        risk_score = min(5, risk_score + 1)

    # ── Confidence ──
    confidence = min(1.0, confidence_inputs / 3.0) * 0.6 + 0.2
    if abs(normalized) > 0.5:
        confidence += 0.1  # Stronger signal = higher confidence
    confidence = round(min(1.0, confidence), 2)

    if confidence >= 0.65:
        confidence_level = "high"
    elif confidence >= 0.45:
        confidence_level = "medium"
    else:
        confidence_level = "low"

    return {
        "horizon": horizon,
        "expectedReturn": expected_return,
        "trendLabel": trend,
        "riskScore": risk_score,
        "confidence": confidence,
        "confidenceLevel": confidence_level,
    }


def run_features():
    """Main feature engineering pipeline."""
    from config import STOCKS, ETFS
    all_assets = {**STOCKS, **ETFS}

    print(f"\n{'='*60}")
    print(f"  BotBourse Feature Engineering")
    print(f"{'='*60}\n")

    all_predictions = []
    watchlist = []

    for ticker in ALL_TICKERS:
        safe_ticker = ticker.replace(".", "_").replace("^", "")
        price_file = PRICES_DIR / f"{safe_ticker}.json"

        if not price_file.exists():
            print(f"  [!] No price data for {ticker}, skipping")
            continue

        print(f"  Computing features for {ticker}...", end=" ")

        # Load price data
        with open(price_file, "r") as f:
            records = json.load(f)

        df = pd.DataFrame(records)
        if df.empty:
            print("EMPTY")
            continue

        # Compute features
        df_feat = compute_features(df)
        if df_feat.empty:
            print("INSUFFICIENT DATA")
            continue

        # Extract latest features
        latest = get_latest_features(df_feat)

        # Save features
        _write_json(FEATURES_DIR / f"{safe_ticker}.json", latest)

        # Derive signals
        signals = derive_signals(latest, ticker)
        meta = all_assets.get(ticker, {})

        for horizon, signal in signals.items():
            pred = {
                **signal,
                "name": meta.get("name", ticker),
                "sector": meta.get("sector", "Diversified"),
                "region": meta.get("region", "US"),
                "assetType": "etf" if ticker in ETFS else "stock",
            }
            all_predictions.append(pred)

        # Add to watchlist if interesting signal
        short_signal = signals.get("short", {})
        if abs(short_signal.get("expectedReturn", 0)) > 0.02:
            rsi = latest.get("rsi_14")
            macd_h = latest.get("macd_histogram")

            signal_text = _generate_signal_text(rsi, macd_h, short_signal)
            explanation = _generate_explanation(latest, short_signal)

            watchlist.append({
                "ticker": ticker,
                "name": meta.get("name", ticker),
                "horizon": "short",
                "signalPrimary": signal_text,
                "explanation": explanation,
                "addedAt": latest.get("last_date", ""),
            })

        print("OK")

    # Save predictions
    _write_json(DATA_DIR / "predictions.json", all_predictions)
    print(f"\n  -> {len(all_predictions)} predictions saved")

    # Save watchlist (top 8 most interesting signals)
    watchlist.sort(key=lambda w: abs(
        next((p["expectedReturn"] for p in all_predictions if p["ticker"] == w["ticker"] and p["horizon"] == "short"), 0)
    ), reverse=True)
    _write_json(DATA_DIR / "watchlist.json", watchlist[:8])
    print(f"  -> {len(watchlist[:8])} watchlist items saved")

    print(f"\n{'='*60}")
    print(f"  Feature engineering complete!")
    print(f"{'='*60}\n")


def _generate_signal_text(rsi, macd_h, signal):
    """Generate a human-readable signal label."""
    parts = []
    if rsi is not None:
        if rsi < 30:
            parts.append("RSI oversold")
        elif rsi > 70:
            parts.append("RSI overbought")

    if macd_h is not None:
        if macd_h > 0:
            parts.append("MACD bullish")
        else:
            parts.append("MACD bearish")

    if not parts:
        trend = signal.get("trendLabel", "neutral")
        parts.append(f"Momentum {trend}")

    return " + ".join(parts)


def _generate_explanation(features, signal):
    """Generate a brief explanation of the signal."""
    parts = []
    ret_20d = features.get("return_20d")
    vol = features.get("volatility_20d")

    if ret_20d is not None:
        direction = "gained" if ret_20d > 0 else "dropped"
        parts.append(f"Price has {direction} {abs(ret_20d)*100:.1f}% over 20 days")

    if vol is not None:
        if vol > 0.40:
            parts.append("with elevated volatility")
        elif vol < 0.15:
            parts.append("in a low-volatility environment")

    rsi = features.get("rsi_14")
    if rsi is not None:
        if rsi < 35:
            parts.append(f"RSI at {rsi:.0f} suggests oversold conditions")
        elif rsi > 65:
            parts.append(f"RSI at {rsi:.0f} suggests overbought conditions")

    return ". ".join(parts) + "." if parts else "Signal detected based on technical indicators."


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
    run_features()
