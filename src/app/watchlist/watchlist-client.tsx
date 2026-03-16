"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { MagnifyingGlass, Funnel, Star, SignIn } from "@phosphor-icons/react";
import { formatPrice, formatChangePercent } from "@/lib/utils";
import { REGIONS, SECTORS, ASSET_TYPES } from "@/lib/constants";
import type { Asset, Region, Sector, AssetType } from "@/lib/types";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonRow from "@/components/ui/SkeletonRow";
import { useTranslation } from "@/components/I18nProvider";
import { SignInButton } from "@clerk/nextjs";

interface WatchlistClientProps {
    initialWatchlist: string[];
    isSignedIn: boolean;
}

export default function WatchlistClient({ initialWatchlist, isSignedIn }: WatchlistClientProps) {
    const { t } = useTranslation();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [regionFilter, setRegionFilter] = useState<Region | "all">("all");
    const [sectorFilter, setSectorFilter] = useState<Sector | "all">("all");
    const [typeFilter, setTypeFilter] = useState<AssetType | "all">("all");

    useEffect(() => {
        if (!isSignedIn || initialWatchlist.length === 0) {
            setLoading(false);
            return;
        }

        async function fetchData() {
            try {
                const res = await fetch("/api/assets");
                const allAssets: Asset[] = await res.json();
                
                // Only keep assets that are in the user's watchlist
                const watchedAssets = allAssets.filter(a => initialWatchlist.includes(a.ticker));
                setAssets(watchedAssets);
            } catch (err) {
                console.error("Failed to load market data:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [isSignedIn, initialWatchlist]);

    const filteredAssets = useMemo(() => {
        return assets.filter((a) => {
            if (search && !a.ticker.toLowerCase().includes(search.toLowerCase()) && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
            if (regionFilter !== "all" && a.region !== regionFilter) return false;
            if (sectorFilter !== "all" && a.sector !== sectorFilter) return false;
            if (typeFilter !== "all" && a.assetType !== typeFilter) return false;
            return true;
        });
    }, [assets, search, regionFilter, sectorFilter, typeFilter]);

    // Compute the empty state UI rendering
    const renderEmptyState = () => {
        if (!isSignedIn) {
            return (
                <div className="p-12 text-center flex flex-col items-center">
                    <SignIn size={48} weight="duotone" color="var(--text-muted)" className="mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{t("watch.login.title")}</h3>
                    <p className="text-sm mb-6 max-w-md" style={{ color: "var(--text-secondary)" }}>{t("watch.login.desc")}</p>
                    <SignInButton mode="modal">
                        <button className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold tactile"
                            style={{
                                background: "var(--accent)",
                                color: "var(--bg-primary)",
                                transition: "transform 0.2s ease"
                            }}
                        >
                            <SignIn size={18} weight="bold" />
                            Login
                        </button>
                    </SignInButton>
                </div>
            );
        }

        if (initialWatchlist.length === 0) {
            return (
                <div className="p-12 text-center flex flex-col items-center">
                    <Star size={48} weight="duotone" color="var(--accent)" className="mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{t("watch.empty.title")}</h3>
                    <p className="text-sm max-w-md mb-6" style={{ color: "var(--text-secondary)" }}>{t("watch.empty.desc")}</p>
                    <Link href="/market" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium tactile"
                        style={{
                            background: "var(--bg-elevated)",
                            border: "1px solid var(--border)",
                            color: "var(--text-secondary)"
                        }}
                    >
                        Browse Markets
                    </Link>
                </div>
            );
        }

        return <EmptyState title={t("market.empty.title")} description={t("market.empty.desc")} />;
    };

    return (
        <div className="px-4 sm:px-6 py-8 md:py-12" style={{ maxWidth: "var(--container-max)", margin: "0 auto" }}>
            {/* ─── Page Header ─── */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Star size={24} weight="fill" color="var(--accent)" />
                    <h1
                        className="text-3xl md:text-4xl font-bold tracking-tighter"
                        style={{ color: "var(--text-primary)" }}
                    >
                        {t("watch.title")}
                    </h1>
                </div>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {loading ? t("market.loading") : t("watch.subtitle", { count: assets.length })}
                </p>
            </div>

            {/* ─── Filter Bar ─── */}
            {isSignedIn && initialWatchlist.length > 0 && (
                <div
                    className="flex flex-wrap items-center gap-3 mb-6 p-3 rounded-xl"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                >
                    <div
                        className="flex items-center gap-2 rounded-lg px-3 py-2 flex-1 min-w-[200px]"
                        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
                    >
                        <MagnifyingGlass size={16} color="var(--text-muted)" />
                        <input
                            type="text"
                            placeholder={t("market.search")}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-transparent outline-none text-sm w-full"
                            style={{ color: "var(--text-primary)" }}
                        />
                    </div>

                    <Funnel size={16} color="var(--text-muted)" className="hidden sm:block" />

                    {[
                        { value: regionFilter, onChange: setRegionFilter, options: REGIONS },
                        { value: sectorFilter, onChange: setSectorFilter, options: SECTORS },
                        { value: typeFilter, onChange: setTypeFilter, options: ASSET_TYPES },
                    ].map((filter, idx) => (
                        <select
                            key={idx}
                            value={filter.value}
                            onChange={(e) => filter.onChange(e.target.value as never)}
                            className="rounded-lg px-3 py-2 text-sm outline-none cursor-pointer"
                            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                        >
                            {filter.options.map((opt) => {
                                let translatedOpt = opt.label;
                                if (opt.value === "all") translatedOpt = t("screener.filter.all");
                                return <option key={opt.value} value={opt.value}>{translatedOpt}</option>;
                            })}
                        </select>
                    ))}
                </div>
            )}

            {/* ─── Asset Table ─── */}
            <div
                className="rounded-xl overflow-hidden mb-12"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
            >
                {isSignedIn && initialWatchlist.length > 0 && (
                    <div
                        className="grid gap-4 px-4 py-3 text-xs font-medium uppercase tracking-wider"
                        style={{
                            color: "var(--text-muted)",
                            borderBottom: "1px solid var(--border)",
                            gridTemplateColumns: "80px 1fr 100px 90px 80px 80px",
                        }}
                    >
                        <span>{t("market.table.ticker")}</span>
                        <span>{t("market.table.name")}</span>
                        <span className="text-right">{t("market.table.price")}</span>
                        <span className="text-right">{t("market.table.change")}</span>
                        <span className="text-right">{t("market.table.type")}</span>
                        <span className="text-right">{t("market.table.region")}</span>
                    </div>
                )}

                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                ) : filteredAssets.length === 0 ? (
                    renderEmptyState()
                ) : (
                    filteredAssets.map((asset, i) => (
                        <Link
                            key={asset.ticker}
                            href={`/asset/${asset.ticker}`}
                            className="grid gap-4 px-4 py-3.5 items-center stagger-item tactile"
                            style={{
                                "--index": i % 20,
                                gridTemplateColumns: "80px 1fr 100px 90px 80px 80px",
                                borderBottom: "1px solid var(--border)",
                                transition: "background var(--transition-fast)",
                            } as React.CSSProperties}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        >
                            <span className="text-sm font-semibold num" style={{ color: "var(--text-primary)" }}>
                                {asset.ticker}
                            </span>
                            <span className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>
                                {asset.name}
                            </span>
                            <span className="text-sm text-right num" style={{ color: "var(--text-primary)" }}>
                                {asset.price > 0 ? formatPrice(asset.price, asset.currency) : "—"}
                            </span>
                            <span
                                className="text-sm text-right num font-medium"
                                style={{ color: asset.changePercent >= 0 ? "var(--accent)" : "var(--negative)" }}
                            >
                                {asset.price > 0 ? formatChangePercent(asset.changePercent) : "—"}
                            </span>
                            <span className="text-xs text-right uppercase" style={{ color: "var(--text-muted)" }}>
                                {asset.assetType}
                            </span>
                            <span className="text-xs text-right" style={{ color: "var(--text-muted)" }}>
                                {asset.region}
                            </span>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
