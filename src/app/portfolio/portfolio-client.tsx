"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
    Briefcase,
    Plus,
    X,
    MagnifyingGlass,
    ChartPieSlice,
    ShieldCheck,
    WarningCircle,
    Scales,
    Target,
    Brain
} from "@phosphor-icons/react";
import { formatReturn, formatPrice as _formatPrice } from "@/lib/utils";
import TrendBadge from "@/components/ui/TrendBadge";
import RiskDots from "@/components/ui/RiskDots";
import { useTranslation } from "@/components/I18nProvider";
import { useCurrency } from "@/components/CurrencyProvider";

// ─── Types ───

interface ScreenerItem {
    ticker: string;
    name: string;
    sector: string;
    region: string;
    assetType: string;
    price: number;
    riskScore: number;
    shortReturn: number;
    shortTrend: string;
    mediumReturn: number;
    mediumTrend: string;
    currency?: string;
}

interface PortfolioItem {
    asset: ScreenerItem;
    shares: number;
    weight: number; // 0 to 1
}

import { saveUserPortfolio } from "../actions/portfolio";

interface DbPortfolioItem {
    ticker: string;
    shares: number;
}

interface PortfolioClientProps {
    screenerData: Record<string, unknown>[];
    initialDbPortfolio?: DbPortfolioItem[] | null;
}

// ─── Component ───

export default function PortfolioClient({ screenerData, initialDbPortfolio }: PortfolioClientProps) {
    const assets = screenerData as unknown as ScreenerItem[];
    const { t } = useTranslation();
    const { formatPrice, currency, eurUsdRate } = useCurrency();

    // State
    const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [initialLoadDone, setInitialLoadDone] = useState(false);

    // Load Data
    useEffect(() => {
        if (initialDbPortfolio && initialDbPortfolio.length > 0) {
            // Load from database if available
            const matchedItems = initialDbPortfolio.map(pi => {
                const asset = assets.find(a => a.ticker === pi.ticker);
                return asset ? { asset, shares: pi.shares, weight: 0 } : null;
            }).filter(Boolean) as PortfolioItem[];
            setPortfolio(matchedItems);
        } else {
            // Fallback to local storage (unregistered users, or empty DB)
            const saved = localStorage.getItem("botbourse_portfolio");
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed.items && Array.isArray(parsed.items)) {
                        const matchedItems = parsed.items.map((pi: any) => {
                            const asset = assets.find(a => a.ticker === pi.ticker);
                            return asset ? { asset, shares: pi.shares, weight: 0 } : null;
                        }).filter(Boolean) as PortfolioItem[];
                        setPortfolio(matchedItems);
                    }
                } catch (e) { }
            }
        }
        setInitialLoadDone(true);
    }, [assets, initialDbPortfolio]);

    // Save Data (Local + DB Sync)
    useEffect(() => {
        if (!initialLoadDone) return;
        
        const items = portfolio.map(p => ({ ticker: p.asset.ticker, shares: p.shares }));
        localStorage.setItem("botbourse_portfolio", JSON.stringify({ items }));

        // Debounced Save to DB (if logged in, initialDbPortfolio !== undefined)
        if (initialDbPortfolio !== null && initialDbPortfolio !== undefined) {
            const timeout = setTimeout(() => {
                saveUserPortfolio(items).catch(console.error);
            }, 1000);
            return () => clearTimeout(timeout);
        }
    }, [portfolio, initialLoadDone, initialDbPortfolio]);

    // Compute dynamic capital based on current holdings
    const dynamicCapital = useMemo(() => {
        return portfolio.reduce((sum, item) => sum + (item.asset.price * item.shares), 0);
    }, [portfolio]);

    const portfolioWithWeights = useMemo(() => {
        return portfolio.map(item => ({
            ...item,
            weight: dynamicCapital > 0 ? (item.asset.price * item.shares) / dynamicCapital : 0
        })).sort((a, b) => b.weight - a.weight);
    }, [portfolio, dynamicCapital]);

    // Aggregate Metrics
    const metrics = useMemo(() => {
        if (portfolioWithWeights.length === 0) return null;

        let avgRisk = 0;
        let expected30d = 0;
        let expected12m = 0;

        const sectorCounts: Record<string, number> = {};
        const regionCounts: Record<string, number> = {};
        const typeCounts: Record<string, number> = {};

        for (const item of portfolioWithWeights) {
            const relWeight = item.weight; // weights already sum to 1

            avgRisk += item.asset.riskScore * relWeight;
            expected30d += item.asset.shortReturn * relWeight;
            expected12m += item.asset.mediumReturn * relWeight;

            sectorCounts[item.asset.sector] = (sectorCounts[item.asset.sector] || 0) + relWeight;
            regionCounts[item.asset.region] = (regionCounts[item.asset.region] || 0) + relWeight;
            typeCounts[item.asset.assetType] = (typeCounts[item.asset.assetType] || 0) + relWeight;
        }

        const numSectors = Object.keys(sectorCounts).length;
        const maxSectorWeight = Math.max(...Object.values(sectorCounts), 0);
        let divScore = 5;
        if (numSectors >= 5) divScore += 2;
        else if (numSectors === 1) divScore -= 2;

        if (maxSectorWeight > 0.5) divScore -= 1;
        if (maxSectorWeight < 0.25) divScore += 1;

        if (typeCounts["etf"] && typeCounts["etf"] > 0.1) divScore += 1;
        if (Object.keys(regionCounts).length > 1) divScore += 1;

        divScore = Math.max(1, Math.min(10, Math.round(divScore)));

        return {
            investedPct: 1, // Full invested assumption without cash drag
            avgRisk,
            expected30d,
            expected12m,
            divScore,
            sectorCounts,
        };
    }, [portfolioWithWeights]);

    // Search Results
    const searchResults = useMemo(() => {
        if (!searchQuery) return [];
        const q = searchQuery.toLowerCase();
        return assets
            .filter(a => !portfolio.some(p => p.asset.ticker === a.ticker))
            .filter(a => a.ticker.toLowerCase().includes(q) || a.name.toLowerCase().includes(q))
            .slice(0, 5);
    }, [searchQuery, assets, portfolio]);

    // Handlers
    const addAsset = (asset: ScreenerItem) => {
        const shares = 1; // Default to 1 share, user can adjust
        setPortfolio([...portfolio, { asset, shares, weight: 0 }]);
        setSearchQuery("");
        setIsSearchOpen(false);
    };

    const removeAsset = (ticker: string) => {
        setPortfolio(portfolio.filter(p => p.asset.ticker !== ticker));
    };

    const updateShares = (ticker: string, shares: number) => {
        if (shares < 0) return;
        setPortfolio(portfolio.map(p =>
            p.asset.ticker === ticker ? { ...p, shares } : p
        ));
    };

    const updateAmount = (ticker: string, amount: number) => {
        if (amount < 0) return;
        setPortfolio(portfolio.map(p => {
            if (p.asset.ticker === ticker) {
                // Determine shares needed for this exact amount (in current currency)
                // If current currency is EUR and asset is USD, amount is in EUR, so priceInCurrent = p.asset.price / rate
                const assetCurrency = p.asset.currency || "USD";
                let priceInDisplay = p.asset.price;
                if (currency === "EUR" && assetCurrency === "USD") priceInDisplay = p.asset.price / eurUsdRate;
                if (currency === "USD" && assetCurrency === "EUR") priceInDisplay = p.asset.price * eurUsdRate;
                
                const shares = Number((amount / priceInDisplay).toFixed(4));
                return { ...p, shares };
            }
            return p;
        }));
    };

    if (!initialLoadDone) return null; // Avoid hydration mismatch

    return (
        <div className="px-4 sm:px-6 py-8 md:py-12" style={{ maxWidth: "var(--container-max)", margin: "0 auto" }}>
            {/* ─── Header ─── */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Briefcase size={20} weight="fill" color="var(--accent)" />
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tighter" style={{ color: "var(--text-primary)" }}>
                            {t("port.title")}
                        </h1>
                    </div>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {t("port.subtitle")}
                    </p>
                </div>

                {dynamicCapital > 0 && (
                    <div className="flex flex-col items-end">
                        <label className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{t("port.capital")} Total</label>
                        <div className="text-2xl font-bold num" style={{ color: "var(--text-primary)" }}>
                            {formatPrice(dynamicCapital)}
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ─── Left Col: Portfolio Builder ─── */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Assets Table Container */}
                    <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                        <div className="p-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
                            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{t("port.holdings")}</h2>

                            {/* Search / Add Asset */}
                            <div className="relative">
                                {isSearchOpen ? (
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center bg-transparent z-10">
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder={t("port.search")}
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="w-48 px-3 py-1.5 text-xs outline-none rounded-l-lg"
                                            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRight: "none", color: "var(--text-primary)" }}
                                        />
                                        <button
                                            onClick={() => setIsSearchOpen(false)}
                                            className="px-2 py-1.5 rounded-r-lg tactile"
                                            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderLeft: "none", color: "var(--text-muted)" }}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setIsSearchOpen(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium tactile"
                                        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                                    >
                                        <Plus size={14} weight="bold" />
                                        {t("port.add")}
                                    </button>
                                )}

                                {/* Dropdown results */}
                                {isSearchOpen && searchResults.length > 0 && (
                                    <div className="absolute top-10 right-0 w-64 rounded-lg overflow-hidden z-20 shadow-xl"
                                        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                                        {searchResults.map(a => (
                                            <button
                                                key={a.ticker}
                                                onClick={() => addAsset(a)}
                                                className="w-full flex items-center justify-between px-3 py-2 text-left tactile"
                                                style={{ borderBottom: "1px solid var(--border)", transition: "background var(--transition-fast)" }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                                            >
                                                <div>
                                                    <span className="text-sm font-semibold mr-2">{a.ticker}</span>
                                                    <span className="text-[10px] text-muted">{a.name.substring(0, 15)}</span>
                                                </div>
                                                <span className="text-xs num">{formatPrice(a.price, a.currency)}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {portfolioWithWeights.length === 0 ? (
                            <div className="p-12 text-center">
                                <ChartPieSlice size={48} weight="duotone" color="var(--text-muted)" className="mx-auto mb-4 opacity-50" />
                                <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("port.empty")}</div>
                                <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{t("port.empty_desc")}</div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                {/* Table Header */}
                                <div className="grid items-center gap-2 px-4 py-2.5 text-[10px] uppercase tracking-wider font-medium"
                                    style={{
                                        color: "var(--text-muted)",
                                        borderBottom: "1px solid var(--border)",
                                        background: "var(--bg-elevated)",
                                        gridTemplateColumns: "20px 2fr 1fr 1fr 1fr 1fr .8fr",
                                    }}>
                                    <div></div>
                                    <div>{t("port.table.asset")}</div>
                                    <div className="text-right">{t("port.table.price")}</div>
                                    <div className="text-right">{t("port.table.shares")}</div>
                                    <div className="text-right">Montant Investi ({currency === "EUR" ? "€" : "$"})</div>
                                    <div className="text-right">Allocation (%)</div>
                                    <div className="text-right">{t("port.table.12m")}</div>
                                </div>

                                {/* Items */}
                                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                                    {portfolioWithWeights.map((item, i) => (
                                        <div key={item.asset.ticker} className="grid items-center gap-2 px-4 py-3 stagger-item"
                                            style={{
                                                "--index": i,
                                                gridTemplateColumns: "20px 2fr 1fr 1fr 1fr 1fr .8fr",
                                            } as React.CSSProperties}>

                                            {/* Remove */}
                                            <button onClick={() => removeAsset(item.asset.ticker)} className="text-muted hover:text-red-400 transition-colors">
                                                <X size={14} />
                                            </button>

                                            {/* Asset */}
                                            <div className="min-w-0">
                                                <Link href={`/asset/${item.asset.ticker}`} className="flex items-center gap-1.5 hover:underline" prefetch={false}>
                                                    <span className="text-sm font-semibold num" style={{ color: "var(--text-primary)" }}>{item.asset.ticker}</span>
                                                    <span className="text-[10px] px-1 py-0.5 rounded uppercase" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>{item.asset.assetType}</span>
                                                </Link>
                                                <div className="text-[10px] truncate mt-0.5" style={{ color: "var(--text-muted)" }}>{item.asset.name}</div>
                                            </div>

                                            {/* Price */}
                                            <div className="text-right text-xs num">
                                                {formatPrice(item.asset.price, item.asset.currency)}
                                            </div>

                                            {/* Shares Input */}
                                            <div className="flex justify-end">
                                                <input
                                                    type="number"
                                                    value={item.shares}
                                                    onChange={(e) => updateShares(item.asset.ticker, Number(e.target.value))}
                                                    step="0.01"
                                                    className="w-16 text-right px-2 py-1 bg-transparent rounded border outline-none text-xs num transition-colors hover:border-white/30 focus:border-white/50"
                                                    style={{ borderColor: "var(--border)", color: "var(--text-primary)", background: "var(--bg-elevated)" }}
                                                />
                                            </div>

                                            {/* Amount Input */}
                                            <div className="flex justify-end items-center gap-1">
                                                <span className="text-xs text-muted">{currency === "EUR" ? "€" : "$"}</span>
                                                <input
                                                    type="number"
                                                    value={(() => {
                                                        const assetCurrency = item.asset.currency || "USD";
                                                        let priceInDisplay = item.asset.price;
                                                        if (currency === "EUR" && assetCurrency === "USD") priceInDisplay = item.asset.price / eurUsdRate;
                                                        if (currency === "USD" && assetCurrency === "EUR") priceInDisplay = item.asset.price * eurUsdRate;
                                                        return Math.round(priceInDisplay * item.shares * 100) / 100;
                                                    })()}
                                                    onChange={(e) => updateAmount(item.asset.ticker, Number(e.target.value))}
                                                    className="w-20 text-right px-2 py-1 bg-transparent rounded border outline-none text-xs num font-medium transition-colors hover:border-white/30 focus:border-white/50"
                                                    style={{ borderColor: "var(--border)", color: "var(--accent)" }}
                                                />
                                            </div>

                                            {/* Read-only Weight */}
                                            <div className="text-right text-xs num font-medium" style={{ color: "var(--text-primary)" }}>
                                                {(item.weight * 100).toFixed(1)}%
                                            </div>

                                            {/* 12m Signal */}
                                            <div className="text-right flex flex-col items-end gap-1">
                                                <div className="flex items-center gap-1.5">
                                                    <TrendBadge trend={item.asset.mediumTrend as any} />
                                                </div>
                                            </div>

                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Right Col: Analytics ─── */}
                <div className="space-y-4">

                    {/* Model Overview Summary */}
                    <div className="rounded-xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                        <div className="flex items-center gap-2 mb-4">
                            <Brain size={18} weight="fill" color="var(--accent)" />
                            <h2 className="text-sm font-semibold uppercase tracking-wider">{t("port.analysis.title")}</h2>
                        </div>

                        {!metrics ? (
                            <div className="text-xs text-center py-6" style={{ color: "var(--text-muted)" }}>{t("port.analysis.empty")}</div>
                        ) : (
                            <div className="space-y-5">
                                {/* Aggregate Return 12m */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("port.analysis.exp12m")}</span>
                                        <span className="text-lg font-bold num" style={{ color: metrics.expected12m >= 0 ? "var(--accent)" : "var(--negative)" }}>
                                            {formatReturn(metrics.expected12m)}
                                        </span>
                                    </div>
                                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                        <div className="h-full rounded-full" style={{
                                            background: metrics.expected12m > 0.1 ? "var(--accent)" : metrics.expected12m > 0 ? "var(--neutral-accent)" : "var(--negative)",
                                            width: `${Math.min(100, Math.max(0, (metrics.expected12m + 0.1) * 500))}%`
                                        }} />
                                    </div>
                                    <div className="text-[10px] text-right mt-1 opacity-70">
                                        Sur la base des {portfolio.length} actions sélectionnées
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-lg" style={{ background: "var(--bg-elevated)" }}>
                                        <div className="text-[10px] uppercase text-muted mb-1">{t("port.analysis.avg_risk")}</div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold num">{metrics.avgRisk.toFixed(1)} <span className="text-[10px] opacity-50 font-normal">/ 5</span></span>
                                        </div>
                                        <div className="mt-1"><RiskDots score={Math.round(metrics.avgRisk) as 1 | 2 | 3 | 4 | 5} /></div>
                                    </div>
                                    <div className="p-3 rounded-lg" style={{ background: "var(--bg-elevated)" }}>
                                        <div className="text-[10px] uppercase text-muted mb-1">{t("port.analysis.div")}</div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold num">{metrics.divScore} <span className="text-[10px] opacity-50 font-normal">/ 10</span></span>
                                        </div>
                                        <div className="text-[10px] mt-1" style={{ color: metrics.divScore >= 7 ? "var(--accent)" : metrics.divScore <= 3 ? "var(--negative)" : "var(--text-secondary)" }}>
                                            {metrics.divScore >= 7 ? t("port.analysis.div_well") : metrics.divScore <= 3 ? t("port.analysis.div_conc") : t("port.analysis.div_adeq")}
                                        </div>
                                    </div>
                                </div>

                                {/* Sector Breakdown Simple */}
                                <div className="pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                                    <div className="text-[10px] uppercase text-muted mb-2">{t("port.analysis.sector")}</div>
                                    <div className="space-y-1.5">
                                        {Object.entries(metrics.sectorCounts)
                                            .sort((a, b) => b[1] - a[1])
                                            .slice(0, 5)
                                            .map(([sector, pct]) => (
                                                <div key={sector} className="flex justify-between items-center text-xs">
                                                    <span className="truncate" style={{ maxWidth: "65%", color: "var(--text-secondary)" }}>{sector}</span>
                                                    <span className="num font-medium">{(pct * 100).toFixed(1)}%</span>
                                                </div>
                                            ))}
                                    </div>
                                </div>

                                {/* Info Box */}
                                <div className="p-3 mt-4 rounded-lg flex gap-2 text-[10px] leading-relaxed" style={{ background: "rgba(39, 39, 42, 0.4)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                    <ShieldCheck size={14} className="flex-shrink-0 mt-0.5" />
                                    <div>
                                        {t("port.analysis.disclaimer")}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
