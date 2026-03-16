"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function getUserPortfolio() {
    const { userId } = await auth();

    if (!userId) {
        return null;
    }

    const items = await prisma.portfolioItem.findMany({
        where: { userId },
        select: { ticker: true, shares: true },
        orderBy: { createdAt: 'asc' } // Keep some order
    });

    return items;
}

export async function saveUserPortfolio(items: { ticker: string, shares: number }[]) {
    const { userId } = await auth();

    if (!userId) {
        return { success: false, error: "Unauthorized" };
    }

    // We can do this in a transaction: delete old, create new
    // This is simple since portfolio items aren't huge
    try {
        await prisma.$transaction(async (tx) => {
            await tx.portfolioItem.deleteMany({
                where: { userId }
            });
            
            if (items.length > 0) {
                await tx.portfolioItem.createMany({
                    data: items.map(i => ({
                        userId,
                        ticker: i.ticker,
                        shares: i.shares
                    }))
                });
            }
        });
        return { success: true };
    } catch (e) {
        console.error("Failed to save portfolio to DB", e);
        return { success: false, error: "Database error" };
    }
}
