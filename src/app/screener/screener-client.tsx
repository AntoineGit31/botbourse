"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
    Funnel,
    SortAscending,
    SortDescending,
    ArrowRight,
    Eraser,
} from "@phosphor-icons/react";
import {
    formatPrice,
    formatChangePercent,
    formatReturn,
    formatMarketCap,
    formatVolume,
} from "@/lib/utils";
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
    exchange: string;
    price: number;
    changePercent: number;
    marketCap: number | null;
    peRatio: number | null;
    dividendYield: number | null;
    volume: number | null;
    rsi: number | null;
    macdHistogram: number | null;
    adx: number | null;
    stochK: number | null;
    bbPosition: number | null;
    volumeRatio: number | null;
    volatility20d: number | null;
    volatility60d: number | null;
    drawdown: number | null;
    return5d: number | null;
    return20d: number | null;
    return60d: number | null;
    priceVsSma20: number | null;
    priceVsSma50: number | null;
    priceVsSma200: number | null;
    riskScore: number;
    shortTrend: string;
    shortReturn: number;
    shortConfidence: string;
    mediumTrend: string;
    mediumReturn: number;
    mediumConfidence: string;
    longTrend: string;
    longReturn: number;
    longConfidence: string;
}

type SortField =
    | "ticker" | "changePercent" | "rsi" | "adx" | "volatility20d"
    | "drawdown" | "riskScore" | "shortReturn" | "mediumReturn" | "return20d"
    | "volumeRatio" | "marketCap" | "price";

type SortDir = "asc" | "desc";

// ─── Filter Presets ───

const PRESETS_KEYS = [
    { labelKey: "screener.preset.oversold", filters: { rsiMax: 30 } },
    { labelKey: "screener.preset.overbought", filters: { rsiMin: 70 } },
    { labelKey: "screener.preset.volatility", filters: { volMin: 35 } },
    { labelKey: "screener.preset.low_risk", filters: { riskMax: 2 } },
    { labelKey: "screener.preset.strong_trend", filters: { adxMin: 40 } },
    { labelKey: "screener.preset.bullish", filters: { trendFilter: "bullish" } },
    { labelKey: "screener.preset.bearish", filters: { trendFilter: "bearish" } },
    { labelKey: "screener.preset.volume", filters: { volRatioMin: 2 } },
];

// ─── Component ───

interface ScreenerClientProps {
    data: Record<string, unknown>[];
}

export default function ScreenerClient({ data }: ScreenerClientProps) {
    const items = data as unknown as ScreenerItem[];
    const { t } = useTranslation();

    // ── Sort state ──
    const [sortField, setSortField] = useState<SortField>("mediumReturn");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    // ── Filter state ──
    const [sector, setSector] = useState("all");
    const [region, setRegion] = useState("all");
    const [assetType, setAssetType] = useState("all");
    const [trendFilter, setTrendFilter] = useState("all");
    const [rsiMin, setRsiMin] = useState<number | "">("");
    const [rsiMax, setRsiMax] = useState<number | "">("");
    const [adxMin, setAdxMin] = useState<number | "">("");
    const [volMin, setVolMin] = useState<number | "">("");
    const [riskMax, setRiskMax] = useState<number | "">("");
    const [volRatioMin, setVolRatioMin] = useState<number | "">("");
    const [search, setSearch] = useState("");

    const resetFilters = useCallback(() => {
        setSector("all"); setRegion("all"); setAssetType("all");
        setTrendFilter("all"); setRsiMin(""); setRsiMax(""); setAdxMin("");
        setVolMin(""); setRiskMax(""); setVolRatioMin(""); setSearch("");
    }, []);

    const applyPreset = useCallback((preset: typeof PRESETS_KEYS[number]) => {
        resetFilters();
        const f = preset.filters as Record<string, unknown>;
        if (f.rsiMin) setRsiMin(f.rsiMin as number);
        if (f.rsiMax) setRsiMax(f.rsiMax as number);
        if (f.adxMin) setAdxMin(f.adxMin as number);
        if (f.volMin) setVolMin(f.volMin as number);
        if (f.riskMax) setRiskMax(f.riskMax as number);
        if (f.volRatioMin) setVolRatioMin(f.volRatioMin as number);
        if (f.trendFilter) setTrendFilter(f.trendFilter as string);
    }, [resetFilters]);

    // ── Sectors and regions from data ──
    const sectors = useMemo(() => [...new Set(items.map(i => i.sector))].sort(), [items]);
    const regions = useMemo(() => [...new Set(items.map(i => i.region))].sort(), [items]);

    // ── Filtering ──
    const filtered = useMemo(() => {
        return items.filter((item) => {
            if (search && !item.ticker.toLowerCase().includes(search.toLowerCase())
                && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
            if (sector !== "all" && item.sector !== sector) return false;
            if (region !== "all" && item.region !== region) return false;
            if (assetType !== "all" && item.assetType !== assetType) return false;
            if (trendFilter !== "all" && item.shortTrend !== trendFilter) return false;
            if (rsiMin !== "" && (item.rsi === null || item.rsi < rsiMin)) return false;
            if (rsiMax !== "" && (item.rsi === null || item.rsi > rsiMax)) return false;
            if (adxMin !== "" && (item.adx === null || item.adx < adxMin)) return false;
            if (volMin !== "" && (item.volatility20d === null || item.volatility20d * 100 < volMin)) return false;
            if (riskMax !== "" && item.riskScore > riskMax) return false;
            if (volRatioMin !== "" && (item.volumeRatio === null || item.volumeRatio < volRatioMin)) return false;
            return true;
        });
    }, [items, search, sector, region, assetType, trendFilter, rsiMin, rsiMax, adxMin, volMin, riskMax, volRatioMin]);

    // ── Sorting ──
    const sorted = useMemo(() => {
        const copy = [...filtered];
        copy.sort((a, b) => {
            const va = (a as unknown as Record<string, number>)[sortField] ?? 0;
            const vb = (b as unknown as Record<string, number>)[sortField] ?? 0;
            if (sortField === "ticker") {
                return sortDir === "asc"
                    ? String(va).localeCompare(String(vb))
                    : String(vb).localeCompare(String(va));
            }
            return sortDir === "asc" ? va - vb : vb - va;
        });
        return copy;
    }, [filtered, sortField, sortDir]);

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(sortDir === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDir("desc");
        }
    };

    const SortIcon = sortDir === "asc" ? SortAscending : SortDescending;

    const activeFilterCount = [
        sector !== "all", region !== "all", assetType !== "all", trendFilter !== "all",
        rsiMin !== "", rsiMax !== "", adxMin !== "", volMin !== "", riskMax !== "", volRatioMin !== "", search !== "",
    ].filter(Boolean).length;

    return (
        <div className="px-4 sm:px-6 py-8 md:py-12" style={{ maxWidth: "var(--container-max)", margin: "0 auto" }}>
            {/* ─── Header ─── */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Funnel size={20} weight="fill" color="var(--accent)" />
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tighter" style={{ color: "var(--text-primary)" }}>
                            {t("screener.title")}
                        </h1>
                    </div>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {t("screener.subtitle", { count: items.length })}
                    </p>
                </div>
                <div className="text-sm num" style={{ color: "var(--text-muted)" }}>
                    {sorted.length} {sorted.length !== 1 ? t("screener.results_pl") : t("screener.results")}
                    {activeFilterCount > 0 && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                            {activeFilterCount} {activeFilterCount !== 1 ? t("screener.filters_pl") : t("screener.filters")}
                        </span>
                    )}
                </div>
            </div>

            {/* ─── Presets ─── */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
                {PRESETS_KEYS.map((preset) => (
                    <button
                        key={preset.labelKey}
                        onClick={() => applyPreset(preset)}
                        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium tactile"
                        style={{
                            background: "var(--bg-surface)",
                            border: "1px solid var(--border)",
                            color: "var(--text-secondary)",
                            transition: "all var(--transition-fast)",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {t(preset.labelKey)}
                    </button>
                ))}
            </div>

            {/* ─── Filters Grid ─── */}
            <div className="rounded-xl p-4 mb-6" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {/* Search */}
                    <div className="col-span-2 sm:col-span-1">
                        <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>{t("screener.filter.search")}</label>
                        <input
                            type="text"
                            placeholder={t("screener.filter.search_ph")}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg text-xs outline-none"
                            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                        />
                    </div>

                    <FilterSelect label={t("screener.filter.sector")} value={sector} onChange={setSector}
                        options={[{ value: "all", label: t("screener.filter.all") }, ...sectors.map(s => ({ value: s, label: s }))]} />
                    <FilterSelect label={t("screener.filter.region")} value={region} onChange={setRegion}
                        options={[{ value: "all", label: t("screener.filter.all") }, ...regions.map(r => ({ value: r, label: r }))]} />
                    <FilterSelect label={t("screener.filter.type")} value={assetType} onChange={setAssetType}
                        options={[{ value: "all", label: t("screener.filter.all") }, { value: "stock", label: t("screener.filter.stocks") }, { value: "etf", label: t("screener.filter.etfs") }]} />
                    <FilterSelect label={t("screener.filter.ml_trend")} value={trendFilter} onChange={setTrendFilter}
                        options={[{ value: "all", label: t("screener.filter.all") }, { value: "bullish", label: t("screener.filter.bullish") }, { value: "neutral", label: t("screener.filter.neutral") }, { value: "bearish", label: t("screener.filter.bearish") }]} />

                    <FilterNumber label={t("screener.filter.rsi_min")} value={rsiMin} onChange={setRsiMin} placeholder="0" />
                    <FilterNumber label={t("screener.filter.rsi_max")} value={rsiMax} onChange={setRsiMax} placeholder="100" />
                    <FilterNumber label={t("screener.filter.adx_min")} value={adxMin} onChange={setAdxMin} placeholder="0" />
                    <FilterNumber label={t("screener.filter.vol_min")} value={volMin} onChange={setVolMin} placeholder="0" />
                    <FilterNumber label={t("screener.filter.risk_max")} value={riskMax} onChange={setRiskMax} placeholder="5" />
                    <FilterNumber label={t("screener.filter.vol_ratio")} value={volRatioMin} onChange={setVolRatioMin} placeholder="1" />
                </div>

                <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                    <span className="text-xs num" style={{ color: "var(--text-muted)" }}>
                        {t("screener.showing", { filtered: sorted.length, total: items.length })}
                    </span>
                    <button onClick={resetFilters} className="flex items-center gap-1 text-xs font-medium tactile"
                        style={{ color: "var(--text-muted)", transition: "color var(--transition-fast)" }}>
                        <Eraser size={12} />
                        {t("screener.reset")}
                    </button>
                </div>
            </div>

            {/* ─── Results Table ─── */}
            <div className="rounded-xl overflow-hidden mb-8" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                {/* Table header */}
                <div className="grid items-center gap-4 px-4 py-2.5 text-[10px] uppercase tracking-wider font-medium"
                    style={{
                        color: "var(--text-muted)",
                        borderBottom: "1px solid var(--border)",
                        background: "var(--bg-elevated)",
                        gridTemplateColumns: "minmax(120px, 1.5fr) 70px 65px 40px 45px 60px 60px 125px 125px",
                    }}>
                    <SortHeader label={t("screener.table.asset")} field="ticker" current={sortField} dir={sortDir} onClick={toggleSort} />
                    <SortHeader label={t("screener.table.price")} field="price" current={sortField} dir={sortDir} onClick={toggleSort} align="right" />
                    <SortHeader label={t("screener.table.change")} field="changePercent" current={sortField} dir={sortDir} onClick={toggleSort} align="right" />
                    <SortHeader label={t("screener.table.rsi")} field="rsi" current={sortField} dir={sortDir} onClick={toggleSort} align="right" />
                    <SortHeader label={t("screener.table.adx")} field="adx" current={sortField} dir={sortDir} onClick={toggleSort} align="right" />
                    <SortHeader label={t("screener.table.vol20d")} field="volatility20d" current={sortField} dir={sortDir} onClick={toggleSort} align="right" />
                    <SortHeader label={t("screener.table.risk")} field="riskScore" current={sortField} dir={sortDir} onClick={toggleSort} align="center" />
                    <SortHeader label={t("screener.table.30d")} field="shortReturn" current={sortField} dir={sortDir} onClick={toggleSort} align="right" />
                    <SortHeader label={t("screener.table.12m")} field="mediumReturn" current={sortField} dir={sortDir} onClick={toggleSort} align="right" />
                </div>

                {/* Table body */}
                {sorted.length === 0 ? (
                    <div className="px-4 py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                        {t("screener.empty")}
                    </div>
                ) : (
                    <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
                        {sorted.map((item, i) => (
                            <Link
                                key={item.ticker}
                                href={`/asset/${item.ticker}`}
                                className="grid items-center gap-4 px-4 py-3 stagger-item tactile"
                                style={{
                                    "--index": i % 30,
                                    gridTemplateColumns: "minmax(120px, 1.5fr) 70px 65px 40px 45px 60px 60px 125px 125px",
                                    borderBottom: "1px solid var(--border)",
                                    transition: "background var(--transition-fast)",
                                } as React.CSSProperties}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                            >
                                {/* Asset */}
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm font-semibold num" style={{ color: "var(--text-primary)" }}>{item.ticker}</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-medium"
                                            style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
                                            {item.assetType}
                                        </span>
                                    </div>
                                    <div className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-muted)" }}>{item.name}</div>
                                </div>

                                {/* Price */}
                                <div className="text-right text-sm num font-medium" style={{ color: "var(--text-primary)" }}>
                                    {item.price > 0 ? formatPrice(item.price) : "—"}
                                </div>

                                {/* Change */}
                                <div className="text-right text-xs num font-medium"
                                    style={{ color: item.changePercent >= 0 ? "var(--accent)" : "var(--negative)" }}>
                                    {formatChangePercent(item.changePercent)}
                                </div>

                                {/* RSI */}
                                <div className="text-right text-xs num"
                                    style={{ color: item.rsi != null ? (item.rsi < 30 ? "var(--accent)" : item.rsi > 70 ? "var(--negative)" : "var(--text-secondary)") : "var(--text-muted)" }}>
                                    {item.rsi?.toFixed(0) ?? "—"}
                                </div>

                                {/* ADX */}
                                <div className="text-right text-xs num"
                                    style={{ color: item.adx != null && item.adx > 40 ? "var(--accent)" : "var(--text-secondary)" }}>
                                    {item.adx?.toFixed(0) ?? "—"}
                                </div>

                                {/* Volatility */}
                                <div className="text-right text-xs num" style={{ color: "var(--text-secondary)" }}>
                                    {item.volatility20d != null ? `${(item.volatility20d * 100).toFixed(0)}%` : "—"}
                                </div>

                                {/* Risk */}
                                <div className="flex justify-center">
                                    <RiskDots score={item.riskScore as 1 | 2 | 3 | 4 | 5} />
                                </div>

                                {/* 30d Signal */}
                                <div className="text-right flex items-center justify-end gap-1.5">
                                    <TrendBadge trend={item.shortTrend as "bullish" | "neutral" | "bearish"} />
                                    <span className="text-xs num font-medium"
                                        style={{ color: item.shortReturn >= 0 ? "var(--accent)" : "var(--negative)" }}>
                                        {formatReturn(item.shortReturn)}
                                    </span>
                                </div>

                                {/* 12m Signal */}
                                <div className="text-right flex items-center justify-end gap-1.5">
                                    <TrendBadge trend={item.mediumTrend as "bullish" | "neutral" | "bearish"} />
                                    <span className="text-xs num font-medium"
                                        style={{ color: item.mediumReturn >= 0 ? "var(--accent)" : "var(--negative)" }}>
                                        {formatReturn(item.mediumReturn)}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Sub-components ───

function FilterSelect({ label, value, onChange, options }: {
    label: string; value: string; onChange: (v: string) => void;
    options: { value: string; label: string }[];
}) {
    return (
        <div>
            <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>{label}</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </div>
    );
}

function FilterNumber({ label, value, onChange, placeholder }: {
    label: string; value: number | ""; onChange: (v: number | "") => void; placeholder: string;
}) {
    return (
        <div>
            <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>{label}</label>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder={placeholder}
                className="w-full px-3 py-1.5 rounded-lg text-xs outline-none num"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
        </div>
    );
}

function SortHeader({ label, field, current, dir, onClick, align = "left" }: {
    label: string; field: SortField; current: SortField; dir: SortDir;
    onClick: (f: SortField) => void; align?: "left" | "right" | "center";
}) {
    const isActive = current === field;
    return (
        <button
            onClick={() => onClick(field)}
            className="flex items-center gap-0.5 tactile"
            style={{
                justifyContent: align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start",
                color: isActive ? "var(--accent)" : "var(--text-muted)",
                fontWeight: isActive ? 600 : 500,
                transition: "color var(--transition-fast)",
            }}
        >
            {label}
            {isActive && (dir === "asc" ? <SortAscending size={10} /> : <SortDescending size={10} />)}
        </button>
    );
}
