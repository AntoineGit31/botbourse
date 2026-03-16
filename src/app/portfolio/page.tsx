import { Metadata } from "next";
import { getScreenerData } from "@/lib/data";
import PortfolioClient from "./portfolio-client";
import { getUserPortfolio } from "../actions/portfolio";

export const metadata: Metadata = {
    title: "Portfolio Simulator",
    description: "Build a virtual portfolio, see aggregate risk/return, diversification score, and model-predicted performance.",
};

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
    const screenerData = await getScreenerData();
    const dbPortfolio = await getUserPortfolio();
    return <PortfolioClient screenerData={screenerData} initialDbPortfolio={dbPortfolio} />;
}
