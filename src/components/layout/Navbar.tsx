"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    ChartLineUp,
    ListMagnifyingGlass,
    Brain,
    Scales,
    Funnel,
    GridFour,
    Briefcase,
    Translate,
    SignIn,
} from "@phosphor-icons/react";
import { useTranslation } from "@/components/I18nProvider";
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'

const NAV_ITEMS = [
    { href: "/market", labelKey: "nav.markets", icon: ChartLineUp },
    { href: "/predictions", labelKey: "nav.model_room", icon: Brain },
    { href: "/screener", labelKey: "nav.screener", icon: Funnel },
    { href: "/sectors", labelKey: "nav.sectors", icon: GridFour },
    { href: "/portfolio", labelKey: "nav.portfolio", icon: Briefcase },
] as const;

export default function Navbar() {
    const pathname = usePathname();
    const { lang, setLang, t } = useTranslation();

    return (
        <nav
            className="fixed top-0 left-0 right-0 z-40"
            style={{
                background: "rgba(9, 9, 11, 0.8)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                borderBottom: "1px solid var(--border)",
            }}
        >
            <div className="mx-auto flex items-center justify-between px-6 py-3" style={{ maxWidth: "var(--container-max)" }}>
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5 tactile group">
                    <div
                        className="flex items-center justify-center rounded-lg"
                        style={{
                            width: 32,
                            height: 32,
                            background: "var(--accent-soft)",
                            transition: "background var(--transition-fast)",
                        }}
                    >
                        <ListMagnifyingGlass size={18} weight="bold" color="var(--accent)" />
                    </div>
                    <span
                        className="text-lg font-semibold tracking-tight hidden sm:inline"
                        style={{ color: "var(--text-primary)" }}
                    >
                        {t("app.name" as any)}
                    </span>
                </Link>

                {/* Nav links */}
                <div className="flex items-center gap-1">
                    {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
                        const isActive = pathname === href || pathname.startsWith(href + "/");
                        return (
                            <Link
                                key={href}
                                href={href}
                                className="tactile flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium"
                                style={{
                                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                                    background: isActive ? "var(--bg-elevated)" : "transparent",
                                    transition: "all var(--transition-fast)",
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.color = "var(--text-primary)";
                                        e.currentTarget.style.background = "rgba(39, 39, 42, 0.5)";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.color = "var(--text-secondary)";
                                        e.currentTarget.style.background = "transparent";
                                    }
                                }}
                            >
                                <Icon size={18} weight={isActive ? "fill" : "regular"} />
                                <span className="hidden md:inline">{t(labelKey as any)}</span>
                            </Link>
                        );
                    })}
                </div>

                <div className="flex items-center gap-4">
                    {/* Language Switch */}
                    <button
                        onClick={() => setLang(lang === "en" ? "fr" : "en")}
                        className="flex items-center gap-1.5 text-xs tactile font-medium px-2.5 py-1.5 rounded-lg"
                        style={{
                            color: "var(--text-secondary)",
                            background: "var(--bg-elevated)",
                            border: "1px solid var(--border)",
                            transition: "all var(--transition-fast)",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
                    >
                        <Translate size={14} />
                        <span className="uppercase">{lang}</span>
                    </button>

                    {/* Legal link */}
                    <Link
                        href="/legal"
                        className="flex items-center gap-1.5 text-xs tactile"
                        style={{
                            color: "var(--text-muted)",
                            transition: "color var(--transition-fast)",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
                    >
                        <Scales size={14} weight="regular" />
                        <span className="hidden lg:inline">{t("nav.legal" as any)}</span>
                    </Link>

                    {/* Authentication */}
                    <div className="pl-2 border-l" style={{ borderColor: 'var(--border)' }}>
                        <SignedOut>
                            <SignInButton mode="modal">
                                <button className="flex items-center gap-2 text-sm font-semibold tactile px-4 py-1.5 rounded-md"
                                    style={{
                                        color: "var(--bg-primary)",
                                        background: "var(--text-primary)",
                                        transition: "transform 0.2s ease",
                                    }}
                                >
                                    Login
                                </button>
                            </SignInButton>
                        </SignedOut>
                        <SignedIn>
                            <UserButton
                                appearance={{
                                    elements: {
                                        userButtonAvatarBox: "w-8 h-8 rounded-full border border-[var(--border)]",
                                        userButtonPopoverCard: "bg-[var(--bg-elevated)] border border-[var(--border)]",
                                    }
                                }}
                            />
                        </SignedIn>
                    </div>
                </div>
            </div>
        </nav>
    );
}
