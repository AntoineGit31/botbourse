"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { DICT } from "@/lib/i18n-dict";

type Lang = "en" | "fr";

interface I18nContextProps {
    lang: Lang;
    setLang: (lang: Lang) => void;
    t: (key: string | undefined | null, variables?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextProps | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [lang, setLang] = useState<Lang>("en");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem("botbourse_lang") as Lang;
        if (saved && (saved === "en" || saved === "fr")) {
            setLang(saved);
        } else {
            if (navigator.language.startsWith("fr")) setLang("fr");
        }
    }, []);

    const handleSetLang = (l: Lang) => {
        setLang(l);
        localStorage.setItem("botbourse_lang", l);
        // Force the page to reflect server changes safely if needed, but context works for client.
    };

    const t = (key: string | undefined | null, variables?: Record<string, string | number>) => {
        if (!key) return "";
        let str = (DICT[lang] as Record<string, string>)[key] || key;
        if (variables) {
            Object.keys(variables).forEach(k => {
                str = str.replace(`{{${k}}}`, String(variables[k]));
            });
        }
        return str;
    };

    // Before mounting, just use default "en" without mismatch.
    return (
        <I18nContext.Provider value={{ lang, setLang: handleSetLang, t }}>
            <div data-lang={mounted ? lang : "en"} style={{ visibility: mounted ? "visible" : "hidden", display: "contents" }}>
                {children}
            </div>
        </I18nContext.Provider>
    );
}

export function useTranslation() {
    const ctx = useContext(I18nContext);
    if (!ctx) throw new Error("useTranslation must be used within I18nProvider");
    return ctx;
}
