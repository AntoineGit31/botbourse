"""
BotBourse Model Training — v2.0 Professional

Trains an ensemble of LightGBM models for each horizon using purged
walk-forward validation. Includes sector encoding, feature interactions,
market-relative momentum, macro overlay, and Ridge blending.
"""

import json
import pickle
from pathlib import Path
from datetime import datetime, timezone

import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.linear_model import RidgeClassifier, Ridge
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, mean_absolute_error

from config import ALL_TICKERS, PRICES_DIR, DATA_DIR, STOCKS, ETFS, safe_ticker_filename

MODELS_DIR = Path(__file__).parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

# ─── Feature columns (numerical) ───
NUMERIC_FEATURES = [
    "return_5d", "return_20d", "return_60d",
    "volatility_20d", "volatility_60d",
    "rsi_14", "macd_histogram",
    "price_vs_sma20", "price_vs_sma50", "price_vs_sma200",
    "bb_position", "bb_width",
    "stoch_k", "adx",
    "volume_ratio",
    "drawdown",
    "trend_sma_ratio",
    "atr_normalized",
    "month",
    "macro_vix",
    "macro_tnx",
    # ── NEW: Interaction features ──
    "rsi_x_vix",
    "vol_x_volume",
    "momentum_vs_market",
    "sector_momentum",
    # ── NEW: Fundamental features ──
    "pe_ratio",
    "dividend_yield",
]

# Sector is handled as a LightGBM categorical
CATEGORICAL_FEATURES = ["sector_encoded"]

# Full feature list for LightGBM
FEATURE_COLS = NUMERIC_FEATURES + CATEGORICAL_FEATURES


def load_macro_data():
    """Load VIX and TNX historical prices for training merge."""
    macro_dfs = {}
    for ticker, col_prefix in [("^VIX", "macro_vix"), ("^TNX", "macro_tnx")]:
        safe = safe_ticker_filename(ticker)
        price_file = PRICES_DIR / f"{safe}.json"
        if price_file.exists():
            with open(price_file) as f:
                df = pd.DataFrame(json.load(f))
                if not df.empty and "time" in df.columns and "close" in df.columns:
                    macro_dfs[col_prefix] = df.set_index("time")["close"].rename(col_prefix)
    if macro_dfs:
        return pd.concat(macro_dfs.values(), axis=1)
    return pd.DataFrame()


def load_market_returns():
    """Load S&P 500 returns for market-relative momentum."""
    for spy in ["SPY", "VOO", "^GSPC"]:
        safe = safe_ticker_filename(spy)
        price_file = PRICES_DIR / f"{safe}.json"
        if price_file.exists():
            with open(price_file) as f:
                df = pd.DataFrame(json.load(f))
                if not df.empty and "close" in df.columns:
                    df["close"] = pd.to_numeric(df["close"], errors="coerce")
                    df["market_return_20d"] = df["close"].pct_change(20)
                    df["market_return_60d"] = df["close"].pct_change(60)
                    return df.set_index("time")[["market_return_20d", "market_return_60d"]]
    return pd.DataFrame()


def load_fundamentals():
    """Load P/E and dividend yield from assets.json."""
    assets_path = DATA_DIR / "assets.json"
    if not assets_path.exists():
        return {}
    with open(assets_path) as f:
        assets = json.load(f)
    return {a["ticker"]: {
        "pe_ratio": a.get("peRatio"),
        "dividend_yield": a.get("dividendYield"),
    } for a in assets if "ticker" in a}


# ─── Sector encoder (global, consistent across train/predict) ───
SECTOR_LIST = sorted(list(set(
    [m.get("sector", "Diversified") for m in STOCKS.values()] +
    [m.get("sector", "Diversified") for m in ETFS.values()] +
    ["Diversified", "Macro", "Crypto"]
)))
_sector_encoder = LabelEncoder()
_sector_encoder.fit(SECTOR_LIST)


def encode_sector(sector_name: str) -> int:
    """Encode a sector name to an integer for LightGBM categorical."""
    try:
        return int(_sector_encoder.transform([sector_name])[0])
    except ValueError:
        return int(_sector_encoder.transform(["Diversified"])[0])


def build_training_dataset(horizon_days: int) -> pd.DataFrame:
    """
    Build a professional training dataset with:
    - Technical indicators
    - Macro overlay (VIX, TNX)
    - Market-relative momentum
    - Sector encoding
    - Feature interactions
    - Fundamental features
    """
    all_frames = []
    macro_df = load_macro_data()
    market_df = load_market_returns()
    fundamentals = load_fundamentals()

    for ticker in ALL_TICKERS:
        safe_ticker = safe_ticker_filename(ticker)
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

        # ── Core Technical Features ──
        df["return_1d"] = df["close"].pct_change(1)
        df["return_5d"] = df["close"].pct_change(5)
        df["return_20d"] = df["close"].pct_change(20)
        df["return_60d"] = df["close"].pct_change(60)

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

        # ADX
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

        # Advanced features
        df["trend_sma_ratio"] = df["sma_50"] / df["sma_200"]
        df["atr_normalized"] = atr14 / df["close"]
        df["month"] = pd.to_datetime(df["time"]).dt.month

        # ── Macro Overlay ──
        df = df.set_index("time")
        if not macro_df.empty:
            df = df.join(macro_df, how="left")
            for col, default in [("macro_vix", 20.0), ("macro_tnx", 4.0)]:
                if col in df.columns:
                    df[col] = df[col].ffill().bfill()
                else:
                    df[col] = default
        else:
            df["macro_vix"] = 20.0
            df["macro_tnx"] = 4.0

        # ── Market-Relative Momentum ──
        if not market_df.empty:
            df = df.join(market_df, how="left")
            df["market_return_20d"] = df["market_return_20d"].ffill().bfill().fillna(0)
            df["market_return_60d"] = df["market_return_60d"].ffill().bfill().fillna(0)
        else:
            df["market_return_20d"] = 0.0
            df["market_return_60d"] = 0.0

        df = df.reset_index(names="time")

        # Momentum vs Market (alpha)
        df["momentum_vs_market"] = df["return_20d"] - df["market_return_20d"]

        # ── Feature Interactions ──
        df["rsi_x_vix"] = df["rsi_14"] * df["macro_vix"] / 100.0
        df["vol_x_volume"] = df["volatility_20d"] * df["volume_ratio"]

        # ── Sector Encoding ──
        meta = STOCKS.get(ticker, ETFS.get(ticker, {}))
        sector_name = meta.get("sector", "Diversified")
        df["sector_encoded"] = encode_sector(sector_name)
        df["ticker"] = ticker
        df["sector"] = sector_name
        df["region"] = meta.get("region", "US")

        # ── Sector Momentum (placeholder per-ticker, enriched later) ──
        df["sector_momentum"] = 0.0  # Will be filled cross-sectionally

        # ── Fundamental Features ──
        fund = fundamentals.get(ticker, {})
        pe = fund.get("pe_ratio")
        div_y = fund.get("dividend_yield")
        df["pe_ratio"] = float(pe) if pe is not None and np.isfinite(float(pe or 0)) else 0.0
        df["dividend_yield"] = float(div_y) if div_y is not None and np.isfinite(float(div_y or 0)) else 0.0

        # ── Target ──
        df["forward_return"] = df["close"].shift(-horizon_days) / df["close"] - 1

        # Keep only complete rows
        keep_cols = FEATURE_COLS + ["forward_return", "ticker", "sector", "region", "time"]
        df = df.dropna(subset=NUMERIC_FEATURES + ["forward_return"])
        df = df.replace([np.inf, -np.inf], np.nan).dropna(subset=NUMERIC_FEATURES + ["forward_return"])

        if len(df) > 50:
            all_frames.append(df[keep_cols])

    if not all_frames:
        return pd.DataFrame()

    combined = pd.concat(all_frames, ignore_index=True)
    combined = combined.sort_values("time").reset_index(drop=True)

    # ── Cross-sectional Sector Momentum ──
    # For each date, compute the average return_20d per sector
    combined["sector_momentum"] = combined.groupby(["time", "sector"])["forward_return"].transform("mean")

    return combined


def _purged_split(df: pd.DataFrame, train_ratio=0.75, purge_days=30):
    """
    Purged Walk-Forward split.
    Leaves a gap of `purge_days` between train and validation
    to prevent data leakage from overlapping forward returns.
    """
    n = len(df)
    train_end = int(n * train_ratio)
    val_start = train_end + purge_days  # Gap to prevent leakage

    if val_start >= n:
        val_start = train_end  # Fallback if dataset too small

    train = df.iloc[:train_end]
    val = df.iloc[val_start:]

    return train, val


def train_short_term_model():
    """
    Short-term (~30 days): Ensemble of LightGBM + Ridge classifier.
    Target: 3-class (positive / flat / negative).
    Uses purged walk-forward validation.
    """
    print("\n  [1/3] Training SHORT-TERM classifier (30-day horizon)...")

    df = build_training_dataset(horizon_days=22)
    if df.empty:
        print("    [!] No training data available")
        return None

    # Create 3-class target
    df["target"] = 1  # neutral
    df.loc[df["forward_return"] > 0.02, "target"] = 2   # positive (>+2%)
    df.loc[df["forward_return"] < -0.02, "target"] = 0  # negative (<-2%)

    # Purged split
    train_df, val_df = _purged_split(df, train_ratio=0.75, purge_days=30)

    X_train = train_df[FEATURE_COLS].values
    y_train = train_df["target"].values
    X_val = val_df[FEATURE_COLS].values
    y_val = val_df["target"].values

    print(f"    Training: {len(X_train):,}, Validation: {len(X_val):,} (purge gap: 30 rows)")
    print(f"    Class distribution (train): {np.bincount(y_train.astype(int))}")

    # ── LightGBM ──
    cat_indices = [FEATURE_COLS.index(c) for c in CATEGORICAL_FEATURES]
    train_data = lgb.Dataset(X_train, label=y_train, feature_name=FEATURE_COLS,
                             categorical_feature=cat_indices)
    val_data = lgb.Dataset(X_val, label=y_val, reference=train_data, feature_name=FEATURE_COLS,
                           categorical_feature=cat_indices)

    lgb_params = {
        "objective": "multiclass",
        "num_class": 3,
        "metric": "multi_logloss",
        "learning_rate": 0.03,
        "num_leaves": 63,
        "max_depth": 7,
        "min_data_in_leaf": 100,
        "feature_fraction": 0.7,
        "bagging_fraction": 0.7,
        "bagging_freq": 5,
        "lambda_l1": 0.2,
        "lambda_l2": 0.5,
        "verbose": -1,
        "seed": 42,
        "n_jobs": -1,
    }

    lgb_model = lgb.train(
        lgb_params, train_data,
        num_boost_round=800,
        valid_sets=[val_data],
        callbacks=[lgb.early_stopping(80), lgb.log_evaluation(0)],
    )

    # ── Ridge Classifier (ensemble component) ──
    scaler = StandardScaler()
    # Use only numeric features for Ridge (no categoricals)
    numeric_indices = list(range(len(NUMERIC_FEATURES)))
    X_train_scaled = scaler.fit_transform(X_train[:, numeric_indices])
    X_val_scaled = scaler.transform(X_val[:, numeric_indices])

    ridge_model = RidgeClassifier(alpha=1.0)
    ridge_model.fit(X_train_scaled, y_train)

    # ── Ensemble Predictions ──
    lgb_probs = lgb_model.predict(X_val)  # (N, 3)
    ridge_decisions = ridge_model.decision_function(X_val_scaled)  # (N, 3)
    # Softmax the Ridge decisions
    ridge_exp = np.exp(ridge_decisions - ridge_decisions.max(axis=1, keepdims=True))
    ridge_probs = ridge_exp / ridge_exp.sum(axis=1, keepdims=True)

    # Blend: 70% LightGBM + 30% Ridge
    ensemble_probs = 0.7 * lgb_probs + 0.3 * ridge_probs
    y_pred = ensemble_probs.argmax(axis=1)

    acc = accuracy_score(y_val, y_pred)
    lgb_only_acc = accuracy_score(y_val, lgb_probs.argmax(axis=1))
    print(f"    LightGBM-only accuracy: {lgb_only_acc:.3f}")
    print(f"    Ensemble accuracy:      {acc:.3f}")

    # Feature importance
    importance = dict(zip(FEATURE_COLS, lgb_model.feature_importance(importance_type="gain").tolist()))
    top_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:7]
    print(f"    Top features: {', '.join(f'{f[0]}({f[1]:.0f})' for f in top_features)}")

    # Save
    model_path = MODELS_DIR / "short_term.pkl"
    with open(model_path, "wb") as f:
        pickle.dump({
            "model": lgb_model,
            "ridge_model": ridge_model,
            "scaler": scaler,
            "features": FEATURE_COLS,
            "numeric_features": NUMERIC_FEATURES,
            "type": "ensemble_classifier",
            "blend_weights": [0.7, 0.3],
        }, f)

    meta = {
        "horizon": "short", "type": "ensemble_classifier",
        "accuracy": round(acc, 4), "lgb_accuracy": round(lgb_only_acc, 4),
        "n_train": len(X_train), "n_val": len(X_val),
        "top_features": [f[0] for f in top_features],
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "version": "v2.0",
    }

    return meta


def train_medium_term_model():
    """
    Medium-term (~12 months): Ensemble of LightGBM + Ridge regressor.
    Target: 252-day forward log-return.
    Uses purged walk-forward validation.
    """
    print("\n  [2/3] Training MEDIUM-TERM regressor (12-month horizon)...")

    df = build_training_dataset(horizon_days=252)
    if df.empty:
        print("    [!] No training data available")
        return None

    df["target"] = np.log1p(df["forward_return"])

    # Purged split (larger purge gap for 12-month horizon)
    train_df, val_df = _purged_split(df, train_ratio=0.75, purge_days=60)

    X_train = train_df[FEATURE_COLS].values
    y_train = train_df["target"].values
    X_val = val_df[FEATURE_COLS].values
    y_val = val_df["target"].values

    print(f"    Training: {len(X_train):,}, Validation: {len(X_val):,} (purge gap: 60 rows)")

    # ── LightGBM ──
    cat_indices = [FEATURE_COLS.index(c) for c in CATEGORICAL_FEATURES]
    train_data = lgb.Dataset(X_train, label=y_train, feature_name=FEATURE_COLS,
                             categorical_feature=cat_indices)
    val_data = lgb.Dataset(X_val, label=y_val, reference=train_data, feature_name=FEATURE_COLS,
                           categorical_feature=cat_indices)

    lgb_params = {
        "objective": "regression",
        "metric": "mae",
        "learning_rate": 0.02,
        "num_leaves": 63,
        "max_depth": 6,
        "min_data_in_leaf": 150,
        "feature_fraction": 0.6,
        "bagging_fraction": 0.6,
        "bagging_freq": 5,
        "lambda_l1": 0.3,
        "lambda_l2": 0.5,
        "verbose": -1,
        "seed": 42,
        "n_jobs": -1,
    }

    lgb_model = lgb.train(
        lgb_params, train_data,
        num_boost_round=800,
        valid_sets=[val_data],
        callbacks=[lgb.early_stopping(80), lgb.log_evaluation(0)],
    )

    # ── Ridge Regressor ──
    scaler = StandardScaler()
    numeric_indices = list(range(len(NUMERIC_FEATURES)))
    X_train_scaled = scaler.fit_transform(X_train[:, numeric_indices])
    X_val_scaled = scaler.transform(X_val[:, numeric_indices])

    ridge_model = Ridge(alpha=1.0)
    ridge_model.fit(X_train_scaled, y_train)

    # ── Ensemble ──
    lgb_pred = lgb_model.predict(X_val)
    ridge_pred = ridge_model.predict(X_val_scaled)
    ensemble_pred = 0.7 * lgb_pred + 0.3 * ridge_pred

    mae = mean_absolute_error(y_val, ensemble_pred)
    dir_acc = np.mean(np.sign(ensemble_pred) == np.sign(y_val))
    lgb_mae = mean_absolute_error(y_val, lgb_pred)
    print(f"    LightGBM-only MAE: {lgb_mae:.4f}")
    print(f"    Ensemble MAE:      {mae:.4f}, Directional accuracy: {dir_acc:.3f}")

    importance = dict(zip(FEATURE_COLS, lgb_model.feature_importance(importance_type="gain").tolist()))
    top_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:7]
    print(f"    Top features: {', '.join(f'{f[0]}({f[1]:.0f})' for f in top_features)}")

    # Save
    model_path = MODELS_DIR / "medium_term.pkl"
    with open(model_path, "wb") as f:
        pickle.dump({
            "model": lgb_model,
            "ridge_model": ridge_model,
            "scaler": scaler,
            "features": FEATURE_COLS,
            "numeric_features": NUMERIC_FEATURES,
            "type": "ensemble_regressor",
            "blend_weights": [0.7, 0.3],
        }, f)

    meta = {
        "horizon": "medium", "type": "ensemble_regressor",
        "mae": round(mae, 4), "lgb_mae": round(lgb_mae, 4),
        "directional_accuracy": round(dir_acc, 4),
        "n_train": len(X_train), "n_val": len(X_val),
        "top_features": [f[0] for f in top_features],
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "version": "v2.0",
    }

    return meta


def train_long_term_model():
    """
    Long-term (~3 years): LightGBM regressor (replacing the old heuristic).
    Target: 756-day forward log-return.
    """
    print("\n  [3/3] Training LONG-TERM regressor (3-year horizon)...")

    df = build_training_dataset(horizon_days=504)  # ~2 years (max data allows)
    if df.empty:
        print("    [!] No training data available for long-term, falling back to heuristic")
        return _fallback_long_term_heuristic()

    df["target"] = np.log1p(df["forward_return"])

    # Purged split
    train_df, val_df = _purged_split(df, train_ratio=0.75, purge_days=120)

    if len(val_df) < 100:
        print("    [!] Insufficient validation data, falling back to heuristic")
        return _fallback_long_term_heuristic()

    X_train = train_df[FEATURE_COLS].values
    y_train = train_df["target"].values
    X_val = val_df[FEATURE_COLS].values
    y_val = val_df["target"].values

    print(f"    Training: {len(X_train):,}, Validation: {len(X_val):,} (purge gap: 120 rows)")

    cat_indices = [FEATURE_COLS.index(c) for c in CATEGORICAL_FEATURES]
    train_data = lgb.Dataset(X_train, label=y_train, feature_name=FEATURE_COLS,
                             categorical_feature=cat_indices)
    val_data = lgb.Dataset(X_val, label=y_val, reference=train_data, feature_name=FEATURE_COLS,
                           categorical_feature=cat_indices)

    lgb_params = {
        "objective": "regression",
        "metric": "mae",
        "learning_rate": 0.01,
        "num_leaves": 31,
        "max_depth": 5,
        "min_data_in_leaf": 200,
        "feature_fraction": 0.5,
        "bagging_fraction": 0.5,
        "bagging_freq": 5,
        "lambda_l1": 0.5,
        "lambda_l2": 1.0,
        "verbose": -1,
        "seed": 42,
        "n_jobs": -1,
    }

    lgb_model = lgb.train(
        lgb_params, train_data,
        num_boost_round=500,
        valid_sets=[val_data],
        callbacks=[lgb.early_stopping(60), lgb.log_evaluation(0)],
    )

    y_pred = lgb_model.predict(X_val)
    mae = mean_absolute_error(y_val, y_pred)
    dir_acc = np.mean(np.sign(y_pred) == np.sign(y_val))
    print(f"    Validation MAE: {mae:.4f}, Directional accuracy: {dir_acc:.3f}")

    importance = dict(zip(FEATURE_COLS, lgb_model.feature_importance(importance_type="gain").tolist()))
    top_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:5]
    print(f"    Top features: {', '.join(f'{f[0]}({f[1]:.0f})' for f in top_features)}")

    # Save as pickle (ML model, not heuristic)
    model_path = MODELS_DIR / "long_term.pkl"
    with open(model_path, "wb") as f:
        pickle.dump({
            "model": lgb_model,
            "features": FEATURE_COLS,
            "type": "regressor",
        }, f)

    # Also save the JSON for backward compat
    _fallback_long_term_heuristic()

    meta = {
        "horizon": "long", "type": "ml_regressor",
        "mae": round(mae, 4), "directional_accuracy": round(dir_acc, 4),
        "n_train": len(X_train), "n_val": len(X_val),
        "top_features": [f[0] for f in top_features],
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "version": "v2.0",
    }
    return meta


def _fallback_long_term_heuristic():
    """Save heuristic rules for backward compatibility."""
    rules = {
        "horizon": "long",
        "type": "heuristic",
        "version": "v2.0",
        "scoring": {
            "price_vs_sma200": {"weight": 0.25, "direction": "positive"},
            "return_60d": {"weight": 0.15, "direction": "positive"},
            "volatility_60d": {"weight": 0.20, "direction": "negative"},
            "drawdown": {"weight": 0.15, "direction": "negative_abs"},
            "rsi_14": {"weight": 0.10, "direction": "mean_revert_50"},
            "adx": {"weight": 0.15, "direction": "positive"},
        },
        "confidence_level": "medium",
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
    print(f"  BotBourse Model Training v2.0")
    print(f"  Started: {datetime.now(timezone.utc).isoformat()}")
    print(f"{'='*60}")

    # Save sector encoder for predict.py
    encoder_path = MODELS_DIR / "sector_encoder.pkl"
    with open(encoder_path, "wb") as f:
        pickle.dump({"encoder": _sector_encoder, "sector_list": SECTOR_LIST}, f)

    all_meta = []

    meta_short = train_short_term_model()
    if meta_short:
        all_meta.append(meta_short)

    meta_medium = train_medium_term_model()
    if meta_medium:
        all_meta.append(meta_medium)

    meta_long = train_long_term_model()
    if meta_long:
        all_meta.append({"horizon": "long", "type": meta_long.get("type", "heuristic"),
                         "version": "v2.0",
                         "trained_at": meta_long.get("trained_at", datetime.now(timezone.utc).isoformat())})

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
