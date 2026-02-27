"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function toggleWatchlist(ticker: string, isWatching: boolean) {
    const { userId } = await auth();

    if (!userId) {
        throw new Error("Unauthorized");
    }

    if (isWatching) {
        await prisma.watchlistItem.deleteMany({
            where: {
                userId,
                ticker,
            },
        });
    } else {
        // Use upsert to prevent double-insert race conditions
        await prisma.watchlistItem.upsert({
            where: {
                userId_ticker: {
                    userId,
                    ticker,
                },
            },
            update: {},
            create: {
                userId,
                ticker,
            },
        });
    }

    revalidatePath("/portfolio");
    revalidatePath(`/asset/${ticker}`);
}

export async function getUserWatchlist() {
    const { userId } = await auth();

    if (!userId) {
        return [];
    }

    const items = await prisma.watchlistItem.findMany({
        where: { userId },
        select: { ticker: true },
        orderBy: { createdAt: 'desc' }
    });

    return items.map((i) => i.ticker);
}
