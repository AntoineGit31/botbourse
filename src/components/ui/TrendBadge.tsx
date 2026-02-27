import type { TrendLabel } from "@/lib/types";
import { TrendUp, TrendDown, Minus } from "@phosphor-icons/react/dist/ssr";

interface TrendBadgeProps {
    trend: TrendLabel;
    size?: "sm" | "md";
}

export default function TrendBadge({ trend, size = "sm" }: TrendBadgeProps) {
    const config = {
        bullish: {
            label: "Bullish",
            bg: "var(--accent-soft)",
            color: "var(--accent)",
            Icon: TrendUp,
        },
        bearish: {
            label: "Bearish",
            bg: "var(--negative-soft)",
            color: "var(--negative)",
            Icon: TrendDown,
        },
        neutral: {
            label: "Neutral",
            bg: "var(--neutral-soft)",
            color: "var(--neutral-accent)",
            Icon: Minus,
        },
    }[trend];

    const sizeClasses = size === "sm" ? "text-xs px-2 py-0.5 gap-1" : "text-sm px-2.5 py-1 gap-1.5";

    return (
        <span
            className={`inline-flex items-center font-medium rounded-md ${sizeClasses}`}
            style={{ background: config.bg, color: config.color }}
        >
            <config.Icon size={size === "sm" ? 12 : 14} weight="bold" />
            {config.label}
        </span>
    );
}
