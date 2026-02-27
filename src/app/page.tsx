import HomeClient from "./home-client";
import { getPredictions, getAssets } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [predictions, assets] = await Promise.all([
    getPredictions(),
    getAssets()
  ]);

  const previewPredictions = predictions
    .filter((p) => p.horizon === "short" && p.expectedReturn > 0)
    .sort((a, b) => b.expectedReturn - a.expectedReturn)
    .slice(0, 5);

  const marketPulse = assets.slice(0, 15); // Top 15 assets for the ticker

  return <HomeClient previewPredictions={previewPredictions} marketPulse={marketPulse} />;
}
