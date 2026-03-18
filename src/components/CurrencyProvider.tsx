"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Currency = "USD" | "EUR";

interface CurrencyContextProps {
    currency: Currency;
    setCurrency: (c: Currency) => void;
    eurUsdRate: number;
    formatPrice: (price: number, assetCurrency?: string) => string;
    formatMarketCap: (value: number, assetCurrency?: string) => string;
}

const CurrencyContext = createContext<CurrencyContextProps | null>(null);

export function CurrencyProvider({ children, eurUsdRate }: { children: React.ReactNode, eurUsdRate: number }) {
    const [currency, setCurrencyState] = useState<Currency>("USD");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem("botbourse_currency") as Currency;
        if (saved && (saved === "USD" || saved === "EUR")) {
            setCurrencyState(saved);
        }
    }, []);

    const setCurrency = (c: Currency) => {
        setCurrencyState(c);
        localStorage.setItem("botbourse_currency", c);
    };

    /**
     * Helper to convert an amount from USD to EUR if requested.
     */
    const convert = (value: number, assetCurrency: string = "USD") => {
        if (!mounted) return { value, symbol: assetCurrency === "EUR" ? "€" : "$" };

        // If the asset is natively in USD, and user prefers EUR, convert it (divide by rate)
        if (currency === "EUR" && assetCurrency === "USD") {
            return { value: value / eurUsdRate, symbol: "€" };
        }
        // If the asset is natively in EUR, and user prefers USD, convert it (multiply by rate)
        if (currency === "USD" && assetCurrency === "EUR") {
            return { value: value * eurUsdRate, symbol: "$" };
        }

        // Otherwise return natively
        const symbol = currency === "EUR" ? "€" : currency === "DKK" ? "kr" : "$";
        return { value, symbol };
    };

    const formatPrice = (price: number, assetCurrency: string = "USD") => {
        const { value, symbol } = convert(price, assetCurrency);
        return `${symbol}${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatMarketCap = (cap: number, assetCurrency: string = "USD") => {
        const { value, symbol } = convert(cap, assetCurrency);
        if (value >= 1e12) return `${symbol}${(value / 1e12).toFixed(2)}T`;
        if (value >= 1e9) return `${symbol}${(value / 1e9).toFixed(2)}B`;
        if (value >= 1e6) return `${symbol}${(value / 1e6).toFixed(1)}M`;
        return `${symbol}${value.toLocaleString()}`;
    };

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency, eurUsdRate, formatPrice, formatMarketCap }}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency() {
    const ctx = useContext(CurrencyContext);
    if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
    return ctx;
}
