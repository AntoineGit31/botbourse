"use client";

import { useRef, useEffect, useState } from "react";
import {
    createChart,
    type IChartApi,
    ColorType,
    CandlestickSeries,
    AreaSeries,
    HistogramSeries,
} from "lightweight-charts";
import type { OHLCData } from "@/lib/types";

type ChartMode = "candle" | "area";

interface PriceChartProps {
    data: OHLCData[];
    isPositive: boolean;
}

export default function PriceChart({ data, isPositive }: PriceChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const [mode, setMode] = useState<ChartMode>("candle");

    useEffect(() => {
        if (!containerRef.current || data.length === 0) return;

        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }

        const accent = isPositive ? "#10b981" : "#f43f5e";
        const upColor = "#10b981";
        const downColor = "#f43f5e";

        const chart = createChart(containerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: "#71717a",
                fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
                fontSize: 11,
            },
            grid: {
                vertLines: { color: "rgba(255, 255, 255, 0.03)" },
                horzLines: { color: "rgba(255, 255, 255, 0.03)" },
            },
            width: containerRef.current.clientWidth,
            height: 380,
            rightPriceScale: {
                borderColor: "rgba(255, 255, 255, 0.06)",
                scaleMargins: { top: 0.05, bottom: 0.25 },
            },
            timeScale: {
                borderColor: "rgba(255, 255, 255, 0.06)",
                timeVisible: true,
            },
            crosshair: {
                vertLine: { color: "rgba(255, 255, 255, 0.15)", width: 1, style: 2 },
                horzLine: { color: "rgba(255, 255, 255, 0.15)", width: 1, style: 2 },
            },
        });

        chartRef.current = chart;

        // Lightweight Charts requires strictly ascending uniqueness
        const safeData = Array.from(new Map(data.map(d => [d.time as string | number, d])).values())
            .sort((a, b) => {
                if (typeof a.time === 'number' && typeof b.time === 'number') return a.time - b.time;
                if (typeof a.time === 'string' && typeof b.time === 'string') return a.time.localeCompare(b.time);
                return 0;
            });

        if (mode === "candle") {
            const candleSeries = chart.addSeries(CandlestickSeries, {
                upColor,
                downColor,
                borderUpColor: upColor,
                borderDownColor: downColor,
                wickUpColor: upColor,
                wickDownColor: downColor,
            });

            candleSeries.setData(
                safeData.map((d) => ({
                    time: d.time,
                    open: d.open,
                    high: d.high,
                    low: d.low,
                    close: d.close,
                }))
            );
        } else {
            const areaSeries = chart.addSeries(AreaSeries, {
                topColor: `${accent}20`,
                bottomColor: `${accent}02`,
                lineColor: accent,
                lineWidth: 2,
            });

            areaSeries.setData(safeData.map((d) => ({ time: d.time, value: d.close })));
        }

        // Volume histogram
        if (safeData.some(d => d.volume && d.volume > 0)) {
            const volumeSeries = chart.addSeries(HistogramSeries, {
                priceFormat: { type: "volume" },
                priceScaleId: "volume",
            });

            chart.priceScale("volume").applyOptions({
                scaleMargins: { top: 0.8, bottom: 0 },
            });

            volumeSeries.setData(
                safeData.map((d) => ({
                    time: d.time,
                    value: d.volume || 0,
                    color: d.close >= d.open ? `${upColor}30` : `${downColor}30`,
                }))
            );
        }

        chart.timeScale().fitContent();

        const handleResize = () => {
            if (containerRef.current && chartRef.current) {
                chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
            }
        };

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, [data, isPositive, mode]);

    return (
        <div>
            {/* Chart Mode Toggle */}
            <div className="flex items-center gap-1 mb-3">
                {(["candle", "area"] as const).map((m) => (
                    <button
                        key={m}
                        onClick={() => setMode(m)}
                        className="px-2.5 py-1 rounded-md text-[11px] font-medium tactile"
                        style={{
                            background: mode === m ? "var(--bg-surface)" : "transparent",
                            color: mode === m ? "var(--text-primary)" : "var(--text-muted)",
                            border: mode === m ? "1px solid var(--border)" : "1px solid transparent",
                            transition: "all var(--transition-fast)",
                        }}
                    >
                        {m === "candle" ? "Candlestick" : "Area"}
                    </button>
                ))}
            </div>
            <div
                ref={containerRef}
                style={{ width: "100%", height: 380, borderRadius: 8, overflow: "hidden" }}
            />
        </div>
    );
}
