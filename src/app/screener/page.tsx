import { Metadata } from "next";
import { getScreenerData } from "@/lib/data";
import ScreenerClient from "./screener-client";

export const metadata: Metadata = {
    title: "Screener",
    description: "Filter and scan stocks and ETFs by technical indicators, risk scores, and AI predictions.",
};

export const dynamic = "force-dynamic";

export default async function ScreenerPage() {
    const data = await getScreenerData();
    return <ScreenerClient data={data} />;
}
