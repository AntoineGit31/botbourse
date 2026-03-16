import { Metadata } from "next";
import WatchlistClient from "./watchlist-client";
import { getUserWatchlist } from "@/app/actions/watchlist";
import { auth } from "@clerk/nextjs/server";

export const metadata: Metadata = {
    title: "Watchlist - BotBourse",
    description: "Your personalized asset watchlist.",
};

export default async function WatchlistPage() {
    const { userId } = await auth();
    const activeWatchlist = userId ? await getUserWatchlist() : [];

    return <WatchlistClient initialWatchlist={activeWatchlist} isSignedIn={!!userId} />;
}
