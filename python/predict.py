"""
BotBourse Model Predictor

Uses trained LightGBM models to generate predictions for all assets.
Replaces the heuristic-only signals from features.py with proper ML predictions.
"""

import json
import pickle
from pathlib import Path
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from scipy import stats

from config import ALL_TICKERS, STOCKS, ETFS, PRICES_DIR, FEATURES_DIR, DATA_DIR

MODELS_DIR = Path(__file__).parent / "models"

# Same feature columns as training
FEATURE_COLS = [
    "return_5d", "return_20d", "return_60d",
    "volatility_20d", "volatility_60d",
    "rsi_14", "macd_histogram",
    "price_vs_sma20", "price_vs_sma50", "price_vs_sma200",
    "bb_position", "bb_width",
    "stoch_k", "adx",
    "volume_ratio",
    "drawdown",
]


def load_models():
    """Load all trained models."""
    models = {}

    short_path = MODELS_DIR / "short_term.pkl"
    if short_path.exists():
        with open(short_path, "rb") as f:
            models["short"] = pickle.load(f)
        print("  Loaded short-term classifier")

    medium_path = MODELS_DIR / "medium_term.pkl"
    if medium_path.exists():
        with open(medium_path, "rb") as f:
            models["medium"] = pickle.load(f)
        print("  Loaded medium-term regressor")

    long_path = MODELS_DIR / "long_term.json"
    if long_path.exists():
        with open(long_path) as f:
            models["long"] = json.load(f)
        print("  Loaded long-term heuristic")

    return models


def get_latest_features_for_ticker(ticker: str) -> dict | None:
    """Load the latest computed features for a ticker."""
    safe_ticker = ticker.replace(".", "_").replace("^", "")
    feat_file = FEATURES_DIR / f"{safe_ticker}.json"

    if not feat_file.exists():
        return None

    with open(feat_file) as f:
        return json.load(f)


def predict_short_term(model_data: dict, features: dict) -> dict:
    """Generate short-term prediction using the classifier."""
    model = model_data["model"]

    # Build feature vector
    X = np.array([[features.get(col, 0) or 0 for col in FEATURE_COLS]])

    # Replace NaN/Inf
    X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)

    # Predict probabilities for 3 classes: [negative, neutral, positive]
    probs = model.predict(X)[0]

    # Expected return: weighted sum of class probabilities × typical class returns
    class_returns = [-0.04, 0.0, 0.04]  # negative, flat, positive
    expected_return = sum(p * r for p, r in zip(probs, class_returns))

    # Confidence from max probability
    max_prob = max(probs)
    predicted_class = int(np.argmax(probs))

    # Map to trend
    trend_map = {0: "bearish", 1: "neutral", 2: "bullish"}
    trend = trend_map[predicted_class]

    # Confidence calibration (probabilities from LightGBM tend to cluster around 0.33-0.5)
    if max_prob >= 0.50:
        confidence_level = "high"
        confidence = min(0.85, 0.5 + (max_prob - 0.50) * 2)
    elif max_prob >= 0.40:
        confidence_level = "medium"
        confidence = 0.4 + (max_prob - 0.40) * 1.5
    else:
        confidence_level = "low"
        confidence = max(0.2, max_prob * 0.8)

    return {
        "horizon": "short",
        "expectedReturn": round(float(np.clip(expected_return, -0.10, 0.10)), 4),
        "trendLabel": trend,
        "confidence": round(float(confidence), 2),
        "confidenceLevel": confidence_level,
        "probabilities": {
            "negative": round(float(probs[0]), 3),
            "neutral": round(float(probs[1]), 3),
            "positive": round(float(probs[2]), 3),
        },
    }


def predict_medium_term(model_data: dict, features: dict) -> dict:
    """Generate medium-term prediction using the regressor."""
    model = model_data["model"]

    X = np.array([[features.get(col, 0) or 0 for col in FEATURE_COLS]])
    X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)

    # Predict log-return
    log_return = model.predict(X)[0]
    expected_return = float(np.expm1(log_return))  # Convert back from log

    # Clip to reasonable range
    expected_return = float(np.clip(expected_return, -0.40, 0.50))

    # Trend
    if expected_return > 0.03:
        trend = "bullish"
    elif expected_return < -0.03:
        trend = "bearish"
    else:
        trend = "neutral"

    # Confidence from the magnitude of the prediction relative to recent volatility
    vol = features.get("volatility_60d", 0.25) or 0.25
    signal_to_noise = abs(expected_return) / max(vol, 0.05)

    if signal_to_noise > 0.4:
        confidence_level = "high"
        confidence = min(0.80, 0.5 + signal_to_noise * 0.3)
    elif signal_to_noise > 0.15:
        confidence_level = "medium"
        confidence = 0.4 + signal_to_noise * 0.3
    else:
        confidence_level = "low"
        confidence = max(0.25, 0.2 + signal_to_noise)

    return {
        "horizon": "medium",
        "expectedReturn": round(expected_return, 4),
        "trendLabel": trend,
        "confidence": round(float(confidence), 2),
        "confidenceLevel": confidence_level,
    }


def predict_long_term(heuristic: dict, features: dict) -> dict:
    """Generate long-term prediction using the heuristic scoring rules."""
    scoring = heuristic.get("scoring", {})
    total_score = 0.0
    max_score = 0.0

    for feat_name, rule in scoring.items():
        weight = rule["weight"]
        max_score += weight
        val = features.get(feat_name)

        if val is None:
            continue

        direction = rule["direction"]

        if direction == "positive":
            # Higher = better, normalize with sigmoid-like
            contribution = np.tanh(val * 3) * weight
        elif direction == "negative":
            # Lower = better
            contribution = -np.tanh(val * 2) * weight
        elif direction == "negative_abs":
            # Closer to zero = better
            contribution = (1 - min(abs(val), 1)) * weight
        elif direction == "mean_revert_50":
            # Closer to 50 = better (for RSI)
            deviation = abs(val - 50) / 50
            contribution = (1 - deviation) * weight
        else:
            contribution = 0

        total_score += contribution

    # Normalize to [-1, 1]
    normalized = total_score / max(max_score, 0.01)

    # Map to expected annualized return
    expected_return = float(np.clip(normalized * 0.12, -0.15, 0.15))

    if expected_return > 0.02:
        trend = "bullish"
    elif expected_return < -0.02:
        trend = "bearish"
    else:
        trend = "neutral"

    # Long-term confidence is always capped at medium
    confidence = min(0.60, 0.3 + abs(normalized) * 0.3)
    confidence_level = "medium" if confidence >= 0.45 else "low"

    return {
        "horizon": "long",
        "expectedReturn": round(expected_return, 4),
        "trendLabel": trend,
        "confidence": round(float(confidence), 2),
        "confidenceLevel": confidence_level,
    }


def compute_risk_score(features: dict) -> int:
    """
    Compute risk score (1-5) from volatility and drawdown metrics.
    1 = low risk, 5 = very high risk.
    """
    vol_20 = features.get("volatility_20d") or 0.25
    vol_60 = features.get("volatility_60d") or 0.25
    max_dd = features.get("drawdown") or 0

    # Volatility component (0-3 points)
    avg_vol = (vol_20 + vol_60) / 2
    if avg_vol < 0.15:
        vol_points = 0
    elif avg_vol < 0.25:
        vol_points = 1
    elif avg_vol < 0.35:
        vol_points = 2
    else:
        vol_points = 3

    # Drawdown component (0-2 points)
    if max_dd > -0.10:
        dd_points = 0
    elif max_dd > -0.25:
        dd_points = 1
    else:
        dd_points = 2

    raw = vol_points + dd_points
    return max(1, min(5, raw + 1))


def detect_watchlist_signals(features: dict, ticker: str, predictions: dict) -> list:
    """
    Detect regime-change signals for the AI watchlist.
    Returns a list of signal dicts (can be empty).
    """
    signals = []

    rsi = features.get("rsi_14")
    vol_20 = features.get("volatility_20d")
    vol_60 = features.get("volatility_60d")
    volume_ratio = features.get("volume_ratio")
    price_vs_sma200 = features.get("price_vs_sma200")
    adx = features.get("adx")
    return_20d = features.get("return_20d")
    macd_h = features.get("macd_histogram")

    # 1. Volatility regime shift: 20d vol > 2× 60d vol
    if vol_20 and vol_60 and vol_60 > 0.05:
        if vol_20 / vol_60 > 2.0:
            signals.append({
                "ticker": ticker,
                "signalPrimary": "Volatility regime shift",
                "signalSecondary": f"20d vol ({vol_20:.0%}) is {vol_20/vol_60:.1f}x the 60d average",
                "explanation": f"Sharp increase in volatility indicates a regime change. "
                              f"This often precedes significant directional moves.",
                "horizon": "short",
            })

    # 2. Trend reversal: price crosses 200d MA + extreme RSI
    if rsi is not None and price_vs_sma200 is not None:
        if abs(price_vs_sma200) < 0.03 and (rsi < 30 or rsi > 70):
            direction = "oversold near support" if rsi < 30 else "overbought near resistance"
            signals.append({
                "ticker": ticker,
                "signalPrimary": "Trend reversal candidate",
                "signalSecondary": f"RSI at {rsi:.0f}, price near 200d MA",
                "explanation": f"Price is testing the 200-day moving average while RSI is {direction}. "
                              f"This combination often signals a reversal point.",
                "horizon": "short",
            })

    # 3. Volume anomaly: 5d volume > 3× average
    if volume_ratio and volume_ratio > 3.0:
        signals.append({
            "ticker": ticker,
            "signalPrimary": "Volume anomaly detected",
            "signalSecondary": f"Volume is {volume_ratio:.1f}x the 20-day average",
            "explanation": f"Unusually high trading volume often signals institutional activity "
                          f"or a catalyst event. Monitor for directional breakout.",
            "horizon": "short",
        })

    # 4. Strong momentum divergence (RSI/MACD divergence)
    if rsi and macd_h is not None and return_20d is not None:
        if return_20d < -0.05 and rsi > 50 and macd_h > 0:
            signals.append({
                "ticker": ticker,
                "signalPrimary": "Bullish divergence",
                "signalSecondary": "Price down but momentum indicators positive",
                "explanation": f"Price has dropped {abs(return_20d)*100:.1f}% over 20 days but RSI ({rsi:.0f}) "
                              f"and MACD remain positive, suggesting the decline may be temporary.",
                "horizon": "short",
            })
        elif return_20d > 0.05 and rsi < 50 and macd_h < 0:
            signals.append({
                "ticker": ticker,
                "signalPrimary": "Bearish divergence",
                "signalSecondary": "Price up but momentum indicators negative",
                "explanation": f"Price has gained {return_20d*100:.1f}% over 20 days but RSI ({rsi:.0f}) "
                              f"and MACD are negative, suggesting the rally may stall.",
                "horizon": "short",
            })

    # 5. Strong trend (high ADX + directional move)
    if adx and adx > 40 and return_20d is not None:
        direction = "upward" if return_20d > 0 else "downward"
        signals.append({
            "ticker": ticker,
            "signalPrimary": f"Strong {direction} trend",
            "signalSecondary": f"ADX at {adx:.0f} with {abs(return_20d)*100:.1f}% move",
            "explanation": f"ADX above 40 indicates a strong established trend. "
                          f"Trend-following strategies tend to outperform in this regime.",
            "horizon": "medium",
        })

    return signals


def _sanitize(obj):
    """Recursively replace Infinity/NaN with None."""
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


def run_predictions():
    """Generate predictions for all assets using trained models."""
    print(f"\n{'='*60}")
    print(f"  BotBourse Model Predictions")
    print(f"  Started: {datetime.now(timezone.utc).isoformat()}")
    print(f"{'='*60}\n")

    # Load models
    models = load_models()
    if not models:
        print("  [!] No trained models found. Run train.py first.")
        return

    all_predictions = []
    all_watchlist = []
    skipped = 0

    for ticker in ALL_TICKERS:
        features = get_latest_features_for_ticker(ticker)
        if not features:
            skipped += 1
            continue

        meta = STOCKS.get(ticker, ETFS.get(ticker, {}))
        asset_type = "etf" if ticker in ETFS else "stock"

        predictions = {}

        # Short-term (ML classifier)
        if "short" in models:
            pred_short = predict_short_term(models["short"], features)
        else:
            pred_short = {"horizon": "short", "expectedReturn": 0, "trendLabel": "neutral",
                         "confidence": 0.3, "confidenceLevel": "low"}
        predictions["short"] = pred_short

        # Medium-term (ML regressor)
        if "medium" in models:
            pred_medium = predict_medium_term(models["medium"], features)
        else:
            pred_medium = {"horizon": "medium", "expectedReturn": 0, "trendLabel": "neutral",
                          "confidence": 0.3, "confidenceLevel": "low"}
        predictions["medium"] = pred_medium

        # Long-term (heuristic)
        if "long" in models:
            pred_long = predict_long_term(models["long"], features)
        else:
            pred_long = {"horizon": "long", "expectedReturn": 0, "trendLabel": "neutral",
                        "confidence": 0.3, "confidenceLevel": "low"}
        predictions["long"] = pred_long

        # Risk score (shared across horizons)
        risk_score = compute_risk_score(features)

        # Add each horizon to predictions list
        for horizon, pred in predictions.items():
            all_predictions.append({
                **pred,
                "ticker": ticker,
                "name": meta.get("name", ticker),
                "sector": meta.get("sector", "Diversified"),
                "region": meta.get("region", "US"),
                "assetType": asset_type,
                "riskScore": risk_score,
            })

        # Watchlist signals
        watchlist_signals = detect_watchlist_signals(features, ticker, predictions)
        for sig in watchlist_signals:
            sig["name"] = meta.get("name", ticker)
            sig["detectedAt"] = features.get("last_date", "")
        all_watchlist.extend(watchlist_signals)

    # Save predictions
    _write_json(DATA_DIR / "predictions.json", all_predictions)
    print(f"\n  -> {len(all_predictions)} predictions saved ({skipped} tickers skipped)")

    # Save watchlist (top 12 most interesting)
    all_watchlist.sort(key=lambda w: w.get("signalPrimary", ""), reverse=False)
    _write_json(DATA_DIR / "watchlist.json", all_watchlist[:12])
    print(f"  -> {len(all_watchlist[:12])} watchlist items saved (from {len(all_watchlist)} detected)")

    # ── Generate screener.json ──
    print(f"\n  Generating screener data...")
    screener_data = []

    # Load assets.json for price/market data
    assets_path = DATA_DIR / "assets.json"
    assets_map = {}
    if assets_path.exists():
        with open(assets_path) as f:
            try:
                assets_list = json.load(f)
                for a in assets_list:
                    assets_map[a.get("ticker", "")] = a
            except Exception:
                pass

    for ticker in ALL_TICKERS:
        features = get_latest_features_for_ticker(ticker)
        if not features:
            continue

        meta = STOCKS.get(ticker, ETFS.get(ticker, {}))
        asset_data = assets_map.get(ticker, {})
        asset_type = "etf" if ticker in ETFS else "stock"

        # Get predictions for this ticker
        ticker_preds = [p for p in all_predictions if p.get("ticker") == ticker]
        short_pred = next((p for p in ticker_preds if p.get("horizon") == "short"), {})
        medium_pred = next((p for p in ticker_preds if p.get("horizon") == "medium"), {})
        long_pred = next((p for p in ticker_preds if p.get("horizon") == "long"), {})

        def _safe(val, default=None):
            if val is None:
                return default
            try:
                v = float(val)
                return round(v, 4) if np.isfinite(v) else default
            except (ValueError, TypeError):
                return default

        screener_data.append({
            "ticker": ticker,
            "name": meta.get("name", ticker),
            "sector": meta.get("sector", "Diversified"),
            "region": meta.get("region", "US"),
            "assetType": asset_type,
            "exchange": meta.get("exchange", ""),
            # Price data
            "price": _safe(asset_data.get("price"), 0),
            "changePercent": _safe(asset_data.get("changePercent"), 0),
            "marketCap": _safe(asset_data.get("marketCap")),
            "peRatio": _safe(asset_data.get("peRatio")),
            "dividendYield": _safe(asset_data.get("dividendYield")),
            "volume": _safe(asset_data.get("volume")),
            # Technical indicators
            "rsi": _safe(features.get("rsi_14")),
            "macdHistogram": _safe(features.get("macd_histogram")),
            "adx": _safe(features.get("adx")),
            "stochK": _safe(features.get("stoch_k")),
            "bbPosition": _safe(features.get("bb_position")),
            "bbWidth": _safe(features.get("bb_width")),
            "volumeRatio": _safe(features.get("volume_ratio")),
            "volatility20d": _safe(features.get("volatility_20d")),
            "volatility60d": _safe(features.get("volatility_60d")),
            "drawdown": _safe(features.get("drawdown")),
            "return5d": _safe(features.get("return_5d")),
            "return20d": _safe(features.get("return_20d")),
            "return60d": _safe(features.get("return_60d")),
            "priceVsSma20": _safe(features.get("price_vs_sma20")),
            "priceVsSma50": _safe(features.get("price_vs_sma50")),
            "priceVsSma200": _safe(features.get("price_vs_sma200")),
            # ML predictions
            "riskScore": short_pred.get("riskScore", 3),
            "shortTrend": short_pred.get("trendLabel", "neutral"),
            "shortReturn": _safe(short_pred.get("expectedReturn"), 0),
            "shortConfidence": short_pred.get("confidenceLevel", "low"),
            "mediumTrend": medium_pred.get("trendLabel", "neutral"),
            "mediumReturn": _safe(medium_pred.get("expectedReturn"), 0),
            "mediumConfidence": medium_pred.get("confidenceLevel", "low"),
            "longTrend": long_pred.get("trendLabel", "neutral"),
            "longReturn": _safe(long_pred.get("expectedReturn"), 0),
            "longConfidence": long_pred.get("confidenceLevel", "low"),
        })

    _write_json(DATA_DIR / "screener.json", screener_data)
    print(f"  -> {len(screener_data)} screener entries saved")

    # Save model metadata for frontend
    model_meta_path = MODELS_DIR / "model_meta.json"
    if model_meta_path.exists():
        with open(model_meta_path) as f:
            model_meta = json.load(f)
    else:
        model_meta = []

    # Update pipeline meta
    _write_json(DATA_DIR / "meta.json", {
        "lastPredictedAt": datetime.now(timezone.utc).isoformat(),
        "assetCount": len(ALL_TICKERS),
        "predictionCount": len(all_predictions),
        "watchlistCount": len(all_watchlist[:12]),
        "screenerCount": len(screener_data),
        "modelVersions": {m.get("horizon", "?"): m.get("version", "v1.0") for m in model_meta},
    })

    print(f"\n{'='*60}")
    print(f"  Predictions complete!")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    run_predictions()
