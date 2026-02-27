import type { ReactNode } from "react";

interface GlassPanelProps {
    children: ReactNode;
    className?: string;
    strong?: boolean;
}

export default function GlassPanel({ children, className = "", strong = false }: GlassPanelProps) {
    return (
        <div
            className={`rounded-2xl ${className}`}
            style={{
                background: strong
                    ? "rgba(24, 24, 27, 0.85)"
                    : "rgba(24, 24, 27, 0.7)",
                backdropFilter: strong ? "blur(40px)" : "blur(24px)",
                WebkitBackdropFilter: strong ? "blur(40px)" : "blur(24px)",
                border: "1px solid var(--glass-border)",
                boxShadow: strong
                    ? "var(--glass-inner-shadow), var(--shadow-lg)"
                    : "var(--glass-inner-shadow), var(--shadow-md)",
            }}
        >
            {children}
        </div>
    );
}
