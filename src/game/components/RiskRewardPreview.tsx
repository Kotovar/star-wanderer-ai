"use client";

type PreviewTone = "danger" | "warning" | "good" | "neutral";

export interface RiskRewardPreviewItem {
    label: string;
    value: string;
    tone?: PreviewTone;
}

interface RiskRewardPreviewProps {
    title: string;
    riskTitle?: string;
    rewardTitle?: string;
    risks: RiskRewardPreviewItem[];
    rewards: RiskRewardPreviewItem[];
    notes?: string[];
}

const toneClass: Record<PreviewTone, string> = {
    danger: "text-[#ff4444]",
    warning: "text-[#ffb000]",
    good: "text-[#00ff41]",
    neutral: "text-[#888]",
};

function PreviewColumn({
    title,
    items,
}: {
    title: string;
    items: RiskRewardPreviewItem[];
}) {
    return (
        <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ffb000]">
                {title}
            </div>
            <div className="space-y-1.5">
                {items.map((item) => (
                    <div
                        key={`${item.label}:${item.value}`}
                        className="flex items-start justify-between gap-3 text-xs"
                    >
                        <span className="text-[#667766]">{item.label}</span>
                        <span
                            className={`text-right font-bold ${toneClass[item.tone ?? "neutral"]}`}
                        >
                            {item.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function RiskRewardPreview({
    title,
    riskTitle = "Риск",
    rewardTitle = "Награда",
    risks,
    rewards,
    notes = [],
}: RiskRewardPreviewProps) {
    return (
        <div className="mb-4 border border-[#ffb00066] bg-[rgba(255,176,0,0.05)] p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="font-['Orbitron'] text-xs font-bold uppercase tracking-[0.18em] text-[#ffb000]">
                    {title}
                </div>
                <div className="h-px flex-1 bg-[#ffb00033]" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <PreviewColumn title={riskTitle} items={risks} />
                <PreviewColumn title={rewardTitle} items={rewards} />
            </div>

            {notes.length > 0 && (
                <div className="mt-3 border-t border-[#ffb00022] pt-2 text-[11px] leading-relaxed text-[#889988]">
                    {notes.map((note) => (
                        <div key={note}>• {note}</div>
                    ))}
                </div>
            )}
        </div>
    );
}
