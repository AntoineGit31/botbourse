"""
BotBourse Full Pipeline

Orchestrates: data fetch → feature engineering → model training → predictions.
Run with: python pipeline.py [--skip-fetch] [--skip-train]
"""

import sys
import time
from datetime import datetime, timezone


def main():
    start = time.time()
    args = sys.argv[1:]

    skip_fetch = "--skip-fetch" in args
    skip_train = "--skip-train" in args

    timestamp = datetime.now(timezone.utc).isoformat()
    print(f"\n{'='*60}")
    print(f"  BotBourse Full Pipeline")
    print(f"  Started: {timestamp}")
    print(f"{'='*60}\n")

    # ── Step 1: Fetch market data ──
    if not skip_fetch:
        print(f"\n{'-'*40}")
        print(f"  STEP 1: Fetching market data")
        print(f"{'-'*40}\n")
        from fetcher import run_fetcher
        run_fetcher()
    else:
        print("  [*] Skipping data fetch (--skip-fetch)")

    # ── Step 2: Feature engineering ──
    print(f"\n{'-'*40}")
    print(f"  STEP 2: Computing features")
    print(f"{'-'*40}\n")
    from features import run_features
    run_features()

    # ── Step 3: Model training ──
    if not skip_train:
        print(f"\n{'-'*40}")
        print(f"  STEP 3: Training models")
        print(f"{'-'*40}\n")
        from train import run_training
        run_training()
    else:
        print("  [*] Skipping model training (--skip-train)")

    # ── Step 4: Generate predictions ──
    print(f"\n{'-'*40}")
    print(f"  STEP 4: Generating ML predictions")
    print(f"{'-'*40}\n")
    from predict import run_predictions
    run_predictions()

    elapsed = time.time() - start
    print(f"\n{'='*60}")
    print(f"  Pipeline complete in {elapsed:.1f}s")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
