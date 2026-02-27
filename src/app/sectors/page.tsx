import { Metadata } from "next";
import { getScreenerData } from "@/lib/data";
import SectorsClient from "./sectors-client";

export const metadata: Metadata = {
    title: "Sector Analysis",
    description: "Sector performance heatmap, rotation signals, and top/bottom performers across all market sectors.",
};

export const dynamic = "force-dynamic";

export default async function SectorsPage() {
    const data = await getScreenerData();
    return <SectorsClient data={data} />;
}
