import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Цветовая тема рамки/фона секции — тот же язык, что и у GameDialog */
const SECTION_PANEL_TONE_CHROME = {
    green: "bg-[rgba(0,255,65,0.05)] border-[#00ff41]",
    cyan: "bg-[rgba(0,212,255,0.05)] border-[#00d4ff]",
} as const;

export type SectionPanelTone = keyof typeof SECTION_PANEL_TONE_CHROME;

const SECTION_PANEL_PADDING = {
    sm: "p-3",
    md: "p-4",
} as const;

export type SectionPanelPadding = keyof typeof SECTION_PANEL_PADDING;

interface SectionPanelProps extends ComponentProps<"div"> {
    tone?: SectionPanelTone;
    padding?: SectionPanelPadding;
}

/**
 * Общая рамка для бордированных секций внутри панелей (не модалок — для них
 * см. GameDialog.tsx). Раньше `bg-[rgba(0,255,65,0.05)] border
 * border-[#00ff41] p-4` (и p-3 вариант) копировались буквально в 10+ файлах.
 */
export function SectionPanel({
    tone = "green",
    padding = "md",
    className,
    ...props
}: SectionPanelProps) {
    return (
        <div
            className={cn(
                "border",
                SECTION_PANEL_TONE_CHROME[tone],
                SECTION_PANEL_PADDING[padding],
                className,
            )}
            {...props}
        />
    );
}
