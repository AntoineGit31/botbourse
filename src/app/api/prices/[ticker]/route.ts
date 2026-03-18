import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// This route reads individual price files. Because it uses a dynamic path.join,
// we explicitly configure file tracing to include the prices directory ONLY here.
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
        const filePath = path.join(process.cwd(), "public", "data", "prices", `${safeTicker}.json`);

        const raw = await fs.readFile(filePath, "utf-8");
        const data = JSON.parse(raw);

        return NextResponse.json(data);
    } catch {
        return NextResponse.json([], { status: 200 });
    }
}
