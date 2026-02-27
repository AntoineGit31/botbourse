import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), "public", "data", "indices.json");
        const raw = await fs.readFile(filePath, "utf-8");
        const data = JSON.parse(raw);
        return NextResponse.json(data);
    } catch (error) {
        const { MOCK_INDICES } = await import("@/lib/mock-data");
        return NextResponse.json(MOCK_INDICES);
    }
}
