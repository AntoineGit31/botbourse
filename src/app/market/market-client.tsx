"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { MagnifyingGlass, ArrowUp, ArrowDown, Funnel } from "@phosphor-icons/react";
import { formatPrice, formatChangePercent } from "@/lib/utils";
import { REGIONS, SECTORS, ASSET_TYPES } from "@/lib/constants";
import type { Asset, MarketIndex, Region, Sector, AssetType } from "@/lib/types";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonRow from "@/components/ui/SkeletonRow";
import { useTranslation } from "@/components/I18nProvider";

export default function MarketClient() {
    const { t } = useTranslation();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [indices, setIndices] = useState<MarketIndex[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [regionFilter, setRegionFilter] = useState<Region | "all">("all");
    const [sectorFilter, setSectorFilter] = useState<Sector | "all">("all");
    const [typeFilter, setTypeFilter] = useState<AssetType | "all">("all");

    useEffect(() => {
        async function fetchData() {
            try {
                const [assetsRes, indicesRes] = await Promise.all([
                    fetch("/api/assets"),
                    fetch("/api/indices"),
                ]);
                const assetsData = await assetsRes.json();
                const indicesData = await indicesRes.json();
                setAssets(assetsData);
                setIndices(indicesData);
            } catch (err) {
                console.error("Failed to load market data:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const filteredAssets = useMemo(() => {
        return assets.filter((a) => {
            if (search && !a.ticker.toLowerCase().includes(search.toLowerCase()) && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
            if (regionFilter !== "all" && a.region !== regionFilter) return false;
            if (sectorFilter !== "all" && a.sector !== sectorFilter) return false;
            if (typeFilter !== "all" && a.assetType !== typeFilter) return false;
            return true;
        });
    }, [assets, search, regionFilter, sectorFilter, typeFilter]);

    const gainers = [...assets].filter(a => a.price > 0).sort((a, b) => b.changePercent - a.changePercent).slice(0, 5);
    const losers = [...assets].filter(a => a.price > 0).sort((a, b) => a.changePercent - b.changePercent).slice(0, 5);

    return (
        <div className="px-4 sm:px-6 py-8 md:py-12" style={{ maxWidth: "var(--container-max)", margin: "0 auto" }}>
            {/* ─── Page Header ─── */}
            <div className="mb-8">
                <h1
                    className="text-3xl md:text-4xl font-bold tracking-tighter mb-2"
                    style={{ color: "var(--text-primary)" }}
                >
                    {t("market.title")}
                </h1>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {loading ? t("market.loading") : t("market.subtitle", { count: assets.length })}
                </p>
            </div>

            {/* ─── Indices Bar ─── */}
            <div
                className="flex gap-3 overflow-x-auto pb-3 mb-8 -mx-4 px-4 sm:-mx-6 sm:px-6"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                {loading ? (
                    Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="flex-shrink-0 rounded-xl px-4 py-3 skeleton" style={{ minWidth: 160, height: 64 }} />
                    ))
                ) : (
                    indices.map((idx, i) => (
                        <div
                            key={idx.ticker}
                            className="flex-shrink-0 rounded-xl px-4 py-3 stagger-item"
                            style={{
                                "--index": i,
                                background: "var(--bg-surface)",
                                border: "1px solid var(--border)",
                                minWidth: 160,
                            } as React.CSSProperties}
                        >
                            <div className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                                {idx.name}
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-sm font-semibold num" style={{ color: "var(--text-primary)" }}>
                                    {idx.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </span>
                                <span
                                    className="text-xs font-medium num"
                                    style={{ color: idx.changePercent >= 0 ? "var(--accent)" : "var(--negative)" }}
                                >
                                    {formatChangePercent(idx.changePercent)}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* ─── Filter Bar ─── */}
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
                            // For others, fall back to english -> french if available in generic terms
                            return <option key={opt.value} value={opt.value}>{translatedOpt}</option>;
                        })}
                    </select>
                ))}
            </div>

            {/* ─── Asset Table ─── */}
            <div
                className="rounded-xl overflow-hidden mb-12"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
            >
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

                {loading ? (
                    Array.from({ length: 12 }).map((_, i) => <SkeletonRow key={i} />)
                ) : filteredAssets.length === 0 ? (
                    <EmptyState title={t("market.empty.title")} description={t("market.empty.desc")} />
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

            {/* ─── Top Gainers / Top Losers ─── */}
            {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-6 mb-8">
                    <MoverSection title={t("market.top.gainers")} assets={gainers} isPositive />
                    <MoverSection title={t("market.top.losers")} assets={losers} isPositive={false} />
                </div>
            )}
        </div>
    );
}

function MoverSection({ title, assets, isPositive }: { title: string; assets: Asset[]; isPositive: boolean }) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                {isPositive ? <ArrowUp size={16} weight="bold" color="var(--accent)" /> : <ArrowDown size={16} weight="bold" color="var(--negative)" />}
                <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h2>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                {assets.map((asset, i) => (
                    <Link
                        key={asset.ticker}
                        href={`/asset/${asset.ticker}`}
                        className="flex items-center justify-between px-4 py-3 tactile"
                        style={{
                            borderBottom: i < assets.length - 1 ? "1px solid var(--border)" : "none",
                            transition: "background var(--transition-fast)",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                        <div className="flex-1 min-w-0">
                            <span className="text-sm font-semibold num" style={{ color: "var(--text-primary)" }}>{asset.ticker}</span>
                            <span className="text-xs ml-2 truncate" style={{ color: "var(--text-muted)" }}>{asset.name}</span>
                        </div>
                        <span className="text-sm font-semibold num" style={{ color: isPositive ? "var(--accent)" : "var(--negative)" }}>
                            {formatChangePercent(asset.changePercent)}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
