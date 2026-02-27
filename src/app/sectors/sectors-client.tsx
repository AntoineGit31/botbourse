"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
    GridFour,
    TrendUp,
    TrendDown,
    Pulse,
    ArrowRight,
    CaretRight,
} from "@phosphor-icons/react";
import { formatReturn, formatChangePercent } from "@/lib/utils";
import TrendBadge from "@/components/ui/TrendBadge";
import RiskDots from "@/components/ui/RiskDots";
import { useTranslation } from "@/components/I18nProvider";

// ─── Types ───

interface ScreenerItem {
    ticker: string;
    name: string;
    sector: string;
    region: string;
    assetType: string;
    price: number;
    changePercent: number;
    rsi: number | null;
    adx: number | null;
    volatility20d: number | null;
    drawdown: number | null;
    return5d: number | null;
    return20d: number | null;
    return60d: number | null;
    riskScore: number;
    shortTrend: string;
    shortReturn: number;
    mediumTrend: string;
    mediumReturn: number;
    longTrend: string;
    longReturn: number;
}

interface SectorStats {
    name: string;
    count: number;
    avgChange: number;
    avgReturn20d: number;
    avgReturn60d: number;
    avgRsi: number;
    avgVolatility: number;
    avgRisk: number;
    avgShortReturn: number;
    avgMediumReturn: number;
    bullishPct: number;
    bearishPct: number;
    topPerformers: ScreenerItem[];
    worstPerformers: ScreenerItem[];
    momentum: "accelerating" | "stable" | "decelerating";
    assets: ScreenerItem[];
}

interface SectorsClientProps {
    data: Record<string, unknown>[];
}

// ─── Helpers ───

function avg(vals: (number | null)[]): number {
    const valid = vals.filter((v): v is number => v != null && isFinite(v));
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
}

function getHeatColor(value: number, scale: number): string {
    const norm = Math.max(-1, Math.min(1, value / scale));
    if (norm > 0) {
        const intensity = Math.round(norm * 80 + 20);
        return `rgba(16, 185, 129, ${intensity / 100})`;
    } else {
        const intensity = Math.round(Math.abs(norm) * 80 + 20);
        return `rgba(244, 63, 94, ${intensity / 100})`;
    }
}

// ─── Component ───

export default function SectorsClient({ data }: SectorsClientProps) {
    const items = data as unknown as ScreenerItem[];
    const { t } = useTranslation();
    const [selectedSector, setSelectedSector] = useState<string | null>(null);
    const [heatMetric, setHeatMetric] = useState<"avgChange" | "avgReturn20d" | "avgMediumReturn">("avgReturn20d");

    // ── Compute sector stats ──
    const sectorStats = useMemo(() => {
        const grouped: Record<string, ScreenerItem[]> = {};
        for (const item of items) {
            const s = item.sector || "Diversified";
            if (!grouped[s]) grouped[s] = [];
            grouped[s].push(item);
        }

        const stats: SectorStats[] = Object.entries(grouped).map(([name, assets]) => {
            const sorted20d = [...assets].sort((a, b) => (b.return20d ?? 0) - (a.return20d ?? 0));
            const avgReturn20d = avg(assets.map(a => a.return20d));
            const avgReturn60d = avg(assets.map(a => a.return60d));

            // Momentum: compare 20d vs 60d/3 (normalized monthly)
            const monthlyFromQuarterly = avgReturn60d / 3;
            let momentum: SectorStats["momentum"] = "stable";
            if (avgReturn20d > monthlyFromQuarterly + 0.005) momentum = "accelerating";
            else if (avgReturn20d < monthlyFromQuarterly - 0.005) momentum = "decelerating";

            const bullish = assets.filter(a => a.shortTrend === "bullish").length;
            const bearish = assets.filter(a => a.shortTrend === "bearish").length;

            return {
                name,
                count: assets.length,
                avgChange: avg(assets.map(a => a.changePercent)),
                avgReturn20d,
                avgReturn60d,
                avgRsi: avg(assets.map(a => a.rsi)),
                avgVolatility: avg(assets.map(a => a.volatility20d)),
                avgRisk: avg(assets.map(a => a.riskScore)),
                avgShortReturn: avg(assets.map(a => a.shortReturn)),
                avgMediumReturn: avg(assets.map(a => a.mediumReturn)),
                bullishPct: assets.length > 0 ? bullish / assets.length : 0,
                bearishPct: assets.length > 0 ? bearish / assets.length : 0,
                topPerformers: sorted20d.slice(0, 3),
                worstPerformers: sorted20d.slice(-3).reverse(),
                momentum,
                assets,
            };
        });

        stats.sort((a, b) => {
            const va = a[heatMetric] ?? 0;
            const vb = b[heatMetric] ?? 0;
            return vb - va;
        });

        return stats;
    }, [items, heatMetric]);

    const selected = sectorStats.find(s => s.name === selectedSector);

    const metricLabels: Record<string, string> = {
        avgChange: t("sect.metric.daily"),
        avgReturn20d: t("sect.metric.20d"),
        avgMediumReturn: t("sect.metric.12m"),
    };

    const metricScale: Record<string, number> = {
        avgChange: 3,
        avgReturn20d: 0.08,
        avgMediumReturn: 0.25,
    };

    return (
        <div className="px-4 sm:px-6 py-8 md:py-12" style={{ maxWidth: "var(--container-max)", margin: "0 auto" }}>
            {/* ─── Header ─── */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <GridFour size={20} weight="fill" color="var(--accent)" />
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tighter" style={{ color: "var(--text-primary)" }}>
                            {t("sect.title")}
                        </h1>
                    </div>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {t("sect.subtitle", { sectorsCount: sectorStats.length, assetsCount: items.length })}
                    </p>
                </div>
                <div className="flex rounded-lg p-1" style={{ background: "var(--bg-elevated)" }}>
                    {(["avgChange", "avgReturn20d", "avgMediumReturn"] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => setHeatMetric(m)}
                            className="px-3 py-1.5 rounded-md text-xs font-medium tactile"
                            style={{
                                background: heatMetric === m ? "var(--bg-surface)" : "transparent",
                                color: heatMetric === m ? "var(--text-primary)" : "var(--text-muted)",
                                boxShadow: heatMetric === m ? "var(--shadow-sm)" : "none",
                                transition: "all var(--transition-fast)",
                            }}
                        >
                            {metricLabels[m]}
                        </button>
                    ))}
                </div>
            </div>

            {/* ─── Sector Heatmap Grid ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-8">
                {sectorStats.map((sector, i) => {
                    const value = sector[heatMetric] ?? 0;
                    const isSelected = selectedSector === sector.name;
                    const heatBg = getHeatColor(value, metricScale[heatMetric]);

                    return (
                        <button
                            key={sector.name}
                            onClick={() => setSelectedSector(isSelected ? null : sector.name)}
                            className="rounded-xl p-4 text-left stagger-item tactile relative overflow-hidden"
                            style={{
                                "--index": i,
                                background: isSelected ? "var(--bg-elevated)" : "var(--bg-surface)",
                                border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border)",
                                transition: "all var(--transition-fast)",
                            } as React.CSSProperties}
                        >
                            {/* Heat indicator bar */}
                            <div
                                className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                                style={{ background: heatBg }}
                            />

                            <div className="text-sm font-semibold mb-1 mt-1" style={{ color: "var(--text-primary)" }}>
                                {sector.name}
                            </div>
                            <div className="text-[11px] mb-2" style={{ color: "var(--text-muted)" }}>
                                {sector.count === 1 ? t("sect.assets_count_single", { count: 1 }) : t("sect.assets_count", { count: sector.count })}
                            </div>

                            {/* Main metric */}
                            <div className="text-xl font-bold num mb-2"
                                style={{ color: value >= 0 ? "var(--accent)" : "var(--negative)" }}>
                                {heatMetric === "avgChange"
                                    ? formatChangePercent(value)
                                    : formatReturn(value)
                                }
                            </div>

                            {/* Mini stats row */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                                    <span className="text-[10px] num" style={{ color: "var(--text-muted)" }}>
                                        {Math.round(sector.bullishPct * 100)}%
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--negative)" }} />
                                    <span className="text-[10px] num" style={{ color: "var(--text-muted)" }}>
                                        {Math.round(sector.bearishPct * 100)}%
                                    </span>
                                </div>
                                <MomentumBadge momentum={sector.momentum} />
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* ─── Sector Detail Drill-Down ─── */}
            {selected && (
                <div className="rounded-xl overflow-hidden mb-8 stagger-item" style={{
                    "--index": 0,
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                } as React.CSSProperties}>
                    {/* Detail Header */}
                    <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
                        <div>
                            <h2 className="text-lg font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                                {selected.name}
                            </h2>
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                                {t("sect.detail.assets_info", { count: selected.count, rsi: selected.avgRsi.toFixed(0), vol: (selected.avgVolatility * 100).toFixed(0) })}
                            </span>
                        </div>
                        <MomentumBadge momentum={selected.momentum} large />
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6" style={{ borderBottom: "1px solid var(--border)" }}>
                        <StatCell label={t("sect.stat.daily")} value={formatChangePercent(selected.avgChange)} positive={selected.avgChange >= 0} />
                        <StatCell label={t("sect.stat.20d")} value={formatReturn(selected.avgReturn20d)} positive={selected.avgReturn20d >= 0} />
                        <StatCell label={t("sect.stat.60d")} value={formatReturn(selected.avgReturn60d)} positive={selected.avgReturn60d >= 0} />
                        <StatCell label={t("sect.stat.ml_short")} value={formatReturn(selected.avgShortReturn)} positive={selected.avgShortReturn >= 0} />
                        <StatCell label={t("sect.stat.ml_12m")} value={formatReturn(selected.avgMediumReturn)} positive={selected.avgMediumReturn >= 0} />
                        <StatCell label={t("sect.stat.risk")} value={selected.avgRisk.toFixed(1) + " / 5"} />
                    </div>

                    {/* Bullish / Bearish Bar */}
                    <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{t("sect.sentiment")}</span>
                            <span className="text-[10px] num" style={{ color: "var(--text-muted)" }}>
                                {t("sect.sentiment_desc", { bull: Math.round(selected.bullishPct * 100), bear: Math.round(selected.bearishPct * 100) })}
                            </span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden flex" style={{ background: "var(--bg-elevated)" }}>
                            <div style={{ width: `${selected.bullishPct * 100}%`, background: "var(--accent)", transition: "width 0.4s ease" }} />
                            <div style={{ width: `${(1 - selected.bullishPct - selected.bearishPct) * 100}%`, background: "var(--neutral-accent)", opacity: 0.3 }} />
                            <div style={{ width: `${selected.bearishPct * 100}%`, background: "var(--negative)", transition: "width 0.4s ease" }} />
                        </div>
                    </div>

                    {/* Top / Worst Performers */}
                    <div className="grid grid-cols-1 md:grid-cols-2">
                        <PerformerList title={t("sect.top")} icon={<TrendUp size={14} weight="bold" color="var(--accent)" />} items={selected.topPerformers} positive />
                        <PerformerList title={t("sect.worst")} icon={<TrendDown size={14} weight="bold" color="var(--negative)" />} items={selected.worstPerformers} positive={false} border />
                    </div>

                    {/* Full Asset List */}
                    <div className="px-5 py-3" style={{ borderTop: "1px solid var(--border)" }}>
                        <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                            {t("sect.all", { sector: selected.name })}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {selected.assets
                                .sort((a, b) => (b.return20d ?? 0) - (a.return20d ?? 0))
                                .map((asset) => (
                                    <Link
                                        key={asset.ticker}
                                        href={`/asset/${asset.ticker}`}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs tactile"
                                        style={{
                                            background: "var(--bg-elevated)",
                                            border: "1px solid var(--border)",
                                            color: "var(--text-secondary)",
                                            transition: "all var(--transition-fast)",
                                        }}
                                    >
                                        <span className="font-semibold num" style={{ color: "var(--text-primary)" }}>{asset.ticker}</span>
                                        <span className="num" style={{ color: (asset.return20d ?? 0) >= 0 ? "var(--accent)" : "var(--negative)", fontSize: 11 }}>
                                            {asset.return20d != null ? formatReturn(asset.return20d) : "—"}
                                        </span>
                                    </Link>
                                ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Sector Rotation Summary ─── */}
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                <div className="px-5 py-3 flex items-center gap-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                    <Pulse size={14} weight="bold" color="var(--accent)" />
                    <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        {t("sect.rotation.title")}
                    </h2>
                </div>
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                    {sectorStats
                        .filter(s => s.momentum !== "stable")
                        .slice(0, 8)
                        .map((sector) => (
                            <button
                                key={sector.name}
                                onClick={() => setSelectedSector(sector.name)}
                                className="w-full flex items-center justify-between px-5 py-3 text-left tactile"
                                style={{ transition: "background var(--transition-fast)" }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                            >
                                <div className="flex items-center gap-3">
                                    <MomentumBadge momentum={sector.momentum} />
                                    <div>
                                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{sector.name}</span>
                                        <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>({sector.count})</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>20d</div>
                                        <div className="text-xs font-semibold num" style={{ color: sector.avgReturn20d >= 0 ? "var(--accent)" : "var(--negative)" }}>
                                            {formatReturn(sector.avgReturn20d)}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>60d</div>
                                        <div className="text-xs font-semibold num" style={{ color: sector.avgReturn60d >= 0 ? "var(--accent)" : "var(--negative)" }}>
                                            {formatReturn(sector.avgReturn60d)}
                                        </div>
                                    </div>
                                    <CaretRight size={12} style={{ color: "var(--text-muted)" }} />
                                </div>
                            </button>
                        ))}
                    {sectorStats.filter(s => s.momentum !== "stable").length === 0 && (
                        <div className="px-5 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
                            {t("sect.rotation.empty")}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Sub-components ───

function MomentumBadge({ momentum, large }: { momentum: SectorStats["momentum"]; large?: boolean }) {
    const { t } = useTranslation();
    const config = {
        accelerating: { label: t("sect.mom.accel"), color: "var(--accent)", bg: "var(--accent-soft)" },
        stable: { label: t("sect.mom.stable"), color: "var(--neutral-accent)", bg: "var(--neutral-soft)" },
        decelerating: { label: t("sect.mom.decel"), color: "var(--negative)", bg: "rgba(244, 63, 94, 0.1)" },
    }[momentum];

    return (
        <span
            className={`inline-flex items-center rounded-md font-medium ${large ? "px-2.5 py-1 text-xs" : "px-1.5 py-0.5 text-[9px]"}`}
            style={{ background: config.bg, color: config.color }}
        >
            {config.label}
        </span>
    );
}

function StatCell({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
    return (
        <div className="px-4 py-3" style={{ borderRight: "1px solid var(--border)" }}>
            <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{label}</div>
            <div className="text-sm font-semibold num"
                style={{ color: positive === undefined ? "var(--text-primary)" : positive ? "var(--accent)" : "var(--negative)" }}>
                {value}
            </div>
        </div>
    );
}

function PerformerList({ title, icon, items, positive, border }: {
    title: string; icon: React.ReactNode; items: ScreenerItem[]; positive: boolean; border?: boolean;
}) {
    return (
        <div className="px-5 py-3" style={{ borderLeft: border ? "1px solid var(--border)" : "none" }}>
            <div className="flex items-center gap-1.5 mb-2">
                {icon}
                <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--text-muted)" }}>{title}</span>
            </div>
            <div className="space-y-1.5">
                {items.map((item) => (
                    <Link
                        key={item.ticker}
                        href={`/asset/${item.ticker}`}
                        className="flex items-center justify-between py-1 tactile rounded px-1 -mx-1"
                        style={{ transition: "background var(--transition-fast)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold num" style={{ color: "var(--text-primary)" }}>{item.ticker}</span>
                            <TrendBadge trend={item.shortTrend as "bullish" | "neutral" | "bearish"} />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs num font-medium"
                                style={{ color: (item.return20d ?? 0) >= 0 ? "var(--accent)" : "var(--negative)" }}>
                                {item.return20d != null ? formatReturn(item.return20d) : "—"}
                            </span>
                            <ArrowRight size={10} style={{ color: "var(--text-muted)" }} />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
