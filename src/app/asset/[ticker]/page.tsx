import { Metadata } from "next";
import { headers } from "next/headers";
import { getAssetByTicker, getPredictions } from "@/lib/data";
import { getUserWatchlist } from "@/app/actions/watchlist";
import AssetDetailClient from "./asset-detail-client";
import type { OHLCData } from "@/lib/types";

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

async function fetchPricesFromAPI(ticker: string): Promise<OHLCData[]> {
    try {
        const headersList = await headers();
        const host = headersList.get("host") || "localhost:3000";
        const protocol = headersList.get("x-forwarded-proto") || "http";
        const safeTicker = ticker.replace(/\./g, "_").replace(/\^/g, "");
        
        // Fetch static JSON file directly from public folder via CDN instead of API route
        const res = await fetch(`${protocol}://${host}/data/prices/${safeTicker}.json`, {
            cache: "no-store",
        });
        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
}

async function fetchFeaturesFromAPI(ticker: string): Promise<Record<string, number | string | null> | null> {
    try {
        const headersList = await headers();
        const host = headersList.get("host") || "localhost:3000";
        const protocol = headersList.get("x-forwarded-proto") || "http";
        const safeTicker = ticker.replace(/\./g, "_").replace(/\^/g, "");
        
        // Fetch static JSON file directly from public folder via CDN instead of API route
        const res = await fetch(`${protocol}://${host}/data/features/${safeTicker}.json`, {
            cache: "no-store",
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

export default async function AssetDetailPage({ params }: PageProps) {
    const resolvedParams = await params;
    const ticker = decodeURIComponent(resolvedParams.ticker);

    const [asset, allPredictions, prices, features, userWatchlist] = await Promise.all([
        getAssetByTicker(ticker),
        getPredictions(),
        fetchPricesFromAPI(ticker),
        fetchFeaturesFromAPI(ticker),
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
