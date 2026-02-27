"""
BotBourse Model Training

Trains LightGBM models for each horizon using walk-forward validation on
cross-sectional data. Models are serialized to models/ for use by the predictor.
"""

import json
import pickle
from pathlib import Path
from datetime import datetime, timezone

import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import accuracy_score, mean_absolute_error

from config import ALL_TICKERS, PRICES_DIR, STOCKS, ETFS

MODELS_DIR = Path(__file__).parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

# ─── Feature columns used by all models ───
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


def build_training_dataset(horizon_days: int) -> pd.DataFrame:
    """
    Build a cross-sectional training dataset from all tickers.

    For each ticker, at each date t, the features are the indicators at t,
    and the target is the forward return over the next `horizon_days` days.
    """
    all_frames = []

    for ticker in ALL_TICKERS:
        safe_ticker = ticker.replace(".", "_").replace("^", "")
        price_file = PRICES_DIR / f"{safe_ticker}.json"

        if not price_file.exists():
            continue

        with open(price_file) as f:
            records = json.load(f)

        df = pd.DataFrame(records)
        if len(df) < 300:
            continue

        df["close"] = pd.to_numeric(df["close"], errors="coerce")
        df["high"] = pd.to_numeric(df["high"], errors="coerce")
        df["low"] = pd.to_numeric(df["low"], errors="coerce")
        df["volume"] = pd.to_numeric(df["volume"], errors="coerce")
        df = df.dropna(subset=["close"])

        # ── Compute features ──
        df["return_5d"] = df["close"].pct_change(5)
        df["return_20d"] = df["close"].pct_change(20)
        df["return_60d"] = df["close"].pct_change(60)
        df["return_1d"] = df["close"].pct_change(1)

        df["sma_20"] = df["close"].rolling(20).mean()
        df["sma_50"] = df["close"].rolling(50).mean()
        df["sma_200"] = df["close"].rolling(200).mean()

        df["price_vs_sma20"] = (df["close"] / df["sma_20"]) - 1
        df["price_vs_sma50"] = (df["close"] / df["sma_50"]) - 1
        df["price_vs_sma200"] = (df["close"] / df["sma_200"]) - 1

        df["volatility_20d"] = df["return_1d"].rolling(20).std() * np.sqrt(252)
        df["volatility_60d"] = df["return_1d"].rolling(60).std() * np.sqrt(252)

        # RSI
        delta = df["close"].diff()
        gain = delta.where(delta > 0, 0).rolling(14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
        rs = gain / loss
        df["rsi_14"] = 100 - (100 / (1 + rs))

        # MACD
        ema12 = df["close"].ewm(span=12, adjust=False).mean()
        ema26 = df["close"].ewm(span=26, adjust=False).mean()
        macd = ema12 - ema26
        macd_signal = macd.ewm(span=9, adjust=False).mean()
        df["macd_histogram"] = macd - macd_signal

        # Bollinger Bands
        bb_sma = df["close"].rolling(20).mean()
        bb_std = df["close"].rolling(20).std()
        bb_upper = bb_sma + 2 * bb_std
        bb_lower = bb_sma - 2 * bb_std
        df["bb_position"] = (df["close"] - bb_lower) / (bb_upper - bb_lower)
        df["bb_width"] = (bb_upper - bb_lower) / df["close"]

        # Stochastic K
        low14 = df["low"].rolling(14).min()
        high14 = df["high"].rolling(14).max()
        df["stoch_k"] = (df["close"] - low14) / (high14 - low14) * 100

        # ADX (simplified)
        plus_dm = df["high"].diff()
        minus_dm = -df["low"].diff()
        plus_dm = plus_dm.where((plus_dm > minus_dm) & (plus_dm > 0), 0)
        minus_dm = minus_dm.where((minus_dm > plus_dm) & (minus_dm > 0), 0)
        tr = pd.concat([df["high"] - df["low"],
                        (df["high"] - df["close"].shift()).abs(),
                        (df["low"] - df["close"].shift()).abs()], axis=1).max(axis=1)
        atr14 = tr.rolling(14).mean()
        plus_di = 100 * (plus_dm.rolling(14).mean() / atr14)
        minus_di = 100 * (minus_dm.rolling(14).mean() / atr14)
        dx = (plus_di - minus_di).abs() / (plus_di + minus_di) * 100
        df["adx"] = dx.rolling(14).mean()

        # Volume ratio
        vol_sma = df["volume"].rolling(20).mean()
        df["volume_ratio"] = df["volume"] / vol_sma

        # Drawdown
        rolling_max = df["close"].cummax()
        df["drawdown"] = (df["close"] - rolling_max) / rolling_max

        # ── Target: forward return ──
        df["forward_return"] = df["close"].shift(-horizon_days) / df["close"] - 1

        # Ticker metadata
        meta = STOCKS.get(ticker, ETFS.get(ticker, {}))
        df["ticker"] = ticker
        df["sector"] = meta.get("sector", "Diversified")
        df["region"] = meta.get("region", "US")

        # Keep only rows with all features and target
        df = df.dropna(subset=FEATURE_COLS + ["forward_return"])

        # Replace any inf with NaN then drop
        df = df.replace([np.inf, -np.inf], np.nan).dropna(subset=FEATURE_COLS + ["forward_return"])

        if len(df) > 50:
            all_frames.append(df[FEATURE_COLS + ["forward_return", "ticker", "sector", "region", "time"]])

    if not all_frames:
        return pd.DataFrame()

    combined = pd.concat(all_frames, ignore_index=True)
    combined = combined.sort_values("time").reset_index(drop=True)
    return combined


def train_short_term_model():
    """
    Short-term (~30 days): LightGBM classifier.
    Target: 3-class (positive / flat / negative) based on 30-day forward return.
    """
    print("\n  [1/3] Training SHORT-TERM classifier (30-day horizon)...")

    df = build_training_dataset(horizon_days=22)  # ~1 month trading days
    if df.empty:
        print("    [!] No training data available")
        return None

    # Create 3-class target
    df["target"] = 1  # neutral
    df.loc[df["forward_return"] > 0.02, "target"] = 2   # positive (>+2%)
    df.loc[df["forward_return"] < -0.02, "target"] = 0  # negative (<-2%)

    X = df[FEATURE_COLS].values
    y = df["target"].values

    # Walk-forward: train on first 80%, validate on last 20%
    split_idx = int(len(df) * 0.8)
    X_train, X_val = X[:split_idx], X[split_idx:]
    y_train, y_val = y[:split_idx], y[split_idx:]

    print(f"    Training samples: {len(X_train):,}, Validation: {len(X_val):,}")
    print(f"    Class distribution (train): {np.bincount(y_train.astype(int))}")

    train_data = lgb.Dataset(X_train, label=y_train, feature_name=FEATURE_COLS)
    val_data = lgb.Dataset(X_val, label=y_val, reference=train_data, feature_name=FEATURE_COLS)

    params = {
        "objective": "multiclass",
        "num_class": 3,
        "metric": "multi_logloss",
        "learning_rate": 0.05,
        "num_leaves": 31,
        "max_depth": 6,
        "min_data_in_leaf": 50,
        "feature_fraction": 0.8,
        "bagging_fraction": 0.8,
        "bagging_freq": 5,
        "lambda_l1": 0.1,
        "lambda_l2": 0.1,
        "verbose": -1,
        "seed": 42,
    }

    model = lgb.train(
        params, train_data,
        num_boost_round=500,
        valid_sets=[val_data],
        callbacks=[lgb.early_stopping(50), lgb.log_evaluation(0)],
    )

    # Evaluate
    y_pred = model.predict(X_val).argmax(axis=1)
    acc = accuracy_score(y_val, y_pred)
    print(f"    Validation accuracy: {acc:.3f}")

    # Feature importance
    importance = dict(zip(FEATURE_COLS, model.feature_importance(importance_type="gain").tolist()))
    top_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:5]
    print(f"    Top features: {', '.join(f'{f[0]}({f[1]:.0f})' for f in top_features)}")

    # Save
    model_path = MODELS_DIR / "short_term.pkl"
    with open(model_path, "wb") as f:
        pickle.dump({"model": model, "features": FEATURE_COLS, "type": "classifier"}, f)

    meta = {
        "horizon": "short", "type": "classifier", "accuracy": round(acc, 4),
        "n_train": len(X_train), "n_val": len(X_val),
        "top_features": [f[0] for f in top_features],
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "version": "v1.0",
    }

    return meta


def train_medium_term_model():
    """
    Medium-term (~12 months): LightGBM regressor.
    Target: 252-day forward log-return.
    """
    print("\n  [2/3] Training MEDIUM-TERM regressor (12-month horizon)...")

    df = build_training_dataset(horizon_days=252)
    if df.empty:
        print("    [!] No training data available")
        return None

    # Use log-return as target
    df["target"] = np.log1p(df["forward_return"])

    X = df[FEATURE_COLS].values
    y = df["target"].values

    split_idx = int(len(df) * 0.8)
    X_train, X_val = X[:split_idx], X[split_idx:]
    y_train, y_val = y[:split_idx], y[split_idx:]

    print(f"    Training samples: {len(X_train):,}, Validation: {len(X_val):,}")

    train_data = lgb.Dataset(X_train, label=y_train, feature_name=FEATURE_COLS)
    val_data = lgb.Dataset(X_val, label=y_val, reference=train_data, feature_name=FEATURE_COLS)

    params = {
        "objective": "regression",
        "metric": "mae",
        "learning_rate": 0.03,
        "num_leaves": 31,
        "max_depth": 5,
        "min_data_in_leaf": 100,
        "feature_fraction": 0.7,
        "bagging_fraction": 0.7,
        "bagging_freq": 5,
        "lambda_l1": 0.2,
        "lambda_l2": 0.2,
        "verbose": -1,
        "seed": 42,
    }

    model = lgb.train(
        params, train_data,
        num_boost_round=500,
        valid_sets=[val_data],
        callbacks=[lgb.early_stopping(50), lgb.log_evaluation(0)],
    )

    y_pred = model.predict(X_val)
    mae = mean_absolute_error(y_val, y_pred)
    # Directional accuracy
    dir_acc = np.mean(np.sign(y_pred) == np.sign(y_val))
    print(f"    Validation MAE: {mae:.4f}, Directional accuracy: {dir_acc:.3f}")

    importance = dict(zip(FEATURE_COLS, model.feature_importance(importance_type="gain").tolist()))
    top_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:5]
    print(f"    Top features: {', '.join(f'{f[0]}({f[1]:.0f})' for f in top_features)}")

    model_path = MODELS_DIR / "medium_term.pkl"
    with open(model_path, "wb") as f:
        pickle.dump({"model": model, "features": FEATURE_COLS, "type": "regressor"}, f)

    meta = {
        "horizon": "medium", "type": "regressor",
        "mae": round(mae, 4), "directional_accuracy": round(dir_acc, 4),
        "n_train": len(X_train), "n_val": len(X_val),
        "top_features": [f[0] for f in top_features],
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "version": "v1.0",
    }

    return meta


def train_long_term_heuristic():
    """
    Long-term (~3 years): Fundamental heuristic scoring.
    Not a trained model — rule-based composite score.
    Saved as a config dict rather than a pickle.
    """
    print("\n  [3/3] Building LONG-TERM heuristic scoring rules...")

    rules = {
        "horizon": "long",
        "type": "heuristic",
        "version": "v1.0",
        "scoring": {
            "price_vs_sma200": {"weight": 0.25, "direction": "positive", "desc": "Above 200d MA = structural uptrend"},
            "return_60d": {"weight": 0.15, "direction": "positive", "desc": "3-month momentum"},
            "volatility_60d": {"weight": 0.20, "direction": "negative", "desc": "Lower volatility = lower risk"},
            "drawdown": {"weight": 0.15, "direction": "negative_abs", "desc": "Smaller drawdown = healthier trend"},
            "rsi_14": {"weight": 0.10, "direction": "mean_revert_50", "desc": "RSI near 50 = stable, extremes = risky"},
            "adx": {"weight": 0.15, "direction": "positive", "desc": "Strong trend = higher conviction"},
        },
        "confidence_level": "medium",  # Long-term is always medium or low
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }

    model_path = MODELS_DIR / "long_term.json"
    with open(model_path, "w") as f:
        json.dump(rules, f, indent=2)

    print("    Heuristic rules saved.")
    return rules


def run_training():
    """Train all models."""
    print(f"\n{'='*60}")
    print(f"  BotBourse Model Training")
    print(f"  Started: {datetime.now(timezone.utc).isoformat()}")
    print(f"{'='*60}")

    all_meta = []

    meta_short = train_short_term_model()
    if meta_short:
        all_meta.append(meta_short)

    meta_medium = train_medium_term_model()
    if meta_medium:
        all_meta.append(meta_medium)

    meta_long = train_long_term_heuristic()
    if meta_long:
        all_meta.append({"horizon": "long", "type": "heuristic", "version": "v1.0",
                         "trained_at": meta_long["trained_at"]})

    # Save model metadata
    meta_path = MODELS_DIR / "model_meta.json"
    with open(meta_path, "w") as f:
        json.dump(all_meta, f, indent=2)

    print(f"\n{'='*60}")
    print(f"  Training complete! Models saved to {MODELS_DIR}")
    print(f"{'='*60}\n")

    return all_meta


if __name__ == "__main__":
    run_training()
