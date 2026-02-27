export default function SkeletonRow({ columns = 5 }: { columns?: number }) {
    return (
        <div
            className="flex items-center gap-4 py-3.5 px-4"
            style={{ borderBottom: "1px solid var(--border)" }}
        >
            {Array.from({ length: columns }).map((_, i) => (
                <div
                    key={i}
                    className="skeleton"
                    style={{
                        height: 14,
                        borderRadius: 6,
                        flex: i === 0 ? "0 0 60px" : i === 1 ? "1 1 140px" : "0 0 80px",
                    }}
                />
            ))}
        </div>
    );
}

export function SkeletonCard() {
    return (
        <div
            className="rounded-2xl p-6"
            style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
            }}
        >
            <div className="skeleton mb-4" style={{ height: 16, width: "40%", borderRadius: 6 }} />
            <div className="skeleton mb-3" style={{ height: 32, width: "60%", borderRadius: 8 }} />
            <div className="skeleton" style={{ height: 12, width: "80%", borderRadius: 6 }} />
        </div>
    );
}
