import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ ticker: string }> }) {
    try {
        const { ticker } = await params;
        if (!ticker) {
            return NextResponse.json({ error: "Ticker is strictly required." }, { status: 400 });
        }

        // Direct fetch to open YF v8 charting API to avoid package rate-limits
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=5m&range=1d`;

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

        // Parse intraday data
        const timestamp = result.timestamp || [];
        const quote = result.indicators?.quote?.[0] || {};
        const closes = quote.close || [];

        const intradayPrices = [];
        for (let i = 0; i < timestamp.length; i++) {
            if (closes[i] !== null && closes[i] !== undefined) {
                intradayPrices.push({
                    time: timestamp[i], // Unix timestamp in seconds
                    open: quote.open?.[i] ?? closes[i],
                    high: quote.high?.[i] ?? closes[i],
                    low: quote.low?.[i] ?? closes[i],
                    close: closes[i],
                    volume: quote.volume?.[i] ?? 0
                });
            }
        }

        // Add the very latest price as the last data point if necessary
        if (intradayPrices.length > 0 && price > 0) {
            const lastData = intradayPrices[intradayPrices.length - 1];
            // If the latest quote is sufficiently detached from the last 5m close, we could inject it,
            // but the 1d range generally gives enough recency. We'll simply let intradayPrices chart handle it.
        }

        return NextResponse.json({
            price,
            change,
            changePercent,
            volume,
            intradayPrices,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error("Live Data Fetch Error:", error.message);
        return NextResponse.json({ error: "Failed to fetch live market data." }, { status: 500 });
    }
}
