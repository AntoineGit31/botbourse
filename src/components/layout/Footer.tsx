"use client";

import Link from "next/link";

export default function Footer() {
    return (
        <footer
            className="w-full px-6 py-10"
            style={{
                borderTop: "1px solid var(--border)",
                background: "var(--bg-primary)",
            }}
        >
            <div
                className="mx-auto grid grid-cols-1 gap-8 md:grid-cols-3"
                style={{ maxWidth: "var(--container-max)" }}
            >
                {/* Brand */}
                <div>
                    <span
                        className="text-base font-semibold tracking-tight"
                        style={{ color: "var(--text-primary)" }}
                    >
                        BotBourse
                    </span>
                    <p
                        className="mt-2 text-sm leading-relaxed"
                        style={{ color: "var(--text-muted)", maxWidth: "40ch" }}
                    >
                        Model-driven market views for stocks and ETFs.
                        Quantitative analysis for informational purposes only.
                    </p>
                </div>

                {/* Navigation */}
                <div>
                    <h4
                        className="text-xs font-medium uppercase tracking-wider mb-3"
                        style={{ color: "var(--text-muted)" }}
                    >
                        Navigation
                    </h4>
                    <div className="flex flex-col gap-2">
                        {[
                            { href: "/market", label: "Markets" },
                            { href: "/predictions", label: "Model Room" },
                            { href: "/legal", label: "Legal & Disclaimer" },
                        ].map(({ href, label }) => (
                            <Link
                                key={href}
                                href={href}
                                className="text-sm"
                                style={{
                                    color: "var(--text-secondary)",
                                    transition: "color var(--transition-fast)",
                                }}
                                onMouseEnter={(e) => { (e.target as HTMLElement).style.color = "var(--text-primary)"; }}
                                onMouseLeave={(e) => { (e.target as HTMLElement).style.color = "var(--text-secondary)"; }}
                            >
                                {label}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Compliance */}
                <div>
                    <h4
                        className="text-xs font-medium uppercase tracking-wider mb-3"
                        style={{ color: "var(--text-muted)" }}
                    >
                        Compliance
                    </h4>
                    <p
                        className="text-xs leading-relaxed"
                        style={{ color: "var(--text-muted)", maxWidth: "45ch" }}
                    >
                        This platform does not constitute a regulated investment service
                        under MiFID II or AMF guidelines. All model outputs are
                        informational and do not represent financial advice.
                    </p>
                </div>
            </div>

            <div
                className="mx-auto mt-8 pt-6 text-center text-xs"
                style={{
                    maxWidth: "var(--container-max)",
                    borderTop: "1px solid var(--border)",
                    color: "var(--text-muted)",
                }}
            >
                BotBourse &middot; {new Date().getFullYear()} &middot; Built for informational purposes
            </div>
        </footer>
    );
}
