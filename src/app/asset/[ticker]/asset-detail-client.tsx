"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
    CaretRight,
    ArrowLeft,
    ChartLine,
    Gauge,
    Brain,
    TrendUp,
    TrendDown,
    Lightning,
    ShieldCheck,
    Warning,
    Pulse,
    ArrowsClockwise,
    Star,
} from "@phosphor-icons/react";
import { CHART_PERIODS } from "@/lib/constants";
import {
    formatPrice,
    formatChangePercent,
    formatMarketCap,
    formatVolume,
    formatReturn,
    getHorizonLabel,
    getConfidenceDisplay,
} from "@/lib/utils";
import type { Asset, Prediction, OHLCData } from "@/lib/types";
import GlassPanel from "@/components/ui/GlassPanel";
import TrendBadge from "@/components/ui/TrendBadge";
import RiskDots from "@/components/ui/RiskDots";
import PriceChart from "@/components/asset/PriceChart";
import { useTranslation } from "@/components/I18nProvider";
import { toggleWatchlist } from "@/app/actions/watchlist";
import { useAuth } from "@clerk/nextjs";

interface AssetDetailClientProps {
    asset: Asset | null;
    predictions: Prediction[];
    prices: OHLCData[];
    features: Record<string, number | string | null> | null;
    ticker: string;
    isWatchingInitial?: boolean;
}

export default function AssetDetailClient({ asset, predictions, prices, features, ticker, isWatchingInitial = false }: AssetDetailClientProps) {
    const { t } = useTranslation();
    const { isSignedIn } = useAuth();
    const [chartPeriod, setChartPeriod] = useState("1Y");
    const [liveData, setLiveData] = useState<{ price: number, changePercent: number, fetching: boolean } | null>(null);

    const [isWatching, setIsWatching] = useState(isWatchingInitial);
    const [isPending, startTransition] = useTransition();

    const fetchLivePrice = async () => {
        if (!ticker) return;
        setLiveData(prev => ({ price: prev?.price ?? asset?.price ?? 0, changePercent: prev?.changePercent ?? asset?.changePercent ?? 0, fetching: true }));
        try {
            const res = await fetch(`/api/asset/${ticker}/live`);
            const data = await res.json();
            if (res.ok && data.price !== undefined) {
                setLiveData({ price: data.price, changePercent: data.changePercent, fetching: false });
            } else {
                console.error("API Error:", data);
                setLiveData(prev => prev ? { ...prev, fetching: false } : null);
            }
        } catch (e) {
            setLiveData(prev => prev ? { ...prev, fetching: false } : null);
            console.error("Fetch Live Price Exception:", e);
        }
    };

    const handleToggleWatchlist = () => {
        if (!isSignedIn) {
            alert("Please sign in to add assets to your watchlist!");
            return;
        }

        const newWatchingState = !isWatching;
        setIsWatching(newWatchingState);

        startTransition(async () => {
            try {
                await toggleWatchlist(ticker, !newWatchingState);
            } catch (error) {
                console.error("Failed to update watchlist", error);
                setIsWatching(!newWatchingState); // Revert on failure
            }
        });
    };

    const chartData = useMemo(() => {
        if (prices.length === 0) return [];
        const days = { "1D": 1, "1W": 7, "1M": 30, "6M": 180, "1Y": 365, "5Y": 1825 }[chartPeriod] || 365;
        return prices.slice(-days);
    }, [chartPeriod, prices]);

    if (!asset) {
        return (
            <div className="px-4 sm:px-6 py-20 text-center" style={{ maxWidth: "var(--container-max)", margin: "0 auto" }}>
                <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>{t("asset.not_found")}</h1>
                <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                    {t("asset.no_data", { ticker })}
                </p>
                <Link href="/market" className="text-sm font-medium" style={{ color: "var(--accent)" }}>
                    {t("asset.back")}
                </Link>
            </div>
        );
    }

    const currentPrice = liveData?.price ?? asset.price;
    const currentChangePercent = liveData?.changePercent ?? asset.changePercent;
    const isPositive = currentChangePercent >= 0;

    // Compute performance from prices
    const perf = useMemo(() => {
        if (prices.length < 2) return null;
        const latest = prices[prices.length - 1].close;
        const get = (days: number) => {
            const idx = Math.max(0, prices.length - days - 1);
            return ((latest / prices[idx].close) - 1) * 100;
        };
        return {
            "1W": prices.length > 5 ? get(5) : null,
            "1M": prices.length > 22 ? get(22) : null,
            "3M": prices.length > 66 ? get(66) : null,
            "6M": prices.length > 132 ? get(132) : null,
            "1Y": prices.length > 252 ? get(252) : null,
            "YTD": (() => {
                const jan1 = prices.findIndex(p => p.time >= `${new Date().getFullYear()}-01-01`);
                return jan1 >= 0 ? ((latest / prices[jan1].close) - 1) * 100 : null;
            })(),
        };
    }, [prices]);

    return (
        <div className="px-4 sm:px-6 py-8 md:py-12" style={{ maxWidth: "var(--container-max)", margin: "0 auto" }}>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 mb-6 text-xs" style={{ color: "var(--text-muted)" }}>
                <Link href="/market" className="flex items-center gap-1 tactile" style={{ color: "var(--text-muted)", transition: "color var(--transition-fast)" }}>
                    <ArrowLeft size={12} />
                    {t("nav.markets")}
                </Link>
                <CaretRight size={10} />
                <span style={{ color: "var(--text-secondary)" }}>{asset.ticker}</span>
            </div>

            {/* ═══ Main Grid (65/35) ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-6 lg:gap-8">
                {/* LEFT COLUMN */}
                <div>
                    {/* Header */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
                                {asset.assetType}
                            </span>
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{asset.exchange}</span>
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>·</span>
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{asset.sector}</span>
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>·</span>
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{asset.region}</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1" style={{ color: "var(--text-primary)" }}>
                            {asset.name}
                            <span className="text-lg ml-2 font-semibold num" style={{ color: "var(--text-muted)" }}>{asset.ticker}</span>
                        </h1>
                        <div className="flex items-center justify-between mt-2 flex-wrap gap-4">
                            <div className="flex items-baseline gap-3">
                                <span className="text-3xl md:text-4xl font-bold num transition-colors duration-300" style={{ color: liveData?.fetching ? "var(--text-muted)" : "var(--text-primary)" }}>
                                    {currentPrice > 0 ? formatPrice(currentPrice, asset.currency) : "—"}
                                </span>
                                {currentPrice > 0 && (
                                    <span className="text-base font-semibold num transition-colors duration-300" style={{ color: isPositive ? "var(--accent)" : "var(--negative)" }}>
                                        {formatChangePercent(currentChangePercent)}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleToggleWatchlist}
                                    disabled={isPending}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-300 hover:bg-white/5`}
                                    style={{
                                        background: isWatching ? "var(--accent-soft)" : "var(--bg-surface)",
                                        border: isWatching ? "1px solid var(--accent)" : "1px solid var(--border)",
                                        color: isWatching ? "var(--accent)" : "var(--text-secondary)"
                                    }}
                                >
                                    <Star size={14} weight={isWatching ? "fill" : "regular"} className={isPending ? "animate-pulse" : ""} />
                                    {isWatching ? "Following" : "Watchlist"}
                                </button>

                                <button
                                    onClick={fetchLivePrice}
                                    disabled={liveData?.fetching}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-300 ${liveData?.fetching ? "opacity-50" : "hover:bg-white/5"}`}
                                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                                >
                                    <ArrowsClockwise size={14} className={liveData?.fetching ? "animate-spin" : ""} />
                                    {liveData?.fetching ? "Updating..." : "Live Price"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Performance Strip */}
                    {perf && (
                        <div className="flex gap-2 overflow-x-auto pb-2 mb-5" style={{ scrollbarWidth: "none" }}>
                            {Object.entries(perf).map(([period, val]) => val !== null && (
                                <div
                                    key={period}
                                    className="flex-shrink-0 rounded-lg px-3 py-2 text-center"
                                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", minWidth: 70 }}
                                >
                                    <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>{period}</div>
                                    <div className="text-xs font-semibold num" style={{ color: val >= 0 ? "var(--accent)" : "var(--negative)" }}>
                                        {val >= 0 ? "+" : ""}{val.toFixed(1)}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Chart */}
                    <div className="rounded-xl p-4 mb-6" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                                <ChartLine size={14} weight="bold" color="var(--accent)" />
                                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{t("asset.price_hist")}</span>
                            </div>
                            <div className="flex gap-1">
                                {CHART_PERIODS.map(({ value, label }) => (
                                    <button
                                        key={value}
                                        onClick={() => setChartPeriod(value)}
                                        className="px-2.5 py-1 rounded-md text-[11px] font-medium tactile"
                                        style={{
                                            background: chartPeriod === value ? "var(--bg-elevated)" : "transparent",
                                            color: chartPeriod === value ? "var(--text-primary)" : "var(--text-muted)",
                                            transition: "all var(--transition-fast)",
                                        }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <PriceChart data={chartData} isPositive={isPositive} />
                    </div>

                    {/* Key Metrics */}
                    <div className="rounded-xl overflow-hidden mb-6" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                        <h3 className="px-4 py-3 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5"
                            style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                            <Gauge size={13} weight="bold" />
                            {t("asset.key_metrics")}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4">
                            {asset.assetType === "stock" ? (
                                <>
                                    <MetricCell label={t("asset.metric.mcap")} value={asset.marketCap ? formatMarketCap(asset.marketCap) : "—"} />
                                    <MetricCell label={t("asset.metric.pe")} value={asset.peRatio?.toFixed(1) ?? "—"} />
                                    <MetricCell label={t("asset.metric.div")} value={asset.dividendYield ? `${(asset.dividendYield * 100).toFixed(2)}%` : "—"} />
                                    <MetricCell label={t("asset.metric.vol")} value={asset.volume ? formatVolume(asset.volume) : "—"} />
                                </>
                            ) : (
                                <>
                                    <MetricCell label={t("asset.metric.idx")} value={asset.indexTracked ?? "—"} />
                                    <MetricCell label={t("asset.metric.ter")} value={asset.ter ? `${(asset.ter * 100).toFixed(2)}%` : "—"} />
                                    <MetricCell label={t("asset.metric.dom")} value={asset.domicile ?? "—"} />
                                    <MetricCell label={t("asset.metric.cat")} value={asset.etfCategory ?? "—"} />
                                </>
                            )}
                        </div>
                    </div>

                    {/* Technical Indicators */}
                    {features && (
                        <div className="rounded-xl overflow-hidden mb-6" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                            <h3 className="px-4 py-3 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5"
                                style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                                <Pulse size={13} weight="bold" />
                                {t("asset.tech_ind")}
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                <IndicatorCell
                                    label="RSI (14)"
                                    value={features.rsi_14 != null ? Number(features.rsi_14).toFixed(1) : "—"}
                                    status={features.rsi_14 != null ? (Number(features.rsi_14) < 30 ? "oversold" : Number(features.rsi_14) > 70 ? "overbought" : "neutral") : undefined}
                                />
                                <IndicatorCell
                                    label="MACD Histogram"
                                    value={features.macd_histogram != null ? Number(features.macd_histogram).toFixed(4) : "—"}
                                    status={features.macd_histogram != null ? (Number(features.macd_histogram) > 0 ? "bullish" : "bearish") : undefined}
                                />
                                <IndicatorCell
                                    label="Volatility (20d)"
                                    value={features.volatility_20d != null ? `${(Number(features.volatility_20d) * 100).toFixed(1)}%` : "—"}
                                    status={features.volatility_20d != null ? (Number(features.volatility_20d) > 0.35 ? "high" : Number(features.volatility_20d) < 0.15 ? "low" : "neutral") : undefined}
                                />
                                <IndicatorCell
                                    label="ADX"
                                    value={features.adx != null ? Number(features.adx).toFixed(1) : "—"}
                                    status={features.adx != null ? (Number(features.adx) > 40 ? "strong" : Number(features.adx) < 20 ? "weak" : "neutral") : undefined}
                                />
                                <IndicatorCell
                                    label="Stochastic K"
                                    value={features.stoch_k != null ? Number(features.stoch_k).toFixed(1) : "—"}
                                    status={features.stoch_k != null ? (Number(features.stoch_k) < 20 ? "oversold" : Number(features.stoch_k) > 80 ? "overbought" : "neutral") : undefined}
                                />
                                <IndicatorCell
                                    label="BB Position"
                                    value={features.bb_position != null ? Number(features.bb_position).toFixed(2) : "—"}
                                    status={features.bb_position != null ? (Number(features.bb_position) > 0.8 ? "overbought" : Number(features.bb_position) < 0.2 ? "oversold" : "neutral") : undefined}
                                />
                                <IndicatorCell
                                    label="Volume Ratio"
                                    value={features.volume_ratio != null ? `${Number(features.volume_ratio).toFixed(1)}x` : "—"}
                                    status={features.volume_ratio != null ? (Number(features.volume_ratio) > 3 ? "anomaly" : "neutral") : undefined}
                                />
                                <IndicatorCell
                                    label="Max Drawdown (1Y)"
                                    value={features.max_drawdown_1y != null ? `${(Number(features.max_drawdown_1y) * 100).toFixed(1)}%` : "—"}
                                    status={features.max_drawdown_1y != null ? (Number(features.max_drawdown_1y) < -0.30 ? "severe" : "neutral") : undefined}
                                />
                            </div>
                        </div>
                    )}

                    {/* AI Summary */}
                    {(asset.aiProfile || asset.aiOpportunities || asset.aiRisks) && (
                        <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                            <h3 className="px-4 py-3 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5"
                                style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                                <Brain size={13} weight="bold" />
                                {t("asset.ai.title")}
                            </h3>
                            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                                {asset.aiProfile && (
                                    <div className="px-4 py-4">
                                        <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>{t("asset.ai.profile")}</div>
                                        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", maxWidth: "65ch" }}>{asset.aiProfile}</p>
                                    </div>
                                )}
                                {asset.aiOpportunities && (
                                    <div className="px-4 py-4">
                                        <div className="text-xs font-medium uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: "var(--accent)" }}>
                                            <TrendUp size={12} weight="bold" /> {t("asset.ai.opps")}
                                        </div>
                                        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", maxWidth: "65ch" }}>{asset.aiOpportunities}</p>
                                    </div>
                                )}
                                {asset.aiRisks && (
                                    <div className="px-4 py-4">
                                        <div className="text-xs font-medium uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: "var(--negative)" }}>
                                            <Warning size={12} weight="bold" /> {t("asset.ai.risks")}
                                        </div>
                                        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", maxWidth: "65ch" }}>{asset.aiRisks}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN */}
                <div className="flex flex-col gap-6">
                    {/* Model Signals — ML Predictions per Horizon */}
                    <GlassPanel strong className="p-5 md:p-6">
                        <h3 className="text-xs font-medium uppercase tracking-wider mb-4 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                            <Lightning size={13} weight="fill" color="var(--accent)" />
                            {t("asset.model.title")}
                        </h3>
                        {predictions.length === 0 ? (
                            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("asset.model.empty")}</p>
                        ) : (
                            <div className="space-y-0 divide-y" style={{ borderColor: "var(--border)" }}>
                                {(["short", "medium", "long"] as const).map((horizon) => {
                                    const pred = predictions.find((p) => p.horizon === horizon);
                                    if (!pred) return null;
                                    return <SignalRow key={horizon} prediction={pred} t={t} />;
                                })}
                            </div>
                        )}
                        <div className="mt-4 pt-3 text-xs leading-relaxed" style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}>
                            <ShieldCheck size={12} className="inline mr-1" style={{ verticalAlign: "middle" }} />
                            {t("asset.model.desc")}
                        </div>
                    </GlassPanel>

                    {/* Risk Summary */}
                    {predictions.length > 0 && (
                        <div className="rounded-xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                            <h3 className="text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                                <Gauge size={13} weight="bold" />
                                {t("asset.risk.title")}
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("asset.risk.score")}</span>
                                    <RiskDots score={predictions[0].riskScore} />
                                </div>
                                {features && (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("asset.risk.vol20")}</span>
                                            <span className="text-sm font-medium num" style={{ color: "var(--text-secondary)" }}>
                                                {features.volatility_20d != null ? `${(Number(features.volatility_20d) * 100).toFixed(1)}%` : "—"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("asset.risk.vol60")}</span>
                                            <span className="text-sm font-medium num" style={{ color: "var(--text-secondary)" }}>
                                                {features.volatility_60d != null ? `${(Number(features.volatility_60d) * 100).toFixed(1)}%` : "—"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("asset.risk.dd")}</span>
                                            <span className="text-sm font-medium num" style={{ color: "var(--negative)" }}>
                                                {features.drawdown != null ? `${(Number(features.drawdown) * 100).toFixed(1)}%` : "—"}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Asset Details */}
                    <div className="rounded-xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                        <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>{t("asset.details.title")}</h3>
                        <div className="space-y-2.5">
                            <DetailRow label={t("asset.details.ticker")} value={asset.ticker} />
                            <DetailRow label={t("asset.details.exc")} value={asset.exchange} />
                            <DetailRow label={t("asset.details.sec")} value={asset.sector} />
                            <DetailRow label={t("asset.details.reg")} value={asset.region} />
                            <DetailRow label={t("asset.details.cur")} value={asset.currency} />
                            {asset.assetType === "etf" && asset.indexTracked && (
                                <DetailRow label={t("asset.details.tracks")} value={asset.indexTracked} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Sub-components ───

function MetricCell({ label, value }: { label: string; value: string }) {
    return (
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)" }}>
            <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</div>
            <div className="text-sm font-semibold num" style={{ color: "var(--text-primary)" }}>{value}</div>
        </div>
    );
}

function IndicatorCell({ label, value, status }: { label: string; value: string; status?: string }) {
    const getStatusColor = () => {
        switch (status) {
            case "bullish": case "oversold": case "low": return "var(--accent)";
            case "bearish": case "overbought": case "high": case "severe": return "var(--negative)";
            case "strong": return "var(--accent)";
            case "weak": return "var(--text-muted)";
            case "anomaly": return "#f59e0b";
            default: return "var(--text-secondary)";
        }
    };

    const getStatusLabel = () => {
        if (!status || status === "neutral") return null;
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    return (
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)" }}>
            <div className="text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>{label}</div>
            <div className="flex items-center gap-2">
                <span className="text-sm font-semibold num" style={{ color: getStatusColor() }}>
                    {value}
                </span>
                {getStatusLabel() && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{ background: `${getStatusColor()}15`, color: getStatusColor() }}>
                        {getStatusLabel()}
                    </span>
                )}
            </div>
        </div>
    );
}

function SignalRow({ prediction, t }: { prediction: Prediction, t: any }) {
    const conf = getConfidenceDisplay(prediction.confidenceLevel);
    const isPositive = prediction.expectedReturn >= 0;

    return (
        <div className="py-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                        {t("preds.watchlist.term", { term: prediction.horizon })}
                    </span>
                    <TrendBadge trend={prediction.trendLabel} />
                </div>
                <span className="text-lg font-bold num" style={{ color: isPositive ? "var(--accent)" : "var(--negative)" }}>
                    {formatReturn(prediction.expectedReturn)}
                </span>
            </div>

            {/* Visual Return Bar */}
            <div className="mb-3">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                    <div
                        className="h-full rounded-full"
                        style={{
                            width: `${Math.min(100, Math.abs(prediction.expectedReturn) * 500 + 5)}%`,
                            background: isPositive
                                ? "linear-gradient(90deg, var(--accent), #34d399)"
                                : "linear-gradient(90deg, var(--negative), #fb7185)",
                            transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                    />
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{t("Risk")}</span>
                        <RiskDots score={prediction.riskScore} />
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{t("preds.table.conf")}</span>
                        <span className={`text-xs font-medium ${conf.className}`}>{conf.label}</span>
                    </div>
                </div>
                <span className="text-[11px] num" style={{ color: "var(--text-muted)" }}>{getHorizonLabel(prediction.horizon)}</span>
            </div>
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{value}</span>
        </div>
    );
}
