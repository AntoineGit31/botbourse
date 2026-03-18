import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ ticker: string }> }
) {
    try {
        const { ticker } = await params;
        if (!ticker) {
            return NextResponse.json({ error: "Ticker is required." }, { status: 400 });
        }

        const safeTicker = ticker.replace(/\./g, "_").replace(/\^/g, "");
        const filePath = path.join(process.cwd(), "public", "data", "features", `${safeTicker}.json`);

        const raw = await fs.readFile(filePath, "utf-8");
        const data = JSON.parse(raw);

        return NextResponse.json(data);
    } catch {
        return NextResponse.json(null, { status: 200 });
    }
}
