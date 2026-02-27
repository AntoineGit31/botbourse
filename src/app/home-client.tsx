"use client";

import Link from "next/link";
import { ArrowRight, ChartLineUp, ShieldCheck, Brain, TrendUp, Lightning, TrendDown } from "@phosphor-icons/react";
import { formatReturn, formatPrice, formatChangePercent } from "@/lib/utils";
import type { Prediction, Asset } from "@/lib/types";
import TrendBadge from "@/components/ui/TrendBadge";
import RiskDots from "@/components/ui/RiskDots";
import { useTranslation } from "@/components/I18nProvider";
import { useEffect, useState } from "react";

interface HomeClientProps {
    previewPredictions: Prediction[];
    marketPulse: Asset[];
}

export default function HomeClient({ previewPredictions, marketPulse }: HomeClientProps) {
    const { t } = useTranslation();
    const [activeIndex, setActiveIndex] = useState(0);

    // Rotate the featured prediction automatically
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % previewPredictions.length);
        }, 3500);
        return () => clearInterval(interval);
    }, [previewPredictions.length]);

    return (
        <div className="relative overflow-hidden w-full">
            {/* Background Animations */}
            <div className="absolute top-0 left-0 w-full h-[80vh] overflow-hidden -z-10 pointer-events-none">
                <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full opacity-20 filter blur-[100px] animate-pulse" style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)", animationDuration: "8s" }} />
                <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full opacity-10 filter blur-[120px] animate-pulse" style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)", animationDuration: "12s" }} />
            </div>

            {/* Live Market Pulse Ticker */}
            <div className="w-full border-b flex overflow-hidden whitespace-nowrap py-2.5" style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.2)" }}>
                <div className="flex animate-marquee shrink-0 items-center justify-center cursor-default">
                    {marketPulse.map((asset) => (
                        <div key={`pulse-1-${asset.ticker}`} className="flex items-center gap-2 mx-6">
                            <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{asset.ticker}</span>
                            <span className="text-xs num" style={{ color: "var(--text-primary)" }}>{formatPrice(asset.price)}</span>
                            <span className="text-xs num font-medium flex items-center gap-0.5" style={{ color: asset.changePercent >= 0 ? "var(--accent)" : "var(--negative)" }}>
                                {asset.changePercent >= 0 ? <TrendUp weight="bold" /> : <TrendDown weight="bold" />}
                                {formatChangePercent(asset.changePercent)}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="flex animate-marquee shrink-0 items-center justify-center cursor-default" aria-hidden="true">
                    {marketPulse.map((asset) => (
                        <div key={`pulse-2-${asset.ticker}`} className="flex items-center gap-2 mx-6">
                            <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{asset.ticker}</span>
                            <span className="text-xs num" style={{ color: "var(--text-primary)" }}>{formatPrice(asset.price)}</span>
                            <span className="text-xs num font-medium flex items-center gap-0.5" style={{ color: asset.changePercent >= 0 ? "var(--accent)" : "var(--negative)" }}>
                                {asset.changePercent >= 0 ? <TrendUp weight="bold" /> : <TrendDown weight="bold" />}
                                {formatChangePercent(asset.changePercent)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="px-4 sm:px-6" style={{ maxWidth: "var(--container-max)", margin: "0 auto" }}>
                {/* ─── Hero Section (Split: 55/45) ─── */}
                <section
                    className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-12 md:gap-16 items-center py-16 md:py-24"
                    style={{ minHeight: "calc(100vh - 200px)" }}
                >
                    {/* Left — Text */}
                    <div className="relative z-10">
                        <div
                            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium mb-6 animate-fade-in-up"
                            style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid rgba(16, 185, 129, 0.15)" }}
                        >
                            <Brain size={14} weight="fill" className="animate-pulse" />
                            {t("home.badge")}
                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-tight mb-6 animate-fade-in-up" style={{ color: "var(--text-primary)", animationDelay: "100ms" }}>
                            {t("home.title1")}
                            <br />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500">
                                {t("home.title2")}
                            </span>
                        </h1>

                        <p className="text-base md:text-lg leading-relaxed mb-10 animate-fade-in-up" style={{ color: "var(--text-secondary)", maxWidth: "55ch", animationDelay: "200ms" }}>
                            {t("home.subtitle")}
                        </p>

                        <div className="flex flex-wrap gap-4 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
                            <Link
                                href="/predictions"
                                className="tactile group relative inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold overflow-hidden"
                                style={{
                                    background: "var(--accent)", color: "var(--bg-primary)",
                                    boxShadow: "0 8px 32px rgba(16, 185, 129, 0.3)",
                                }}
                            >
                                <span className="absolute inset-0 w-full h-full bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
                                {t("home.btn_model")}
                                <ArrowRight size={16} weight="bold" className="group-hover:translate-x-1 transition-transform" />
                            </Link>

                            <Link
                                href="/market"
                                className="tactile inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium"
                                style={{ background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-active)", transition: "all var(--transition-fast)" }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.borderColor = "var(--text-muted)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)" }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderColor = "var(--border-active)"; e.currentTarget.style.background = "transparent" }}
                            >
                                {t("home.btn_market")}
                            </Link>
                        </div>
                    </div>

                    {/* Right — Animated Data Previews */}
                    <div className="relative w-full aspect-square md:aspect-[4/5] flex items-center justify-center animate-fade-in-up z-10" style={{ animationDelay: "400ms" }}>
                        <div className="absolute -inset-10 rounded-[3rem] bg-gradient-to-br from-emerald-500/10 to-transparent -z-10 blur-2xl"></div>
                        {previewPredictions.map((pred, i) => {
                            const isActive = i === activeIndex;
                            const isPrev = i === (activeIndex - 1 + previewPredictions.length) % previewPredictions.length;
                            const isNext = i === (activeIndex + 1) % previewPredictions.length;

                            let styles = {
                                opacity: 0,
                                transform: "translateY(50px) scale(0.8)",
                                zIndex: 0,
                                filter: "blur(10px)",
                            };

                            if (isActive) {
                                styles = { opacity: 1, transform: "translateY(0) scale(1)", zIndex: 10, filter: "blur(0px)" };
                            } else if (isPrev) {
                                styles = { opacity: 0.3, transform: "translateY(-70px) scale(0.85)", zIndex: 5, filter: "blur(4px)" };
                            } else if (isNext) {
                                styles = { opacity: 0.3, transform: "translateY(70px) scale(0.85)", zIndex: 5, filter: "blur(4px)" };
                            }

                            return (
                                <div
                                    key={pred.ticker}
                                    className="absolute w-[80%] rounded-2xl p-6 transition-all duration-700 ease-out"
                                    style={{
                                        ...styles,
                                        background: "rgba(24, 24, 27, 0.75)",
                                        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
                                        border: isActive ? "1px solid var(--accent)" : "1px solid var(--glass-border)",
                                        boxShadow: isActive ? "0 20px 40px rgba(0,0,0,0.5), 0 0 20px rgba(16, 185, 129, 0.15)" : "var(--glass-inner-shadow), var(--shadow-diffusion)",
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                                                <Lightning size={20} weight="fill" color="var(--accent)" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl font-bold num" style={{ color: "var(--text-primary)" }}>{pred.ticker}</span>
                                                    <TrendBadge trend={pred.trendLabel} />
                                                </div>
                                                <span className="text-xs truncate block max-w-[120px]" style={{ color: "var(--text-muted)" }}>{pred.name}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-5">
                                        <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5">
                                            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{t("home.30d_horizon")} Return</span>
                                            <span className="text-lg font-bold num" style={{ color: pred.expectedReturn >= 0 ? "var(--accent)" : "var(--negative)" }}>
                                                {formatReturn(pred.expectedReturn)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5">
                                            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Risk Profile</span>
                                            <RiskDots score={pred.riskScore} />
                                        </div>
                                    </div>

                                    <div className="w-full h-1.5 rounded-full overflow-hidden bg-white/5">
                                        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{
                                            width: isActive ? `${Math.min(100, Math.max(10, Math.abs(pred.expectedReturn) * 400))}%` : "0%",
                                            background: pred.expectedReturn >= 0 ? "linear-gradient(90deg, var(--accent), #34d399)" : "linear-gradient(90deg, var(--negative), #fb7185)",
                                            transitionDelay: "300ms"
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* ─── Features Section ─── */}
                <section className="py-20 md:py-32 relative text-center" style={{ borderTop: "1px solid var(--border)" }}>
                    {/* Background glow for features */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full opacity-10 filter blur-[150px] -z-10 pointer-events-none" style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }} />

                    <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-16" style={{ color: "var(--text-primary)" }}>
                        {t("home.how_it_works")}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                        {/* Feature 1 */}
                        <div className="group rounded-3xl p-8 hover:-translate-y-2 transition-transform duration-500 text-center" style={{ background: "linear-gradient(180deg, var(--bg-surface) 0%, transparent 100%)", border: "1px solid var(--border)", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
                            <div className="flex items-center justify-center rounded-2xl mb-6 mx-auto group-hover:scale-110 transition-transform duration-500" style={{ width: 64, height: 64, background: "var(--accent-soft)" }}>
                                <Brain size={32} weight="duotone" color="var(--accent)" />
                            </div>
                            <h3 className="text-xl font-bold tracking-tight mb-3" style={{ color: "var(--text-primary)" }}>
                                {t("home.feat1_title")}
                            </h3>
                            <p className="text-sm leading-relaxed mx-auto" style={{ color: "var(--text-secondary)", maxWidth: "35ch" }}>
                                {t("home.feat1_desc")}
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="group rounded-3xl p-8 hover:-translate-y-2 transition-transform duration-500 text-center" style={{ background: "linear-gradient(180deg, var(--bg-surface) 0%, transparent 100%)", border: "1px solid var(--border)", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
                            <div className="flex items-center justify-center rounded-2xl mb-6 mx-auto group-hover:scale-110 transition-transform duration-500" style={{ width: 64, height: 64, background: "var(--negative-soft)" }}>
                                <ShieldCheck size={32} weight="duotone" color="var(--negative)" />
                            </div>
                            <h3 className="text-xl font-bold tracking-tight mb-3" style={{ color: "var(--text-primary)" }}>
                                {t("home.feat2_title")}
                            </h3>
                            <p className="text-sm leading-relaxed mx-auto" style={{ color: "var(--text-secondary)", maxWidth: "35ch" }}>
                                {t("home.feat2_desc")}
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="group rounded-3xl p-8 hover:-translate-y-2 transition-transform duration-500 text-center" style={{ background: "linear-gradient(180deg, var(--bg-surface) 0%, transparent 100%)", border: "1px solid var(--border)", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
                            <div className="flex items-center justify-center rounded-2xl mb-6 mx-auto group-hover:scale-110 transition-transform duration-500" style={{ width: 64, height: 64, background: "var(--neutral-soft)" }}>
                                <ChartLineUp size={32} weight="duotone" color="var(--neutral-accent)" />
                            </div>
                            <h3 className="text-xl font-bold tracking-tight mb-3" style={{ color: "var(--text-primary)" }}>
                                {t("home.feat3_title")}
                            </h3>
                            <p className="text-sm leading-relaxed mx-auto" style={{ color: "var(--text-secondary)", maxWidth: "35ch" }}>
                                {t("home.feat3_desc")}
                            </p>
                        </div>
                    </div>
                </section>
            </div>
            {/* Embedded styles for CSS animations within the component */}
            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                    animation: marquee 35s linear infinite;
                }
                .animate-marquee:hover {
                    animation-play-state: paused;
                }
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fade-in-up {
                    opacity: 0;
                    animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
}
