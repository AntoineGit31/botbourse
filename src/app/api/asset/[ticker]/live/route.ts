import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ ticker: string }> }) {
    try {
        const { ticker } = await params;
        if (!ticker) {
            return NextResponse.json({ error: "Ticker is strictly required." }, { status: 400 });
        }

        // Direct fetch to open YF v8 charting API to avoid package rate-limits
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;

        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Accept": "application/json"
            },
            next: { revalidate: 0 } // no-cache
        });

        if (!res.ok) {
            return NextResponse.json({ error: "API limit reached or ticker not found." }, { status: res.status });
        }

        const data = await res.json();
        const result = data?.chart?.result?.[0];

        if (!result || !result.meta) {
            return NextResponse.json({ error: "Invalid data received." }, { status: 404 });
        }

        const meta = result.meta;
        const price = meta.regularMarketPrice ?? 0;
        const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? 0;

        const change = price - prevClose;
        const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
        const volume = meta.regularMarketVolume ?? 0;

        return NextResponse.json({
            price,
            change,
            changePercent,
            volume,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error("Live Data Fetch Error:", error.message);
        return NextResponse.json({ error: "Failed to fetch live market data." }, { status: 500 });
    }
}
