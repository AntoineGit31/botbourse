import { Metadata } from "next";
import { getAssetByTicker, getPredictions, getPrices, getFeatures } from "@/lib/data";
import { getUserWatchlist } from "@/app/actions/watchlist";
import AssetDetailClient from "./asset-detail-client";

interface PageProps {
    params: Promise<{ ticker: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const resolvedParams = await params;
    const ticker = decodeURIComponent(resolvedParams.ticker);
    const asset = await getAssetByTicker(ticker);

    if (!asset) {
        return { title: "Asset Not Found" };
    }

    return {
        title: `${asset.ticker} — ${asset.name}`,
        description: `View price charts, key metrics, and model predictions for ${asset.name} (${asset.ticker}).`,
    };
}

export const dynamic = "force-dynamic";

export default async function AssetDetailPage({ params }: PageProps) {
    const resolvedParams = await params;
    const ticker = decodeURIComponent(resolvedParams.ticker);

    const [asset, allPredictions, prices, features, userWatchlist] = await Promise.all([
        getAssetByTicker(ticker),
        getPredictions(),
        getPrices(ticker),
        getFeatures(ticker),
        getUserWatchlist(),
    ]);

    const predictions = allPredictions.filter((p) => p.ticker === ticker);
    const isWatching = userWatchlist.includes(ticker);

    return (
        <AssetDetailClient
            asset={asset}
            predictions={predictions}
            prices={prices}
            features={features}
            ticker={ticker}
            isWatchingInitial={isWatching}
        />
    );
}
