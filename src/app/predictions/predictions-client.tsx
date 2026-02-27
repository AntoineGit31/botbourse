"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
    Brain,
    ArrowRight,
    TrendUp,
    TrendDown,
    Binoculars,
    Lightning,
    Info,
    Clock,
    ChartBar,
    Target,
} from "@phosphor-icons/react";
import { HORIZONS, REGIONS, SECTORS, ASSET_TYPES, MODEL_VERSION } from "@/lib/constants";
import { formatReturn, getHorizonLabel, getConfidenceDisplay } from "@/lib/utils";
import type { Horizon, Region, Sector, AssetType, Prediction, WatchlistItem } from "@/lib/types";
import TrendBadge from "@/components/ui/TrendBadge";
import RiskDots from "@/components/ui/RiskDots";
import GlassPanel from "@/components/ui/GlassPanel";
import EmptyState from "@/components/ui/EmptyState";
import { useTranslation } from "@/components/I18nProvider";

interface PredictionsClientProps {
    predictions: Prediction[];
    watchlist: WatchlistItem[];
    lastRun: string;
    predictionCount: number;
    assetCount: number;
}

export default function PredictionsClient({
    predictions, watchlist, lastRun, predictionCount, assetCount,
}: PredictionsClientProps) {
    const { t } = useTranslation();
    const [horizon, setHorizon] = useState<Horizon>("short");
    const [regionFilter, setRegionFilter] = useState<Region | "all">("all");
    const [sectorFilter, setSectorFilter] = useState<Sector | "all">("all");
    const [typeFilter, setTypeFilter] = useState<AssetType | "all">("all");

    const filtered = useMemo(() => {
        return predictions.filter((p) => {
            if (p.horizon !== horizon) return false;
            if (regionFilter !== "all" && p.region !== regionFilter) return false;
            if (sectorFilter !== "all" && p.sector !== sectorFilter) return false;
            if (typeFilter !== "all" && p.assetType !== typeFilter) return false;
            return true;
        });
    }, [predictions, horizon, regionFilter, sectorFilter, typeFilter]);

    const opportunities = filtered
        .filter((p) => p.expectedReturn > 0)
        .sort((a, b) => b.expectedReturn - a.expectedReturn);

    const risks = filtered
        .filter((p) => p.expectedReturn <= 0)
        .sort((a, b) => a.expectedReturn - b.expectedReturn);

    const lastRunDate = new Date(lastRun).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    });

    // Compute quick stats for the header
    const avgReturn = filtered.length
        ? filtered.reduce((acc, p) => acc + p.expectedReturn, 0) / filtered.length
        : 0;
    const bullishCount = filtered.filter(p => p.trendLabel === "bullish").length;
    const bearishCount = filtered.filter(p => p.trendLabel === "bearish").length;

    return (
        <div className="px-4 sm:px-6 py-8 md:py-12" style={{ maxWidth: "var(--container-max)", margin: "0 auto" }}>
            {/* ─── Page Header ─── */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Brain size={20} weight="fill" color="var(--accent)" />
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tighter" style={{ color: "var(--text-primary)" }}>
                            {t("preds.title")}
                        </h1>
                    </div>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {t("preds.subtitle", { predCount: predictionCount, assetCount })}
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                    <Clock size={14} />
                    <span>{t("preds.last_updated")} <span className="num">{lastRunDate}</span></span>
                </div>
            </div>

            {/* ─── Quick Stats Strip ─── */}
            <div className="flex gap-3 overflow-x-auto pb-2 mb-6 -mx-4 px-4 sm:-mx-6 sm:px-6" style={{ scrollbarWidth: "none" }}>
                {[
                    { label: t("preds.stat.filtered"), value: `${filtered.length}`, icon: <ChartBar size={14} weight="bold" color="var(--accent)" /> },
                    { label: t("preds.stat.bullish"), value: `${bullishCount}`, icon: <TrendUp size={14} weight="bold" color="var(--accent)" /> },
                    { label: t("preds.stat.bearish"), value: `${bearishCount}`, icon: <TrendDown size={14} weight="bold" color="var(--negative)" /> },
                    { label: t("preds.stat.avg_expected"), value: formatReturn(avgReturn), icon: <Target size={14} weight="bold" color="var(--neutral-accent)" /> },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="flex-shrink-0 rounded-xl px-4 py-2.5 flex items-center gap-3"
                        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", minWidth: 130 }}
                    >
                        {stat.icon}
                        <div>
                            <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{stat.label}</div>
                            <div className="text-sm font-semibold num" style={{ color: "var(--text-primary)" }}>{stat.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ─── Filter Bar ─── */}
            <div className="rounded-xl p-3 mb-8" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex rounded-lg p-1" style={{ background: "var(--bg-elevated)" }}>
                        {HORIZONS.map((h) => (
                            <button
                                key={h.value}
                                onClick={() => setHorizon(h.value)}
                                className="px-3.5 py-1.5 rounded-md text-xs font-medium tactile"
                                style={{
                                    background: horizon === h.value ? "var(--bg-surface)" : "transparent",
                                    color: horizon === h.value ? "var(--text-primary)" : "var(--text-muted)",
                                    boxShadow: horizon === h.value ? "var(--shadow-sm)" : "none",
                                    transition: "all var(--transition-fast)",
                                }}
                            >
                                {h.label}
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-6 hidden sm:block" style={{ background: "var(--border)" }} />

                    {[
                        { value: regionFilter, onChange: setRegionFilter, options: REGIONS },
                        { value: typeFilter, onChange: setTypeFilter, options: ASSET_TYPES },
                        { value: sectorFilter, onChange: setSectorFilter, options: SECTORS },
                    ].map((filter, idx) => (
                        <select
                            key={idx}
                            value={filter.value}
                            onChange={(e) => filter.onChange(e.target.value as never)}
                            className="rounded-lg px-3 py-1.5 text-xs outline-none cursor-pointer"
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

                <div className="flex items-center gap-1.5 mt-2.5 px-1">
                    <Info size={12} color="var(--text-muted)" />
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {HORIZONS.find((h) => h.value === horizon)?.description} — {t("preds.disclaimer")}
                    </span>
                </div>
            </div>

            {/* ─── Main Content Grid ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-6 lg:gap-8 mb-12">
                {/* LEFT — Opportunities */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <TrendUp size={18} weight="bold" color="var(--accent)" />
                        <h2 className="text-lg font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                            {t("preds.opps.title")}
                        </h2>
                        <span className="text-xs px-2 py-0.5 rounded-full num" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                            {opportunities.length}
                        </span>
                    </div>

                    {opportunities.length === 0 ? (
                        <EmptyState title={t("preds.opps.empty_title")} description={t("preds.opps.empty_desc")} />
                    ) : (
                        <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                            {opportunities.map((pred, i) => (
                                <PredictionRow key={`${pred.ticker}-${pred.horizon}`} prediction={pred} index={i} />
                            ))}
                        </div>
                    )}
                </div>

                {/* RIGHT — Watchlist */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Binoculars size={18} weight="bold" color="var(--neutral-accent)" />
                        <h2 className="text-lg font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                            {t("preds.watchlist.title")}
                        </h2>
                        <span className="text-xs px-2 py-0.5 rounded-full num" style={{ background: "var(--neutral-soft)", color: "var(--neutral-accent)" }}>
                            {watchlist.length}
                        </span>
                    </div>

                    <GlassPanel className="p-0 overflow-hidden">
                        {watchlist.length === 0 ? (
                            <div className="p-6 text-sm" style={{ color: "var(--text-muted)" }}>
                                {t("preds.watchlist.empty")}
                            </div>
                        ) : (
                            watchlist.map((item, i) => (
                                <WatchlistRow key={`${item.ticker}-${i}`} item={item} index={i} isLast={i === watchlist.length - 1} />
                            ))
                        )}
                    </GlassPanel>
                </div>
            </div>

            {/* ─── Headwinds Section ─── */}
            <div className="mb-12">
                <div className="flex items-center gap-2 mb-4">
                    <TrendDown size={18} weight="bold" color="var(--negative)" />
                    <h2 className="text-lg font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                        {t("preds.risk.title")}
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full num" style={{ background: "var(--negative-soft)", color: "var(--negative)" }}>
                        {risks.length}
                    </span>
                </div>

                {risks.length === 0 ? (
                    <EmptyState title={t("preds.risk.empty_title")} description={t("preds.risk.empty_desc")} />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-4">
                        {risks.slice(0, 10).map((pred, i) => (
                            <div
                                key={`${pred.ticker}-${pred.horizon}`}
                                className="rounded-xl p-4 stagger-item tactile"
                                style={{
                                    "--index": i,
                                    background: "var(--bg-surface)",
                                    border: "1px solid var(--border)",
                                    transition: "background var(--transition-fast), transform var(--transition-fast)",
                                    cursor: "pointer",
                                } as React.CSSProperties}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-surface)"; }}
                            >
                                <Link href={`/asset/${pred.ticker}`} className="block">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold num" style={{ color: "var(--text-primary)" }}>{pred.ticker}</span>
                                            <TrendBadge trend={pred.trendLabel} />
                                        </div>
                                        <span className="text-base font-bold num" style={{ color: "var(--negative)" }}>
                                            {formatReturn(pred.expectedReturn)}
                                        </span>
                                    </div>
                                    <div className="text-xs mb-2 truncate" style={{ color: "var(--text-muted)" }}>{pred.name}</div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("preds.table.risk")}</span>
                                            <RiskDots score={pred.riskScore} />
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("preds.table.conf")}</span>
                                            <span className={`text-xs font-medium ${getConfidenceDisplay(pred.confidenceLevel).className}`}>
                                                {getConfidenceDisplay(pred.confidenceLevel).label}
                                            </span>
                                        </div>
                                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{getHorizonLabel(pred.horizon)}</span>
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Model Transparency Footer ─── */}
            <div
                className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
            >
                <div className="flex items-center gap-3">
                    <Lightning size={16} weight="fill" color="var(--accent)" />
                    <div>
                        <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{MODEL_VERSION}</span>
                        <span className="text-xs mx-2" style={{ color: "var(--text-muted)" }}>&middot;</span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("preds.footer.trained", { count: assetCount })}</span>
                        <span className="text-xs mx-2" style={{ color: "var(--text-muted)" }}>&middot;</span>
                        <span className="text-xs num" style={{ color: "var(--text-muted)" }}>{t("preds.footer.last_run", { date: lastRunDate })}</span>
                    </div>
                </div>
                <Link
                    href="/legal"
                    className="text-xs font-medium flex items-center gap-1 tactile"
                    style={{ color: "var(--accent)", transition: "opacity var(--transition-fast)" }}
                >
                    {t("preds.footer.how_it_works")}
                    <ArrowRight size={12} weight="bold" />
                </Link>
            </div>
        </div>
    );
}

// ─── Sub-components ───

function PredictionRow({ prediction, index }: { prediction: Prediction; index: number }) {
    const { t } = useTranslation();
    const conf = getConfidenceDisplay(prediction.confidenceLevel);
    return (
        <Link
            href={`/asset/${prediction.ticker}`}
            className="flex items-center gap-4 px-4 py-3.5 stagger-item tactile"
            style={{
                "--index": index % 20,
                borderBottom: "1px solid var(--border)",
                transition: "background var(--transition-fast)",
            } as React.CSSProperties}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
            <span className="text-xs font-semibold num flex-shrink-0" style={{ color: "var(--text-muted)", width: 20, textAlign: "center" }}>
                {index + 1}
            </span>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold num" style={{ color: "var(--text-primary)" }}>{prediction.ticker}</span>
                    <TrendBadge trend={prediction.trendLabel} />
                </div>
                <span className="text-xs truncate block mt-0.5" style={{ color: "var(--text-muted)" }}>{prediction.name}</span>
            </div>
            <div className="hidden sm:flex flex-col items-center gap-0.5">
                <span className="text-[10px] uppercase" style={{ color: "var(--text-muted)" }}>{t("preds.table.risk")}</span>
                <RiskDots score={prediction.riskScore} />
            </div>
            <div className="hidden sm:flex flex-col items-center gap-0.5">
                <span className="text-[10px] uppercase" style={{ color: "var(--text-muted)" }}>{t("preds.table.conf")}</span>
                <span className={`text-xs font-medium ${conf.className}`}>{conf.label}</span>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-sm font-bold num" style={{ color: prediction.expectedReturn >= 0 ? "var(--accent)" : "var(--negative)" }}>
                    {formatReturn(prediction.expectedReturn)}
                </span>
                <span className="text-[10px] num" style={{ color: "var(--text-muted)" }}>{getHorizonLabel(prediction.horizon)}</span>
            </div>
        </Link>
    );
}

function WatchlistRow({ item, index, isLast }: { item: WatchlistItem; index: number; isLast: boolean }) {
    const { t } = useTranslation();
    return (
        <Link
            href={`/asset/${item.ticker}`}
            className="block px-5 py-4 stagger-item tactile"
            style={{
                "--index": index,
                borderBottom: isLast ? "none" : "1px solid var(--border)",
                transition: "background var(--transition-fast)",
            } as React.CSSProperties}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold num" style={{ color: "var(--text-primary)" }}>{item.ticker}</span>
                <span className="text-xs px-2 py-0.5 rounded-md font-medium" style={{ background: "var(--neutral-soft)", color: "var(--neutral-accent)" }}>
                    {t("preds.watchlist.term", { term: item.horizon })}
                </span>
            </div>
            <div className="text-xs mb-1.5 truncate" style={{ color: "var(--text-muted)" }}>{item.name}</div>
            <div className="flex items-center gap-1.5">
                <Lightning size={12} weight="fill" color="var(--accent)" />
                <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>{item.signalPrimary}</span>
            </div>
            {item.signalSecondary && (
                <div className="text-[11px] mt-1 pl-[18px]" style={{ color: "var(--text-muted)" }}>
                    {item.signalSecondary}
                </div>
            )}
            <p className="text-xs leading-relaxed mt-2" style={{ color: "var(--text-muted)", maxWidth: "50ch" }}>
                {item.explanation}
            </p>
        </Link>
    );
}
