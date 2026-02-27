import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";

interface EmptyStateProps {
    title: string;
    description: string;
}

export default function EmptyState({ title, description }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div
                className="flex items-center justify-center rounded-2xl mb-5"
                style={{
                    width: 64,
                    height: 64,
                    background: "var(--bg-elevated)",
                }}
            >
                <MagnifyingGlass size={28} weight="light" color="var(--text-muted)" />
            </div>
            <h3
                className="text-base font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
            >
                {title}
            </h3>
            <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-muted)", maxWidth: "40ch" }}
            >
                {description}
            </p>
        </div>
    );
}
