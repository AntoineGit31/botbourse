import { Metadata } from "next";
import PredictionsClient from "./predictions-client";
import { getPredictions, getWatchlist, getPipelineMeta } from "@/lib/data";

export const metadata: Metadata = {
    title: "Model Room",
    description: "Ranked AI predictions and model signals for stocks and ETFs across multiple time horizons.",
};

export const dynamic = "force-dynamic";

export default async function PredictionsPage() {
    const [predictions, watchlist, meta] = await Promise.all([
        getPredictions(),
        getWatchlist(),
        getPipelineMeta(),
    ]);

    const lastRun = (meta as Record<string, unknown>)?.lastPredictedAt as string
        ?? (meta as Record<string, unknown>)?.lastFetchedAt as string
        ?? new Date().toISOString();

    const predictionCount = (meta as Record<string, unknown>)?.predictionCount as number ?? predictions.length;
    const assetCount = (meta as Record<string, unknown>)?.assetCount as number ?? Math.floor(predictions.length / 3);

    return (
        <PredictionsClient
            predictions={predictions}
            watchlist={watchlist}
            lastRun={lastRun}
            predictionCount={predictionCount}
            assetCount={assetCount}
        />
    );
}
