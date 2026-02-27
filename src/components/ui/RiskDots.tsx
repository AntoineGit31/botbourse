interface RiskDotsProps {
    score: 1 | 2 | 3 | 4 | 5;
    size?: "sm" | "md";
}

export default function RiskDots({ score, size = "sm" }: RiskDotsProps) {
    const dotSize = size === "sm" ? 6 : 8;
    const gap = size === "sm" ? 3 : 4;

    return (
        <div className="flex items-center" style={{ gap }}>
            {[1, 2, 3, 4, 5].map((i) => (
                <div
                    key={i}
                    style={{
                        width: dotSize,
                        height: dotSize,
                        borderRadius: "50%",
                        background:
                            i <= score
                                ? score <= 2
                                    ? "var(--accent)"
                                    : score <= 3
                                        ? "var(--neutral-accent)"
                                        : "var(--negative)"
                                : "var(--bg-elevated)",
                        transition: "background var(--transition-fast)",
                    }}
                />
            ))}
        </div>
    );
}
