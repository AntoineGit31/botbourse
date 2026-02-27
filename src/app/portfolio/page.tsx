import { Metadata } from "next";
import { getScreenerData } from "@/lib/data";
import PortfolioClient from "./portfolio-client";

export const metadata: Metadata = {
    title: "Portfolio Simulator",
    description: "Build a virtual portfolio, see aggregate risk/return, diversification score, and model-predicted performance.",
};

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
    const screenerData = await getScreenerData();
    return <PortfolioClient screenerData={screenerData} />;
}
