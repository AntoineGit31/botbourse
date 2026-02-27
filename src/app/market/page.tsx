import { Metadata } from "next";
import MarketClient from "./market-client";

export const metadata: Metadata = {
    title: "Markets",
    description: "Real-time overview of stocks, ETFs, and major indices tracked by BotBourse.",
};

export default function MarketPage() {
    return <MarketClient />;
}
