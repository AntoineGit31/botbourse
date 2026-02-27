import { DISCLAIMER_TEXT } from "@/lib/constants";

export default function DisclaimerStrip() {
    return (
        <div
            className="w-full py-2.5 px-6 text-center"
            style={{
                background: "rgba(244, 63, 94, 0.04)",
                borderBottom: "1px solid rgba(244, 63, 94, 0.08)",
                color: "var(--text-muted)",
                fontSize: "0.7rem",
                letterSpacing: "0.01em",
                lineHeight: 1.5,
            }}
        >
            {DISCLAIMER_TEXT}
        </div>
    );
}
